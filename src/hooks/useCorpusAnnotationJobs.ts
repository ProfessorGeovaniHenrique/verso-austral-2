import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CorpusAnnotationJob {
  id: string;
  corpus_id: string | null;
  corpus_name: string;
  status: string;
  processed_artists: number;
  total_artists: number;
  processed_songs: number;
  total_songs: number;
  processed_words: number;
  total_words_estimated: number;
  current_artist_name: string | null;
  current_artist_job_id: string | null;
  erro_mensagem: string | null;
  tempo_inicio: string | null;
  tempo_fim: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UseCorpusAnnotationJobsResult {
  jobs: CorpusAnnotationJob[];
  activeJobs: CorpusAnnotationJob[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  cancelJob: (jobId: string) => Promise<boolean>;
  isStuck: (job: CorpusAnnotationJob) => boolean;
}

export function useCorpusAnnotationJobs(): UseCorpusAnnotationJobsResult {
  const [jobs, setJobs] = useState<CorpusAnnotationJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('corpus_annotation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('[useCorpusAnnotationJobs] Erro ao buscar jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    const toastId = toast.loading('Cancelando job de corpus...');
    try {
      // Buscar job para pegar current_artist_job_id
      const { data: job } = await supabase
        .from('corpus_annotation_jobs')
        .select('current_artist_job_id')
        .eq('id', jobId)
        .single();

      // Cancelar job de artista atual se existir
      if (job?.current_artist_job_id) {
        await supabase
          .from('annotation_jobs')
          .update({ status: 'cancelado', tempo_fim: new Date().toISOString() })
          .eq('id', job.current_artist_job_id);
      }

      // Cancelar job de corpus
      const { error } = await supabase
        .from('corpus_annotation_jobs')
        .update({ 
          status: 'cancelado', 
          tempo_fim: new Date().toISOString(),
          erro_mensagem: 'Cancelado pelo usuário'
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Job de corpus cancelado!', { id: toastId });
      await fetchJobs();
      return true;
    } catch (err) {
      console.error('[useCorpusAnnotationJobs] Erro ao cancelar:', err);
      toast.error('Falha ao cancelar job', { id: toastId });
      return false;
    }
  }, [fetchJobs]);

  const isStuck = useCallback((job: CorpusAnnotationJob): boolean => {
    if (job.status !== 'processando') return false;
    if ((job.processed_artists || 0) > 0) return false;
    
    const createdAt = job.created_at ? new Date(job.created_at).getTime() : Date.now();
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    
    return createdAt < thirtyMinutesAgo;
  }, []);

  useEffect(() => {
    fetchJobs();
    
    // Polling a cada 10 segundos para jobs ativos
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const activeJobs = jobs.filter(j => 
    ['pendente', 'processando', 'pausado'].includes(j.status)
  );

  return {
    jobs,
    activeJobs,
    isLoading,
    refetch: fetchJobs,
    cancelJob,
    isStuck
  };
}
