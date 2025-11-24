import StructuredLogger, { LogContext, LogLevel } from './structured-logger.ts';

/**
 * Factory para criar loggers contextualizados em Edge Functions
 * Uso: const log = createEdgeLogger('function-name', requestId, userId)
 */
export function createEdgeLogger(
  functionName: string,
  requestId?: string,
  userId?: string
) {
  const logger = new StructuredLogger(undefined, requestId);

  const baseContext: LogContext = {
    functionName,
    userId,
    requestId,
  };

  return {
    debug: (message: string, additionalContext?: Partial<LogContext>) => {
      logger.debug(message, { ...baseContext, ...additionalContext });
    },

    info: (message: string, additionalContext?: Partial<LogContext>) => {
      logger.info(message, { ...baseContext, ...additionalContext });
    },

    warn: (message: string, additionalContext?: Partial<LogContext>) => {
      logger.warn(message, { ...baseContext, ...additionalContext });
    },

    error: (
      message: string,
      error?: Error,
      additionalContext?: Partial<LogContext>
    ) => {
      logger.error(message, error, { ...baseContext, ...additionalContext });
    },

    fatal: (
      message: string,
      error?: Error,
      additionalContext?: Partial<LogContext>
    ) => {
      logger.fatal(message, error, { ...baseContext, ...additionalContext });
    },

    // Helpers para logging estruturado comum em Edge Functions
    logJobStart: (jobId: string, totalItems: number, metadata?: Record<string, unknown>) => {
      logger.info(`Job started: ${jobId}`, {
        ...baseContext,
        jobId,
        stage: 'start',
        totalItems,
        ...metadata,
      });
    },

    logJobProgress: (
      jobId: string,
      processedItems: number,
      totalItems: number,
      percentage: number
    ) => {
      logger.info(`Job progress: ${percentage.toFixed(1)}%`, {
        ...baseContext,
        jobId,
        stage: 'progress',
        processedItems,
        totalItems,
        percentage,
      });
    },

    logJobComplete: (
      jobId: string,
      processedItems: number,
      duration: number,
      metadata?: Record<string, unknown>
    ) => {
      logger.info(`Job completed: ${jobId}`, {
        ...baseContext,
        jobId,
        stage: 'complete',
        processedItems,
        duration,
        ...metadata,
      });
    },

    logJobError: (
      jobId: string,
      error: Error,
      metadata?: Record<string, unknown>
    ) => {
      logger.fatal(`Job failed: ${jobId}`, error, {
        ...baseContext,
        jobId,
        stage: 'error',
        ...metadata,
      });
    },

    logApiCall: (
      service: string,
      endpoint: string,
      method: string,
      status: number,
      duration?: number
    ) => {
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      const message = `${service} ${method} ${endpoint} - ${status}`;

      if (level === 'error') {
        logger.error(message, undefined, {
          ...baseContext,
          service,
          endpoint,
          method,
          status,
          duration,
        });
      } else if (level === 'warn') {
        logger.warn(message, {
          ...baseContext,
          service,
          endpoint,
          method,
          status,
          duration,
        });
      } else {
        logger.info(message, {
          ...baseContext,
          service,
          endpoint,
          method,
          status,
          duration,
        });
      }
    },

    logDatabaseQuery: (
      table: string,
      operation: 'select' | 'insert' | 'update' | 'delete',
      rowCount: number,
      duration?: number
    ) => {
      logger.debug(`DB ${operation} on ${table} (${rowCount} rows)`, {
        ...baseContext,
        table,
        operation,
        rowCount,
        duration,
      });
    },

    logValidation: (
      entity: string,
      isValid: boolean,
      errors?: string[]
    ) => {
      if (isValid) {
        logger.info(`Validation passed: ${entity}`, {
          ...baseContext,
          entity,
          isValid: true,
        });
      } else {
        logger.warn(`Validation failed: ${entity}`, {
          ...baseContext,
          entity,
          isValid: false,
          errors,
        });
      }
    },

    logCacheHit: (cacheKey: string, source: 'hit' | 'miss') => {
      logger.debug(`Cache ${source}: ${cacheKey}`, {
        ...baseContext,
        cacheKey,
        cacheStatus: source,
      });
    },

    // Timing helper para medir duração de operações
    startTimer: () => {
      const startTime = Date.now();
      return {
        end: (operationName: string, additionalContext?: Partial<LogContext>) => {
          const duration = Date.now() - startTime;
          logger.info(`${operationName} completed in ${duration}ms`, {
            ...baseContext,
            operation: operationName,
            duration,
            ...additionalContext,
          });
          return duration;
        },
      };
    },
  };
}

/**
 * Logger rápido para Edge Functions sem contexto extenso
 */
export function quickLog(
  functionName: string,
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  context?: Partial<LogContext>
) {
  const logger = new StructuredLogger();
  const fullContext: LogContext = {
    functionName,
    ...context,
  };

  switch (level) {
    case 'debug':
      logger.debug(message, fullContext);
      break;
    case 'info':
      logger.info(message, fullContext);
      break;
    case 'warn':
      logger.warn(message, fullContext);
      break;
    case 'error':
      logger.error(message, undefined, fullContext);
      break;
    case 'fatal':
      logger.fatal(message, undefined, fullContext);
      break;
  }
}
