/**
 * Hook para métricas em tempo real de jobs de enriquecimento
 * Busca dados diretamente do banco a cada 5 segundos
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useEnrichmentLiveMetrics');
export interface EnrichmentLiveMetrics {
  // Métricas de progresso
  songsUpdatedLastMinute: number;
  songsUpdatedLast5Minutes: number;
  processingRate: number; // songs/minute
  estimatedEtaMinutes: number | null;
  
  // Última música processada
  lastProcessedSong: {
    id: string;
    title: string;
    artist: string;
    updatedAt: string;
    hasComposer: boolean;
    hasYear: boolean;
    hasYoutube: boolean;
  } | null;
  
  // Músicas recentes (últimas 5)
  recentSongs: Array<{
    id: string;
    title: string;
    artist: string;
    updatedAt: string;
  }>;
  
  // Heartbeat
  lastUpdateAt: Date | null;
  isAlive: boolean;
}

interface UseEnrichmentLiveMetricsOptions {
  jobId?: string;
  enabled?: boolean;
  refreshInterval?: number;
}

export function useEnrichmentLiveMetrics(options: UseEnrichmentLiveMetricsOptions = {}) {
  const { jobId, enabled = true, refreshInterval = 5000 } = options;
  
  const [metrics, setMetrics] = useState<EnrichmentLiveMetrics>({
    songsUpdatedLastMinute: 0,
    songsUpdatedLast5Minutes: 0,
    processingRate: 0,
    estimatedEtaMinutes: null,
    lastProcessedSong: null,
    recentSongs: [],
    lastUpdateAt: null,
    isAlive: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [totalRemaining, setTotalRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const fetchMetrics = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Buscar músicas atualizadas recentemente (com dados de enriquecimento)
      const { data: recentUpdates, error: recentError } = await supabase
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
      
      if (recentError) {
        log.error('Error fetching recent updates', recentError);
        return;
      }
      
      const updates = recentUpdates || [];
      
      // Contar por período
      const lastMinuteCount = updates.filter(s => 
        new Date(s.updated_at) >= oneMinuteAgo
      ).length;
      
      const last5MinutesCount = updates.length;
      
      // Calcular taxa (songs/minute)
      const rate = last5MinutesCount > 0 
        ? last5MinutesCount / 5 
        : lastMinuteCount;
      
      // Buscar job para calcular ETA
      let etaMinutes: number | null = null;
      let remaining: number | null = null;
      
      if (jobId) {
        const { data: job } = await supabase
          .from('enrichment_jobs')
          .select('total_songs, songs_processed')
          .eq('id', jobId)
          .maybeSingle();
        
        if (job) {
          remaining = job.total_songs - job.songs_processed;
          setTotalRemaining(remaining);
          
          if (rate > 0 && remaining > 0) {
            etaMinutes = Math.ceil(remaining / rate);
          }
        }
      }
      
      // Formatar última música
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
      
      // Formatar músicas recentes (últimas 5)
      const recentSongs = updates.slice(0, 5).map(s => ({
        id: s.id,
        title: s.title,
        artist: (s.artists as any)?.name || 'Desconhecido',
        updatedAt: s.updated_at,
      }));
      
      // Verificar se está vivo (atualização nos últimos 2 minutos)
      const isAlive = lastSong 
        ? new Date(lastSong.updated_at) >= new Date(now.getTime() - 2 * 60 * 1000)
        : false;
      
      setMetrics({
        songsUpdatedLastMinute: lastMinuteCount,
        songsUpdatedLast5Minutes: last5MinutesCount,
        processingRate: Math.round(rate * 10) / 10,
        estimatedEtaMinutes: etaMinutes,
        lastProcessedSong,
        recentSongs,
        lastUpdateAt: now,
        isAlive,
      });
      
    } catch (err) {
      log.error('Error in fetchMetrics', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, jobId]);
  
  // Setup do intervalo
  useEffect(() => {
    if (enabled) {
      fetchMetrics();
      intervalRef.current = setInterval(fetchMetrics, refreshInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, fetchMetrics]);
  
  // Formatar ETA para exibição
  const formatEta = useCallback((minutes: number | null) => {
    if (minutes === null || minutes <= 0) return null;
    
    if (minutes < 60) {
      return `~${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours < 24) {
      return `~${hours}h ${mins}min`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `~${days}d ${remainingHours}h`;
  }, []);
  
  return {
    metrics,
    isLoading,
    totalRemaining,
    formattedEta: formatEta(metrics.estimatedEtaMinutes),
    refetch: fetchMetrics,
  };
}
