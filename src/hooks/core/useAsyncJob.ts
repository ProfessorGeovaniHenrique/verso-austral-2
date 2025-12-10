/**
 * Hook genérico para gerenciar jobs assíncronos persistentes
 * Abstração DRY para useEnrichmentJob, useSemanticAnnotationJob, etc.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createLogger } from '@/lib/loggerFactory';

// ============ TYPES ============

export type JobStatus = 'pendente' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado' | 'iniciado';

export interface BaseJob {
  id: string;
  status: JobStatus;
  created_at: string;
  updated_at?: string;
  tempo_inicio?: string | null;
  tempo_fim?: string | null;
  erro_mensagem?: string | null;
  is_cancelling?: boolean;
}

export interface AsyncJobConfig<T extends BaseJob> {
  tableName: string;
  edgeFunctionName?: string;
  statusField?: keyof T;
  progressField?: keyof T;
  totalField?: keyof T;
  filters?: Record<string, unknown>;
  autoRefresh?: boolean;
  refreshInterval?: number;
  abandonedTimeoutMinutes?: number;
  onJobComplete?: (job: T) => void;
  onJobError?: (job: T) => void;
}

export interface AsyncJobResult<T extends BaseJob> {
  // State
  activeJob: T | null;
  lastCompletedJob: T | null;
  jobs: T[];
  isLoading: boolean;
  isStarting: boolean;
  isResuming: boolean;
  progress: number;
  eta: string | null;
  isAbandoned: boolean;
  
  // Computed flags
  isProcessing: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isCancelling: boolean;
  hasActiveJob: boolean;
  
  // Actions
  fetchActiveJob: () => Promise<void>;
  fetchJobs: (limit?: number) => Promise<void>;
  startJob: (body: Record<string, unknown>) => Promise<string | null>;
  pauseJob: () => Promise<void>;
  resumeJob: (body?: Record<string, unknown>) => Promise<void>;
  cancelJob: () => Promise<void>;
  cleanupAbandoned: () => Promise<number>;
  refetch: () => Promise<void>;
}

// Helper para queries dinâmicas (bypass tipos estritos do Supabase)
async function dynamicQuery(
  table: string,
  operation: 'select' | 'update',
  options: {
    select?: string;
    filters?: Array<{ field: string; op: string; value: unknown }>;
    orderBy?: { field: string; ascending: boolean };
    limit?: number;
    updates?: Record<string, unknown>;
  }
): Promise<{ data: unknown[] | null; error: Error | null }> {
  try {
    // Use any para bypass do tipo
    let query = (supabase as any).from(table);
    
    if (operation === 'select') {
      query = query.select(options.select || '*');
    } else if (operation === 'update' && options.updates) {
      query = query.update(options.updates);
    }
    
    if (options.filters) {
      for (const filter of options.filters) {
        if (filter.op === 'eq') {
          query = query.eq(filter.field, filter.value);
        } else if (filter.op === 'in') {
          query = query.in(filter.field, filter.value as unknown[]);
        } else if (filter.op === 'lt') {
          query = query.lt(filter.field, filter.value);
        }
      }
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy.field, { ascending: options.orderBy.ascending });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const result = await query;
    return { data: result.data, error: result.error };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

// ============ HOOK ============

export function useAsyncJob<T extends BaseJob>(config: AsyncJobConfig<T>): AsyncJobResult<T> {
  const {
    tableName,
    edgeFunctionName,
    statusField = 'status' as keyof T,
    progressField,
    totalField,
    filters = {},
    autoRefresh = true,
    refreshInterval = 30000,
    abandonedTimeoutMinutes = 5,
    onJobComplete,
    onJobError,
  } = config;

  const log = createLogger(`useAsyncJob:${tableName}`);

  const [activeJob, setActiveJob] = useState<T | null>(null);
  const [lastCompletedJob, setLastCompletedJob] = useState<T | null>(null);
  const [jobs, setJobs] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Build filters array
  const buildFilters = useCallback(() => {
    const result: Array<{ field: string; op: string; value: unknown }> = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        result.push({ field: key, op: 'eq', value });
      }
    });
    return result;
  }, [filters]);

  // Fetch active job
  const fetchActiveJob = useCallback(async () => {
    try {
      const filtersList = buildFilters();
      filtersList.push({ 
        field: String(statusField), 
        op: 'in', 
        value: ['pendente', 'processando', 'pausado', 'iniciado'] 
      });

      const { data, error } = await dynamicQuery(tableName, 'select', {
        filters: filtersList,
        orderBy: { field: 'created_at', ascending: false },
        limit: 1,
      });

      if (error) {
        log.error('Error fetching active job', error);
        return;
      }

      const job = data && data.length > 0 ? data[0] as T : null;
      setActiveJob(job);
      
      if (job && !startTimeRef.current) {
        startTimeRef.current = job.tempo_inicio 
          ? new Date(job.tempo_inicio).getTime() 
          : Date.now();
      }
    } finally {
      setIsLoading(false);
    }
  }, [tableName, statusField, buildFilters, log]);

  // Fetch last completed job
  const fetchLastCompleted = useCallback(async () => {
    const filtersList = buildFilters();
    filtersList.push({ field: String(statusField), op: 'eq', value: 'concluido' });

    const { data } = await dynamicQuery(tableName, 'select', {
      filters: filtersList,
      orderBy: { field: 'tempo_fim', ascending: false },
      limit: 1,
    });
    
    setLastCompletedJob(data && data.length > 0 ? data[0] as T : null);
  }, [tableName, statusField, buildFilters]);

  // Fetch all jobs (for monitoring)
  const fetchJobs = useCallback(async (limit = 50) => {
    setIsLoading(true);
    try {
      const filtersList = buildFilters();

      const { data, error } = await dynamicQuery(tableName, 'select', {
        filters: filtersList,
        orderBy: { field: 'created_at', ascending: false },
        limit,
      });

      if (error) {
        log.error('Error fetching jobs', error);
        return;
      }

      setJobs((data || []) as T[]);
    } finally {
      setIsLoading(false);
    }
  }, [tableName, buildFilters, log]);

  // Start new job
  const startJob = useCallback(async (body: Record<string, unknown>): Promise<string | null> => {
    if (!edgeFunctionName) {
      log.error('No edge function configured');
      return null;
    }

    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke(edgeFunctionName, { body });

      if (error) {
        toast.error('Erro ao iniciar job');
        log.error('Error starting job', error);
        return null;
      }

      if (!data.success && !data.jobId) {
        toast.error(data.error || 'Erro ao iniciar job');
        return null;
      }

      toast.success('Job iniciado!');
      startTimeRef.current = Date.now();
      await fetchActiveJob();
      return data.jobId || null;
    } finally {
      setIsStarting(false);
    }
  }, [edgeFunctionName, fetchActiveJob, log]);

  // Pause job
  const pauseJob = useCallback(async () => {
    if (!activeJob) return;

    const { error } = await dynamicQuery(tableName, 'update', {
      updates: { [statusField]: 'pausado' },
      filters: [{ field: 'id', op: 'eq', value: activeJob.id }],
    });

    if (error) {
      toast.error('Erro ao pausar job');
      log.error('Error pausing job', error);
      return;
    }

    toast.info('Job pausado');
    await fetchActiveJob();
  }, [activeJob, tableName, statusField, fetchActiveJob, log]);

  // Resume job
  const resumeJob = useCallback(async (body?: Record<string, unknown>) => {
    if (!activeJob || isResuming) return;

    setIsResuming(true);
    try {
      if (edgeFunctionName) {
        const { error } = await supabase.functions.invoke(edgeFunctionName, {
          body: { jobId: activeJob.id, ...body },
        });

        if (error) {
          log.warn('Error invoking resume', { error: error.message });
        }
      } else {
        await dynamicQuery(tableName, 'update', {
          updates: { 
            [statusField]: 'processando',
            last_chunk_at: new Date().toISOString(),
          },
          filters: [{ field: 'id', op: 'eq', value: activeJob.id }],
        });
      }

      toast.success('Job retomado!');
      await fetchActiveJob();
    } finally {
      setIsResuming(false);
    }
  }, [activeJob, isResuming, edgeFunctionName, tableName, statusField, fetchActiveJob, log]);

  // Cancel job
  const cancelJob = useCallback(async () => {
    if (!activeJob) return;

    const { error } = await dynamicQuery(tableName, 'update', {
      updates: { 
        is_cancelling: true,
        [statusField]: 'cancelado',
        tempo_fim: new Date().toISOString(),
      },
      filters: [{ field: 'id', op: 'eq', value: activeJob.id }],
    });

    if (error) {
      toast.error('Erro ao cancelar job');
      log.error('Error cancelling job', error);
      return;
    }

    toast.info('Job cancelado');
    setActiveJob(null);
  }, [activeJob, tableName, statusField, log]);

  // Cleanup abandoned jobs
  const cleanupAbandoned = useCallback(async (): Promise<number> => {
    const threshold = new Date(Date.now() - abandonedTimeoutMinutes * 60 * 1000).toISOString();
    
    const { data, error } = await dynamicQuery(tableName, 'update', {
      updates: { 
        [statusField]: 'erro',
        erro_mensagem: 'Marcado como abandonado',
        tempo_fim: new Date().toISOString(),
      },
      filters: [
        { field: String(statusField), op: 'eq', value: 'processando' },
        { field: 'tempo_inicio', op: 'lt', value: threshold },
      ],
    });

    if (error) {
      toast.error('Erro ao limpar jobs abandonados');
      return 0;
    }

    const count = Array.isArray(data) ? data.length : 0;
    if (count > 0) {
      toast.success(`${count} job(s) abandonado(s) limpo(s)`);
    }
    
    await fetchActiveJob();
    return count;
  }, [tableName, statusField, abandonedTimeoutMinutes, fetchActiveJob]);

  // Calculate progress
  const progress = (() => {
    if (!activeJob || !progressField || !totalField) return 0;
    const processed = Number(activeJob[progressField]) || 0;
    const total = Number(activeJob[totalField]) || 0;
    return total > 0 ? Math.round((processed / total) * 100) : 0;
  })();

  // Calculate ETA
  const eta = (() => {
    if (!activeJob || !progressField || !totalField || !startTimeRef.current) return null;
    
    const processed = Number(activeJob[progressField]) || 0;
    const total = Number(activeJob[totalField]) || 0;
    
    if (processed === 0 || total === 0) return null;
    
    const elapsed = Date.now() - startTimeRef.current;
    const rate = processed / (elapsed / 1000);
    const remaining = total - processed;
    const etaSeconds = remaining / rate;

    if (etaSeconds < 60) return `~${Math.round(etaSeconds)}s`;
    if (etaSeconds < 3600) return `~${Math.round(etaSeconds / 60)}min`;
    
    const hours = Math.floor(etaSeconds / 3600);
    const mins = Math.round((etaSeconds % 3600) / 60);
    return `~${hours}h ${mins}min`;
  })();

  // Check if abandoned
  const isAbandoned = (() => {
    if (!activeJob || activeJob.status !== 'processando') return false;
    const lastUpdate = (activeJob as Record<string, unknown>).last_chunk_at as string || activeJob.updated_at;
    if (!lastUpdate) return false;
    return Date.now() - new Date(lastUpdate).getTime() > abandonedTimeoutMinutes * 60 * 1000;
  })();

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchActiveJob();
    fetchLastCompleted();

    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const job = payload.new as T;
            
            // Check if matches filters
            const matchesFilters = Object.entries(filters).every(
              ([key, value]) => !value || (job as Record<string, unknown>)[key] === value
            );

            if (matchesFilters) {
              const status = job[statusField] as string;
              
              if (['pendente', 'processando', 'pausado', 'iniciado'].includes(status)) {
                setActiveJob(job);
              } else if (status === 'concluido') {
                setActiveJob(null);
                setLastCompletedJob(job);
                onJobComplete?.(job);
              } else if (['cancelado', 'erro'].includes(status)) {
                setActiveJob(null);
                if (status === 'erro') onJobError?.(job);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, statusField, filters, fetchActiveJob, fetchLastCompleted, onJobComplete, onJobError]);

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
    // State
    activeJob,
    lastCompletedJob,
    jobs,
    isLoading,
    isStarting,
    isResuming,
    progress,
    eta,
    isAbandoned,
    
    // Computed flags
    isProcessing: activeJob?.status === 'processando' && !isAbandoned,
    isPaused: activeJob?.status === 'pausado',
    isCompleted: activeJob?.status === 'concluido',
    isCancelling: activeJob?.is_cancelling || false,
    hasActiveJob: !!activeJob,
    
    // Actions
    fetchActiveJob,
    fetchJobs,
    startJob,
    pauseJob,
    resumeJob,
    cancelJob,
    cleanupAbandoned,
    refetch: fetchActiveJob,
  };
}
