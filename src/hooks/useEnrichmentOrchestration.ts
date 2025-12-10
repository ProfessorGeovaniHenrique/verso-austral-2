/**
 * Hook para gerenciar orquestração de enriquecimento por corpus
 * Sprint AUD-P3: Batch Execution
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useEnrichmentOrchestration');

export interface CorpusStatus {
  id: string;
  name: string;
  type: string;
  pendingCount: number;
  isCompleted: boolean;
  isActive: boolean;
  songsProcessed: number;
  songsFailed: number;
}

export interface OrchestrationState {
  isRunning: boolean;
  currentCorpusIndex: number;
  currentCorpusId: string | null;
  currentCorpusName: string | null;
  currentJobId: string | null;
  completedCorpora: string[];
  totalProcessed: number;
  totalFailed: number;
  startedAt: string | null;
  lastActivity: string | null;
}

export interface OrchestrationData {
  state: OrchestrationState;
  corpora: CorpusStatus[];
  orphansCleaned: number;
}

const POLL_INTERVAL = 5000; // 5 segundos

export function useEnrichmentOrchestration() {
  const [data, setData] = useState<OrchestrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Buscar status da orquestração
  const fetchStatus = useCallback(async () => {
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { body: { action: 'status' } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar status');
      }

      setData({
        state: result.state,
        corpora: result.corpora,
        orphansCleaned: result.orphansCleaned,
      });
      setError(null);
    } catch (err) {
      log.error('Error fetching status', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Iniciar processamento
  const start = useCallback(async (corpusId?: string, jobType: 'metadata' | 'youtube' | 'full' = 'metadata') => {
    setIsStarting(true);
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { 
          body: { 
            action: 'start',
            corpusId,
            jobType,
          } 
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!result.success) {
        toast.error(result.error || 'Erro ao iniciar');
        return false;
      }

      toast.success(result.message || 'Processamento iniciado!');
      await fetchStatus();
      return true;
    } catch (err) {
      log.error('Error starting', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar');
      return false;
    } finally {
      setIsStarting(false);
    }
  }, [fetchStatus]);

  // Parar processamento
  const stop = useCallback(async () => {
    setIsStopping(true);
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { body: { action: 'stop' } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!result.success) {
        toast.error(result.error || 'Erro ao parar');
        return false;
      }

      toast.info(result.message || 'Processamento parado');
      await fetchStatus();
      return true;
    } catch (err) {
      log.error('Error stopping', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao parar');
      return false;
    } finally {
      setIsStopping(false);
    }
  }, [fetchStatus]);

  // Pular corpus atual
  const skip = useCallback(async (jobType: 'metadata' | 'youtube' | 'full' = 'metadata') => {
    setIsSkipping(true);
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { body: { action: 'skip', jobType } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!result.success) {
        toast.error(result.error || 'Erro ao pular');
        return false;
      }

      toast.info(result.message || 'Corpus pulado');
      await fetchStatus();
      return true;
    } catch (err) {
      log.error('Error skipping', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao pular');
      return false;
    } finally {
      setIsSkipping(false);
    }
  }, [fetchStatus]);

  // Limpar jobs órfãos
  const cleanup = useCallback(async () => {
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { body: { action: 'cleanup' } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result.orphansCleaned > 0) {
        toast.success(`${result.orphansCleaned} jobs órfãos limpos`);
      } else {
        toast.info('Nenhum job órfão encontrado');
      }

      await fetchStatus();
      return result.orphansCleaned;
    } catch (err) {
      log.error('Error cleaning up', err);
      toast.error(err instanceof Error ? err.message : 'Erro na limpeza');
      return 0;
    }
  }, [fetchStatus]);

  // Setup inicial e polling
  useEffect(() => {
    fetchStatus();

    // Polling quando há processamento ativo
    pollIntervalRef.current = setInterval(() => {
      if (data?.state.isRunning) {
        fetchStatus();
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchStatus, data?.state.isRunning]);

  // Calcular métricas
  const totalPending = data?.corpora.reduce((sum, c) => sum + c.pendingCount, 0) || 0;
  const totalCompleted = data?.corpora.filter(c => c.isCompleted).length || 0;
  const progress = data?.state.isRunning && data.state.totalProcessed > 0
    ? Math.round((data.state.totalProcessed / (data.state.totalProcessed + totalPending)) * 100)
    : 0;

  // Calcular ETA
  const calculateETA = useCallback(() => {
    if (!data?.state.isRunning || !data.state.startedAt || data.state.totalProcessed === 0) {
      return null;
    }

    const elapsedMs = Date.now() - new Date(data.state.startedAt).getTime();
    const rate = data.state.totalProcessed / (elapsedMs / 1000); // songs per second
    const remaining = totalPending;
    const etaSeconds = remaining / rate;

    return {
      rate: rate * 60, // songs per minute
      remainingMinutes: Math.round(etaSeconds / 60),
      remainingHours: Math.round(etaSeconds / 3600 * 10) / 10,
    };
  }, [data, totalPending]);

  return {
    // Estado
    data,
    isLoading,
    error,

    // Flags de ação
    isStarting,
    isStopping,
    isSkipping,

    // Métricas
    totalPending,
    totalCompleted,
    progress,
    eta: calculateETA(),

    // Ações
    start,
    stop,
    skip,
    cleanup,
    refetch: fetchStatus,
  };
}
