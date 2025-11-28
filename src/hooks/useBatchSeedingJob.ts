import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BatchSeedingJob {
  id: string;
  status: 'pendente' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado';
  source: string;
  total_candidates: number;
  processed_words: number;
  current_offset: number;
  morfologico_count: number;
  heranca_count: number;
  gemini_count: number;
  failed_count: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  last_chunk_at: string | null;
  erro_mensagem: string | null;
  created_at: string;
  updated_at: string;
}

export function useBatchSeedingJob() {
  const [activeJob, setActiveJob] = useState<BatchSeedingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Detectar job ativo ao montar
  useEffect(() => {
    const checkActiveJob = async () => {
      try {
        const { data, error } = await supabase
          .from('batch_seeding_jobs')
          .select('*')
          .in('status', ['processando', 'pausado'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('[useBatchSeedingJob] Error checking active job:', error);
        } else if (data) {
          // Type-safe casting
          const typedJob: BatchSeedingJob = {
            ...data,
            status: data.status as BatchSeedingJob['status']
          };
          setActiveJob(typedJob);
        }
      } catch (error) {
        console.error('[useBatchSeedingJob] Exception checking active job:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkActiveJob();
  }, []);

  // 2. Subscrever a mudanças em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('batch-seeding-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'batch_seeding_jobs'
      }, (payload) => {
        const job = payload.new as any;
        console.log('[useBatchSeedingJob] Realtime update:', job.status, job.processed_words);
        
        // Type-safe casting
        const typedJob: BatchSeedingJob = {
          ...job,
          status: job.status as BatchSeedingJob['status']
        };
        
        setActiveJob(typedJob);
        
        // Notificação quando concluir
        if (job.status === 'concluido') {
          toast.success(`🎉 Batch seeding concluído: ${job.processed_words} palavras classificadas!`, {
            duration: 5000
          });
        } else if (job.status === 'erro') {
          toast.error(`❌ Batch seeding falhou: ${job.erro_mensagem || 'Erro desconhecido'}`, {
            duration: 5000
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Função para iniciar novo job
  const startJob = async (source: string = 'all') => {
    try {
      const { data, error } = await supabase.functions.invoke('batch-seed-semantic-lexicon', {
        body: { mode: 'seed', source, limit: 50, offset: 0 }
      });
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('[useBatchSeedingJob] Error starting job:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  };

  // 4. Calcular progresso
  const progress = activeJob 
    ? Math.min((activeJob.processed_words / 2000) * 100, 100)
    : 0;

  return {
    activeJob,
    isLoading,
    progress,
    startJob,
    isProcessing: activeJob?.status === 'processando'
  };
}
