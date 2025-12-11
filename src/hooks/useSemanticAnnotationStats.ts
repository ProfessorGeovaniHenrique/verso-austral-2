/**
 * useSemanticAnnotationStats - Hook para estatísticas de jobs de anotação semântica
 * 
 * Consulta semantic_annotation_jobs e fornece métricas agregadas em tempo real
 */

import { useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SemanticAnnotationJob {
  id: string;
  artist_id: string;
  artist_name: string;
  status: string;
  total_words: number;
  processed_words: number;
  progress: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  last_chunk_at: string | null;
  chunks_processed: number | null;
  current_song_index: number | null;
  current_word_index: number | null;
}

export interface SemanticAnnotationStats {
  totalJobs: number;
  processing: number;
  paused: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalWordsAnnotated: number;
  totalWordsProcessed: number;
  activeJobs: SemanticAnnotationJob[];
  recentJobs: SemanticAnnotationJob[];
}

interface UseSemanticAnnotationStatsOptions {
  enabled?: boolean;
  refetchInterval?: number;
  limit?: number;
}

export function useSemanticAnnotationStats(options: UseSemanticAnnotationStatsOptions = {}) {
  const { 
    enabled = true, 
    refetchInterval = 5000,
    limit = 50 
  } = options;

  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const queryResult = useQuery({
    queryKey: ['semantic-annotation-stats', limit],
    queryFn: async () => {
      // Buscar jobs recentes com estatísticas
      const { data: jobs, error } = await supabase
        .from('semantic_annotation_jobs')
        .select('*')
        .order('tempo_inicio', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Buscar contagem total por status
      const { data: statusCounts, error: countError } = await supabase
        .from('semantic_annotation_jobs')
        .select('status')
        .then(result => {
          if (result.error) return { data: null, error: result.error };
          
          const counts = {
            total: result.data?.length || 0,
            processing: 0,
            paused: 0,
            completed: 0,
            failed: 0,
            cancelled: 0
          };

          result.data?.forEach(job => {
            if (job.status === 'processando') counts.processing++;
            else if (job.status === 'pausado') counts.paused++;
            else if (job.status === 'concluido' || job.status === 'completo') counts.completed++;
            else if (job.status === 'erro') counts.failed++;
            else if (job.status === 'cancelado') counts.cancelled++;
          });

          return { data: counts, error: null };
        });

      if (countError) throw countError;

      // Mapear para interface esperada - progress é calculado, não existe na tabela
      const mappedJobs: SemanticAnnotationJob[] = (jobs || []).map(job => {
        const totalWords = job.total_words || 0;
        const processedWords = job.processed_words || 0;
        const calculatedProgress = totalWords > 0 
          ? Math.round((processedWords / totalWords) * 100) 
          : 0;

        return {
          id: job.id,
          artist_id: job.artist_id,
          artist_name: job.artist_name,
          status: job.status,
          total_words: totalWords,
          processed_words: processedWords,
          progress: calculatedProgress,
          tempo_inicio: job.tempo_inicio,
          tempo_fim: job.tempo_fim,
          erro_mensagem: job.erro_mensagem,
          last_chunk_at: job.last_chunk_at,
          chunks_processed: job.chunks_processed,
          current_song_index: job.current_song_index,
          current_word_index: job.current_word_index
        };
      });

      const activeJobs = mappedJobs.filter(j => 
        j.status === 'processando' || j.status === 'pausado'
      );

      const totalWordsAnnotated = mappedJobs
        .filter(j => j.status === 'concluido' || j.status === 'completo')
        .reduce((sum, j) => sum + j.processed_words, 0);

      const totalWordsProcessed = mappedJobs
        .reduce((sum, j) => sum + j.processed_words, 0);

      return {
        jobs: mappedJobs,
        stats: {
          totalJobs: statusCounts?.total || 0,
          processing: statusCounts?.processing || 0,
          paused: statusCounts?.paused || 0,
          completed: statusCounts?.completed || 0,
          failed: statusCounts?.failed || 0,
          cancelled: statusCounts?.cancelled || 0,
          totalWordsAnnotated,
          totalWordsProcessed,
          activeJobs,
          recentJobs: mappedJobs.slice(0, 10)
        }
      };
    },
    enabled,
    refetchInterval: (query) => {
      // Pausar polling se não há jobs ativos
      const hasActiveJobs = query.state.data?.stats?.activeJobs?.length ?? 0 > 0;
      return hasActiveJobs ? refetchInterval : 15000;
    },
    staleTime: 2000
  });

  // Realtime subscription
  useEffect(() => {
    if (!enabled) return;

    channelRef.current = supabase
      .channel('semantic-annotation-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'semantic_annotation_jobs'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['semantic-annotation-stats'] });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, queryClient]);

  const lastUpdated = useMemo(() => new Date(), [queryResult.dataUpdatedAt]);

  return {
    jobs: queryResult.data?.jobs || [],
    stats: queryResult.data?.stats || {
      totalJobs: 0,
      processing: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalWordsAnnotated: 0,
      totalWordsProcessed: 0,
      activeJobs: [],
      recentJobs: []
    },
    isLoading: queryResult.isLoading,
    isRefetching: queryResult.isRefetching,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
    lastUpdated
  };
}
