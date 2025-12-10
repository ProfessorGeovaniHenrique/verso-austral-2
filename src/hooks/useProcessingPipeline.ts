/**
 * Hook para gerenciar pipeline de processamento unificada
 * Sprint 3: Pipeline Unificada
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProcessingJob {
  id: string;
  status: 'pendente' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado';
  scope: string;
  scope_filter: string | null;
  total_songs: number;
  songs_processed: number;
  songs_enriched: number;
  songs_annotated: number;
  songs_failed: number;
  avg_quality_score: number;
  quality_distribution: Record<string, number>;
  chunk_size: number;
  chunks_processed: number;
  current_song_index: number;
  is_cancelling: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface PhaseStats {
  enrichment: {
    completed: number;
    successRate: number;
  };
  annotation: {
    completed: number;
    successRate: number;
  };
  quality: {
    avgScore: number;
    distribution: Record<string, number>;
  };
}

interface StartOptions {
  scope?: 'global' | 'corpus' | 'artist';
  scopeFilter?: string;
  skipEnrichment?: boolean;
  skipAnnotation?: boolean;
  forceReprocess?: boolean;
}

export function useProcessingPipeline(autoRefreshInterval = 5000) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Buscar jobs
  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const typedJobs = (data || []) as ProcessingJob[];
      setJobs(typedJobs);

      // Definir job ativo (mais recente processando ou pausado)
      const activeJob = typedJobs.find(j => 
        j.status === 'processando' || j.status === 'pausado'
      );
      setJob(activeJob || null);
    } catch (err) {
      console.error('Erro buscando jobs de processamento:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refs para controle de interval e debounce (estáveis, não causam re-render)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const hasActiveJobRef = useRef(false);
  const fetchJobsRef = useRef(fetchJobs);
  fetchJobsRef.current = fetchJobs;

  // Fetch inicial apenas uma vez
  useEffect(() => {
    fetchJobsRef.current();
  }, []);

  // Verificar mudança de estado de jobs ativos e configurar interval
  // Usando useEffect separado que só depende de primitivos
  useEffect(() => {
    const checkActiveStatus = () => {
      const hasActive = jobs.some(j => 
        j.status === 'processando' || j.status === 'pausado'
      );
      
      if (hasActive !== hasActiveJobRef.current) {
        hasActiveJobRef.current = hasActive;
        
        // Limpar interval anterior
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Criar novo interval se há jobs ativos
        if (hasActive) {
          intervalRef.current = setInterval(() => {
            const now = Date.now();
            if (now - lastFetchRef.current >= 5000) {
              lastFetchRef.current = now;
              fetchJobsRef.current();
            }
          }, autoRefreshInterval);
        }
      }
    };
    
    checkActiveStatus();
  }, [jobs.length, autoRefreshInterval]); // Depende apenas do length, não do array inteiro

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calcular progresso
  const progress = job 
    ? job.total_songs > 0 
      ? Math.round((job.songs_processed / job.total_songs) * 100) 
      : 0
    : 0;

  // Calcular ETA
  const eta = useCallback(() => {
    if (!job || job.status !== 'processando' || !job.started_at) return null;

    const elapsed = Date.now() - new Date(job.started_at).getTime();
    if (job.songs_processed === 0) return null;

    const msPerSong = elapsed / job.songs_processed;
    const remaining = job.total_songs - job.songs_processed;
    const etaMs = remaining * msPerSong;

    const minutes = Math.floor(etaMs / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `~${hours}h ${minutes % 60}min`;
    }
    return `~${minutes}min`;
  }, [job]);

  // Estatísticas por fase
  const phaseStats: PhaseStats = {
    enrichment: {
      completed: job?.songs_enriched || 0,
      successRate: job?.songs_processed 
        ? Math.round((job.songs_enriched / job.songs_processed) * 100) 
        : 0
    },
    annotation: {
      completed: job?.songs_annotated || 0,
      successRate: job?.songs_processed 
        ? Math.round((job.songs_annotated / job.songs_processed) * 100) 
        : 0
    },
    quality: {
      avgScore: job?.avg_quality_score || 0,
      distribution: job?.quality_distribution || { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 }
    }
  };

  // Iniciar processamento
  const startProcessing = async (options: StartOptions = {}) => {
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-catalog-batch', {
        body: {
          scope: options.scope || 'global',
          scopeFilter: options.scopeFilter,
          skipEnrichment: options.skipEnrichment || false,
          skipAnnotation: options.skipAnnotation || false,
          forceReprocess: options.forceReprocess || false
        }
      });

      if (error) throw error;

      toast.success('Pipeline de processamento iniciada');
      fetchJobs();
    } catch (err) {
      console.error('Erro iniciando processamento:', err);
      toast.error('Erro ao iniciar processamento');
    } finally {
      setIsStarting(false);
    }
  };

  // Pausar job
  const pauseProcessing = async () => {
    if (!job) return;

    try {
      const { error } = await supabase
        .from('processing_jobs')
        .update({ status: 'pausado' })
        .eq('id', job.id);

      if (error) throw error;
      toast.info('Processamento pausado');
      fetchJobs();
    } catch (err) {
      console.error('Erro pausando processamento:', err);
      toast.error('Erro ao pausar');
    }
  };

  // Retomar job
  const resumeProcessing = async () => {
    if (!job) return;

    try {
      const { error } = await supabase.functions.invoke('process-catalog-batch', {
        body: { 
          jobId: job.id, 
          continueFrom: job.current_song_index,
          forceLock: true 
        }
      });

      if (error) throw error;
      toast.success('Processamento retomado');
      fetchJobs();
    } catch (err) {
      console.error('Erro retomando processamento:', err);
      toast.error('Erro ao retomar');
    }
  };

  // Cancelar job
  const cancelProcessing = async () => {
    if (!job) return;

    try {
      const { error } = await supabase
        .from('processing_jobs')
        .update({ is_cancelling: true })
        .eq('id', job.id);

      if (error) throw error;
      toast.info('Cancelamento solicitado');
      fetchJobs();
    } catch (err) {
      console.error('Erro cancelando processamento:', err);
      toast.error('Erro ao cancelar');
    }
  };

  return {
    job,
    jobs,
    isLoading,
    isStarting,
    isProcessing: job?.status === 'processando',
    isPaused: job?.status === 'pausado',
    progress,
    eta: eta(),
    phaseStats,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    refetch: fetchJobs
  };
}
