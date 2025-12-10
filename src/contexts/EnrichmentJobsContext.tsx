/**
 * EnrichmentJobsContext - Provider centralizado para jobs de enriquecimento
 * Elimina múltiplos hooks e timers, centralizando todo o estado
 * 
 * REFATORAÇÃO: Sprint de desmembramento da aba de Enriquecimento
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createLogger } from '@/lib/loggerFactory';
import type { EnrichmentJob, EnrichmentStatus, EnrichmentJobType, EnrichmentScope } from '@/hooks/useEnrichmentJob';

const log = createLogger('EnrichmentJobsContext');

// Tipos para métricas live
export interface EnrichmentLiveMetrics {
  songsUpdatedLastMinute: number;
  songsUpdatedLast5Minutes: number;
  processingRate: number;
  estimatedEtaMinutes: number | null;
  lastProcessedSong: {
    id: string;
    title: string;
    artist: string;
    updatedAt: string;
    hasComposer: boolean;
    hasYear: boolean;
    hasYoutube: boolean;
  } | null;
  recentSongs: Array<{
    id: string;
    title: string;
    artist: string;
    updatedAt: string;
  }>;
  lastUpdateAt: Date | null;
  isAlive: boolean;
}

interface EnrichmentJobsContextValue {
  // Jobs
  jobs: EnrichmentJob[];
  activeJobs: EnrichmentJob[];
  isLoading: boolean;
  
  // Métricas live centralizadas (um único fetch para todos)
  liveMetrics: EnrichmentLiveMetrics;
  formattedEta: string | null;
  
  // Stats agregadas
  stats: {
    total: number;
    processing: number;
    paused: number;
    completed: number;
    failed: number;
  };
  
  // Ações
  refetch: () => Promise<void>;
  pauseJob: (jobId: string) => Promise<void>;
  resumeJob: (job: EnrichmentJob) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  
  // Estado de ação
  actionLoading: string | null;
}

const defaultMetrics: EnrichmentLiveMetrics = {
  songsUpdatedLastMinute: 0,
  songsUpdatedLast5Minutes: 0,
  processingRate: 0,
  estimatedEtaMinutes: null,
  lastProcessedSong: null,
  recentSongs: [],
  lastUpdateAt: null,
  isAlive: false,
};

const EnrichmentJobsContext = createContext<EnrichmentJobsContextValue | null>(null);

// Intervalos
const ACTIVE_REFRESH_INTERVAL = 5000;
const IDLE_REFRESH_INTERVAL = 30000;

export function EnrichmentJobsProvider({ children }: { children: React.ReactNode }) {
  // Estados
  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<EnrichmentLiveMetrics>(defaultMetrics);
  
  // Refs para controle de interval estável
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasActiveJobsRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  
  // Jobs ativos memoizados
  const activeJobs = useMemo(() => 
    jobs.filter(j => ['processando', 'pausado'].includes(j.status)),
    [jobs]
  );
  
  // Stats memoizadas
  const stats = useMemo(() => ({
    total: jobs.length,
    processing: jobs.filter(j => j.status === 'processando').length,
    paused: jobs.filter(j => j.status === 'pausado').length,
    completed: jobs.filter(j => j.status === 'concluido').length,
    failed: jobs.filter(j => j.status === 'erro').length,
  }), [jobs]);
  
  // Fetch jobs (force ignora debounce para ações manuais do usuário)
  const fetchJobs = useCallback(async (force = false) => {
    const now = Date.now();
    // Debounce de 3s (ignorado se force=true)
    if (!force && now - lastFetchRef.current < 3000) return;
    lastFetchRef.current = now;
    
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
  
  // Refetch manual (sempre força atualização)
  const manualRefetch = useCallback(async () => {
    await fetchJobs(true);
  }, [fetchJobs]);
  
  // Fetch métricas live
  const fetchLiveMetrics = useCallback(async (activeJobId?: string) => {
    try {
      const currentTime = new Date();
      const oneMinuteAgo = new Date(currentTime.getTime() - 60 * 1000);
      const fiveMinutesAgo = new Date(currentTime.getTime() - 5 * 60 * 1000);
      
      const { data: recentUpdates, error } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          updated_at,
          composer,
          release_year,
          youtube_url,
          artists!inner(name)
        `)
        .gte('updated_at', fiveMinutesAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) {
        log.error('Error fetching live metrics', error);
        return;
      }
      
      const updates = recentUpdates || [];
      const lastMinuteCount = updates.filter(s => 
        new Date(s.updated_at) >= oneMinuteAgo
      ).length;
      const last5MinutesCount = updates.length;
      const rate = last5MinutesCount > 0 ? last5MinutesCount / 5 : lastMinuteCount;
      
      // ETA se tiver job ativo
      let etaMinutes: number | null = null;
      if (activeJobId) {
        const activeJob = jobs.find(j => j.id === activeJobId);
        if (activeJob && rate > 0) {
          const remaining = activeJob.total_songs - activeJob.songs_processed;
          if (remaining > 0) {
            etaMinutes = Math.ceil(remaining / rate);
          }
        }
      }
      
      const lastSong = updates[0];
      const lastProcessedSong = lastSong ? {
        id: lastSong.id,
        title: lastSong.title,
        artist: (lastSong.artists as any)?.name || 'Desconhecido',
        updatedAt: lastSong.updated_at,
        hasComposer: !!lastSong.composer,
        hasYear: !!lastSong.release_year,
        hasYoutube: !!lastSong.youtube_url,
      } : null;
      
      const recentSongs = updates.slice(0, 5).map(s => ({
        id: s.id,
        title: s.title,
        artist: (s.artists as any)?.name || 'Desconhecido',
        updatedAt: s.updated_at,
      }));
      
      const isAlive = lastSong 
        ? new Date(lastSong.updated_at) >= new Date(currentTime.getTime() - 2 * 60 * 1000)
        : false;
      
      setLiveMetrics({
        songsUpdatedLastMinute: lastMinuteCount,
        songsUpdatedLast5Minutes: last5MinutesCount,
        processingRate: Math.round(rate * 10) / 10,
        estimatedEtaMinutes: etaMinutes,
        lastProcessedSong,
        recentSongs,
        lastUpdateAt: currentTime,
        isAlive,
      });
    } catch (err) {
      log.error('Error in fetchLiveMetrics', err as Error);
    }
  }, [jobs]);
  
  // Formatar ETA
  const formattedEta = useMemo(() => {
    const minutes = liveMetrics.estimatedEtaMinutes;
    if (minutes === null || minutes <= 0) return null;
    
    if (minutes < 60) return `~${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours < 24) return `~${hours}h ${mins}min`;
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `~${days}d ${remainingHours}h`;
  }, [liveMetrics.estimatedEtaMinutes]);
  
  // Controle de polling baseado em jobs ativos
  useEffect(() => {
    const hasActive = activeJobs.length > 0;
    
    if (hasActive !== hasActiveJobsRef.current) {
      hasActiveJobsRef.current = hasActive;
      
      // Limpar intervals anteriores
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      
      // Novo interval baseado no estado
      const newInterval = hasActive ? ACTIVE_REFRESH_INTERVAL : IDLE_REFRESH_INTERVAL;
      
      intervalRef.current = setInterval(() => {
        fetchJobs();
      }, newInterval);
      
      // Métricas live só quando há jobs ativos
      if (hasActive) {
        const processingJob = activeJobs.find(j => j.status === 'processando');
        fetchLiveMetrics(processingJob?.id);
        
        metricsIntervalRef.current = setInterval(() => {
          const processingJob = activeJobs.find(j => j.status === 'processando');
          fetchLiveMetrics(processingJob?.id);
        }, ACTIVE_REFRESH_INTERVAL);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
    };
  }, [activeJobs.length, fetchJobs, fetchLiveMetrics, activeJobs]);
  
  // Fetch inicial
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  
  // Ações
  const pauseJob = useCallback(async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const { error } = await supabase
        .from('enrichment_jobs')
        .update({ status: 'pausado' })
        .eq('id', jobId);
      
      if (error) throw error;
      toast.info('Job pausado');
      await fetchJobs();
    } catch (err) {
      toast.error('Erro ao pausar job');
    } finally {
      setActionLoading(null);
    }
  }, [fetchJobs]);
  
  const resumeJob = useCallback(async (job: EnrichmentJob) => {
    setActionLoading(job.id);
    try {
      const { error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: { jobId: job.id, continueFrom: job.current_song_index }
      });
      
      if (error) throw error;
      toast.success('Job retomado');
      await fetchJobs();
    } catch (err) {
      toast.error('Erro ao retomar job');
    } finally {
      setActionLoading(null);
    }
  }, [fetchJobs]);
  
  const cancelJob = useCallback(async (jobId: string) => {
    setActionLoading(jobId);
    try {
      // Buscar status atual do job
      const { data: job, error: fetchError } = await supabase
        .from('enrichment_jobs')
        .select('status')
        .eq('id', jobId)
        .single();
      
      if (fetchError || !job) {
        throw new Error('Job não encontrado');
      }
      
      // Se job está pausado/pendente/erro, cancelar diretamente
      // Se está processando, apenas marcar is_cancelling (Edge Function irá processar)
      if (['pausado', 'pendente', 'erro'].includes(job.status)) {
        const { error } = await supabase
          .from('enrichment_jobs')
          .update({ 
            status: 'cancelado',
            tempo_fim: new Date().toISOString(),
            is_cancelling: false,
            erro_mensagem: null
          })
          .eq('id', jobId);
        
        if (error) throw error;
        toast.success('Job cancelado');
      } else {
        // Job está processando - marcar flag para Edge Function processar
        const { error } = await supabase
          .from('enrichment_jobs')
          .update({ is_cancelling: true })
          .eq('id', jobId);
        
        if (error) throw error;
        toast.info('Cancelamento solicitado (será processado no próximo chunk)');
      }
      
      await fetchJobs();
    } catch (err) {
      log.error('Erro ao cancelar job', err as Error);
      toast.error('Erro ao cancelar job');
    } finally {
      setActionLoading(null);
    }
  }, [fetchJobs]);
  
  const value: EnrichmentJobsContextValue = {
    jobs,
    activeJobs,
    isLoading,
    liveMetrics,
    formattedEta,
    stats,
    refetch: manualRefetch,
    pauseJob,
    resumeJob,
    cancelJob,
    actionLoading,
  };
  
  return (
    <EnrichmentJobsContext.Provider value={value}>
      {children}
    </EnrichmentJobsContext.Provider>
  );
}

export function useEnrichmentJobsContext() {
  const context = useContext(EnrichmentJobsContext);
  if (!context) {
    throw new Error('useEnrichmentJobsContext must be used within EnrichmentJobsProvider');
  }
  return context;
}
