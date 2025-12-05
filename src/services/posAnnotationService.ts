/**
 * 🔬 POS ANNOTATION SERVICE
 * 
 * Handles Part-of-Speech tagging for corpus texts using backend Edge Function
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  POSToken, 
  POSAnnotatedSong, 
  CorpusComPOS, 
  POSStatistics,
  POSFilter,
  POSAnnotationRequest,
  POSAnnotationResponse
} from '@/data/types/pos-annotation.types';
import type { CorpusCompleto } from '@/data/types/full-text-corpus.types';

/**
 * Annotate a single text with POS tags
 */
export async function annotatePOS(texto: string, idioma: 'pt' | 'es' = 'pt'): Promise<POSToken[]> {
  try {
    const request: POSAnnotationRequest = { texto, idioma };
    
    const { data, error } = await supabase.functions.invoke<POSAnnotationResponse>('annotate-pos', {
      body: request
    });

    if (error) {
      console.error('[POS] Erro ao anotar texto:', error);
      throw new Error(`Erro na anotação POS: ${error.message}`);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.tokens || [];
  } catch (error) {
    console.error('[POS] Erro na chamada do serviço:', error);
    throw error;
  }
}

/**
 * Progress callback type for corpus annotation
 */
export type POSAnnotationProgressCallback = (processed: number, total: number, currentSong: string) => void;

/**
 * Annotate entire corpus with POS tags
 * @param corpus - Corpus to annotate
 * @param onProgress - Optional callback for progress updates
 */
export async function annotatePOSForCorpus(
  corpus: CorpusCompleto,
  onProgress?: POSAnnotationProgressCallback
): Promise<CorpusComPOS> {
  console.log(`[POS] Anotando corpus ${corpus.tipo} com ${corpus.totalMusicas} músicas...`);
  
  const annotatedSongs: POSAnnotatedSong[] = [];
  const total = corpus.musicas.length;
  
  for (let i = 0; i < total; i++) {
    const musica = corpus.musicas[i];
    const texto = musica.letra;
    
    // Report progress before processing
    if (onProgress) {
      onProgress(i, total, musica.metadata.musica);
    }
    
    const tokens = await annotatePOS(texto);
    
    annotatedSongs.push({
      musicaId: `${musica.metadata.artista}-${musica.metadata.musica}`,
      metadata: musica.metadata,
      tokens
    });
    
    // Report progress after processing
    if (onProgress) {
      onProgress(i + 1, total, musica.metadata.musica);
    }
  }
  
  const totalTokens = annotatedSongs.reduce((sum, song) => sum + song.tokens.length, 0);
  
  console.log(`[POS] Corpus anotado: ${totalTokens} tokens em ${annotatedSongs.length} músicas`);
  
  return {
    tipo: corpus.tipo,
    totalMusicas: corpus.totalMusicas,
    totalPalavras: corpus.totalPalavras,
    totalTokens,
    musicas: annotatedSongs
  };
}

/**
 * Calculate POS statistics from annotated corpus
 */
export function getPOSStatistics(annotatedCorpus: CorpusComPOS): POSStatistics {
  const allTokens = annotatedCorpus.musicas.flatMap(m => m.tokens);
  const totalTokens = allTokens.length;
  
  // Count POS distribution
  const distribuicaoPOS: Record<string, number> = {};
  const temposVerbais: Record<string, number> = {};
  const lemasSet = new Map<string, { pos: string; freq: number }>();
  
  for (const token of allTokens) {
    // POS distribution
    distribuicaoPOS[token.pos] = (distribuicaoPOS[token.pos] || 0) + 1;
    
    // Verb tense distribution
    if (token.pos === 'VERB' && token.features.tempo) {
      temposVerbais[token.features.tempo] = (temposVerbais[token.features.tempo] || 0) + 1;
    }
    
    // Lemma frequency
    const key = `${token.lema}:${token.pos}`;
    const current = lemasSet.get(key);
    if (current) {
      current.freq++;
    } else {
      lemasSet.set(key, { pos: token.pos, freq: 1 });
    }
  }
  
  // Calculate percentages
  const distribuicaoPercentual: Record<string, number> = {};
  for (const [pos, count] of Object.entries(distribuicaoPOS)) {
    distribuicaoPercentual[pos] = (count / totalTokens) * 100;
  }
  
  // Top lemmas
  const lemasFrequentes = Array.from(lemasSet.entries())
    .map(([key, { pos, freq }]) => ({
      lema: key.split(':')[0],
      pos,
      frequencia: freq
    }))
    .sort((a, b) => b.frequencia - a.frequencia)
    .slice(0, 100);
  
  // Calculate lexical density: (NOUN + VERB + ADJ + ADV) / total
  const contentWords = ['NOUN', 'VERB', 'ADJ', 'ADV', 'PROPN'];
  const contentWordCount = contentWords.reduce((sum, pos) => sum + (distribuicaoPOS[pos] || 0), 0);
  const densidadeLexical = contentWordCount / totalTokens;
  
  // Type-Token Ratio
  const uniqueTokens = new Set(allTokens.map(t => t.palavra)).size;
  const typeTokenRatio = uniqueTokens / totalTokens;
  
  return {
    totalTokens,
    distribuicaoPOS,
    distribuicaoPercentual,
    lemasFrequentes,
    temposVerbais,
    densidadeLexical,
    typeTokenRatio
  };
}

/**
 * Filter tokens by POS criteria
 */
export function filterTokensByPOS(
  tokens: POSToken[], 
  filter: POSFilter
): POSToken[] {
  return tokens.filter(token => {
    // Filter by POS tags
    if (filter.posTags && !filter.posTags.includes(token.pos)) {
      return false;
    }
    
    // Filter by lemmas
    if (filter.lemmas && !filter.lemmas.includes(token.lema)) {
      return false;
    }
    
    // Filter by morphological features
    if (filter.features) {
      for (const [key, value] of Object.entries(filter.features)) {
        if (token.features[key] !== value) {
          return false;
        }
      }
    }
    
    return true;
  });
}

/**
 * Get all unique POS tags from corpus
 */
export function getUniquePOSTags(annotatedCorpus: CorpusComPOS): string[] {
  const tags = new Set<string>();
  
  for (const musica of annotatedCorpus.musicas) {
    for (const token of musica.tokens) {
      tags.add(token.pos);
    }
  }
  
  return Array.from(tags).sort();
}

/**
 * Get all unique lemmas for a specific POS
 */
export function getLemmasByPOS(annotatedCorpus: CorpusComPOS, pos: string): string[] {
  const lemmas = new Set<string>();
  
  for (const musica of annotatedCorpus.musicas) {
    for (const token of musica.tokens) {
      if (token.pos === pos) {
        lemmas.add(token.lema);
      }
    }
  }
  
  return Array.from(lemmas).sort();
}

/**
 * Cache keys for localStorage
 */
const CACHE_PREFIX = 'pos_annotation_';

export function getCachedAnnotation(corpusType: string): CorpusComPOS | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${corpusType}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function setCachedAnnotation(corpusType: string, data: CorpusComPOS): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${corpusType}`, JSON.stringify(data));
  } catch (error) {
    console.warn('[POS] Erro ao cachear anotações:', error);
  }
}
