import * as Sentry from "@sentry/react";
import { trackPerformance } from "./sentry";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
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
}

class StructuredLogger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor(minLevel?: LogLevel) {
    this.minLevel = minLevel ?? LogLevel.INFO;
    this.isDevelopment = import.meta.env.DEV;
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
    
    // Add breadcrumb to Sentry
    Sentry.addBreadcrumb({
      message,
      level: "info",
      data: context,
    });
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
    
    // Add breadcrumb to Sentry
    Sentry.addBreadcrumb({
      message,
      level: "warning",
      data: context,
    });
  }

  success(message: string, context?: LogContext): void {
    this.info(`✅ ${message}`, context);
  }

  // Track performance automatically for slow operations
  performanceTrack(operation: string, durationMs: number, context?: LogContext): void {
    if (durationMs > 3000) { // 3 seconds threshold
      this.warn(`Slow operation detected: ${operation}`, {
        ...context,
        duration_ms: durationMs,
        performance_issue: true,
      });
      
      // Send to Sentry for monitoring
      trackPerformance(operation, durationMs, context);
    } else {
      this.debug(`Operation completed: ${operation}`, {
        ...context,
        duration_ms: durationMs,
      });
    }
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
      Sentry.captureException(error, {
        extra: context,
      });
    } else {
      Sentry.captureMessage(message, "error");
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
      Sentry.captureException(error, {
        level: "fatal",
        extra: context,
      });
    } else {
      Sentry.captureMessage(message, "fatal");
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
    };
  }

  private output(entry: LogEntry): void {
    // In development, pretty print
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(entry.level);
      console.log(
        `%c[${entry.level}]%c ${entry.message}`,
        style,
        "color: inherit",
        entry.context || ""
      );
      if (entry.error) {
        console.error(entry.error);
      }
      return;
    }

    // In production, structured JSON
    const output = JSON.stringify(entry);
    
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

  private getConsoleStyle(level: string): string {
    const styles: Record<string, string> = {
      DEBUG: "color: #6b7280; font-weight: bold",
      INFO: "color: #3b82f6; font-weight: bold",
      WARN: "color: #f59e0b; font-weight: bold",
      ERROR: "color: #ef4444; font-weight: bold",
      FATAL: "color: #dc2626; font-weight: bold; background: #fee",
    };
    return styles[level] || "";
  }
}

export const logger = new StructuredLogger();
