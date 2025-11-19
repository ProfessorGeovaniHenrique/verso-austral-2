import { createLogger } from "./structured-logger.ts";
import { recordRequest, recordError, recordLatency } from "./metrics-collector.ts";
import { incrementRequestCount, incrementErrorCount } from "./health-check.ts";
import { captureException } from "./sentry.ts";

export function withInstrumentation(
  functionName: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const logger = createLogger(functionName, requestId);
    const startTime = Date.now();
    
    // Increment counters
    incrementRequestCount();
    recordRequest(functionName);
    
    logger.info("Request received", {
      functionName,
      requestId,
      method: req.method,
      url: req.url,
    });
    
    try {
      const response = await handler(req);
      const duration = Date.now() - startTime;
      
      // Record metrics
      recordLatency(functionName, duration);
      
      logger.info("Request completed", {
        functionName,
        requestId,
        duration,
        status: response.status,
      });
      
      // Track errors
      if (response.status >= 400) {
        incrementErrorCount();
        recordError(functionName, `HTTP ${response.status}`);
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Increment error counters
      incrementErrorCount();
      recordError(functionName, error instanceof Error ? error.name : "UnknownError");
      recordLatency(functionName, duration);
      
      logger.error(
        "Request failed",
        error instanceof Error ? error : new Error(String(error)),
        {
          functionName,
          requestId,
          duration,
        }
      );
      
      // Capture in Sentry
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          functionName,
          requestId,
        }
      );
      
      // Return error response
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Internal Server Error",
          requestId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}
