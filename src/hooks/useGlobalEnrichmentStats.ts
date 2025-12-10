/**
 * useGlobalEnrichmentStats - Hook consolidado para estatísticas globais de enriquecimento
 * Sprint AUD-P1: Dashboard de Progresso Global
 */

import { useMemo, useCallback } from 'react';
import { useCatalogExtendedStats } from '@/hooks/useCatalogExtendedStats';
import { useEnrichmentJobsContext } from '@/contexts/EnrichmentJobsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useGlobalEnrichmentStats');

export interface CorpusEnrichmentStats {
  corpusId: string;
  corpusName: string;
  corpusType: string;
  color: string;
  totalSongs: number;
  enrichedSongs: number;
  pendingSongs: number;
  errorSongs: number;
  progress: number;
  hasActiveJob: boolean;
  activeJobId?: string;
}

export interface GlobalEnrichmentStats {
  // Totais globais
  totalSongs: number;
  enrichedSongs: number;
  pendingSongs: number;
  errorSongs: number;
  globalProgress: number;
  
  // Por corpus
  corpora: CorpusEnrichmentStats[];
  
  // Métricas de processamento
  processingRate: number;
  estimatedEtaMinutes: number | null;
  formattedEta: string | null;
  isProcessing: boolean;
  lastUpdateAt: Date | null;
  
  // Status
  isLoading: boolean;
}

// Mapeamento de corpus_id para tipo
const CORPUS_TYPE_MAP: Record<string, string> = {
  '9e6b0c4a-7d8e-4f9a-b1c2-3d4e5f6a7b8c': 'gaucho',
  '1e7256cd-5adf-4196-85f9-4af7031f098a': 'nordestino',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890': 'sertanejo',
};

export function useGlobalEnrichmentStats(): GlobalEnrichmentStats & {
  startCorpusJob: (corpusId: string, corpusType: string) => Promise<void>;
  refetch: () => void;
} {
  const { data: catalogStats, isLoading: catalogLoading, refetch: refetchCatalog } = useCatalogExtendedStats();
  const { 
    activeJobs, 
    liveMetrics, 
    formattedEta, 
    isLoading: jobsLoading,
    refetch: refetchJobs
  } = useEnrichmentJobsContext();
  
  // Calcular stats por corpus
  const corpora = useMemo<CorpusEnrichmentStats[]>(() => {
    if (!catalogStats?.corpusBreakdown) return [];
    
    return catalogStats.corpusBreakdown.map(corpus => {
      const activeJob = activeJobs.find(j => j.corpus_id === corpus.corpusId);
      const corpusType = CORPUS_TYPE_MAP[corpus.corpusId] || corpus.corpusName.toLowerCase();
      
      return {
        corpusId: corpus.corpusId,
        corpusName: corpus.corpusName,
        corpusType,
        color: corpus.color,
        totalSongs: corpus.songCount,
        enrichedSongs: corpus.enrichedSongs,
        pendingSongs: corpus.pendingSongs,
        errorSongs: corpus.errorSongs,
        progress: corpus.songCount > 0 
          ? Math.round((corpus.enrichedSongs / corpus.songCount) * 100 * 10) / 10
          : 0,
        hasActiveJob: !!activeJob,
        activeJobId: activeJob?.id,
      };
    });
  }, [catalogStats?.corpusBreakdown, activeJobs]);
  
  // Stats globais
  const globalStats = useMemo(() => {
    const totalSongs = catalogStats?.totalSongs || 0;
    const enrichedSongs = catalogStats?.enrichedSongs || 0;
    const pendingSongs = catalogStats?.pendingSongs || 0;
    const errorSongs = catalogStats?.errorSongs || 0;
    
    return {
      totalSongs,
      enrichedSongs,
      pendingSongs,
      errorSongs,
      globalProgress: totalSongs > 0 
        ? Math.round((enrichedSongs / totalSongs) * 100 * 100) / 100
        : 0,
    };
  }, [catalogStats]);
  
  // Iniciar job para um corpus específico
  const startCorpusJob = useCallback(async (corpusId: string, corpusType: string) => {
    log.info('Starting corpus enrichment job', { corpusId, corpusType });
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: {
          jobType: 'metadata',
          scope: 'corpus',
          corpusId,
          corpusType,
        }
      });
      
      if (error) {
        log.error('Error starting corpus job', error);
        toast.error('Erro ao iniciar job de enriquecimento');
        return;
      }
      
      if (!data.success) {
        if (data.existingJobId) {
          toast.warning('Já existe um job ativo para este corpus');
        } else {
          toast.error(data.error || 'Erro ao iniciar job');
        }
        return;
      }
      
      toast.success(`Enriquecimento do corpus ${corpusType} iniciado!`);
      refetchJobs();
    } catch (err) {
      log.error('Failed to start corpus job', err as Error);
      toast.error('Falha ao iniciar enriquecimento');
    }
  }, [refetchJobs]);
  
  const refetch = useCallback(() => {
    refetchCatalog();
    refetchJobs();
  }, [refetchCatalog, refetchJobs]);
  
  return {
    // Globais
    ...globalStats,
    
    // Por corpus
    corpora,
    
    // Métricas de processamento
    processingRate: liveMetrics.processingRate,
    estimatedEtaMinutes: liveMetrics.estimatedEtaMinutes,
    formattedEta,
    isProcessing: activeJobs.some(j => j.status === 'processando'),
    lastUpdateAt: liveMetrics.lastUpdateAt,
    
    // Status
    isLoading: catalogLoading || jobsLoading,
    
    // Ações
    startCorpusJob,
    refetch,
  };
}
