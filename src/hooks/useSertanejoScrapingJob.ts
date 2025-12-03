import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

export function useSertanejoScrapingJob() {
  const [activeJob, setActiveJob] = useState<ScrapingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Buscar job ativo ao montar
  const fetchActiveJob = useCallback(async () => {
    const { data } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('corpus_type', 'sertanejo')
      .in('status', ['iniciado', 'processando', 'pausado'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setActiveJob(data as ScrapingJob | null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchActiveJob();

    // Subscrição Realtime
    const channel = supabase
      .channel('scraping_jobs_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'scraping_jobs',
        filter: 'corpus_type=eq.sertanejo'
      }, (payload) => {
        console.log('[useSertanejoScrapingJob] Realtime update:', payload);
        if (payload.new) {
          const newJob = payload.new as ScrapingJob;
          setActiveJob(prev => {
            // Atualizar apenas se for o mesmo job ou se não há job ativo
            if (!prev || prev.id === newJob.id) {
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
  }, [fetchActiveJob]);

  // Iniciar novo job
  const startJob = useCallback(async (artistLimit: number, songsPerArtist: number) => {
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-sertanejo-artists', {
        body: { artistLimit, songsPerArtist }
      });

      if (error) throw error;

      toast.success('Scraping iniciado! Você pode fechar esta página - o processo continua automaticamente.', {
        duration: 8000
      });
      
      // Buscar job atualizado
      await fetchActiveJob();
      
      return data.jobId;
    } catch (error) {
      console.error('Erro ao iniciar job:', error);
      toast.error('Erro ao iniciar scraping');
      throw error;
    } finally {
      setIsStarting(false);
    }
  }, [fetchActiveJob]);

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
    
    toast.info('Cancelamento solicitado... O job será interrompido em breve.');
    setActiveJob(prev => prev ? { ...prev, is_cancelling: true } : null);
  }, [activeJob]);

  // Retomar job pausado
  const resumeJob = useCallback(async () => {
    if (!activeJob) return;

    try {
      await supabase.functions.invoke('scrape-sertanejo-artists', {
        body: { 
          jobId: activeJob.id, 
          continueFrom: { artistIndex: activeJob.current_artist_index }
        }
      });

      toast.success('Job retomado!');
      await fetchActiveJob();
    } catch (error) {
      toast.error('Erro ao retomar job');
    }
  }, [activeJob, fetchActiveJob]);

  // Calcular progresso
  const progress = activeJob && activeJob.total_artists > 0
    ? Math.round((activeJob.current_artist_index / activeJob.total_artists) * 100)
    : 0;

  // Verificar se está abandonado (sem atualização > 15 min)
  const isAbandoned = activeJob && 
    ['processando', 'pausado'].includes(activeJob.status) &&
    new Date(activeJob.updated_at).getTime() < Date.now() - 15 * 60 * 1000;

  // Buscar último job completo
  const [lastCompletedJob, setLastCompletedJob] = useState<ScrapingJob | null>(null);
  
  useEffect(() => {
    if (!activeJob) {
      supabase
        .from('scraping_jobs')
        .select('*')
        .eq('corpus_type', 'sertanejo')
        .eq('status', 'concluido')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          setLastCompletedJob(data as ScrapingJob | null);
        });
    }
  }, [activeJob]);

  return {
    activeJob,
    lastCompletedJob,
    isLoading,
    isStarting,
    progress,
    isAbandoned,
    startJob,
    cancelJob,
    resumeJob,
    refetch: fetchActiveJob,
    isProcessing: activeJob?.status === 'processando',
    isPaused: activeJob?.status === 'pausado',
    isCompleted: activeJob?.status === 'concluido',
    isCancelling: activeJob?.is_cancelling || false,
  };
}
