import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

export interface AnnotationJob {
  id: string;
  user_id: string;
  corpus_type: string;
  status: string;
  total_palavras: number | null;
  palavras_processadas: number | null;
  palavras_anotadas: number | null;
  progresso: number | null;
  tempo_inicio: string | null;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  metadata: any;
}

export function useAnnotationJobs(refetchInterval: number = 3000) {
  const queryResult = useQuery({
    queryKey: ['annotation-jobs'],
    queryFn: async () => {
      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('annotation_jobs')
          .select('*')
          .order('tempo_inicio', { ascending: false })
          .limit(50);

        if (error) throw error;
        return data as AnnotationJob[];
      }, {
        maxRetries: 5,
        baseDelay: 500,
        onRetry: (error, attempt) => {
          notifications.info(
            `Reconectando... (${attempt}/5)`,
            'Tentando carregar jobs de anotação'
          );
        }
      });
    },
    refetchInterval: (query) => {
      // ✅ CORREÇÃO #7: Pausar polling se não há jobs ativos
      const hasActiveJobs = query.state.data?.some(
        job => job.status === 'pending' || job.status === 'processing'
      );
      return hasActiveJobs ? refetchInterval : false;
    },
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ✅ Realtime com cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    channelRef.current = supabase
      .channel('annotation_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotation_jobs'
        },
        () => {
          queryResult.refetch();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryResult.refetch]);

  const stats = {
    totalJobs: queryResult.data?.length || 0,
    completedJobs: queryResult.data?.filter(j => j.status === 'completed').length || 0,
    failedJobs: queryResult.data?.filter(j => j.status === 'failed').length || 0,
    inProgressJobs: queryResult.data?.filter(j => j.status === 'processing' || j.status === 'pending').length || 0,
    totalWordsProcessed: queryResult.data?.reduce((sum, j) => sum + (j.palavras_processadas || 0), 0) || 0
  };

  return {
    jobs: queryResult.data || [],
    stats,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch
  };
}
