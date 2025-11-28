import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/loggerFactory';
import { useSemanticAnnotationJob } from './useSemanticAnnotationJob';

const log = createLogger('useSemanticAnnotationCatalog');

interface SongCoverage {
  songId: string;
  totalWords: number;
  cachedWords: number;
  coverage: number;
}

export function useSemanticAnnotationCatalog() {
  const [annotatingSongIds, setAnnotatingSongIds] = useState<Set<string>>(new Set());
  const [annotatingArtistIds, setAnnotatingArtistIds] = useState<Set<string>>(new Set());
  const [songProgress, setSongProgress] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  
  // Reutilizar hook existente para anotação de artistas
  const { startJob: startArtistJob, job: artistJob } = useSemanticAnnotationJob();

  /**
   * Verificar cobertura de uma música no cache
   */
  const checkSongCoverage = useCallback(async (songId: string): Promise<SongCoverage | null> => {
    try {
      // Buscar música e contar palavras
      const { data: song } = await supabase
        .from('songs')
        .select('lyrics')
        .eq('id', songId)
        .single();

      if (!song?.lyrics) return null;

      const words = song.lyrics
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^\wáàâãéèêíïóôõöúçñ]/gi, ''))
        .filter(w => w.length > 1);

      const totalWords = words.length;

      // Contar palavras no cache
      const { count: cachedCount } = await supabase
        .from('semantic_disambiguation_cache')
        .select('*', { count: 'exact', head: true })
        .eq('song_id', songId);

      const cachedWords = cachedCount || 0;
      const coverage = totalWords > 0 ? (cachedWords / totalWords) * 100 : 0;

      log.info('Song coverage checked', { songId, totalWords, cachedWords, coverage });

      return {
        songId,
        totalWords,
        cachedWords,
        coverage,
      };
    } catch (error) {
      log.error('Error checking song coverage', error as Error);
      return null;
    }
  }, []);

  /**
   * Anotar música individual
   */
  const annotateSong = useCallback(async (songId: string, songTitle: string) => {
    if (annotatingSongIds.has(songId)) {
      log.warn('Song already being annotated', { songId });
      return;
    }

    setAnnotatingSongIds(prev => new Set(prev).add(songId));
    setSongProgress(prev => new Map(prev).set(songId, 0));

    try {
      log.info('Starting song annotation', { songId, songTitle });

      toast({
        title: "Anotando semanticamente",
        description: `Processando "${songTitle}"...`,
      });

      const { data, error } = await supabase.functions.invoke('annotate-single-song', {
        body: { songId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao anotar música');
      }

      log.success('Song annotation complete', {
        songId,
        stats: data.stats,
      });

      toast({
        title: "✅ Anotação concluída!",
        description: `"${songTitle}" processada: ${data.stats.processedWords} palavras (${data.stats.cachedWords} cache, ${data.stats.newWords} novas)`,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Error annotating song', error as Error, { songId });
      
      toast({
        title: "Erro ao anotar música",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setAnnotatingSongIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
      setSongProgress(prev => {
        const next = new Map(prev);
        next.delete(songId);
        return next;
      });
    }
  }, [annotatingSongIds, toast]);

  /**
   * Anotar todas as músicas de um artista (delega para useSemanticAnnotationJob)
   */
  const annotateArtist = useCallback(async (artistId: string, artistName: string) => {
    if (annotatingArtistIds.has(artistId)) {
      log.warn('Artist already being annotated', { artistId });
      return null;
    }

    setAnnotatingArtistIds(prev => new Set(prev).add(artistId));

    try {
      log.info('Starting artist annotation', { artistId, artistName });

      toast({
        title: "Iniciando anotação semântica",
        description: `Processando todas as músicas de ${artistName}...`,
      });

      const jobId = await startArtistJob(artistName);
      
      if (!jobId) {
        throw new Error('Falha ao iniciar job de anotação');
      }

      log.success('Artist annotation job started', { artistId, artistName, jobId });

      return jobId;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Error annotating artist', error as Error, { artistId });
      
      toast({
        title: "Erro ao anotar artista",
        description: errorMsg,
        variant: "destructive",
      });

      return null;
    } finally {
      setAnnotatingArtistIds(prev => {
        const next = new Set(prev);
        next.delete(artistId);
        return next;
      });
    }
  }, [annotatingArtistIds, startArtistJob, toast]);

  return {
    annotateSong,
    annotateArtist,
    checkSongCoverage,
    isAnnotatingSong: (songId: string) => annotatingSongIds.has(songId),
    isAnnotatingArtist: (artistId: string) => annotatingArtistIds.has(artistId),
    songProgress,
    artistJob,
  };
}
