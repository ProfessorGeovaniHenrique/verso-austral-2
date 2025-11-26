import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useSemanticAnnotationJob');

interface SemanticAnnotationJob {
  id: string;
  artist_id: string;
  artist_name: string;
  status: string;
  total_songs: number;
  total_words: number;
  processed_words: number;
  cached_words: number;
  new_words: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  erro_mensagem: string | null;
}

interface UseSemanticAnnotationJobResult {
  job: SemanticAnnotationJob | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  progress: number;
  startJob: (artistName: string) => Promise<string | null>;
  cancelPolling: () => void;
}

/**
 * Hook para gerenciar jobs de anotação semântica com polling
 */
export function useSemanticAnnotationJob(): UseSemanticAnnotationJobResult {
  const [job, setJob] = useState<SemanticAnnotationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<number | null>(null);

  const isProcessing = job?.status === 'iniciado' || job?.status === 'processando';
  const progress = job && job.total_words > 0 
    ? (job.processed_words / job.total_words) * 100 
    : 0;

  /**
   * Iniciar novo job de anotação
   */
  const startJob = useCallback(async (artistName: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      log.info('Starting annotation job', { artistName });

      const { data, error: invokeError } = await supabase.functions.invoke(
        'annotate-artist-songs',
        {
          body: { artistName }
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Erro ao iniciar job');
      }

      const jobId = data.jobId;
      log.info('Job started', { jobId, artistName });

      // Buscar job inicial
      await fetchJob(jobId);

      // Iniciar polling
      startPolling(jobId);

      return jobId;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      log.error('Error starting job', err as Error);
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Buscar status do job
   */
  const fetchJob = useCallback(async (jobId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('semantic_annotation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setJob(data);

      // Se job terminou, parar polling
      if (data.status === 'concluido' || data.status === 'erro' || data.status === 'cancelado') {
        cancelPolling();
        log.info('Job finished', { jobId, status: data.status });
      }

    } catch (err) {
      log.error('Error fetching job', err as Error);
      setError(err instanceof Error ? err.message : 'Erro ao buscar job');
    }
  }, []);

  /**
   * Iniciar polling do job
   */
  const startPolling = useCallback((jobId: string) => {
    // Parar polling anterior se existir
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    // Polling a cada 2 segundos
    const intervalId = window.setInterval(() => {
      fetchJob(jobId);
    }, 2000);

    setPollingIntervalId(intervalId);
    log.info('Polling started', { jobId });
  }, [pollingIntervalId, fetchJob]);

  /**
   * Cancelar polling
   */
  const cancelPolling = useCallback(() => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      log.info('Polling cancelled');
    }
  }, [pollingIntervalId]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  return {
    job,
    isLoading,
    isProcessing,
    error,
    progress,
    startJob,
    cancelPolling,
  };
}
