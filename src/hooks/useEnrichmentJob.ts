/**
 * Hook para gerenciar jobs de enriquecimento persistentes
 * Similar a useCorpusScrapingJob
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EnrichmentJobType = 'metadata' | 'youtube' | 'lyrics' | 'full';
export type EnrichmentScope = 'all' | 'artist' | 'corpus' | 'selection' | 'letter';
export type EnrichmentStatus = 'pendente' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado';

export interface EnrichmentJob {
  id: string;
  job_type: EnrichmentJobType;
  scope: EnrichmentScope;
  artist_id: string | null;
  artist_name: string | null;
  corpus_id: string | null;
  corpus_type: string | null;
  song_ids: string[];
  status: EnrichmentStatus;
  is_cancelling: boolean;
  total_songs: number;
  songs_processed: number;
  songs_succeeded: number;
  songs_failed: number;
  current_song_index: number;
  chunk_size: number;
  chunks_processed: number;
  last_chunk_at: string | null;
  force_reenrich: boolean;
  created_at: string;
  updated_at: string;
  tempo_inicio: string | null;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  metadata: Record<string, unknown>;
}

export interface UseEnrichmentJobOptions {
  artistId?: string;
  corpusId?: string;
  jobType?: EnrichmentJobType;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ABANDONED_TIMEOUT_MINUTES = 5;

export function useEnrichmentJob(options: UseEnrichmentJobOptions = {}) {
  const { artistId, corpusId, jobType, autoRefresh = true, refreshInterval = 30000 } = options;

  const [activeJob, setActiveJob] = useState<EnrichmentJob | null>(null);
  const [lastCompletedJob, setLastCompletedJob] = useState<EnrichmentJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Buscar job ativo
  const fetchActiveJob = useCallback(async () => {
    try {
      let query = supabase
        .from('enrichment_jobs')
        .select('*')
        .in('status', ['pendente', 'processando', 'pausado'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (artistId) {
        query = query.eq('artist_id', artistId);
      }
      if (corpusId) {
        query = query.eq('corpus_id', corpusId);
      }
      if (jobType) {
        query = query.eq('job_type', jobType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useEnrichmentJob] Erro buscando job:', error);
        return;
      }

      setActiveJob(data && data.length > 0 ? data[0] as EnrichmentJob : null);
    } finally {
      setIsLoading(false);
    }
  }, [artistId, corpusId, jobType]);

  // Buscar último job concluído
  const fetchLastCompletedJob = useCallback(async () => {
    let query = supabase
      .from('enrichment_jobs')
      .select('*')
      .eq('status', 'concluido')
      .order('tempo_fim', { ascending: false })
      .limit(1);

    if (artistId) {
      query = query.eq('artist_id', artistId);
    }
    if (corpusId) {
      query = query.eq('corpus_id', corpusId);
    }
    if (jobType) {
      query = query.eq('job_type', jobType);
    }

    const { data } = await query;
    setLastCompletedJob(data && data.length > 0 ? data[0] as EnrichmentJob : null);
  }, [artistId, corpusId, jobType]);

  // Iniciar novo job
  const startJob = useCallback(async (params: {
    jobType: EnrichmentJobType;
    scope?: EnrichmentScope;
    artistId?: string;
    artistName?: string;
    corpusId?: string;
    corpusType?: string;
    songIds?: string[];
    forceReenrich?: boolean;
  }) => {
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: {
          jobType: params.jobType,
          scope: params.scope || 'all',
          artistId: params.artistId,
          artistName: params.artistName,
          corpusId: params.corpusId,
          corpusType: params.corpusType,
          songIds: params.songIds,
          forceReenrich: params.forceReenrich || false,
        }
      });

      if (error) {
        toast.error('Erro ao iniciar job de enriquecimento');
        console.error('[useEnrichmentJob] Erro iniciando job:', error);
        return null;
      }

      if (!data.success) {
        if (data.existingJobId) {
          toast.warning('Já existe um job ativo para este escopo');
        } else {
          toast.error(data.error || 'Erro ao iniciar job');
        }
        return null;
      }

      toast.success('Job de enriquecimento iniciado!');
      await fetchActiveJob();
      return data.jobId;
    } finally {
      setIsStarting(false);
    }
  }, [fetchActiveJob]);

  // Pausar job
  const pauseJob = useCallback(async () => {
    if (!activeJob) return;

    const { error } = await supabase
      .from('enrichment_jobs')
      .update({ status: 'pausado' })
      .eq('id', activeJob.id);

    if (error) {
      toast.error('Erro ao pausar job');
      console.error('[useEnrichmentJob] Erro pausando:', error);
      return;
    }

    toast.info('Job pausado');
    await fetchActiveJob();
  }, [activeJob, fetchActiveJob]);

  // Cancelar job
  const cancelJob = useCallback(async () => {
    if (!activeJob) return;

    const { error } = await supabase
      .from('enrichment_jobs')
      .update({ is_cancelling: true })
      .eq('id', activeJob.id);

    if (error) {
      toast.error('Erro ao solicitar cancelamento');
      console.error('[useEnrichmentJob] Erro cancelando:', error);
      return;
    }

    toast.info('Cancelamento solicitado...');
    await fetchActiveJob();
  }, [activeJob, fetchActiveJob]);

  // Retomar job pausado
  const resumeJob = useCallback(async () => {
    if (!activeJob || activeJob.status !== 'pausado' || isResuming) return;

    setIsResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: {
          jobId: activeJob.id,
          continueFrom: activeJob.current_song_index,
        }
      });

      if (error) {
        toast.error('Erro ao retomar job');
        console.error('[useEnrichmentJob] Erro retomando:', error);
        return;
      }

      toast.success('Job retomado!');
      await fetchActiveJob();
    } finally {
      setIsResuming(false);
    }
  }, [activeJob, isResuming, fetchActiveJob]);

  // Reiniciar job (cancelar atual e iniciar novo)
  const restartJob = useCallback(async (params: Parameters<typeof startJob>[0]) => {
    if (activeJob) {
      await supabase
        .from('enrichment_jobs')
        .update({ 
          status: 'cancelado',
          is_cancelling: false,
          tempo_fim: new Date().toISOString()
        })
        .eq('id', activeJob.id);
    }

    return startJob(params);
  }, [activeJob, startJob]);

  // Calcular progresso
  const progress = activeJob && activeJob.total_songs > 0
    ? Math.round((activeJob.songs_processed / activeJob.total_songs) * 100)
    : 0;

  // Verificar se job está abandonado
  const isAbandoned = activeJob && activeJob.status === 'processando' && activeJob.last_chunk_at
    ? new Date().getTime() - new Date(activeJob.last_chunk_at).getTime() > ABANDONED_TIMEOUT_MINUTES * 60 * 1000
    : false;

  // Setup inicial e realtime
  useEffect(() => {
    fetchActiveJob();
    fetchLastCompletedJob();

    // Subscription realtime
    const channel = supabase
      .channel('enrichment-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrichment_jobs',
        },
        (payload) => {
          console.log('[useEnrichmentJob] Realtime update:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const job = payload.new as EnrichmentJob;
            
            // Verificar se é relevante para os filtros atuais
            const matchesFilters = 
              (!artistId || job.artist_id === artistId) &&
              (!corpusId || job.corpus_id === corpusId) &&
              (!jobType || job.job_type === jobType);

            if (matchesFilters) {
              if (['pendente', 'processando', 'pausado'].includes(job.status)) {
                setActiveJob(job);
              } else if (job.status === 'concluido') {
                setActiveJob(null);
                setLastCompletedJob(job);
              } else if (['cancelado', 'erro'].includes(job.status)) {
                setActiveJob(null);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [artistId, corpusId, jobType, fetchActiveJob, fetchLastCompletedJob]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && activeJob && ['processando', 'pausado'].includes(activeJob.status)) {
      refreshIntervalRef.current = setInterval(fetchActiveJob, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, activeJob, refreshInterval, fetchActiveJob]);

  return {
    // Estado
    activeJob,
    lastCompletedJob,
    isLoading,
    isStarting,
    isResuming,
    progress,
    isAbandoned,

    // Flags derivadas
    isProcessing: activeJob?.status === 'processando' && !isAbandoned,
    isPaused: activeJob?.status === 'pausado',
    isCompleted: activeJob?.status === 'concluido',
    isCancelling: activeJob?.is_cancelling || false,
    hasActiveJob: !!activeJob,

    // Ações
    startJob,
    pauseJob,
    cancelJob,
    resumeJob,
    restartJob,
    refetch: fetchActiveJob,
  };
}

// Hook para listar todos os jobs (monitoramento)
export function useEnrichmentJobsList() {
  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrichment_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useEnrichmentJobsList] Erro:', error);
        return;
      }

      setJobs((data || []) as EnrichmentJob[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();

    const channel = supabase
      .channel('all-enrichment-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrichment_jobs' },
        () => fetchJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs]);

  return { jobs, isLoading, refetch: fetchJobs };
}
