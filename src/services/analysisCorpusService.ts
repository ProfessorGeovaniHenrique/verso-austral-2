/**
 * 🎯 ANALYSIS CORPUS SERVICE
 * 
 * Serviço unificado para carregamento e processamento de corpus
 * para as ferramentas de análise estilística (Página 3)
 */

import { supabase } from '@/integrations/supabase/client';
import { CorpusCompleto, SongEntry, SongMetadata } from '@/data/types/full-text-corpus.types';
import { CorpusWord } from '@/data/types/corpus-tools.types';
import { CorpusSelection } from '@/contexts/AnalysisToolsContext';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('analysisCorpusService');

export type AnalysisCorpusType = 'gaucho' | 'nordestino' | 'sertanejo';

export interface CorpusStats {
  tokens: number;      // Total de palavras (incluindo repetições)
  types: number;       // Tipos únicos (vocabulário)
  ttr: number;         // Type-Token Ratio (types/tokens * 100)
  songs: number;       // Total de músicas
  avgWordsPerSong: number;
}

export interface LoadedCorpus {
  corpus: CorpusCompleto;
  wordFrequency: CorpusWord[];
  stats: CorpusStats;
}

/**
 * Carrega corpus baseado na seleção do usuário
 */
export async function loadAnalysisCorpus(
  selection: CorpusSelection
): Promise<LoadedCorpus | null> {
  if (!selection) return null;
  
  try {
    if (selection.type === 'platform') {
      return loadPlatformCorpus(
        selection.platformCorpus as AnalysisCorpusType,
        selection.platformArtist
      );
    } else if (selection.type === 'user' && selection.userCorpus) {
      return parseUserCorpus(selection.userCorpus.content, selection.userCorpus.name);
    }
    
    return null;
  } catch (error) {
    log.error('Failed to load analysis corpus', error as Error);
    throw error;
  }
}

/**
 * Carrega corpus da plataforma (Gaúcho, Nordestino, Sertanejo)
 */
async function loadPlatformCorpus(
  corpusType: AnalysisCorpusType,
  artistFilter?: string
): Promise<LoadedCorpus> {
  log.info('Loading platform corpus', { corpusType, artistFilter });
  
  // Buscar corpus_id pelo normalized_name
  const { data: corporaData, error: corporaError } = await supabase
    .from('corpora')
    .select('id')
    .eq('normalized_name', corpusType)
    .single();

  if (corporaError || !corporaData) {
    const errorMsg = `Corpus "${corpusType}" não encontrado no banco de dados`;
    log.error('Corpus not found', undefined, { corpusType });
    throw new Error(errorMsg);
  }

  const corpusId = corporaData.id;
  
  // Query base para músicas com letras
  let query = supabase
    .from('songs')
    .select(`
      id,
      title,
      lyrics,
      release_year,
      artists!inner (
        id,
        name,
        corpus_id
      )
    `)
    .not('lyrics', 'is', null)
    .eq('artists.corpus_id', corpusId);
  
  // Filtro por artista se especificado
  if (artistFilter) {
    query = query.eq('artists.name', artistFilter);
  }
  
  const { data: songs, error } = await query;
  
  if (error) {
    log.error('Failed to load songs', error);
    throw new Error(`Erro ao carregar músicas: ${error.message}`);
  }
  
  if (!songs || songs.length === 0) {
    log.warn('No songs found', { corpusType, artistFilter });
    return createEmptyCorpus(corpusType);
  }
  
  // Processar músicas em CorpusCompleto
  const corpus = processsongsToCorpus(songs, corpusType);
  const wordFrequency = corpusToWordFrequency(corpus);
  const stats = calculateCorpusStats(corpus, wordFrequency);
  
  log.info('Corpus loaded successfully', { 
    songs: corpus.totalMusicas,
    tokens: stats.tokens,
    types: stats.types 
  });
  
  return { corpus, wordFrequency, stats };
}

/**
 * Processa array de músicas do banco em CorpusCompleto
 */
function processsongsToCorpus(
  songs: any[],
  corpusType: AnalysisCorpusType
): CorpusCompleto {
  const musicas: SongEntry[] = [];
  let posicaoGlobal = 0;
  
  for (const song of songs) {
    if (!song.lyrics || !song.artists) continue;
    
    const metadata: SongMetadata = {
      artista: song.artists.name,
      compositor: undefined,
      album: '',
      musica: song.title,
      ano: song.release_year || undefined,
      fonte: 'manual'
    };
    
    const letra = song.lyrics.trim();
    const linhas = letra.split('\n').filter((l: string) => l.trim());
    
    // Tokenização: preservar acentos, remover pontuação
    const palavras = letra
      .toLowerCase()
      .replace(/[^\wáéíóúâêôãõàèìòùäëïöüçñ\s-]/g, ' ')
      .split(/\s+/)
      .filter((p: string) => p.length > 0);
    
    if (palavras.length === 0) continue;
    
    musicas.push({
      metadata,
      letra,
      linhas,
      palavras,
      posicaoNoCorpus: posicaoGlobal
    });
    
    posicaoGlobal += palavras.length;
  }
  
  return {
    tipo: corpusType,
    totalMusicas: musicas.length,
    totalPalavras: musicas.reduce((sum, m) => sum + m.palavras.length, 0),
    musicas
  };
}

