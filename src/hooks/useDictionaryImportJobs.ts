import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

export interface DictionaryImportJob {
  id: string;
  tipo_dicionario: string;
  status: string;
  total_verbetes: number;
  verbetes_processados: number;
  verbetes_inseridos: number;
  erros: number;
  erro_mensagem: string | null;
  progresso: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  metadata: any;
  criado_em: string;
  atualizado_em: string;
}

export function useDictionaryImportJobs(refetchInterval: number = 2000) {
  const queryResult = useQuery({
    queryKey: ['dictionary-import-jobs'],
    queryFn: async () => {
      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('dictionary_import_jobs')
          .select('*')
          .order('criado_em', { ascending: false })
          .limit(20);

        if (error) throw error;
        return data as DictionaryImportJob[];
      }, {
        maxRetries: 5,
        baseDelay: 500,
        onRetry: (error, attempt) => {
          notifications.info(
            `Reconectando... (${attempt}/5)`,
            'Tentando carregar jobs de importação'
          );
        }
      });
    },
    refetchInterval: (query) => {
      // ✅ FIX MEMORY LEAK: Pausar polling se não há jobs ativos
      const hasActiveJobs = query.state.data?.some(
        job => job.status === 'iniciado' || job.status === 'processando' || job.status === 'pendente'
      );
      return hasActiveJobs ? refetchInterval : false;
    },
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ✅ FIX MEMORY LEAK: Realtime com cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    channelRef.current = supabase
      .channel('dictionary_jobs_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dictionary_import_jobs'
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
  }, []);

  return queryResult;
}
