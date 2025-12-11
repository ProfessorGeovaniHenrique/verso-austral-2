/**
 * Hook para gerenciar jobs de enriquecimento persistentes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useEnrichmentJob');

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
  autoResumeEnabled?: boolean; // SPRINT ENRICHMENT-AUTO-RESUME: habilitar auto-retomada
}

// SPRINT ENRICH-REWRITE: Reduzido de 5 para 3 minutos
const ABANDONED_TIMEOUT_MINUTES = 3;
// SPRINT ENRICH-RECOVERY-FIX: Detecção de jobs travados (sem progresso mas "processando")
const STUCK_DETECTION_MINUTES = 10;
// SPRINT ENRICHMENT-AUTO-RESUME: Configurações de auto-retomada
const AUTO_RESUME_DELAY_MS = 15000; // 15 segundos antes de tentar auto-retomar
const MAX_AUTO_RESUME_RETRIES = 3;

export function useEnrichmentJob(options: UseEnrichmentJobOptions = {}) {
  const { 
    artistId, 
    corpusId, 
    jobType, 
    autoRefresh = true, 
    refreshInterval = 15000,
    autoResumeEnabled = true // Habilitado por padrão
  } = options;

  const [activeJob, setActiveJob] = useState<EnrichmentJob | null>(null);
  const [lastCompletedJob, setLastCompletedJob] = useState<EnrichmentJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  
  // SPRINT ENRICHMENT-AUTO-RESUME: Estado de auto-retomada
  const [autoResumeCount, setAutoResumeCount] = useState(0);
  const [isAutoResuming, setIsAutoResuming] = useState(false);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        log.error('Error fetching job', error);
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
        log.error('Error starting job', error);
        return null;
      }

      if (!data.success) {
        if (data.existingJobId) {
          // Oferecer opção de forçar reinício
          toast.warning('Já existe um job ativo para este escopo', {
            description: 'Deseja cancelar o existente e iniciar novo?',
            action: {
              label: 'Forçar Reinício',
              onClick: () => forceRestartJob(params)
            },
            duration: 10000
          });
        } else if (data.hint === 'Use forceLock: true para forçar reinício') {
          toast.warning('Outro chunk está em execução', {
            description: 'O job pode estar travado. Forçar reinício?',
            action: {
              label: 'Forçar',
              onClick: () => resumeJobWithForce()
            },
            duration: 10000
          });
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

  // Forçar reinício do job (cancelar atual e iniciar novo)
  const forceRestartJob = useCallback(async (params: Parameters<typeof startJob>[0]) => {
    if (activeJob) {
      await supabase
        .from('enrichment_jobs')
        .update({ 
          status: 'cancelado',
          is_cancelling: false,
          tempo_fim: new Date().toISOString(),
          erro_mensagem: 'Cancelado para reinício forçado'
        })
        .eq('id', activeJob.id);
      
      setActiveJob(null);
    }

    // Pequeno delay para garantir que o job foi cancelado
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return startJob(params);
  }, [activeJob, startJob]);

  // Retomar job com force lock
  const resumeJobWithForce = useCallback(async () => {
    if (!activeJob || isResuming) return;

    setIsResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: {
          jobId: activeJob.id,
          continueFrom: activeJob.current_song_index,
          forceLock: true // Força aquisição de lock
        }
      });

      if (error) {
        toast.error('Erro ao forçar retomada do job');
        log.error('Error forcing resume', error);
        return;
      }

      toast.success('Job retomado com força!');
      await fetchActiveJob();
    } finally {
      setIsResuming(false);
    }
  }, [activeJob, isResuming, fetchActiveJob]);

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
    if (!activeJob || isResuming) return;
    
    // Se job está travado (processando mas sem atualização), usar force
    const isStuck = activeJob.status === 'processando' && activeJob.last_chunk_at
      ? new Date().getTime() - new Date(activeJob.last_chunk_at).getTime() > ABANDONED_TIMEOUT_MINUTES * 60 * 1000
      : false;

    if (isStuck) {
      return resumeJobWithForce();
    }

    if (activeJob.status !== 'pausado') return;

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
  }, [activeJob, isResuming, fetchActiveJob, resumeJobWithForce]);

  // Reiniciar job (cancelar atual e iniciar novo)
  const restartJob = useCallback(async (params: Parameters<typeof startJob>[0]) => {
    return forceRestartJob(params);
  }, [forceRestartJob]);

  // SPRINT ENRICH-REWRITE: Limpar jobs órfãos baseado em last_chunk_at (não songs_processed)
  const cleanupAbandonedJobs = useCallback(async () => {
    const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MINUTES * 60 * 1000).toISOString();
    
    // Buscar jobs que estão "processando" mas sem heartbeat recente
    const { data, error } = await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'pausado', // Pausado para permitir retomada, não erro
        erro_mensagem: 'Job pausado automaticamente (sem heartbeat). Clique "Retomar" para continuar.',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'processando')
      .lt('last_chunk_at', abandonedThreshold) // Baseado em heartbeat, não songs_processed
      .select();

    if (error) {
      toast.error('Erro ao limpar jobs abandonados');
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      toast.success(`${count} job(s) abandonado(s) pausado(s)`);
    }
    
    await fetchActiveJob();
    return count;
  }, [fetchActiveJob]);

  // Calcular progresso
  const progress = activeJob && activeJob.total_songs > 0
    ? Math.round((activeJob.songs_processed / activeJob.total_songs) * 100)
    : 0;

  // SPRINT ENRICH-REWRITE: Verificar se job está abandonado baseado em heartbeat
  const isAbandoned = activeJob && activeJob.status === 'processando' && activeJob.last_chunk_at
    ? new Date().getTime() - new Date(activeJob.last_chunk_at).getTime() > ABANDONED_TIMEOUT_MINUTES * 60 * 1000
    : false;

  // SPRINT ENRICH-RECOVERY-FIX: Verificar se job está travado (processando sem progresso por muito tempo)
  const isStuck = activeJob && activeJob.status === 'processando' && activeJob.last_chunk_at
    ? new Date().getTime() - new Date(activeJob.last_chunk_at).getTime() > STUCK_DETECTION_MINUTES * 60 * 1000
    : false;

  // Calcular minutos desde última atividade
  const minutesSinceLastActivity = activeJob?.last_chunk_at 
    ? Math.round((Date.now() - new Date(activeJob.last_chunk_at).getTime()) / 60000)
    : null;

  // Verificar se job precisa de atenção (pausado, abandonado ou stuck)
  const needsAttention = isAbandoned || isStuck || activeJob?.status === 'pausado';

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
          log.debug('Realtime update', { eventType: payload.eventType });
          
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

  // SPRINT ENRICHMENT-AUTO-RESUME: Auto-retomada de jobs pausados e stuck
  useEffect(() => {
    // Limpar timeout anterior
    if (autoResumeTimeoutRef.current) {
      clearTimeout(autoResumeTimeoutRef.current);
      autoResumeTimeoutRef.current = null;
    }

    // Não tentar auto-retomar se:
    // - Auto-resume desabilitado
    // - Não há job ativo
    // - Já está retomando
    // - Atingiu limite de tentativas
    // - Erro é de circuit breaker (requer intervenção manual)
    if (
      !autoResumeEnabled ||
      !activeJob ||
      isResuming ||
      isAutoResuming ||
      autoResumeCount >= MAX_AUTO_RESUME_RETRIES ||
      activeJob.erro_mensagem?.toLowerCase().includes('circuit breaker')
    ) {
      return;
    }

    // Condições para auto-resume:
    // 1. Job está pausado
    // 2. Job está stuck (processando mas sem atividade por STUCK_DETECTION_MINUTES)
    const shouldAutoResume = activeJob.status === 'pausado' || isStuck;
    
    if (!shouldAutoResume) {
      return;
    }

    const resumeReason = isStuck ? 'stuck' : 'pausado';
    log.info(`Auto-resume scheduled (${resumeReason}, attempt ${autoResumeCount + 1}/${MAX_AUTO_RESUME_RETRIES})`);

    autoResumeTimeoutRef.current = setTimeout(async () => {
      setIsAutoResuming(true);
      
      try {
        const useForce = isStuck; // Usar force lock para jobs stuck
        log.info(`Auto-resuming job ${activeJob.id} (force=${useForce})...`);
        toast.info(`Retomando job automaticamente${useForce ? ' (forçado)' : ''}...`, { duration: 3000 });
        
        const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
          body: {
            jobId: activeJob.id,
            continueFrom: activeJob.current_song_index,
            forceLock: useForce,
          }
        });

        if (error || !data?.success) {
          setAutoResumeCount(prev => prev + 1);
          log.warn(`Auto-resume failed (attempt ${autoResumeCount + 1})`, error || data?.error);
          
          if (autoResumeCount + 1 >= MAX_AUTO_RESUME_RETRIES) {
            toast.warning('Não foi possível retomar automaticamente. Clique em "Retomar" manualmente.', {
              duration: 10000
            });
          }
        } else {
          setAutoResumeCount(0); // Reset on success
          toast.success('Job retomado automaticamente!');
        }
        
        await fetchActiveJob();
      } catch (err) {
        setAutoResumeCount(prev => prev + 1);
        log.error('Auto-resume exception', err);
      } finally {
        setIsAutoResuming(false);
      }
    }, AUTO_RESUME_DELAY_MS);

    return () => {
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
        autoResumeTimeoutRef.current = null;
      }
    };
  }, [activeJob, autoResumeEnabled, isResuming, isAutoResuming, autoResumeCount, fetchActiveJob]);

  // Reset auto-resume count when job changes or completes
  useEffect(() => {
    if (!activeJob || activeJob.status === 'processando') {
      setAutoResumeCount(0);
    }
  }, [activeJob?.id, activeJob?.status]);

  return {
    // Estado
    activeJob,
    lastCompletedJob,
    isLoading,
    isStarting,
    isResuming,
    progress,
    isAbandoned,
    // SPRINT ENRICH-RECOVERY-FIX: Novos estados de detecção
    isStuck,
    minutesSinceLastActivity,
    needsAttention,

    // Flags derivadas
    isProcessing: activeJob?.status === 'processando' && !isAbandoned && !isStuck,
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
    forceRestartJob,
    resumeJobWithForce,
    cleanupAbandonedJobs,
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
        log.error('Error fetching jobs list', error);
        return;
      }

      setJobs((data || []) as EnrichmentJob[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refs para debounce do realtime - estáveis para evitar re-renders
  const lastRealtimeFetchRef = useRef<number>(0);
  const pendingFetchRef = useRef<NodeJS.Timeout | null>(null);
  const isThrottledRef = useRef(false);
  const fetchJobsRef = useRef(fetchJobs);
  fetchJobsRef.current = fetchJobs;

  // Fetch com throttle de 5 segundos para realtime
  const throttledRealtimeFetch = useCallback(() => {
    // Se já está throttled, ignorar
    if (isThrottledRef.current) return;
    
    // Cancelar fetch pendente
    if (pendingFetchRef.current) {
      clearTimeout(pendingFetchRef.current);
      pendingFetchRef.current = null;
    }
    
    const now = Date.now();
    const timeSinceLastFetch = now - lastRealtimeFetchRef.current;
    
    // Throttle de 5 segundos
    if (timeSinceLastFetch < 5000) {
      isThrottledRef.current = true;
      pendingFetchRef.current = setTimeout(() => {
        isThrottledRef.current = false;
        lastRealtimeFetchRef.current = Date.now();
        fetchJobsRef.current();
      }, 5000 - timeSinceLastFetch);
      return;
    }
    
    lastRealtimeFetchRef.current = now;
    fetchJobsRef.current();
  }, []); // Sem dependências - usa refs

  useEffect(() => {
    fetchJobsRef.current();

    const channel = supabase
      .channel('all-enrichment-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrichment_jobs' },
        throttledRealtimeFetch
      )
      .subscribe();

    return () => {
      if (pendingFetchRef.current) {
        clearTimeout(pendingFetchRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [throttledRealtimeFetch]);

  return { jobs, isLoading, refetch: fetchJobs };
}

// Hook para buscar jobs órfãos/abandonados
export function useOrphanedEnrichmentJobs() {
  const [orphanedJobs, setOrphanedJobs] = useState<EnrichmentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ABANDONED_TIMEOUT_MS = 5 * 60 * 1000;

  const fetchOrphanedJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MS).toISOString();
      
      const { data, error } = await supabase
        .from('enrichment_jobs')
        .select('*')
        .eq('status', 'processando')
        .eq('songs_processed', 0)
        .lt('tempo_inicio', abandonedThreshold)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useOrphanedEnrichmentJobs] Erro:', error);
        return;
      }

      setOrphanedJobs((data || []) as EnrichmentJob[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cleanupOrphanedJobs = useCallback(async () => {
    const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MS).toISOString();
    
    const { error } = await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'erro',
        erro_mensagem: 'Marcado como abandonado pelo sistema',
        tempo_fim: new Date().toISOString()
      })
      .eq('status', 'processando')
      .eq('songs_processed', 0)
      .lt('tempo_inicio', abandonedThreshold);

    if (error) {
      toast.error('Erro ao limpar jobs órfãos');
      return;
    }

    toast.success('Jobs órfãos limpos com sucesso');
    await fetchOrphanedJobs();
  }, [fetchOrphanedJobs]);

  useEffect(() => {
    fetchOrphanedJobs();
  }, [fetchOrphanedJobs]);

  return { orphanedJobs, isLoading, cleanupOrphanedJobs, refetch: fetchOrphanedJobs };
}