/**
 * Parseia corpus de texto do usuário
 */
function parseUserCorpus(content: string, name: string): LoadedCorpus {
  log.info('Parsing user corpus', { name, contentLength: content.length });
  
  // Tokenização simples
  const palavras = content
    .toLowerCase()
    .replace(/[^\wáéíóúâêôãõàèìòùäëïöüçñ\s-]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 0);
  
  // Criar entrada única como "documento"
  const musicas: SongEntry[] = [{
    metadata: {
      artista: 'Usuário',
      musica: name,
      album: '',
      fonte: 'manual'
    },
    letra: content,
    linhas: content.split('\n'),
    palavras,
    posicaoNoCorpus: 0
  }];
  
  const corpus: CorpusCompleto = {
    tipo: 'user' as any,
    totalMusicas: 1,
    totalPalavras: palavras.length,
    musicas
  };
  
  const wordFrequency = corpusToWordFrequency(corpus);
  const stats = calculateCorpusStats(corpus, wordFrequency);
  
  return { corpus, wordFrequency, stats };
}

/**
 * Converte CorpusCompleto para lista de CorpusWord (frequências)
 */
export function corpusToWordFrequency(corpus: CorpusCompleto): CorpusWord[] {
  // Contar frequências
  const freqMap = new Map<string, number>();
  const rangeMap = new Map<string, Set<number>>(); // Músicas onde aparece
  
  corpus.musicas.forEach((musica, musicaIdx) => {
    const seen = new Set<string>();
    
    musica.palavras.forEach(palavra => {
      freqMap.set(palavra, (freqMap.get(palavra) || 0) + 1);
      
      if (!seen.has(palavra)) {
        seen.add(palavra);
        if (!rangeMap.has(palavra)) rangeMap.set(palavra, new Set());
        rangeMap.get(palavra)!.add(musicaIdx);
      }
    });
  });
  
  // Calcular totais para normalização
  const totalTokens = corpus.totalPalavras;
  const totalDocs = corpus.totalMusicas;
  
  // Converter para array ordenado por frequência
  const words: CorpusWord[] = Array.from(freqMap.entries())
    .map(([headword, freq], idx) => ({
      headword,
      freq,
      rank: 0, // Será definido após ordenação
      range: rangeMap.get(headword)?.size || 0,
      normFreq: (freq / totalTokens) * 10000, // Por 10k palavras
      normRange: totalDocs > 0 ? ((rangeMap.get(headword)?.size || 0) / totalDocs) * 100 : 0
    }))
    .sort((a, b) => b.freq - a.freq)
    .map((word, idx) => ({ ...word, rank: idx + 1 }));
  
  return words;
}

/**
 * Calcula estatísticas do corpus
 */
function calculateCorpusStats(
  corpus: CorpusCompleto, 
  wordFreq: CorpusWord[]
): CorpusStats {
  const tokens = corpus.totalPalavras;
  const types = wordFreq.length;
  const ttr = tokens > 0 ? (types / tokens) * 100 : 0;
  const songs = corpus.totalMusicas;
  const avgWordsPerSong = songs > 0 ? tokens / songs : 0;
  
  return { tokens, types, ttr, songs, avgWordsPerSong };
}

/**
 * Cria corpus vazio (fallback)
 */
function createEmptyCorpus(corpusType: AnalysisCorpusType): LoadedCorpus {
  return {
    corpus: {
      tipo: corpusType,
      totalMusicas: 0,
      totalPalavras: 0,
      musicas: []
    },
    wordFrequency: [],
    stats: { tokens: 0, types: 0, ttr: 0, songs: 0, avgWordsPerSong: 0 }
  };
}

/**
 * Obtém lista de artistas por tipo de corpus
 */
export async function getArtistsByCorpusType(
  corpusType: AnalysisCorpusType
): Promise<{ id: string; name: string; songCount: number }[]> {
  log.info('Fetching artists', { corpusType });
  
  try {
    // Buscar corpus_id
    const { data: corporaData, error: corporaError } = await supabase
      .from('corpora')
      .select('id')
      .eq('normalized_name', corpusType)
      .single();
    
    if (corporaError || !corporaData) {
      log.warn('Corpus not found for artists', { corpusType });
      return [];
    }
    
    // Buscar artistas com contagem de músicas
    const { data: artists, error } = await supabase
      .from('artist_stats_secure')
      .select('artist_id, artist_name, total_songs')
      .eq('corpus_id', corporaData.id)
      .order('artist_name');
    
    if (error) {
      log.error('Failed to fetch artists', error);
      return [];
    }
    
    return (artists || []).map(a => ({
      id: a.artist_id,
      name: a.artist_name,
      songCount: a.total_songs || 0
    }));
    
  } catch (error) {
    log.error('Error fetching artists', error as Error);
    return [];
  }
}
