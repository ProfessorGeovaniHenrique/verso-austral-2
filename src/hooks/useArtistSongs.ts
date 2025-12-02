/**
 * Hook para carregar músicas de um artista específico SOB DEMANDA
 * Soluciona o problema do limite de 1000 rows do Supabase
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SongWithRelations } from '@/types/music';

export function useArtistSongs(artistId: string | null) {
  const [songs, setSongs] = useState<SongWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArtistSongs = async () => {
    if (!artistId) {
      setSongs([]);
      return;
    }

    setLoading(true);
    setError(null);

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
        .eq('artist_id', artistId)
        .order('release_year', { ascending: false });

      if (fetchError) throw fetchError;

      setSongs((data as SongWithRelations[]) || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useArtistSongs] Error loading songs:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtistSongs();
  }, [artistId]);

  const reload = async () => {
    await loadArtistSongs();
  };

  return { songs, loading, error, reload };
}
