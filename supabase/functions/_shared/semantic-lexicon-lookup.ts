/**
 * Lookup Hierárquico no Semantic Lexicon
 * 
 * Camada de cache permanente entre cache volátil e API calls.
 * Reduz drasticamente chamadas Gemini usando léxico pré-classificado.
 */

import { createSupabaseClient } from './supabase.ts';

interface LexiconClassification {
  tagset_n1: string;
  tagset_n2?: string;
  tagset_n3?: string;
  tagset_n4?: string;
  confianca: number;
  fonte: string;
  lema?: string;
  pos?: string;
}

// Cache em memória com TTL
const memoryCache = new Map<string, { data: LexiconClassification; timestamp: number }>();
const CACHE_TTL_MS = 3600000; // 1 hora

/**
 * Busca classificação no semantic_lexicon
 * @param palavra - palavra normalizada
 * @returns classificação ou null se não encontrada
 */
export async function getLexiconClassification(
  palavra: string
): Promise<LexiconClassification | null> {
  
  // 1. Verificar cache em memória
  const cached = memoryCache.get(palavra);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }
  
  // 2. Buscar no banco de dados
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('semantic_lexicon')
    .select('tagset_n1, tagset_n2, tagset_n3, tagset_n4, confianca, fonte, lema, pos')
    .eq('palavra', palavra)
    .maybeSingle();
  
  if (error) {
    console.error('[semantic-lexicon-lookup] Database error:', error);
    return null;
  }
  
  if (!data) {
    return null;
  }
  
  const classification: LexiconClassification = {
    tagset_n1: data.tagset_n1,
    tagset_n2: data.tagset_n2 || undefined,
    tagset_n3: data.tagset_n3 || undefined,
    tagset_n4: data.tagset_n4 || undefined,
    confianca: data.confianca,
    fonte: data.fonte,
    lema: data.lema || undefined,
    pos: data.pos || undefined
  };
  
  // 3. Armazenar em cache de memória
  memoryCache.set(palavra, { data: classification, timestamp: Date.now() });
  
  return classification;
}

/**
 * Busca palavra base no lexicon (para regras de herança)
 * @param baseWord - palavra base (sem sufixo/prefixo)
 */
export async function getLexiconBase(
  baseWord: string
): Promise<{ tagset_n1: string; tagset_n2?: string } | null> {
  const classification = await getLexiconClassification(baseWord);
  if (!classification) return null;
  
  return {
    tagset_n1: classification.tagset_n1,
    tagset_n2: classification.tagset_n2
  };
}

/**
 * Salva nova classificação no lexicon
 * (usado para promover cache → lexicon após múltiplos hits)
 */
export async function saveLexiconClassification(
  palavra: string,
  classification: {
    lema?: string;
    pos?: string;
    tagset_n1: string;
    tagset_n2?: string;
    tagset_n3?: string;
    tagset_n4?: string;
    confianca: number;
    fonte: 'gemini_flash' | 'gpt5' | 'morfologico' | 'heranca' | 'manual';
    origem_lexicon?: 'gutenberg' | 'dialectal' | 'corpus';
    frequencia_corpus?: number;
  }
): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  const { error } = await supabase
    .from('semantic_lexicon')
    .insert({
      palavra,
      lema: classification.lema,
      pos: classification.pos,
      tagset_n1: classification.tagset_n1,
      tagset_n2: classification.tagset_n2,
      tagset_n3: classification.tagset_n3,
      tagset_n4: classification.tagset_n4,
      confianca: classification.confianca,
      fonte: classification.fonte,
      origem_lexicon: classification.origem_lexicon,
      frequencia_corpus: classification.frequencia_corpus || 0
    })
    .select()
    .single();
  
  if (error) {
    // Se erro de duplicata, ignorar (já existe)
    if (error.code === '23505') {
      return true;
    }
    console.error('[semantic-lexicon-lookup] Insert error:', error);
    return false;
  }
  
  // Invalidar cache de memória
  memoryCache.delete(palavra);
  
  return true;
}

/**
 * Limpa cache de memória (usado após batch seeding)
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Retorna estatísticas do cache em memória
 */
export function getMemoryCacheStats() {
  return {
    entries: memoryCache.size,
    ttl_ms: CACHE_TTL_MS
  };
}
