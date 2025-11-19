import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createLogger } from "../_shared/structured-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FunctionHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  lastCheck: string;
  latency_ms?: number;
  error?: string;
}

interface AggregatedHealth {
  overall_status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  functions: FunctionHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
}

const EDGE_FUNCTIONS = [
  "analyze-and-suggest-fixes",
  "annotate-pos",
  "annotate-semantic",
  "apply-corpus-metadata",
  "calculate-priority-score",
  "cancel-dictionary-job",
  "enrich-corpus-metadata",
  "process-demo-corpus",
  "process-dialectal-dictionary",
  "process-gutenberg-dictionary",
  "process-houaiss-dictionary",
  "process-nordestino-corpus",
  "process-unesp-dictionary",
  "refine-tagset-suggestions",
  "scan-codebase-realtime",
  "send-critical-alert",
  "send-invite-email",
  "sync-construction-log",
];

async function checkFunctionHealth(
  functionName: string,
  supabaseUrl: string
): Promise<FunctionHealth> {
  const start = Date.now();
  
  try {
    // Call the health endpoint of each function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}?health=true`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    const latency = Date.now() - start;
    
    if (!response.ok) {
      return {
        name: functionName,
        status: "unhealthy",
        lastCheck: new Date().toISOString(),
        latency_ms: latency,
        error: `HTTP ${response.status}`,
      };
    }
    
    const health = await response.json();
    
    return {
      name: functionName,
      status: health.status || "unknown",
      lastCheck: health.timestamp || new Date().toISOString(),
      latency_ms: latency,
    };
  } catch (error) {
    return {
      name: functionName,
      status: "unknown",
      lastCheck: new Date().toISOString(),
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function handler(req: Request): Promise<Response> {
  const logger = createLogger("health-aggregator");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  logger.info("Aggregating health checks", {
    functionName: "health-aggregator",
    functionsCount: EDGE_FUNCTIONS.length,
  });
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  
  // Check all functions in parallel
  const results = await Promise.all(
    EDGE_FUNCTIONS.map(fn => checkFunctionHealth(fn, supabaseUrl))
  );
  
  // Calculate summary
  const summary = results.reduce(
    (acc, result) => {
      acc.total++;
      acc[result.status]++;
      return acc;
    },
    { total: 0, healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 }
  );
  
  // Determine overall status
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  
  if (summary.unhealthy > 0) {
    overallStatus = "unhealthy";
  } else if (summary.degraded > 0 || summary.unknown > 0) {
    overallStatus = "degraded";
  }
  
  const aggregated: AggregatedHealth = {
    overall_status: overallStatus,
    timestamp: new Date().toISOString(),
    functions: results,
    summary,
  };
  
  logger.info("Health aggregation complete", {
    functionName: "health-aggregator",
    overallStatus,
    summary,
  });
  
  return new Response(JSON.stringify(aggregated, null, 2), {
    status: overallStatus === "healthy" ? 200 : 503,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(withInstrumentation("health-aggregator", handler));
