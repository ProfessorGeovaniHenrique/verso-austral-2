/**
 * Hook para monitorar status de backpressure do sistema
 * Consulta Redis via edge function health-check
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BackpressureStatus {
  isActive: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  cooldownUntil: string | null;
  cooldownRemainingMs: number;
  triggerReason: string | null;
  lastCheck: string;
  metrics: {
    dbLatencyMs: number;
    errorCount: number;
    requestCount: number;
    errorRate: number;
  };
}

interface UseBackpressureStatusResult {
  status: BackpressureStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  cooldownMinutesRemaining: number | null;
  isSystemHealthy: boolean;
}

const POLL_INTERVAL_MS = 30000; // 30 segundos

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
          triggerReason: null,
          lastCheck: new Date().toISOString(),
          metrics: {
            dbLatencyMs: data?.checks?.database?.latency_ms || 0,
            errorCount: 0,
            requestCount: 0,
            errorRate: 0,
          }
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

  // Fetch inicial e polling
  useEffect(() => {
    if (!enabled) return;
    
    fetchStatus();
    
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, fetchStatus]);

  // Calcular minutos restantes
  const cooldownMinutesRemaining = status?.cooldownRemainingMs 
    ? Math.ceil(status.cooldownRemainingMs / 60000) 
    : null;

  const isSystemHealthy = status?.status === 'healthy' && !status?.isActive;

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
    cooldownMinutesRemaining,
    isSystemHealthy,
  };
}
