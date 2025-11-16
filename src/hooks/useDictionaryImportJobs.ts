import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['dictionary-import-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dictionary_import_jobs')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as DictionaryImportJob[];
    },
    refetchInterval: (query) => {
      // Continuar polling se há jobs em andamento
      const hasActiveJobs = query.state.data?.some(
        job => job.status === 'iniciado' || job.status === 'processando'
      );
      return hasActiveJobs ? refetchInterval : false;
    }
  });
}
