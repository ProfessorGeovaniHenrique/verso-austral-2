/**
 * Utilitários de Logging Padronizado
 * FASE 3 - Migrado para Structured Logging
 */

import StructuredLogger from './structured-logger.ts';

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatThroughput(items: number, ms: number): string {
  const seconds = ms / 1000;
  const throughput = items / seconds;
  
  if (throughput > 100) {
    return `${Math.round(throughput)} items/s`;
  } else {
    return `${throughput.toFixed(1)} items/s`;
  }
}

export interface JobStartLogParams {
  fonte: string;
  jobId: string;
  totalEntries: number;
  batchSize: number;
  timeoutMs: number;
  maxRetries: number;
}

export function logJobStart(params: JobStartLogParams): void {
  const { fonte, jobId, totalEntries, batchSize, timeoutMs, maxRetries } = params;
  const logger = new StructuredLogger(undefined, jobId);
  
  logger.info(`[${fonte}] Job started`, {
    jobId,
    totalEntries,
    batchSize,
    timeoutMs,
    maxRetries,
    stage: 'start'
  });
}

export interface JobProgressLogParams {
  jobId: string;
  processed: number;
  totalEntries: number;
  inserted: number;
  errors: number;
  startTime: number;
}

export function logJobProgress(params: JobProgressLogParams): void {
  const { jobId, processed, totalEntries, inserted, errors, startTime } = params;
  
  const progress = ((processed / totalEntries) * 100).toFixed(1);
  const elapsed = Date.now() - startTime;
  const estimatedTotal = (elapsed / processed) * totalEntries;
  const estimatedRemaining = estimatedTotal - elapsed;
  const logger = new StructuredLogger(undefined, jobId);
  
  logger.info(`Job progress: ${progress}%`, {
    jobId,
    processed,
    totalEntries,
    inserted,
    errors,
    progress: parseFloat(progress),
    elapsedMs: elapsed,
    estimatedRemainingMs: estimatedRemaining,
    stage: 'progress'
  });
}

export interface JobCompleteLogParams {
  fonte: string;
  jobId: string;
  processed: number;
  totalEntries: number;
  inserted: number;
  errors: number;
  totalTime: number;
}

export function logJobComplete(params: JobCompleteLogParams): void {
  const { fonte, jobId, processed, totalEntries, inserted, errors, totalTime } = params;
  
  const successRate = ((inserted / processed) * 100).toFixed(1);
  const throughput = formatThroughput(processed, totalTime);
  const logger = new StructuredLogger(undefined, jobId);
  
  logger.info(`[${fonte}] Job completed`, {
    jobId,
    processed,
    totalEntries,
    inserted,
    errors,
    successRate: parseFloat(successRate),
    totalTimeMs: totalTime,
    throughput,
    stage: 'complete'
  });
}

export interface JobErrorLogParams {
  fonte: string;
  jobId: string;
  error: Error;
}

export function logJobError(params: JobErrorLogParams): void {
  const { fonte, jobId, error } = params;
  const logger = new StructuredLogger(undefined, jobId);
  
  logger.fatal(`[${fonte}] Job failed`, error, {
    jobId,
    stage: 'error'
  });
}
