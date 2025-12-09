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
 * Sprint BUG-SEM-3: Configurações otimizadas + retry com backoff
 */
const CHUNK_SIZE = 100; // Palavras por chunk para evitar timeout
const CHUNK_DELAY_MS = 500; // Delay entre chunks para rate limiting
const MAX_RETRIES = 3; // Máximo de tentativas por chunk
const RETRY_BASE_DELAY_MS = 1000; // Delay base para retry (exponential backoff)

export interface SemanticAnalysisProgress {
  processed: number;
  total: number;
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  startedAt?: Date;
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

    const startedAt = new Date();
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Report progress with startedAt for ETA calculation
      if (onProgress) {
        onProgress({
          processed: processedWords,
          total: words.length,
          currentChunk: i + 1,
          totalChunks: chunks.length,
          percentage: Math.round((processedWords / words.length) * 100),
          startedAt
        });
      }

      // Sprint BUG-SEM-3: Retry with exponential backoff
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await processChunk(chunk, context);
          allAnnotations.push(...result.annotations);
          processedWords += chunk.length;
          
          log.debug(`Chunk ${i + 1}/${chunks.length} completed`, {
            chunkSize: chunk.length,
            annotated: result.annotations.length,
            attempt
          });
          
          lastError = null;
          break; // Success, exit retry loop
        } catch (chunkError) {
          lastError = chunkError as Error;
          const isRateLimited = String(chunkError).includes('429') || String(chunkError).includes('rate');
          
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            log.warn(`Chunk ${i + 1} attempt ${attempt} failed, retrying in ${delay}ms`, { 
              error: String(chunkError),
              isRateLimited 
            });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If all retries failed, log and continue
      if (lastError) {
        log.error(`Chunk ${i + 1} failed after ${MAX_RETRIES} attempts`, lastError);
        processedWords += chunk.length;
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
        percentage: 100,
        startedAt
      });
    }

    const dominiosUnicos = new Set(allAnnotations.map(a => a.dominio_nome));

    log.info('Chunked analysis complete', { 
      totalWords: words.length,
      annotated: allAnnotations.length,
      domains: dominiosUnicos.size,
      chunks: chunks.length,
      durationMs: Date.now() - startedAt.getTime()
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
 * Interface para resposta da edge function
 */
interface EdgeFunctionResponse {
  success?: boolean;
  annotations?: SemanticAnnotation[];
  totalPalavras?: number;
  palavrasClassificadas?: number;
  dominiosEncontrados?: number;
  error?: string;
}

/**
 * Valida se uma annotation tem estrutura válida
 */
function isValidAnnotation(ann: unknown): ann is SemanticAnnotation {
  if (!ann || typeof ann !== 'object') return false;
  const a = ann as Record<string, unknown>;
  return typeof a.palavra === 'string' && a.palavra.length > 0 &&
         typeof a.tagset_codigo === 'string' && a.tagset_codigo.length > 0;
}

/**
 * Processa um único chunk de palavras com validação robusta
 */
async function processChunk(
  words: string[],
  context?: string
): Promise<SemanticAnalysisResult> {
  const { data, error } = await supabase.functions.invoke('annotate-semantic-domain', {
    body: { words, context }
  });

  // Fase 2.1: Validação de erro de invocação
  if (error) {
    log.error('Edge function invocation error', error);
    throw new Error(`Erro de comunicação com servidor: ${error.message || 'Falha na invocação'}`);
  }

  // Fase 2.1: Validação de resposta nula
  if (!data) {
    log.error('Edge function returned null data');
    throw new Error('Servidor retornou resposta vazia');
  }

  const response = data as EdgeFunctionResponse;

  // Fase 2.1: Validação de sucesso explícito
  if (response.success === false) {
    const errorMessage = response.error || 'Falha no processamento semântico';
    log.error(`Edge function returned success=false: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // Fase 2.1: Validação de annotations como array
  if (!response.annotations || !Array.isArray(response.annotations)) {
    log.error(`Invalid annotations structure - hasField: ${!!response.annotations}, isArray: ${Array.isArray(response.annotations)}`);
    throw new Error('Resposta inválida: annotations não é um array');
  }

  // Fase 2.1: Filtrar annotations inválidas
  const validAnnotations = response.annotations.filter(isValidAnnotation);
  const invalidCount = response.annotations.length - validAnnotations.length;
  
  if (invalidCount > 0) {
    log.warn('Filtered invalid annotations', { 
      total: response.annotations.length, 
      valid: validAnnotations.length, 
      invalid: invalidCount 
    });
  }

  const dominiosUnicos = new Set(validAnnotations.map(a => a.dominio_nome));

  log.debug('Chunk processed successfully', {
    requested: words.length,
    classified: validAnnotations.length,
    domains: dominiosUnicos.size
  });

  return {
    annotations: validAnnotations,
    totalPalavras: words.length,
    palavrasClassificadas: validAnnotations.length,
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
