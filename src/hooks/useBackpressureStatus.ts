/**
 * Hook para monitorar status de backpressure do sistema
 * SPRINT BP-2: Inclui controle de concorrência e verificação pre-flight
 * Consulta Redis via edge function health-check
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical';
export type CooldownLevel = 'degraded' | 'unhealthy' | 'critical';
export type ConcurrencyLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface ConcurrencyStatus {
  activeJobCount: number;
  maxConcurrentJobs: number;
  level: ConcurrencyLevel;
  canStartNewJob: boolean;
  delayMultiplier: number;
  activeJobIds: string[];
}

export interface BackpressureStatus {
  isActive: boolean;
  status: HealthStatus;
  cooldownUntil: string | null;
  cooldownRemainingMs: number;
  cooldownLevel: CooldownLevel | null;
  triggerReason: string | null;
  lastCheck: string;
  metrics: {
    dbLatencyMs: number;
    dbLatencyAvg: number;
    errorCount: number;
    errorCount1h: number;
    requestCount: number;
    requestCount1h: number;
    errorRate: number;
  };
  concurrency: ConcurrencyStatus | null;
}

interface UseBackpressureStatusResult {
  status: BackpressureStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  cooldownMinutesRemaining: number | null;
  isSystemHealthy: boolean;
  // Novas propriedades para controle de concorrência
  activeJobCount: number;
  maxConcurrentJobs: number;
  concurrencyLevel: ConcurrencyLevel;
  canStartNewJob: boolean;
  // Função para verificar se pode iniciar novo job
  checkCanStartJob: () => Promise<boolean>;
}

const POLL_INTERVAL_MS = 30000; // 30 segundos
const MAX_CONCURRENT_JOBS = 5;

export function useBackpressureStatus(enabled: boolean = true): UseBackpressureStatusResult {
  const [status, setStatus] = useState<BackpressureStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('health-check', {
        body: { includeBackpressure: true }
      });
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      if (data?.backpressure) {
        setStatus(data.backpressure);
      } else {
        // Fallback se backpressure não estiver no response
        setStatus({
          isActive: false,
          status: data?.status || 'healthy',
          cooldownUntil: null,
          cooldownRemainingMs: 0,
          cooldownLevel: null,
          triggerReason: null,
          lastCheck: new Date().toISOString(),
          metrics: {
            dbLatencyMs: data?.checks?.database?.latency_ms || 0,
            dbLatencyAvg: 0,
            errorCount: 0,
            errorCount1h: 0,
            requestCount: 0,
            requestCount1h: 0,
            errorRate: 0,
          },
          concurrency: null,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao verificar backpressure';
      setError(errorMsg);
      console.error('[useBackpressureStatus]', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Verificação pré-flight para iniciar novo job
  const checkCanStartJob = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('health-check', {
        body: { includeBackpressure: true }
      });
      
      if (fetchError) {
        console.error('[useBackpressureStatus] Pre-flight check failed:', fetchError);
        return false;
      }
      
      // Atualizar status local
      if (data?.backpressure) {
        setStatus(data.backpressure);
      }
      
      // Verificar condições
      const bp = data?.backpressure;
      
      // Se backpressure ativo, não pode iniciar
      if (bp?.isActive) {
        console.log('[useBackpressureStatus] ⛔ Backpressure ativo - novo job bloqueado');
        return false;
      }
      
      // Se sistema crítico ou unhealthy, não pode iniciar
      if (bp?.status === 'critical' || bp?.status === 'unhealthy') {
        console.log(`[useBackpressureStatus] ⛔ Sistema ${bp.status} - novo job bloqueado`);
        return false;
      }
      
      // Verificar limite de concorrência
      const concurrency = bp?.concurrency;
      if (concurrency && !concurrency.canStartNewJob) {
        console.log(`[useBackpressureStatus] ⛔ Concorrência ${concurrency.level} (${concurrency.activeJobCount}/${concurrency.maxConcurrentJobs}) - novo job bloqueado`);
        return false;
      }
      
      console.log('[useBackpressureStatus] ✅ Pre-flight check passed - pode iniciar novo job');
      return true;
    } catch (err) {
      console.error('[useBackpressureStatus] Pre-flight check error:', err);
      return false;
    }
  }, []);

  // Fetch inicial e polling
  useEffect(() => {
    if (!enabled) return;
    
    fetchStatus();
    
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, fetchStatus]);

  // Calcular valores derivados
  const cooldownMinutesRemaining = useMemo(() => {
    return status?.cooldownRemainingMs 
      ? Math.ceil(status.cooldownRemainingMs / 60000) 
      : null;
  }, [status?.cooldownRemainingMs]);

  const isSystemHealthy = useMemo(() => {
    return status?.status === 'healthy' && !status?.isActive;
  }, [status?.status, status?.isActive]);

  const activeJobCount = status?.concurrency?.activeJobCount ?? 0;
  const maxConcurrentJobs = status?.concurrency?.maxConcurrentJobs ?? MAX_CONCURRENT_JOBS;
  const concurrencyLevel = status?.concurrency?.level ?? 'NORMAL';
  
  const canStartNewJob = useMemo(() => {
    // Não pode se backpressure ativo
    if (status?.isActive) return false;
    
    // Não pode se sistema não saudável
    if (status?.status === 'critical' || status?.status === 'unhealthy') return false;
    
    // Verificar concorrência
    if (status?.concurrency) {
      return status.concurrency.canStartNewJob;
    }
    
    // Default: permitir se jobs abaixo do limite
    return activeJobCount < maxConcurrentJobs;
  }, [status, activeJobCount, maxConcurrentJobs]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
    cooldownMinutesRemaining,
    isSystemHealthy,
    activeJobCount,
    maxConcurrentJobs,
    concurrencyLevel,
    canStartNewJob,
    checkCanStartJob,
  };
}
