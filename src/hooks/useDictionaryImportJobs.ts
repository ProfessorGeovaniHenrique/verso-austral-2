import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';
import { toast } from 'sonner';

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
  offset_inicial?: number;
  isStalled?: boolean; // Job travado (sem atualização > 5min)
}

/**
 * Detecta se um job está travado (sem atualização > 5 minutos)
 */
function detectStalledJobs(jobs: DictionaryImportJob[]): DictionaryImportJob[] {
  const now = new Date();
  const STALLED_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

  return jobs.map(job => {
    if ((job.status === 'processando' || job.status === 'iniciado') && job.atualizado_em) {
      const lastUpdate = new Date(job.atualizado_em);
      const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
      
      if (timeSinceUpdate > STALLED_THRESHOLD_MS) {
        return { ...job, isStalled: true };
      }
    }
    return { ...job, isStalled: false };
  });
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
        
        // Detectar jobs travados
        const jobsWithStalledDetection = detectStalledJobs(data as DictionaryImportJob[]);
        return jobsWithStalledDetection;
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
      const hasActiveJobs = query.state.data?.some(
        job => job.status === 'iniciado' || job.status === 'processando' || job.status === 'pendente'
      );
      return hasActiveJobs ? refetchInterval : 10000; // 2s para ativos, 10s para inativos
    },
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
  });

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

// ✅ NOVO: Verificar integridade de um dicionário
export async function verifyDictionaryIntegrity(tipoDicionario: string) {
  try {
    const { count, error } = await supabase
      .from('dialectal_lexicon')
      .select('*', { count: 'exact', head: true })
      .ilike('volume_fonte', `%${tipoDicionario.replace('dialectal_', '')}%`);

    if (error) throw error;

    return {
      success: true,
      totalEntries: count || 0,
      message: `Encontradas ${count || 0} entradas para ${tipoDicionario}`
    };
  } catch (error: any) {
    return {
      success: false,
      totalEntries: 0,
      message: `Erro ao verificar: ${error.message}`
    };
  }
}

// ✅ NOVO: Limpar e reimportar dicionário
export async function clearAndReimport(tipoDicionario: string) {
  try {
    const volumeNum = tipoDicionario.includes('_I') ? 'I' : 'II';
    
    const { error: deleteError } = await supabase
      .from('dialectal_lexicon')
      .delete()
      .ilike('volume_fonte', `%${volumeNum}%`);

    if (deleteError) throw deleteError;

    toast.success(`Entradas do Volume ${volumeNum} removidas. Reimporte manualmente.`);
    return { success: true };
  } catch (error: any) {
    toast.error(`Erro ao limpar: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ✅ NOVO: Retomar importação de onde parou
export async function resumeImport(job: DictionaryImportJob, fileContent: string) {
  try {
    const volumeNum = job.tipo_dicionario.includes('_I') ? 'I' : 'II';
    const offsetInicial = job.verbetes_processados || 0;

    const { data, error } = await supabase.functions.invoke('process-dialectal-dictionary', {
      body: { 
        fileContent, 
        volumeNum,
        offsetInicial
      }
    });

    if (error) throw error;

    toast.success(`Retomando importação do Volume ${volumeNum} de onde parou (${offsetInicial} verbetes)`);
    return { success: true, jobId: data.jobId };
  } catch (error: any) {
    toast.error(`Erro ao retomar: ${error.message}`);
    return { success: false, error: error.message };
  }
}
