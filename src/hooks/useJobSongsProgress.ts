import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useJobSongsProgress');

export interface SongProgress {
  id: string;
  title: string;
  totalWords: number;
  processedWords: number;
  status: 'completed' | 'processing' | 'pending';
}

interface UseJobSongsProgressResult {
  songs: SongProgress[];
  isLoading: boolean;
  error: string | null;
  completedCount: number;
  totalCount: number;
}

/**
 * Hook para buscar progresso de músicas processadas em um job de anotação
 */
export function useJobSongsProgress(jobId: string | null, isProcessing: boolean): UseJobSongsProgressResult {
  const [songs, setSongs] = useState<SongProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSongsProgress = useCallback(async () => {
    if (!jobId) {
      setSongs([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: invokeError } = await supabase.functions.invoke(
        'get-job-songs-progress',
        { body: { jobId } }
      );

      if (invokeError) {
        // Se job não encontrado, apenas limpar lista sem mostrar erro
        if (invokeError.message.includes('Job não encontrado')) {
          log.info('Job not found, clearing songs list', { jobId });
          setSongs([]);
          return;
        }
        throw new Error(invokeError.message);
      }

      if (data.error && !data.error.includes('Job não encontrado')) {
        throw new Error(data.error);
      }

      setSongs(data.songs || []);
      log.info('Songs progress fetched', { jobId, count: data.songs?.length || 0 });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar progresso';
      log.error('Error fetching songs progress', err as Error);
      setError(errorMsg);
      setSongs([]); // Limpar lista em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  // Buscar inicial
  useEffect(() => {
    if (jobId) {
      fetchSongsProgress();
    }
  }, [jobId, fetchSongsProgress]);

  // Polling enquanto está processando
  useEffect(() => {
    if (!isProcessing || !jobId) return;

    const intervalId = setInterval(() => {
      fetchSongsProgress();
    }, 5000); // A cada 5 segundos

    return () => clearInterval(intervalId);
  }, [isProcessing, jobId, fetchSongsProgress]);

  const completedCount = songs.filter(s => s.status === 'completed').length;
  const totalCount = songs.length;

  return {
    songs,
    isLoading,
    error,
    completedCount,
    totalCount,
  };
}
