/**
 * Hook para estatísticas expandidas do catálogo de música
 * Sprint 2 - Integração Backend Completa
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CatalogExtendedStats {
  totalSongs: number;
  totalArtists: number;
  avgConfidence: number;
  songsWithLyrics: number;
  pendingSongs: number;
  enrichedSongs: number;
  errorSongs: number;
  songsWithYouTube: number;
  songsWithComposer: number;
  corpusBreakdown: {
    corpusId: string;
    corpusName: string;
    color: string;
    songCount: number;
    artistCount: number;
    avgConfidence: number;
  }[];
  weeklyTrend: {
    date: string;
    enriched: number;
    pending: number;
  }[];
}

export function useCatalogExtendedStats() {
  return useQuery({
    queryKey: ['catalog-extended-stats'],
    queryFn: async (): Promise<CatalogExtendedStats> => {
      // Fetch songs stats
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('id, status, confidence_score, lyrics, youtube_url, composer, corpus_id, created_at');
      
      if (songsError) throw songsError;

      // Fetch artists count
      const { count: artistCount, error: artistError } = await supabase
        .from('artists')
        .select('id', { count: 'exact', head: true });
      
      if (artistError) throw artistError;

      // Fetch corpora for breakdown
      const { data: corporaData, error: corporaError } = await supabase
        .from('corpora')
        .select('id, name, color');
      
      if (corporaError) throw corporaError;

      const songs = songsData || [];
      const corpora = corporaData || [];

      // Calculate basic stats
      const totalSongs = songs.length;
      const avgConfidence = songs.length > 0 
        ? songs.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / songs.length 
        : 0;
      
      const songsWithLyrics = songs.filter(s => s.lyrics && s.lyrics.length > 10).length;
      const pendingSongs = songs.filter(s => s.status === 'pending').length;
      const enrichedSongs = songs.filter(s => s.status === 'enriched').length;
      const errorSongs = songs.filter(s => s.status === 'error').length;
      const songsWithYouTube = songs.filter(s => s.youtube_url).length;
      const songsWithComposer = songs.filter(s => s.composer && s.composer.trim()).length;

      // Calculate corpus breakdown
      const corpusBreakdown = corpora.map(corpus => {
        const corpusSongs = songs.filter(s => s.corpus_id === corpus.id);
        return {
          corpusId: corpus.id,
          corpusName: corpus.name,
          color: corpus.color || '#3B82F6',
          songCount: corpusSongs.length,
          artistCount: 0, // Will calculate below
          avgConfidence: corpusSongs.length > 0
            ? corpusSongs.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / corpusSongs.length
            : 0
        };
      });

      // Get artist counts per corpus
      const { data: artistCorpusData } = await supabase
        .from('artists')
        .select('id, corpus_id');
      
      if (artistCorpusData) {
        corpusBreakdown.forEach(cb => {
          cb.artistCount = artistCorpusData.filter(a => a.corpus_id === cb.corpusId).length;
        });
      }

      // Calculate weekly trend (last 7 days)
      const today = new Date();
      const weeklyTrend: { date: string; enriched: number; pending: number }[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count songs created on this date by status
        const daySongs = songs.filter(s => {
          const songDate = new Date(s.created_at).toISOString().split('T')[0];
          return songDate === dateStr;
        });
        
        weeklyTrend.push({
          date: dateStr,
          enriched: daySongs.filter(s => s.status === 'enriched').length,
          pending: daySongs.filter(s => s.status === 'pending').length
        });
      }

      return {
        totalSongs,
        totalArtists: artistCount || 0,
        avgConfidence,
        songsWithLyrics,
        pendingSongs,
        enrichedSongs,
        errorSongs,
        songsWithYouTube,
        songsWithComposer,
        corpusBreakdown,
        weeklyTrend
      };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false
  });
}
