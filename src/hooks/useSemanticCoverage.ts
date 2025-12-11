/**
 * Hook otimizado para cobertura semântica usando Materialized Views
 * 
 * OTIMIZAÇÃO AUD-P2:
 * - Antes: 17 queries, 130k registros, 3-8s
 * - Depois: 3 queries, ~900 registros, <500ms
 * 
 * MVs usadas:
 * - semantic_coverage_by_corpus (3 linhas)
 * - semantic_coverage_by_artist (~900 linhas)
 * - semantic_quality_metrics (1 linha)
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface CorpusCoverage {
  corpusId: string;
  corpusName: string;
  totalSongs: number;
  annotatedSongs: number;
  coveragePercent: number;
  totalWords: number;
  uniqueWords: number;
  avgConfidence: number;
}

export interface ArtistCoverage {
  artistId: string;
  artistName: string;
  corpusId: string | null;
  corpusName: string | null;
  totalSongs: number;
  annotatedSongs: number;
  coveragePercent: number;
  annotatedWords: number;
  ncCount: number;
  n2PlusCount: number;
  avgConfidence: number;
}

export interface CoverageQualityMetrics {
  totalCachedWords: number;
  ncCount: number;
  n2PlusCount: number;
  n1OnlyCount: number;
  avgConfidence: number;
  highConfidencePercent: number;
}

interface UseSemanticCoverageOptions {
  corpusFilter?: string;
  autoRefreshInterval?: number | false;
  enabled?: boolean;
}

// Tipos das MVs do banco
interface MVCorpusCoverage {
  corpus_id: string;
  corpus_name: string;
  total_songs: number;
  annotated_songs: number;
  coverage_percent: number;
  total_words: number;
  unique_words: number;
  avg_confidence: number;
}

interface MVArtistCoverage {
  artist_id: string;
  artist_name: string;
  corpus_id: string | null;
  corpus_name: string | null;
  total_songs: number;
  annotated_songs: number;
  coverage_percent: number;
  annotated_words: number;
  nc_count: number;
  n2_plus_count: number;
  avg_confidence: number;
}

interface MVQualityMetrics {
  total_cached_words: number;
  nc_count: number;
  n2_plus_count: number;
  n1_only_count: number;
  avg_confidence: number;
  high_confidence_percent: number;
}

export function useSemanticCoverage(options: UseSemanticCoverageOptions = {}) {
  const { 
    corpusFilter, 
    autoRefreshInterval = false,
    enabled = true 
  } = options;
  
  const queryClient = useQueryClient();

  // Query 1: Cobertura por Corpus (3 linhas max)
  const corpusCoverageQuery = useQuery({
    queryKey: ['semantic-coverage-mv', 'corpus', corpusFilter],
    queryFn: async (): Promise<CorpusCoverage[]> => {
      const { data, error } = await supabase
        .from('semantic_coverage_by_corpus')
        .select('*')
        .order('corpus_name');
      
      if (error) throw error;
      
      return (data as MVCorpusCoverage[] || []).map(row => ({
        corpusId: row.corpus_id,
        corpusName: row.corpus_name,
        totalSongs: row.total_songs,
        annotatedSongs: row.annotated_songs,
        coveragePercent: Number(row.coverage_percent),
        totalWords: row.total_words,
        uniqueWords: row.unique_words,
        avgConfidence: Number(row.avg_confidence),
      }));
    },
    enabled,
    refetchInterval: autoRefreshInterval || undefined,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Query 2: Cobertura por Artista (~900 linhas)
  const artistCoverageQuery = useQuery({
    queryKey: ['semantic-coverage-mv', 'artist', corpusFilter],
    queryFn: async (): Promise<ArtistCoverage[]> => {
      let query = supabase
        .from('semantic_coverage_by_artist')
        .select('*')
        .order('coverage_percent', { ascending: true });
      
      if (corpusFilter) {
        query = query.eq('corpus_id', corpusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data as MVArtistCoverage[] || []).map(row => ({
        artistId: row.artist_id,
        artistName: row.artist_name,
        corpusId: row.corpus_id,
        corpusName: row.corpus_name,
        totalSongs: row.total_songs,
        annotatedSongs: row.annotated_songs,
        coveragePercent: Number(row.coverage_percent),
        annotatedWords: row.annotated_words,
        ncCount: row.nc_count,
        n2PlusCount: row.n2_plus_count,
        avgConfidence: Number(row.avg_confidence),
      }));
    },
    enabled,
    refetchInterval: autoRefreshInterval || undefined,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Query 3: Métricas de Qualidade (1 linha)
  const qualityMetricsQuery = useQuery({
    queryKey: ['semantic-coverage-mv', 'quality'],
    queryFn: async (): Promise<CoverageQualityMetrics> => {
      const { data, error } = await supabase
        .from('semantic_quality_metrics')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        return {
          totalCachedWords: 0,
          ncCount: 0,
          n2PlusCount: 0,
          n1OnlyCount: 0,
          avgConfidence: 0,
          highConfidencePercent: 0,
        };
      }
      
      const row = data as MVQualityMetrics;
      return {
        totalCachedWords: row.total_cached_words,
        ncCount: row.nc_count,
        n2PlusCount: row.n2_plus_count,
        n1OnlyCount: row.n1_only_count,
        avgConfidence: Number(row.avg_confidence),
        highConfidencePercent: Number(row.high_confidence_percent),
      };
    },
    enabled,
    refetchInterval: autoRefreshInterval || undefined,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Global coverage percentage
  const globalCoverage = corpusCoverageQuery.data?.reduce((acc, c) => {
    acc.totalSongs += c.totalSongs;
    acc.annotatedSongs += c.annotatedSongs;
    return acc;
  }, { totalSongs: 0, annotatedSongs: 0 });

  const globalCoveragePercent = globalCoverage?.totalSongs 
    ? Math.round((globalCoverage.annotatedSongs / globalCoverage.totalSongs) * 100 * 10) / 10
    : 0;

  // Refresh local cache
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['semantic-coverage-mv'] });
  }, [queryClient]);

  // Refresh MVs no banco (operação mais pesada) - via Edge Function
  // Se falhar, faz fallback para refresh do cache local
  const refreshMVs = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('refresh-semantic-mvs');
      
      if (error || !data?.success) {
        console.warn('Refresh MVs falhou, usando fallback cache local:', error || data?.error);
        // Fallback: apenas refresh do cache local
        queryClient.invalidateQueries({ queryKey: ['semantic-coverage-mv'] });
        toast.success('Cache atualizado (dados podem estar levemente desatualizados)');
        return;
      }
      
      // Sucesso completo
      queryClient.invalidateQueries({ queryKey: ['semantic-coverage-mv'] });
      toast.success('Dados de cobertura atualizados');
    } catch (err) {
      console.error('Erro ao atualizar MVs:', err);
      // Fallback silencioso
      queryClient.invalidateQueries({ queryKey: ['semantic-coverage-mv'] });
      toast.success('Cache atualizado');
    }
  }, [queryClient]);

  return {
    // Data
    corpusCoverage: corpusCoverageQuery.data || [],
    artistCoverage: artistCoverageQuery.data || [],
    qualityMetrics: qualityMetricsQuery.data,
    globalCoveragePercent,
    
    // Loading states
    isLoading: corpusCoverageQuery.isLoading || artistCoverageQuery.isLoading,
    isRefreshing: corpusCoverageQuery.isFetching || artistCoverageQuery.isFetching,
    
    // Actions
    refresh,      // Refresh cache local (rápido)
    refreshMVs,   // Refresh MVs no banco (pesado, mas atualiza dados)
  };
}

export type CoverageLevel = 'none' | 'partial' | 'good' | 'complete';

export function getCoverageLevel(percent: number): CoverageLevel {
  if (percent === 0) return 'none';
  if (percent < 50) return 'partial';
  if (percent < 100) return 'good';
  return 'complete';
}

export function getCoverageBadgeVariant(level: CoverageLevel): 'destructive' | 'secondary' | 'default' | 'outline' {
  switch (level) {
    case 'none': return 'destructive';
    case 'partial': return 'secondary';
    case 'good': return 'default';
    case 'complete': return 'outline';
  }
}
