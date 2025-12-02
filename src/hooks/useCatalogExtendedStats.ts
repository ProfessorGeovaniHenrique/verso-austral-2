/**
 * Hook para estatísticas expandidas do catálogo de música
 * Sprint 5 - Correção de limite 1000 entradas e dados por corpus
 * Usa COUNT aggregations ao invés de fetch de todas as linhas
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface CorpusBreakdown {
  corpusId: string;
  corpusName: string;
  color: string;
  songCount: number;
  artistCount: number;
  avgConfidence: number;
  songsWithLyrics: number;
  songsWithYouTube: number;
  songsWithComposer: number;
  pendingSongs: number;
  enrichedSongs: number;
  errorSongs: number;
}

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
  corpusBreakdown: CorpusBreakdown[];
  weeklyTrend: {
    date: string;
    enriched: number;
    pending: number;
  }[];
}

export function useCatalogExtendedStats(corpusFilter?: string) {
  const queryResult = useQuery({
    queryKey: ['catalog-extended-stats', corpusFilter],
    queryFn: async (): Promise<CatalogExtendedStats> => {
      // 1. Buscar todos os corpora primeiro
      const { data: corporaData, error: corporaError } = await supabase
        .from('corpora')
        .select('id, name, color');
      
      if (corporaError) throw corporaError;
      const corpora = corporaData || [];

      // 2. Usar COUNT queries para cada métrica (sem limite de 1000)
      const baseQuery = corpusFilter 
        ? supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter)
        : supabase.from('songs').select('*', { count: 'exact', head: true });

      // Queries paralelas para estatísticas globais
      const [
        totalSongsResult,
        pendingResult,
        enrichedResult,
        errorResult,
        withLyricsResult,
        withYouTubeResult,
        withComposerResult,
        artistsResult
      ] = await Promise.all([
        // Total de músicas
        corpusFilter 
          ? supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter)
          : supabase.from('songs').select('*', { count: 'exact', head: true }),
        // Pendentes
        corpusFilter 
          ? supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter).eq('status', 'pending')
          : supabase.from('songs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        // Enriquecidas
        corpusFilter 
          ? supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter).eq('status', 'enriched')
          : supabase.from('songs').select('*', { count: 'exact', head: true }).eq('status', 'enriched'),
        // Com erro
        corpusFilter 
          ? supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter).eq('status', 'error')
          : supabase.from('songs').select('*', { count: 'exact', head: true }).eq('status', 'error'),
        // Com letras (não vazio)
        corpusFilter 
          ? supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter).not('lyrics', 'is', null).neq('lyrics', '')
          : supabase.from('songs').select('*', { count: 'exact', head: true }).not('lyrics', 'is', null).neq('lyrics', ''),
        // Com YouTube
        corpusFilter 
          ? supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter).not('youtube_url', 'is', null)
          : supabase.from('songs').select('*', { count: 'exact', head: true }).not('youtube_url', 'is', null),
        // Com compositor
        corpusFilter 
          ? supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter).not('composer', 'is', null).neq('composer', '')
          : supabase.from('songs').select('*', { count: 'exact', head: true }).not('composer', 'is', null).neq('composer', ''),
        // Artistas
        corpusFilter 
          ? supabase.from('artists').select('*', { count: 'exact', head: true }).eq('corpus_id', corpusFilter)
          : supabase.from('artists').select('*', { count: 'exact', head: true })
      ]);

      // 3. Buscar média de confiança (sample de 5000 para performance)
      const { data: confidenceSample } = await supabase
        .from('songs')
        .select('confidence_score')
        .not('confidence_score', 'is', null)
        .limit(5000);
      
      const avgConfidence = confidenceSample && confidenceSample.length > 0
        ? confidenceSample.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / confidenceSample.length
        : 0;

      // 4. Calcular estatísticas por corpus (paralelo)
      const corpusBreakdownPromises = corpora.map(async (corpus) => {
        const [
          songCountRes,
          artistCountRes,
          pendingRes,
          enrichedRes,
          errorRes,
          withLyricsRes,
          withYouTubeRes,
          withComposerRes
        ] = await Promise.all([
          supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id),
          supabase.from('artists').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id),
          supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).eq('status', 'pending'),
          supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).eq('status', 'enriched'),
          supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).eq('status', 'error'),
          supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).not('lyrics', 'is', null).neq('lyrics', ''),
          supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).not('youtube_url', 'is', null),
          supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).not('composer', 'is', null).neq('composer', '')
        ]);

        // Sample para confiança média por corpus
        const { data: corpusConfidence } = await supabase
          .from('songs')
          .select('confidence_score')
          .eq('corpus_id', corpus.id)
          .not('confidence_score', 'is', null)
          .limit(1000);

        const corpusAvgConfidence = corpusConfidence && corpusConfidence.length > 0
          ? corpusConfidence.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / corpusConfidence.length
          : 0;

        return {
          corpusId: corpus.id,
          corpusName: corpus.name,
          color: corpus.color || '#3B82F6',
          songCount: songCountRes.count || 0,
          artistCount: artistCountRes.count || 0,
          avgConfidence: corpusAvgConfidence,
          songsWithLyrics: withLyricsRes.count || 0,
          songsWithYouTube: withYouTubeRes.count || 0,
          songsWithComposer: withComposerRes.count || 0,
          pendingSongs: pendingRes.count || 0,
          enrichedSongs: enrichedRes.count || 0,
          errorSongs: errorRes.count || 0
        };
      });

      const corpusBreakdown = await Promise.all(corpusBreakdownPromises);

      // 5. Calcular trend semanal (últimos 7 dias)
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyTrend: { date: string; enriched: number; pending: number }[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        const [enrichedDay, pendingDay] = await Promise.all([
          supabase.from('songs').select('*', { count: 'exact', head: true })
            .gte('updated_at', dateStr)
            .lt('updated_at', nextDateStr)
            .eq('status', 'enriched'),
          supabase.from('songs').select('*', { count: 'exact', head: true })
            .gte('created_at', dateStr)
            .lt('created_at', nextDateStr)
            .eq('status', 'pending')
        ]);

        weeklyTrend.push({
          date: dateStr,
          enriched: enrichedDay.count || 0,
          pending: pendingDay.count || 0
        });
      }

      return {
        totalSongs: totalSongsResult.count || 0,
        totalArtists: artistsResult.count || 0,
        avgConfidence,
        songsWithLyrics: withLyricsResult.count || 0,
        pendingSongs: pendingResult.count || 0,
        enrichedSongs: enrichedResult.count || 0,
        errorSongs: errorResult.count || 0,
        songsWithYouTube: withYouTubeResult.count || 0,
        songsWithComposer: withComposerResult.count || 0,
        corpusBreakdown: corpusBreakdown.filter(c => c.songCount > 0), // Só mostrar corpora com dados
        weeklyTrend
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false
  });

  // Real-time subscription para atualizações
  useEffect(() => {
    const channel = supabase
      .channel('catalog-stats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        () => {
          // Invalidar cache quando houver mudanças
          queryResult.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryResult.refetch]);

  return queryResult;
}
