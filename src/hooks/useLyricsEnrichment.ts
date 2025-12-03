/**
 * Hook para gerenciar enriquecimento de letras de músicas
 * Implementa estratégia de 2 camadas: Letras.mus.br (scraping) + Web Search
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LyricsAnalysis {
  artistId: string;
  artistName: string;
  totalSongs: number;
  withLyrics: number;
  withoutLyrics: number;
  coveragePercent: number;
}

export interface LyricsEnrichmentResult {
  songId: string;
  title: string;
  source: string | null;
  sourceUrl: string | null;
  success: boolean;
  error?: string;
}

export interface LyricsEnrichmentProgress {
  current: number;
  total: number;
  enriched: number;
  notFound: number;
  errors: number;
  results: LyricsEnrichmentResult[];
}

export interface SertanejoPopulateProgress {
  artistsCreated: number;
  songsCreated: number;
  songsWithLyrics: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  error?: string;
}

export function useLyricsEnrichment() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LyricsAnalysis | null>(null);
  
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState<LyricsEnrichmentProgress | null>(null);
  
  const [isPopulating, setIsPopulating] = useState(false);
  const [sertanejoProgress, setSertanejoProgress] = useState<SertanejoPopulateProgress>({
    artistsCreated: 0,
    songsCreated: 0,
    songsWithLyrics: 0,
    status: 'idle'
  });

  // Analyze lyrics coverage for an artist
  const analyzeArtist = useCallback(async (artistId: string): Promise<LyricsAnalysis | null> => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('enrich-missing-lyrics', {
        body: { artistId, mode: 'analyze' }
      });

      if (error) throw error;

      const analysis: LyricsAnalysis = {
        artistId: data.artistId,
        artistName: data.artistName,
        totalSongs: data.totalSongs,
        withLyrics: data.withLyrics,
        withoutLyrics: data.withoutLyrics,
        coveragePercent: data.coveragePercent
      };

      setAnalysisResult(analysis);
      return analysis;
    } catch (error) {
      console.error('[useLyricsEnrichment] Analysis error:', error);
      toast.error('Erro ao analisar cobertura de letras');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Enrich missing lyrics for an artist
  const enrichArtist = useCallback(async (artistId: string, limit = 50): Promise<void> => {
    setIsEnriching(true);
    setProgress({
      current: 0,
      total: limit,
      enriched: 0,
      notFound: 0,
      errors: 0,
      results: []
    });

    try {
      toast.info('Iniciando busca de letras...');

      const { data, error } = await supabase.functions.invoke('enrich-missing-lyrics', {
        body: { artistId, mode: 'enrich', limit }
      });

      if (error) throw error;

      setProgress({
        current: data.processed,
        total: data.processed,
        enriched: data.enriched,
        notFound: data.notFound,
        errors: data.errors,
        results: data.results
      });

      if (data.enriched > 0) {
        toast.success(`${data.enriched} letras encontradas e salvas!`);
      } else {
        toast.info('Nenhuma letra nova encontrada');
      }
    } catch (error) {
      console.error('[useLyricsEnrichment] Enrichment error:', error);
      toast.error('Erro ao enriquecer letras');
    } finally {
      setIsEnriching(false);
    }
  }, []);

  // Populate Sertanejo corpus from Letras.mus.br
  const populateSertanejo = useCallback(async (artistLimit = 25, songsPerArtist = 20): Promise<void> => {
    setIsPopulating(true);
    setSertanejoProgress({
      artistsCreated: 0,
      songsCreated: 0,
      songsWithLyrics: 0,
      status: 'running'
    });

    try {
      toast.info(`Populando Corpus Sertanejo (${artistLimit} artistas)...`);

      const { data, error } = await supabase.functions.invoke('scrape-sertanejo-artists', {
        body: { artistLimit, songsPerArtist }
      });

      if (error) throw error;

      setSertanejoProgress({
        artistsCreated: data.artistsCreated,
        songsCreated: data.songsCreated,
        songsWithLyrics: data.songsWithLyrics,
        status: 'completed'
      });

      toast.success(
        `Corpus Sertanejo populado! ${data.artistsCreated} artistas, ${data.songsCreated} músicas, ${data.songsWithLyrics} com letras`
      );
    } catch (error) {
      console.error('[useLyricsEnrichment] Sertanejo populate error:', error);
      setSertanejoProgress(prev => ({ ...prev, status: 'error', error: error.message }));
      toast.error('Erro ao popular Corpus Sertanejo');
    } finally {
      setIsPopulating(false);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setAnalysisResult(null);
    setProgress(null);
    setSertanejoProgress({
      artistsCreated: 0,
      songsCreated: 0,
      songsWithLyrics: 0,
      status: 'idle'
    });
  }, []);

  return {
    // Analysis
    analyzeArtist,
    analysisResult,
    isAnalyzing,
    
    // Enrichment
    enrichArtist,
    progress,
    isEnriching,
    
    // Sertanejo Population
    populateSertanejo,
    sertanejoProgress,
    isPopulating,
    
    // Utils
    reset
  };
}