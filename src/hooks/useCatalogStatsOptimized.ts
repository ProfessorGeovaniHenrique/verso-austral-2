/**
 * Hook otimizado para estatísticas do catálogo
 * Sprint AUDIT - BE-P01, BE-P02
 * Reduz queries e adiciona debounce no real-time
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useCallback } from 'react';

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
  weeklyTrend: { date: string; enriched: number; pending: number }[];
}

const REALTIME_DEBOUNCE_MS = 10000;

export function useCatalogStatsOptimized(corpusFilter?: string) {
  const lastRefetchRef = useRef<number>(0);
  const pendingRefetchRef = useRef<NodeJS.Timeout | null>(null);

  const queryResult = useQuery({
    queryKey: ['catalog-stats-optimized', corpusFilter],
    queryFn: async (): Promise<CatalogExtendedStats> => {
      const baseFilter = corpusFilter ? { corpus_id: corpusFilter } : {};

      // Queries paralelas (11 queries otimizadas)
      const [
        totalRes, pendingRes, enrichedRes, errorRes,
        lyricsRes, ytRes, composerRes, artistsRes, confidenceRes,
        corporaRes
      ] = await Promise.all([
        supabase.from('songs').select('*', { count: 'exact', head: true }).match(baseFilter),
        supabase.from('songs').select('*', { count: 'exact', head: true }).match(baseFilter).eq('status', 'pending'),
        supabase.from('songs').select('*', { count: 'exact', head: true }).match(baseFilter).eq('status', 'enriched'),
        supabase.from('songs').select('*', { count: 'exact', head: true }).match(baseFilter).eq('status', 'error'),
        supabase.from('songs').select('*', { count: 'exact', head: true }).match(baseFilter).not('lyrics', 'is', null).neq('lyrics', ''),
        supabase.from('songs').select('*', { count: 'exact', head: true }).match(baseFilter).not('youtube_url', 'is', null),
        supabase.from('songs').select('*', { count: 'exact', head: true }).match(baseFilter).not('composer', 'is', null).neq('composer', ''),
        supabase.from('artists').select('*', { count: 'exact', head: true }).match(corpusFilter ? { corpus_id: corpusFilter } : {}),
        supabase.from('songs').select('confidence_score').match(baseFilter).not('confidence_score', 'is', null).limit(1000),
        supabase.from('corpora').select('id, name, color')
      ]);

      const avgConfidence = confidenceRes.data?.length
        ? confidenceRes.data.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / confidenceRes.data.length
        : 0;

      // Corpus breakdown (paralelo)
      const corpora = corporaRes.data || [];
      const corpusBreakdown: CorpusBreakdown[] = [];

      if (corpora.length > 0) {
        const results = await Promise.all(corpora.map(async (corpus) => {
          const [sc, ac, pc, ec, erc, lc, yc, cc] = await Promise.all([
            supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id),
            supabase.from('artists').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id),
            supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).eq('status', 'pending'),
            supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).eq('status', 'enriched'),
            supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).eq('status', 'error'),
            supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).not('lyrics', 'is', null),
            supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).not('youtube_url', 'is', null),
            supabase.from('songs').select('*', { count: 'exact', head: true }).eq('corpus_id', corpus.id).not('composer', 'is', null)
          ]);
          if ((sc.count || 0) > 0) {
            return {
              corpusId: corpus.id, corpusName: corpus.name, color: corpus.color || '#8B5CF6',
              songCount: sc.count || 0, artistCount: ac.count || 0, avgConfidence: 0,
              songsWithLyrics: lc.count || 0, songsWithYouTube: yc.count || 0, songsWithComposer: cc.count || 0,
              pendingSongs: pc.count || 0, enrichedSongs: ec.count || 0, errorSongs: erc.count || 0
            };
          }
          return null;
        }));
        corpusBreakdown.push(...results.filter((r): r is CorpusBreakdown => r !== null));
      }

      // Weekly trend (agregado - elimina N+1)
      const weeklyTrend: { date: string; enriched: number; pending: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        weeklyTrend.push({ date: d.toISOString().split('T')[0], enriched: 0, pending: 0 });
      }

      return {
        totalSongs: totalRes.count || 0, totalArtists: artistsRes.count || 0, avgConfidence,
        songsWithLyrics: lyricsRes.count || 0, songsWithYouTube: ytRes.count || 0, songsWithComposer: composerRes.count || 0,
        pendingSongs: pendingRes.count || 0, enrichedSongs: enrichedRes.count || 0, errorSongs: errorRes.count || 0,
        corpusBreakdown, weeklyTrend
      };
    },
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const debouncedRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastRefetchRef.current < REALTIME_DEBOUNCE_MS) {
      if (!pendingRefetchRef.current) {
        pendingRefetchRef.current = setTimeout(() => {
          lastRefetchRef.current = Date.now();
          queryResult.refetch();
          pendingRefetchRef.current = null;
        }, REALTIME_DEBOUNCE_MS);
      }
      return;
    }
    lastRefetchRef.current = now;
    queryResult.refetch();
  }, [queryResult]);

  useEffect(() => {
    const channel = supabase.channel('catalog-stats-opt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, debouncedRefetch)
      .subscribe();
    return () => {
      if (pendingRefetchRef.current) clearTimeout(pendingRefetchRef.current);
      supabase.removeChannel(channel);
    };
  }, [debouncedRefetch]);

  const forceRefetch = useCallback(() => {
    lastRefetchRef.current = 0;
    return queryResult.refetch();
  }, [queryResult]);

  return { ...queryResult, forceRefetch };
}
