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
    console.log('[useCatalogData] Loading songs...');
    
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
    console.log('[useCatalogData] Loading artists...');
    
    try {
      const { data, error: fetchError } = await supabase
        .from('artists')
        .select(`
          *,
          corpora (
            id,
            name,
            color
          )
        `)
        .order('name', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      console.log(`[useCatalogData] Loaded ${data?.length || 0} artists`);
      setArtists((data as ArtistWithRelations[]) || []);
    } catch (err) {
      console.error('[useCatalogData] Error loading artists:', err);
      throw err;
    }
  };

  const loadStats = async () => {
    console.log('[useCatalogData] Loading stats...');
    
    try {
      const { data: allSongs, error: fetchError } = await supabase
        .from('songs')
        .select('status, confidence_score');
      
      if (fetchError) throw fetchError;

      const { count: artistCount } = await supabase
        .from('artists')
        .select('id', { count: 'exact', head: true });

      const totalSongs = allSongs?.length || 0;
      const pendingSongs = allSongs?.filter(s => s.status === 'pending').length || 0;
      const enrichedSongs = allSongs?.filter(s => s.status === 'enriched').length || 0;
      const errorSongs = allSongs?.filter(s => s.status === 'error').length || 0;
      
      const confidenceScores = allSongs
        ?.map(s => s.confidence_score)
        .filter((score): score is number => score !== null) || [];
      
      const avgConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
        : 0;

      const calculatedStats: CatalogStats = {
        totalSongs,
        totalArtists: artistCount || 0,
        pendingSongs,
        enrichedSongs,
        errorSongs,
        avgConfidence: Math.round(avgConfidence)
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
