import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "./structured-logger.ts";
import { checkBackpressureStatus, type BackpressureStatus } from "./backpressure.ts";

interface CheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms: number;
  message?: string;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    circuitBreaker: CheckResult;
  };
  metrics: {
    uptime: number;
    requestCount: number;
    errorRate: number;
  };
  backpressure?: BackpressureStatus;
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
    
    // Latency thresholds
    if (latency > 1000) {
      return {
        status: "degraded",
        latency_ms: latency,
        message: "High latency detected",
      };
    }
    
    return {
      status: "healthy",
      latency_ms: latency,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function checkCircuitBreaker(): CheckResult {
  // Simple in-memory circuit breaker check
  const uptime = Date.now() - startTime;
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  
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

export async function createHealthCheck(
  functionName: string,
  version: string = "1.0.0",
  includeBackpressure: boolean = false
): Promise<HealthStatus> {
  const logger = createLogger(functionName);
  logger.debug("Performing health check", { functionName });
  
  const [dbCheck, cbCheck, bpStatus] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkCircuitBreaker()),
    includeBackpressure ? checkBackpressureStatus() : Promise.resolve(undefined),
  ]);
  
  // Determine overall status
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  
  if (dbCheck.status === "unhealthy" || cbCheck.status === "unhealthy") {
    overallStatus = "unhealthy";
  } else if (dbCheck.status === "degraded" || cbCheck.status === "degraded") {
    overallStatus = "degraded";
  }
  
  // Se backpressure ativo, forçar status unhealthy
  if (bpStatus?.isActive) {
    overallStatus = "unhealthy";
  }
  
  const uptime = (Date.now() - startTime) / 1000; // seconds
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version,
    checks: {
      database: dbCheck,
      circuitBreaker: cbCheck,
    },
    metrics: {
      uptime,
      requestCount,
      errorRate: parseFloat(errorRate.toFixed(2)),
    },
    backpressure: bpStatus,
  };
}
