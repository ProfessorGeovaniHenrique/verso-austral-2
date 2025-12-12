import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "./structured-logger.ts";
import { checkBackpressureStatus, type BackpressureStatus } from "./backpressure.ts";
import { getJobSlotStatus, type JobSlotStatus } from "./job-slot-manager.ts";

interface CheckResult {
  status: "healthy" | "degraded" | "unhealthy" | "critical";
  latency_ms: number;
  message?: string;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy" | "critical";
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    circuitBreaker: CheckResult;
    concurrency: CheckResult;
  };
  metrics: {
    uptime: number;
    requestCount: number;
    errorRate: number;
    activeJobs: number;
    maxConcurrentJobs: number;
  };
  backpressure?: BackpressureStatus;
  concurrency?: JobSlotStatus;
}

// In-memory metrics (reset on cold start)
let startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

export function incrementRequestCount(): void {
  requestCount++;
}

export function incrementErrorCount(): void {
  errorCount++;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Simple query to check DB connectivity
    const { error } = await supabase
      .from("semantic_tagset")
      .select("id")
      .limit(1);
    
    const latency = Date.now() - start;
    
    if (error) {
      return {
        status: "unhealthy",
        latency_ms: latency,
        message: error.message,
      };
    }
    
    // Latency thresholds - escalonados
    if (latency > 3000) {
      return {
        status: "critical",
        latency_ms: latency,
        message: "Critical latency detected",
      };
    }
    
    if (latency > 1000) {
      return {
        status: "unhealthy",
        latency_ms: latency,
        message: "High latency detected",
      };
    }
    
    if (latency > 500) {
      return {
        status: "degraded",
        latency_ms: latency,
        message: "Elevated latency",
      };
    }
    
    return {
      status: "healthy",
      latency_ms: latency,
    };
  } catch (error) {
    return {
      status: "critical",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function checkCircuitBreaker(): CheckResult {
  const uptime = Date.now() - startTime;
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  
  if (errorRate > 75) {
    return {
      status: "critical",
      latency_ms: 0,
      message: `Critical error rate: ${errorRate.toFixed(2)}%`,
    };
  }
  
  if (errorRate > 50) {
    return {
      status: "unhealthy",
      latency_ms: 0,
      message: `Error rate: ${errorRate.toFixed(2)}%`,
    };
  }
  
  if (errorRate > 25) {
    return {
      status: "degraded",
      latency_ms: 0,
      message: `Error rate: ${errorRate.toFixed(2)}%`,
    };
  }
  
  return {
    status: "healthy",
    latency_ms: 0,
    message: `Error rate: ${errorRate.toFixed(2)}%`,
  };
}

function checkConcurrency(slotStatus: JobSlotStatus | null): CheckResult {
  if (!slotStatus) {
    return {
      status: "healthy",
      latency_ms: 0,
      message: "Concurrency check unavailable",
    };
  }
  
  switch (slotStatus.level) {
    case "CRITICAL":
      return {
        status: "critical",
        latency_ms: 0,
        message: `Critical concurrency: ${slotStatus.activeJobCount}/${slotStatus.maxConcurrentJobs} jobs`,
      };
    case "HIGH":
      return {
        status: "unhealthy",
        latency_ms: 0,
        message: `High concurrency: ${slotStatus.activeJobCount}/${slotStatus.maxConcurrentJobs} jobs`,
      };
    case "ELEVATED":
      return {
        status: "degraded",
        latency_ms: 0,
        message: `Elevated concurrency: ${slotStatus.activeJobCount}/${slotStatus.maxConcurrentJobs} jobs`,
      };
    default:
      return {
        status: "healthy",
        latency_ms: 0,
        message: `Normal concurrency: ${slotStatus.activeJobCount}/${slotStatus.maxConcurrentJobs} jobs`,
      };
  }
}

export async function createHealthCheck(
  functionName: string,
  version: string = "2.0.0",
  includeBackpressure: boolean = false
): Promise<HealthStatus> {
  const logger = createLogger(functionName);
  logger.debug("Performing health check", { functionName });
  
  // Obter status de slots em paralelo
  let slotStatus: JobSlotStatus | null = null;
  try {
    slotStatus = await getJobSlotStatus();
  } catch (err) {
    logger.warn("Failed to get job slot status", { error: err });
  }
  
  const [dbCheck, cbCheck, bpStatus] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkCircuitBreaker()),
    includeBackpressure ? checkBackpressureStatus() : Promise.resolve(undefined),
  ]);
  
  const concurrencyCheck = checkConcurrency(slotStatus);
  
  // Determine overall status (pior status prevalece)
  const statuses = [dbCheck.status, cbCheck.status, concurrencyCheck.status];
  let overallStatus: "healthy" | "degraded" | "unhealthy" | "critical" = "healthy";
  
  if (statuses.includes("critical")) {
    overallStatus = "critical";
  } else if (statuses.includes("unhealthy")) {
    overallStatus = "unhealthy";
  } else if (statuses.includes("degraded")) {
    overallStatus = "degraded";
  }
  
  // Se backpressure ativo, forçar status unhealthy no mínimo
  if (bpStatus?.isActive && overallStatus === "healthy") {
    overallStatus = "unhealthy";
  }
  
  const uptime = (Date.now() - startTime) / 1000;
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version,
    checks: {
      database: dbCheck,
      circuitBreaker: cbCheck,
      concurrency: concurrencyCheck,
    },
    metrics: {
      uptime,
      requestCount,
      errorRate: parseFloat(errorRate.toFixed(2)),
      activeJobs: slotStatus?.activeJobCount || 0,
      maxConcurrentJobs: slotStatus?.maxConcurrentJobs || 5,
    },
    backpressure: bpStatus,
    concurrency: slotStatus || undefined,
  };
}
