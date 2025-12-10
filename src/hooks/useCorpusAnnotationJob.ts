/**
 * Hook para gerenciar jobs de anotação de corpus inteiro
 * Sprint AUDIT-P2: Removido window.confirm, agora usa callback para confirmação
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CorpusAnnotationJob {
  id: string;
  corpus_id: string;
  corpus_name: string;
  status: 'pendente' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado';
  total_artists: number;
  processed_artists: number;
  current_artist_id: string | null;
  current_artist_name: string | null;
  current_artist_job_id: string | null;
  total_songs: number;
  processed_songs: number;
  total_words_estimated: number;
  processed_words: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  created_at: string;
}

interface ArtistJobProgress {
  status: string;
  processed_words: number;
  total_words: number;
  processed_songs: number;
  total_songs: number;
}

interface UseCorpusAnnotationJobResult {
  job: CorpusAnnotationJob | null;
  artistJobProgress: ArtistJobProgress | null;
  isLoading: boolean;
  progress: {
    artistsPercent: number;
    songsPercent: number;
    wordsPercent: number;
  };
  eta: string | null;
  
  startCorpusJob: (corpusId: string) => Promise<string | null>;
  pauseJob: () => Promise<void>;
  resumeJob: () => Promise<void>;
  cancelJob: () => Promise<void>;
  checkActiveJob: (corpusId: string) => Promise<CorpusAnnotationJob | null>;
}

const POLL_INTERVAL = 5000; // 5 segundos

export function useCorpusAnnotationJob(corpusId?: string): UseCorpusAnnotationJobResult {
  const [job, setJob] = useState<CorpusAnnotationJob | null>(null);
  const [artistJobProgress, setArtistJobProgress] = useState<ArtistJobProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Buscar job ativo para o corpus
  const checkActiveJob = useCallback(async (checkCorpusId: string): Promise<CorpusAnnotationJob | null> => {
    const { data, error } = await supabase
      .from('corpus_annotation_jobs')
      .select('*')
      .eq('corpus_id', checkCorpusId)
      .in('status', ['pendente', 'processando', 'pausado'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar job ativo:', error);
      return null;
    }

    return data as CorpusAnnotationJob | null;
  }, []);

  // Buscar progresso do artista atual (usa annotation_jobs, não semantic_annotation_jobs)
  const fetchArtistProgress = useCallback(async (artistJobId: string) => {
    const { data, error } = await supabase
      .from('annotation_jobs')
      .select('status, palavras_processadas, total_palavras')
      .eq('id', artistJobId)
      .single();

    if (!error && data) {
      setArtistJobProgress({
        status: data.status,
        processed_words: data.palavras_processadas || 0,
        total_words: data.total_palavras || 0,
        processed_songs: 0,
        total_songs: 0,
      });
    }
  }, []);

  // Polling do job
  const pollJob = useCallback(async () => {
    if (!job?.id) return;

    const { data, error } = await supabase
      .from('corpus_annotation_jobs')
      .select('*')
      .eq('id', job.id)
      .single();

    if (error) {
      console.error('Erro ao buscar job:', error);
      return;
    }

    const updatedJob = data as CorpusAnnotationJob;
    setJob(updatedJob);

    // Buscar progresso do artista atual
    if (updatedJob.current_artist_job_id) {
      await fetchArtistProgress(updatedJob.current_artist_job_id);
    }

    // Parar polling se job concluído/erro/cancelado
    if (['concluido', 'erro', 'cancelado'].includes(updatedJob.status)) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (updatedJob.status === 'concluido') {
        toast.success('Anotação do corpus concluída!');
      } else if (updatedJob.status === 'erro') {
        toast.error(`Erro na anotação: ${updatedJob.erro_mensagem}`);
      }
    }
  }, [job?.id, fetchArtistProgress]);

  // Iniciar polling
  useEffect(() => {
    if (job && ['processando'].includes(job.status)) {
      pollingRef.current = setInterval(pollJob, POLL_INTERVAL);
      startTimeRef.current = Date.now();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [job?.id, job?.status, pollJob]);

  // Verificar job ativo ao montar
  useEffect(() => {
    if (corpusId) {
      checkActiveJob(corpusId).then(activeJob => {
        if (activeJob) {
          setJob(activeJob);
          if (activeJob.current_artist_job_id) {
            fetchArtistProgress(activeJob.current_artist_job_id);
          }
        }
      });
    }
  }, [corpusId, checkActiveJob, fetchArtistProgress]);

  // Iniciar novo job
  const startCorpusJob = useCallback(async (targetCorpusId: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      // Verificar se já existe job ativo
      const existing = await checkActiveJob(targetCorpusId);
      if (existing) {
        toast.error('Já existe um job ativo para este corpus');
        setJob(existing);
        return existing.id;
      }

      const { data, error } = await supabase.functions.invoke('annotate-corpus', {
        body: { corpusId: targetCorpusId },
      });

      if (error) throw error;

      if (data?.jobId) {
        toast.success(`Anotação iniciada: ${data.totalArtists} artistas`);
        
        // Buscar job criado
        const { data: newJob } = await supabase
          .from('corpus_annotation_jobs')
          .select('*')
          .eq('id', data.jobId)
          .single();

        if (newJob) {
          setJob(newJob as CorpusAnnotationJob);
        }

        return data.jobId;
      }

      return null;
    } catch (error) {
      console.error('Erro ao iniciar job:', error);
      toast.error('Erro ao iniciar anotação do corpus');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkActiveJob]);

  // Pausar job
  const pauseJob = useCallback(async () => {
    if (!job?.id) return;

    try {
      const { error } = await supabase.functions.invoke('annotate-corpus', {
        body: { jobId: job.id, action: 'pause' },
      });

      if (error) throw error;

      setJob(prev => prev ? { ...prev, status: 'pausado' } : null);
      toast.info('Anotação pausada');
    } catch (error) {
      console.error('Erro ao pausar:', error);
      toast.error('Erro ao pausar anotação');
    }
  }, [job?.id]);

  // Retomar job
  const resumeJob = useCallback(async () => {
    if (!job?.id) return;

    try {
      const { error } = await supabase.functions.invoke('annotate-corpus', {
        body: { jobId: job.id, action: 'resume' },
      });

      if (error) throw error;

      setJob(prev => prev ? { ...prev, status: 'processando' } : null);
      toast.success('Anotação retomada');
    } catch (error) {
      console.error('Erro ao retomar:', error);
      toast.error('Erro ao retomar anotação');
    }
  }, [job?.id]);

  // Cancelar job (sem window.confirm - confirmação deve ser feita no componente)
  const cancelJob = useCallback(async (skipConfirmation = false) => {
    if (!job?.id) return;

    // Se skipConfirmation for false, a confirmação deve ser tratada pelo componente
    // que chama esta função usando AlertDialog

    try {
      const { error } = await supabase.functions.invoke('annotate-corpus', {
        body: { jobId: job.id, action: 'cancel' },
      });

      if (error) throw error;

      setJob(prev => prev ? { ...prev, status: 'cancelado' } : null);
      toast.info('Anotação cancelada');
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar anotação');
    }
  }, [job?.id]);

  // Calcular progresso
  const progress = {
    artistsPercent: job && job.total_artists > 0
      ? Math.round((job.processed_artists / job.total_artists) * 100)
      : 0,
    songsPercent: job && job.total_songs > 0
      ? Math.round((job.processed_songs / job.total_songs) * 100)
      : 0,
    wordsPercent: job && job.total_words_estimated > 0
      ? Math.round((job.processed_words / job.total_words_estimated) * 100)
      : 0,
  };

  // Calcular ETA
  let eta: string | null = null;
  if (job && job.status === 'processando' && job.processed_artists > 0 && startTimeRef.current) {
    const elapsed = Date.now() - startTimeRef.current;
    const avgPerArtist = elapsed / job.processed_artists;
    const remaining = job.total_artists - job.processed_artists;
    const etaMs = avgPerArtist * remaining;

    if (etaMs > 0) {
      const hours = Math.floor(etaMs / (1000 * 60 * 60));
      const minutes = Math.floor((etaMs % (1000 * 60 * 60)) / (1000 * 60));
      eta = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }
  }

  return {
    job,
    artistJobProgress,
    isLoading,
    progress,
    eta,
    startCorpusJob,
    pauseJob,
    resumeJob,
    cancelJob,
    checkActiveJob,
  };
}
