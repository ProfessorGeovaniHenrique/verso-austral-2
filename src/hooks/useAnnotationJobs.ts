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

export function useAnnotationJobs(
  page: number = 1, 
  pageSize: number = 20, 
  refetchInterval: number = 3000
) {
  const queryResult = useQuery({
    queryKey: ['annotation-jobs', page, pageSize],
    queryFn: async () => {
      return retrySupabaseOperation(async () => {
        const offset = (page - 1) * pageSize;
        
        // ✅ OTIMIZAÇÃO #3: Buscar total e dados em paralelo
        const [countResult, dataResult] = await Promise.all([
          supabase
            .from('annotation_jobs')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('annotation_jobs')
            .select('*')
            .order('tempo_inicio', { ascending: false })
            .range(offset, offset + pageSize - 1)
        ]);

        if (dataResult.error) throw dataResult.error;
        
        return {
          jobs: (dataResult.data || []) as AnnotationJob[],
          total: countResult.count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((countResult.count || 0) / pageSize)
        };
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
      const hasActiveJobs = query.state.data?.jobs?.some(
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

  const jobs = queryResult.data?.jobs || [];
  const stats = {
    totalJobs: queryResult.data?.total || 0,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    failedJobs: jobs.filter(j => j.status === 'failed').length,
    inProgressJobs: jobs.filter(j => j.status === 'processing' || j.status === 'pending').length,
    totalWordsProcessed: jobs.reduce((sum, j) => sum + (j.palavras_processadas || 0), 0)
  };

  return {
    jobs,
    stats,
    pagination: {
      page: queryResult.data?.page || 1,
      pageSize: queryResult.data?.pageSize || pageSize,
      total: queryResult.data?.total || 0,
      totalPages: queryResult.data?.totalPages || 1
    },
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch
  };
}
