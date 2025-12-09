/**
 * Hook para calcular cobertura semântica por corpus e artista
 * Usa dados de semantic_disambiguation_cache com artist_id e song_id
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  ncCount: number; // Not Classified
  n2PlusCount: number; // N2+ depth
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
  autoRefreshInterval?: number; // ms, default 30000
  enabled?: boolean;
}

export function useSemanticCoverage(options: UseSemanticCoverageOptions = {}) {
  const { 
    corpusFilter, 
    autoRefreshInterval = 30000,
    enabled = true 
  } = options;
  
  const queryClient = useQueryClient();

  // Fetch corpus coverage
  const corpusCoverageQuery = useQuery({
    queryKey: ['semantic-coverage', 'corpus', corpusFilter],
    queryFn: async (): Promise<CorpusCoverage[]> => {
      // Get all corpora with song counts
      const { data: corpora, error: corporaError } = await supabase
        .from('corpora')
        .select('id, name');
      
      if (corporaError) throw corporaError;
      
      const coverages: CorpusCoverage[] = [];
      
      for (const corpus of corpora || []) {
        // Total songs in corpus
        const { count: totalSongs } = await supabase
          .from('songs')
          .select('id', { count: 'exact', head: true })
          .eq('corpus_id', corpus.id);
        
        // Songs with annotations (distinct song_ids in cache for this corpus)
        const { data: annotatedData } = await supabase
          .from('semantic_disambiguation_cache')
          .select('song_id')
          .not('song_id', 'is', null);
        
        // Filter by songs in this corpus
        const { data: corpusSongs } = await supabase
          .from('songs')
          .select('id')
          .eq('corpus_id', corpus.id);
        
        const corpusSongIds = new Set(corpusSongs?.map(s => s.id) || []);
        const annotatedSongIds = new Set(
          annotatedData?.filter(a => corpusSongIds.has(a.song_id!)).map(a => a.song_id) || []
        );
        
        // Words stats for this corpus
        const { data: wordStats } = await supabase
          .from('semantic_disambiguation_cache')
          .select('palavra, confianca, song_id')
          .not('song_id', 'is', null);
        
        const corpusWords = wordStats?.filter(w => corpusSongIds.has(w.song_id!)) || [];
        const uniqueWords = new Set(corpusWords.map(w => w.palavra)).size;
        const avgConfidence = corpusWords.length > 0
          ? corpusWords.reduce((sum, w) => sum + (w.confianca || 0), 0) / corpusWords.length
          : 0;
        
        coverages.push({
          corpusId: corpus.id,
          corpusName: corpus.name,
          totalSongs: totalSongs || 0,
          annotatedSongs: annotatedSongIds.size,
          coveragePercent: totalSongs ? (annotatedSongIds.size / totalSongs) * 100 : 0,
          totalWords: corpusWords.length,
          uniqueWords,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
        });
      }
      
      return coverages;
    },
    enabled,
    refetchInterval: autoRefreshInterval,
    staleTime: 10000,
  });

  // Fetch artist coverage
  const artistCoverageQuery = useQuery({
    queryKey: ['semantic-coverage', 'artist', corpusFilter],
    queryFn: async (): Promise<ArtistCoverage[]> => {
      // Get artists with corpus info
      let artistQuery = supabase
        .from('artists')
        .select('id, name, corpus_id, corpora(name)')
        .order('name');
      
      if (corpusFilter) {
        artistQuery = artistQuery.eq('corpus_id', corpusFilter);
      }
      
      const { data: artists, error } = await artistQuery;
      if (error) throw error;
      
      // Get all song counts per artist
      const { data: songCounts } = await supabase
        .from('songs')
        .select('artist_id');
      
      const artistSongCounts = new Map<string, number>();
      songCounts?.forEach(s => {
        artistSongCounts.set(s.artist_id, (artistSongCounts.get(s.artist_id) || 0) + 1);
      });
      
      // Get annotation stats per artist
      const { data: cacheData } = await supabase
        .from('semantic_disambiguation_cache')
        .select('artist_id, song_id, palavra, confianca, tagset_codigo, tagset_n2');
      
      // Group by artist
      const artistStats = new Map<string, {
        songIds: Set<string>;
        words: number;
        ncCount: number;
        n2PlusCount: number;
        confidenceSum: number;
      }>();
      
      cacheData?.forEach(entry => {
        if (!entry.artist_id) return;
        
        let stats = artistStats.get(entry.artist_id);
        if (!stats) {
          stats = { songIds: new Set(), words: 0, ncCount: 0, n2PlusCount: 0, confidenceSum: 0 };
          artistStats.set(entry.artist_id, stats);
        }
        
        if (entry.song_id) stats.songIds.add(entry.song_id);
        stats.words++;
        if (entry.tagset_codigo === 'NC' || !entry.tagset_codigo) stats.ncCount++;
        if (entry.tagset_n2) stats.n2PlusCount++;
        stats.confidenceSum += entry.confianca || 0;
      });
      
      const coverages: ArtistCoverage[] = (artists || []).map(artist => {
        const stats = artistStats.get(artist.id);
        const totalSongs = artistSongCounts.get(artist.id) || 0;
        const annotatedSongs = stats?.songIds.size || 0;
        
        return {
          artistId: artist.id,
          artistName: artist.name,
          corpusId: artist.corpus_id,
          corpusName: (artist.corpora as any)?.name || null,
          totalSongs,
          annotatedSongs,
          coveragePercent: totalSongs ? (annotatedSongs / totalSongs) * 100 : 0,
          annotatedWords: stats?.words || 0,
          ncCount: stats?.ncCount || 0,
          n2PlusCount: stats?.n2PlusCount || 0,
          avgConfidence: stats?.words 
            ? Math.round((stats.confidenceSum / stats.words) * 100) / 100 
            : 0,
        };
      });
      
      return coverages.sort((a, b) => a.coveragePercent - b.coveragePercent);
    },
    enabled,
    refetchInterval: autoRefreshInterval,
    staleTime: 10000,
  });

  // Fetch quality metrics
  const qualityMetricsQuery = useQuery({
    queryKey: ['semantic-coverage', 'quality', corpusFilter],
    queryFn: async (): Promise<CoverageQualityMetrics> => {
      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .select('tagset_codigo, tagset_n2, confianca');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const ncCount = data?.filter(d => d.tagset_codigo === 'NC' || !d.tagset_codigo).length || 0;
      const n2PlusCount = data?.filter(d => d.tagset_n2).length || 0;
      const n1OnlyCount = total - ncCount - n2PlusCount;
      const avgConfidence = total > 0
        ? data!.reduce((sum, d) => sum + (d.confianca || 0), 0) / total
        : 0;
      const highConfidenceCount = data?.filter(d => (d.confianca || 0) >= 0.8).length || 0;
      
      return {
        totalCachedWords: total,
        ncCount,
        n2PlusCount,
        n1OnlyCount,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        highConfidencePercent: total > 0 ? Math.round((highConfidenceCount / total) * 100) : 0,
      };
    },
    enabled,
    refetchInterval: autoRefreshInterval,
    staleTime: 10000,
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

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['semantic-coverage'] });
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
    refresh,
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
