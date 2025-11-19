import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "./structured-logger.ts";

export interface Metric {
  timestamp: number;
  functionName: string;
  metricType: "request" | "error" | "latency";
  value: number;
  labels?: Record<string, string>;
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private flushInterval: number;
  private logger: ReturnType<typeof createLogger>;
  private flushTimer?: number;
  private enabled: boolean;

  constructor(flushInterval: number = 30000) {
    this.flushInterval = flushInterval;
    this.logger = createLogger("metrics-collector");
    this.enabled = Deno.env.get("METRICS_ENABLED") !== "false";
    
    if (this.enabled) {
      this.startAutoFlush();
    }
  }

  recordRequest(functionName: string, labels?: Record<string, string>): void {
    if (!this.enabled) return;
    
    this.metrics.push({
      timestamp: Date.now(),
      functionName,
      metricType: "request",
      value: 1,
      labels,
    });
  }

  recordError(functionName: string, errorType: string, labels?: Record<string, string>): void {
    if (!this.enabled) return;
    
    this.metrics.push({
      timestamp: Date.now(),
      functionName,
      metricType: "error",
      value: 1,
      labels: {
        ...labels,
        errorType,
      },
    });
  }

  recordLatency(functionName: string, durationMs: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;
    
    this.metrics.push({
      timestamp: Date.now(),
      functionName,
      metricType: "latency",
      value: durationMs,
      labels,
    });
  }

  async flush(): Promise<void> {
    if (!this.enabled || this.metrics.length === 0) return;
    
    const metricsToSend = [...this.metrics];
    this.metrics = [];
    
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Transform metrics to DB format
      const rows = metricsToSend.map(metric => ({
        timestamp: new Date(metric.timestamp).toISOString(),
        function_name: metric.functionName,
        metric_type: metric.metricType,
        value: metric.value,
        labels: metric.labels || {},
      }));
      
      const { error } = await supabase
        .from("edge_function_metrics")
        .insert(rows);
      
      if (error) {
        this.logger.error("Failed to flush metrics", error, {
          functionName: "metrics-collector",
          metricsCount: metricsToSend.length,
        });
        
        // Put metrics back in queue
        this.metrics = [...metricsToSend, ...this.metrics];
      } else {
        this.logger.debug("Metrics flushed successfully", {
          functionName: "metrics-collector",
          metricsCount: metricsToSend.length,
        });
      }
    } catch (error) {
      this.logger.error(
        "Exception while flushing metrics",
        error instanceof Error ? error : new Error(String(error)),
        { functionName: "metrics-collector" }
      );
      
      // Put metrics back in queue
      this.metrics = [...metricsToSend, ...this.metrics];
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    this.flush();
  }
}

// Singleton instance
const collector = new MetricsCollector();

export default collector;
export const recordRequest = collector.recordRequest.bind(collector);
export const recordError = collector.recordError.bind(collector);
export const recordLatency = collector.recordLatency.bind(collector);
export const flush = collector.flush.bind(collector);
