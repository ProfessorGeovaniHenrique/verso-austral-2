import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CorpusType } from '@/data/types/corpus-tools.types';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useCorpusArtistsAndSongs');

interface Song {
  id: string;
  title: string;
}

/**
 * Hook para carregar artistas e músicas dinamicamente por corpus
 * Carrega artistas ao montar, músicas quando artista é selecionado
 */
export function useCorpusArtistsAndSongs(corpusType: CorpusType) {
  const [artists, setArtists] = useState<string[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);

  // Carregar artistas quando corpus mudar
  useEffect(() => {
    const loadArtists = async () => {
      setIsLoadingArtists(true);
      
      try {
        log.info('Loading artists for corpus', { corpusType });
        
        // Buscar corpus_id
        const { data: corpus, error: corpusError } = await supabase
          .from('corpora')
          .select('id')
          .eq('normalized_name', corpusType)
          .single();

        if (corpusError) throw corpusError;
        if (!corpus) {
          log.warn('Corpus not found', { corpusType });
          setArtists([]);
          return;
        }

        // Buscar artistas do corpus
        const { data: artistsData, error: artistsError } = await supabase
          .from('artists')
          .select('name')
          .eq('corpus_id', corpus.id)
          .order('name');

        if (artistsError) throw artistsError;

        const artistNames = artistsData?.map(a => a.name) || [];
        setArtists(artistNames);
        log.info('Artists loaded', { count: artistNames.length });
      } catch (error) {
        log.error('Error loading artists', error as Error);
        setArtists([]);
      } finally {
        setIsLoadingArtists(false);
      }
    };

    loadArtists();
  }, [corpusType]);

  // Carregar músicas quando artista mudar
  useEffect(() => {
    const loadSongs = async () => {
      if (!selectedArtist) {
        setSongs([]);
        return;
      }

      setIsLoadingSongs(true);

      try {
        log.info('Loading songs for artist', { selectedArtist, corpusType });

        // Buscar corpus_id
        const { data: corpus } = await supabase
          .from('corpora')
          .select('id')
          .eq('normalized_name', corpusType)
          .single();

        if (!corpus) {
          setSongs([]);
          return;
        }

        // Buscar músicas do artista
        const { data: songsData, error: songsError } = await supabase
          .from('songs')
          .select('id, title, artists!inner(name, corpus_id)')
          .eq('artists.corpus_id', corpus.id)
          .eq('artists.name', selectedArtist)
          .order('title');

        if (songsError) throw songsError;

        const songsList = songsData?.map(s => ({
          id: s.id,
          title: s.title
        })) || [];

        setSongs(songsList);
        log.info('Songs loaded', { count: songsList.length });
      } catch (error) {
        log.error('Error loading songs', error as Error);
        setSongs([]);
      } finally {
        setIsLoadingSongs(false);
      }
    };

    loadSongs();
  }, [selectedArtist, corpusType]);

  return {
    artists,
    songs,
    selectedArtist,
    setSelectedArtist,
    isLoadingArtists,
    isLoadingSongs
  };
}
