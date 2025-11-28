import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KWICData {
  leftContext: string;
  keyword: string;
  rightContext: string;
  source: string;
}

/**
 * Hook especializado para KWIC de música de estudo específica
 * Busca concordâncias diretamente do banco de dados
 */
export function useKWICFromStudySong() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [kwicData, setKwicData] = useState<KWICData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [songLyrics, setSongLyrics] = useState<string>('');
  const [songMetadata, setSongMetadata] = useState<{ artist: string; title: string } | null>(null);

  const loadSongData = useCallback(async (songId: string) => {
    try {
      const { data: song, error } = await supabase
        .from('songs')
        .select('title, lyrics, artists(name)')
        .eq('id', songId)
        .single();

      if (error) throw error;

      if (song && song.lyrics) {
        setSongLyrics(song.lyrics);
        setSongMetadata({
          artist: song.artists?.name || 'Artista desconhecido',
          title: song.title
        });
      }
    } catch (error) {
      console.error('[KWIC] Erro ao carregar letra:', error);
      toast.error('Erro ao carregar letra da música');
    }
  }, []);

  const generateKWICFromText = useCallback((text: string, palavra: string, contextWords: number = 5): KWICData[] => {
    const palavraLower = palavra.toLowerCase();
    const words = text.split(/\s+/);
    const results: KWICData[] = [];

    words.forEach((word, idx) => {
      if (word.toLowerCase().includes(palavraLower)) {
        const start = Math.max(0, idx - contextWords);
        const end = Math.min(words.length, idx + contextWords + 1);

        const leftContext = words.slice(start, idx).join(' ');
        const rightContext = words.slice(idx + 1, end).join(' ');

        results.push({
          leftContext,
          keyword: word,
          rightContext,
          source: songMetadata ? `${songMetadata.artist} - ${songMetadata.title}` : 'Música de Estudo'
        });
      }
    });

    return results;
  }, [songMetadata]);

  const openModal = useCallback(async (word: string) => {
    setSelectedWord(word);
    setIsOpen(true);
    setIsLoading(true);

    try {
      if (songLyrics) {
        const contexts = generateKWICFromText(songLyrics, word);
        setKwicData(contexts);

        if (contexts.length === 0) {
          toast.info(`Nenhuma ocorrência encontrada para "${word}" na música de estudo`);
        }
      } else {
        toast.warning('Aguarde o carregamento da letra da música');
      }
    } catch (error) {
      console.error('[KWIC] Erro ao gerar concordâncias:', error);
      toast.error('Erro ao buscar concordâncias');
    } finally {
      setIsLoading(false);
    }
  }, [songLyrics, generateKWICFromText]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setSelectedWord('');
    setKwicData([]);
  }, []);

  return {
    isOpen,
    closeModal,
    selectedWord,
    kwicData,
    isLoading,
    openModal,
    loadSongData,
    isReady: !!songLyrics
  };
}
