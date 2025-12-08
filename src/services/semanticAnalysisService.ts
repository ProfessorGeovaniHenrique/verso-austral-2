/**
 * 🎯 SEMANTIC ANALYSIS SERVICE
 * 
 * Interface com annotate-semantic-domain edge function
 * para classificação semântica em tempo real
 */

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('semanticAnalysisService');

export interface SemanticAnnotation {
  palavra: string;
  tagset_primario: string;
  tagset_codigo: string;
  dominio_nome: string;
  cor: string;
  confianca: number;
  prosody: 'Positiva' | 'Negativa' | 'Neutra';
}

export interface SemanticAnalysisResult {
  annotations: SemanticAnnotation[];
  totalPalavras: number;
  palavrasClassificadas: number;
  dominiosEncontrados: number;
}

/**
 * SPRINT AUD-P0 (A-1): Chunking progressivo para >500 palavras
 * Processa palavras em chunks para evitar timeout da edge function
 */
const CHUNK_SIZE = 100; // Palavras por chunk para evitar timeout
const CHUNK_DELAY_MS = 500; // Delay entre chunks para rate limiting

export interface SemanticAnalysisProgress {
  processed: number;
  total: number;
  currentChunk: number;
  totalChunks: number;
  percentage: number;
}

/**
 * Analisa domínios semânticos de uma lista de palavras
 * Suporta chunking progressivo para grandes volumes (>500 palavras)
 */
export async function analyzeSemanticDomains(
  words: string[],
  context?: string,
  onProgress?: (progress: SemanticAnalysisProgress) => void
): Promise<SemanticAnalysisResult> {
  try {
    log.info('Analyzing semantic domains', { wordsCount: words.length });

    // Se <= 100 palavras, processar diretamente
    if (words.length <= CHUNK_SIZE) {
      return await processChunk(words, context);
    }

    // SPRINT AUD-P0: Chunking progressivo para >100 palavras
    const chunks: string[][] = [];
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      chunks.push(words.slice(i, i + CHUNK_SIZE));
    }

    log.info('Processing in chunks', { 
      totalWords: words.length, 
      chunks: chunks.length, 
      chunkSize: CHUNK_SIZE 
    });

    const allAnnotations: SemanticAnnotation[] = [];
    let processedWords = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Report progress
      if (onProgress) {
        onProgress({
          processed: processedWords,
          total: words.length,
          currentChunk: i + 1,
          totalChunks: chunks.length,
          percentage: Math.round((processedWords / words.length) * 100)
        });
      }

      try {
        const result = await processChunk(chunk, context);
        allAnnotations.push(...result.annotations);
        processedWords += chunk.length;
        
        log.debug(`Chunk ${i + 1}/${chunks.length} completed`, {
          chunkSize: chunk.length,
          annotated: result.annotations.length
        });
      } catch (chunkError) {
        log.warn(`Chunk ${i + 1} failed, continuing with remaining chunks`, chunkError);
        processedWords += chunk.length;
        // Continue with remaining chunks instead of failing entirely
      }

      // Rate limiting delay between chunks (skip after last chunk)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        processed: words.length,
        total: words.length,
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        percentage: 100
      });
    }

    const dominiosUnicos = new Set(allAnnotations.map(a => a.dominio_nome));

    log.info('Chunked analysis complete', { 
      totalWords: words.length,
      annotated: allAnnotations.length,
      domains: dominiosUnicos.size,
      chunks: chunks.length
    });

    return {
      annotations: allAnnotations,
      totalPalavras: words.length,
      palavrasClassificadas: allAnnotations.length,
      dominiosEncontrados: dominiosUnicos.size
    };
  } catch (error) {
    log.error('Error analyzing semantic domains', error as Error);
    throw error;
  }
}

/**
 * Processa um único chunk de palavras
 */
async function processChunk(
  words: string[],
  context?: string
): Promise<SemanticAnalysisResult> {
  const { data, error } = await supabase.functions.invoke('annotate-semantic-domain', {
    body: { words, context }
  });

  if (error) {
    log.error('Error calling annotate-semantic-domain', error);
    throw error;
  }

  if (!data || !data.annotations) {
    throw new Error('Resposta inválida da edge function');
  }

  const annotations: SemanticAnnotation[] = data.annotations;
  const dominiosUnicos = new Set(annotations.map(a => a.dominio_nome));

  return {
    annotations,
    totalPalavras: words.length,
    palavrasClassificadas: annotations.length,
    dominiosEncontrados: dominiosUnicos.size
  };
}

/**
 * Busca tagset por código
 */
export async function getTagsetByCode(codigo: string) {
  try {
    const { data, error } = await supabase
      .from('semantic_tagset')
      .select('*')
      .eq('codigo', codigo)
      .eq('status', 'ativo')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error fetching tagset', error as Error, { codigo });
    return null;
  }
}

/**
 * Lista todos os domínios N1 ativos
 */
export async function getAllN1Domains() {
  try {
    const { data, error } = await supabase
      .from('semantic_tagset')
      .select('codigo, nome, cor, nivel_profundidade')
      .eq('status', 'ativo')
      .eq('nivel_profundidade', 1)
      .order('codigo');

    if (error) throw error;
    
    log.info('N1 domains loaded', { count: data?.length || 0 });
    return data || [];
  } catch (error) {
    log.error('Error fetching N1 domains', error as Error);
    return [];
  }
}
