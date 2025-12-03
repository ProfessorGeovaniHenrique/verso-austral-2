/**
 * Hook genérico para gerenciar jobs de scraping de corpus
 * Suporta múltiplos corpus types: gaucho, sertanejo, nordestino
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CorpusType = 'gaucho' | 'sertanejo' | 'nordestino';

export interface ScrapingJob {
  id: string;
  status: 'iniciado' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado';
  corpus_type: string;
  total_artists: number;
  songs_per_artist: number;
  current_artist_index: number;
  artists_processed: number;
  artists_skipped: number;
  songs_created: number;
  songs_with_lyrics: number;
  chunks_processed: number;
  is_cancelling: boolean;
  erro_mensagem: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  last_chunk_at: string | null;
  config?: Record<string, any>;
}

interface UseCorpusScrapingJobOptions {
  autoRefreshInterval?: number;
}

export function useCorpusScrapingJob(
  corpusType: CorpusType,
  options: UseCorpusScrapingJobOptions = {}
) {
  const { autoRefreshInterval = 10000 } = options;
  
  const [activeJob, setActiveJob] = useState<ScrapingJob | null>(null);
  const [lastCompletedJob, setLastCompletedJob] = useState<ScrapingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Edge function name based on corpus type
  const getFunctionName = useCallback(() => {
    switch (corpusType) {
      case 'gaucho': return 'scrape-gaucho-artists';
      case 'sertanejo': return 'scrape-sertanejo-artists';
      case 'nordestino': return 'enrich-missing-lyrics'; // Nordestino usa enrichment
      default: return 'scrape-sertanejo-artists';
    }
  }, [corpusType]);

  // Buscar job ativo
  const fetchActiveJob = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('corpus_type', corpusType)
        .in('status', ['iniciado', 'processando', 'pausado'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setActiveJob(data as ScrapingJob | null);
      
      // Buscar último job completo se não há job ativo
      if (!data) {
        const { data: completed } = await supabase
          .from('scraping_jobs')
          .select('*')
          .eq('corpus_type', corpusType)
          .eq('status', 'concluido')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        setLastCompletedJob(completed as ScrapingJob | null);
      }
    } catch (error) {
      console.error(`[useCorpusScrapingJob] Error fetching job for ${corpusType}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [corpusType]);

  // Setup inicial e realtime
  useEffect(() => {
    fetchActiveJob();

    // Subscrição Realtime
    const channel = supabase
      .channel(`scraping_jobs_${corpusType}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'scraping_jobs',
        filter: `corpus_type=eq.${corpusType}`
      }, (payload) => {
        console.log(`[useCorpusScrapingJob] ${corpusType} realtime:`, payload.eventType);
        if (payload.new) {
          const newJob = payload.new as ScrapingJob;
          setActiveJob(prev => {
            if (!prev || prev.id === newJob.id) {
              // Se job completou, mover para lastCompletedJob
              if (newJob.status === 'concluido') {
                setLastCompletedJob(newJob);
                return null;
              }
              return newJob;
            }
            return prev;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [corpusType, fetchActiveJob]);

  // Iniciar novo job
  const startJob = useCallback(async (artistLimit: number, songsPerArtist: number) => {
    setIsStarting(true);
    try {
      const functionName = getFunctionName();
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { artistLimit, songsPerArtist }
      });

      if (error) throw error;

      toast.success(`Scraping do corpus ${corpusType} iniciado!`, {
        description: 'O processo continua automaticamente em segundo plano.',
        duration: 6000
      });
      
      await fetchActiveJob();
      return data.jobId;
    } catch (error: any) {
      console.error(`[useCorpusScrapingJob] Start error:`, error);
      toast.error(`Erro ao iniciar scraping: ${error.message}`);
      throw error;
    } finally {
      setIsStarting(false);
    }
  }, [corpusType, getFunctionName, fetchActiveJob]);

  // Pausar job
  const pauseJob = useCallback(async () => {
    if (!activeJob) return;
    
    const { error } = await supabase
      .from('scraping_jobs')
      .update({ status: 'pausado' })
      .eq('id', activeJob.id);
    
    if (error) {
      toast.error('Erro ao pausar');
      return;
    }
    
    toast.info('Job pausado');
    setActiveJob(prev => prev ? { ...prev, status: 'pausado' } : null);
  }, [activeJob]);

  // Cancelar job
  const cancelJob = useCallback(async () => {
    if (!activeJob) return;
    
    const { error } = await supabase
      .from('scraping_jobs')
      .update({ is_cancelling: true })
      .eq('id', activeJob.id);
    
    if (error) {
      toast.error('Erro ao cancelar');
      return;
    }
    
    toast.info('Cancelamento solicitado...');
    setActiveJob(prev => prev ? { ...prev, is_cancelling: true } : null);
  }, [activeJob]);

  // Retomar job
  const resumeJob = useCallback(async () => {
    if (!activeJob || isResuming) return;
    
    setIsResuming(true);
    try {
      const functionName = getFunctionName();
      
      await supabase.functions.invoke(functionName, {
        body: { 
          jobId: activeJob.id, 
          continueFrom: { artistIndex: activeJob.current_artist_index }
        }
      });

      toast.success('Job retomado!');
      await fetchActiveJob();
    } catch (error: any) {
      toast.error(`Erro ao retomar: ${error.message}`);
    } finally {
      setIsResuming(false);
    }
  }, [activeJob, isResuming, getFunctionName, fetchActiveJob]);

  // Reiniciar do zero
  const restartJob = useCallback(async (artistLimit: number, songsPerArtist: number) => {
    // Cancelar job atual se existir
    if (activeJob) {
      await supabase
        .from('scraping_jobs')
        .update({ status: 'cancelado', completed_at: new Date().toISOString() })
        .eq('id', activeJob.id);
    }
    
    // Iniciar novo
    await startJob(artistLimit, songsPerArtist);
  }, [activeJob, startJob]);

  // Calcular progresso
  const progress = activeJob && activeJob.total_artists > 0
    ? Math.round((activeJob.current_artist_index / activeJob.total_artists) * 100)
    : 0;

  // Verificar se está abandonado (sem atualização > 10 min)
  const isAbandoned = activeJob && 
    ['processando', 'pausado'].includes(activeJob.status) &&
    activeJob.last_chunk_at &&
    new Date(activeJob.last_chunk_at).getTime() < Date.now() - 10 * 60 * 1000;

  // Verificar se está travado (processando mas sem updates > 5 min)
  const isStuck = activeJob &&
    activeJob.status === 'processando' &&
    new Date(activeJob.updated_at).getTime() < Date.now() - 5 * 60 * 1000;

  return {
    // State
    activeJob,
    lastCompletedJob,
    isLoading,
    isStarting,
    isResuming,
    progress,
    isAbandoned,
    isStuck,
    
    // Actions
    startJob,
    pauseJob,
    cancelJob,
    resumeJob,
    restartJob,
    refetch: fetchActiveJob,
    
    // Derived state
    isProcessing: activeJob?.status === 'processando',
    isPaused: activeJob?.status === 'pausado',
    isCompleted: !activeJob && lastCompletedJob?.status === 'concluido',
    isCancelling: activeJob?.is_cancelling || false,
    hasActiveJob: !!activeJob,
  };
}
