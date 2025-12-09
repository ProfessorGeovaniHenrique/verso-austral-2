/**
 * 📊 USE PROGRESS WITH ETA
 * Sprint AUD-U: Hook para calcular tempo restante estimado
 * 
 * Calcula ETA baseado em progresso e tempo decorrido
 */

import { useMemo } from 'react';

interface ProgressETAResult {
  elapsedMs: number;
  elapsedFormatted: string;
  remainingMs: number;
  remainingFormatted: string;
  wordsPerSecond: number | null;
  estimatedTotalMs: number;
}

function formatDuration(ms: number): string {
  if (ms < 0 || !isFinite(ms)) return '--';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function useProgressWithETA(
  progress: number,
  startedAt?: Date | string | null,
  processedItems?: number
): ProgressETAResult | null {
  return useMemo(() => {
    if (!startedAt || progress <= 0 || progress > 100) return null;
    
    const startTime = typeof startedAt === 'string' 
      ? new Date(startedAt).getTime() 
      : startedAt.getTime();
    
    if (isNaN(startTime)) return null;
    
    const now = Date.now();
    const elapsedMs = now - startTime;
    
    // Calcular tempo total estimado baseado no progresso atual
    const estimatedTotalMs = (elapsedMs / progress) * 100;
    const remainingMs = estimatedTotalMs - elapsedMs;
    
    // Calcular velocidade se temos items processados
    const wordsPerSecond = processedItems && elapsedMs > 0
      ? (processedItems / elapsedMs) * 1000
      : null;
    
    return {
      elapsedMs,
      elapsedFormatted: formatDuration(elapsedMs),
      remainingMs: Math.max(0, remainingMs),
      remainingFormatted: progress >= 99.9 
        ? 'quase lá...' 
        : `~${formatDuration(remainingMs)} restantes`,
      wordsPerSecond,
      estimatedTotalMs
    };
  }, [progress, startedAt, processedItems]);
}

export function formatETAShort(remainingMs: number): string {
  if (remainingMs < 0 || !isFinite(remainingMs)) return '--';
  
  const seconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `~${minutes}m ${seconds % 60}s`;
  }
  return `~${seconds}s`;
}
