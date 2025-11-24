/**
 * Hook para gerenciar dados do catálogo (songs, artists, stats)
 * FASE 1: Separação de responsabilidades
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SongWithRelations, ArtistWithRelations, CatalogStats } from '@/types/music';

export function useCatalogData() {
  const [songs, setSongs] = useState<SongWithRelations[]>([]);
  const [artists, setArtists] = useState<ArtistWithRelations[]>([]);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSongs = async () => {
    console.log('[useCatalogData] ⚠️ ATENÇÃO: Carregando apenas 1000 músicas mais recentes (limite Supabase)');
    
    try {
      const { data, error: fetchError } = await supabase
        .from('songs')
        .select(`
          *,
          artists (
            id,
            name,
            genre,
            normalized_name
          ),
          corpora (
            id,
            name,
            color
          )
        `)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      console.log(`[useCatalogData] Loaded ${data?.length || 0} songs`);
      setSongs((data as SongWithRelations[]) || []);
    } catch (err) {
      console.error('[useCatalogData] Error loading songs:', err);
      throw err;
    }
  };

  const loadArtists = async () => {
    console.log('[useCatalogData] Loading artists from materialized view...');
    
    try {
      const { data, error: fetchError } = await supabase
        .from('artist_stats_mv')
        .select('*')
        .order('artist_name', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      console.log(`[useCatalogData] Loaded ${data?.length || 0} artists with stats`);
      
      // Transformar para o formato ArtistWithRelations + stats
      const artistsWithStats = data?.map(row => ({
        id: row.artist_id,
        name: row.artist_name,
        normalized_name: row.normalized_name,
        genre: row.genre,
        corpus_id: row.corpus_id,
        created_at: '',
        updated_at: '',
        biography: null,
        biography_source: null,
        biography_updated_at: null,
        corpora: row.corpus_name ? {
          id: row.corpus_id,
          name: row.corpus_name,
          color: row.corpus_color
        } : null,
        totalSongs: row.total_songs,
        pendingSongs: row.pending_songs,
        enrichedSongs: row.enriched_songs,
        errorSongs: row.error_songs
      })) || [];
      
      setArtists(artistsWithStats as any);
    } catch (err) {
      console.error('[useCatalogData] Error loading artists:', err);
      throw err;
    }
  };

  const loadStats = async () => {
    console.log('[useCatalogData] Loading stats from aggregated queries...');
    
    try {
      // Query otimizada 1: Contar total de músicas por status
      const { data: statusCounts } = await supabase
        .from('songs')
        .select('status')
        .in('status', ['pending', 'enriched', 'error']);

      // Query otimizada 2: Contar total de artistas
      const { count: artistCount } = await supabase
        .from('artists')
        .select('id', { count: 'exact', head: true });

      // Query otimizada 3: Calcular média de confidence
      const { data: confidenceData } = await supabase
        .from('songs')
        .select('confidence_score')
        .not('confidence_score', 'is', null);
      
      const totalSongs = statusCounts?.length || 0;
      const pendingSongs = statusCounts?.filter(s => s.status === 'pending').length || 0;
      const enrichedSongs = statusCounts?.filter(s => s.status === 'enriched').length || 0;
      const errorSongs = statusCounts?.filter(s => s.status === 'error').length || 0;
      
      const avgConfidence = confidenceData && confidenceData.length > 0
        ? Math.round(
            confidenceData.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / confidenceData.length
          )
        : 0;

      const calculatedStats: CatalogStats = {
        totalSongs,
        totalArtists: artistCount || 0,
        pendingSongs,
        enrichedSongs,
        errorSongs,
        avgConfidence
      };

      console.log('[useCatalogData] Stats:', calculatedStats);
      setStats(calculatedStats);
    } catch (err) {
      console.error('[useCatalogData] Error loading stats:', err);
      throw err;
    }
  };

  const reload = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadSongs(),
        loadArtists(),
        loadStats()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useCatalogData] Error reloading data:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { 
    songs, 
    artists, 
    stats, 
    loading, 
    error, 
    reload 
  };
}
