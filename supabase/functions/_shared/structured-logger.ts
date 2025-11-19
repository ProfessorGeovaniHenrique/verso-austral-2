import { captureException, captureMessage, addBreadcrumb as sentryCrumb } from "./sentry.ts";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  functionName?: string;
  userId?: string;
  jobId?: string;
  requestId?: string;
  duration?: number;
  stage?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  correlationId?: string;
}

class StructuredLogger {
  private minLevel: LogLevel;
  private correlationId?: string;

  constructor(minLevel?: LogLevel, correlationId?: string) {
    const envLevel = Deno.env.get("LOG_LEVEL")?.toUpperCase();
    this.minLevel = minLevel ?? (LogLevel[envLevel as keyof typeof LogLevel] || LogLevel.INFO);
    this.correlationId = correlationId;
  }

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
    
    // Add breadcrumb to Sentry
    sentryCrumb(message, context, "info");
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
    
    // Add breadcrumb to Sentry
    sentryCrumb(message, context, "warning");
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.output(entry);

    // Send to Sentry
    if (error) {
      captureException(error, {
        functionName: context?.functionName,
        userId: context?.userId as string,
        requestId: context?.requestId as string,
        extra: context,
      });
    } else {
      captureMessage(message, "error", {
        functionName: context?.functionName,
        extra: context,
      });
    }
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, context);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.output(entry);

    // Send to Sentry
    if (error) {
      captureException(error, {
        functionName: context?.functionName,
        userId: context?.userId as string,
        requestId: context?.requestId as string,
        extra: { ...context, severity: "fatal" },
      });
    } else {
      captureMessage(message, "fatal", {
        functionName: context?.functionName,
        extra: context,
      });
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.minLevel) return;

    const entry = this.createLogEntry(level, message, context);
    this.output(entry);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: context ? { ...context } : undefined,
      correlationId: this.correlationId,
    };
  }

  private output(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    
    // Use appropriate console method
    if (entry.level === "DEBUG") {
      console.debug(output);
    } else if (entry.level === "INFO") {
      console.info(output);
    } else if (entry.level === "WARN") {
      console.warn(output);
    } else {
      console.error(output);
    }
  }
}

// Factory function to create logger with correlation ID
export function createLogger(functionName: string, requestId?: string): StructuredLogger {
  const logger = new StructuredLogger(undefined, requestId);
  return logger;
}

// Default export
export default StructuredLogger;
