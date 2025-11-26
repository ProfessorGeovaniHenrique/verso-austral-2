/**
 * 🎯 GUTENBERG POS LOOKUP
 * 
 * Fallback de classe gramatical usando Gutenberg (64k+ palavras)
 * Layer 2.5 entre spaCy e Gemini
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

interface GutenbergPOSResult {
  lema: string;
  pos: string;
  posDetalhada: string;
  fonte: string;
  confianca: number;
}

/**
 * Mapeamento de notação Gutenberg → POS padrão Universal Dependencies
 */
const GUTENBERG_TO_POS: Record<string, { pos: string; posDetalhada: string }> = {
  // Substantivos
  '_m._': { pos: 'NOUN', posDetalhada: 'NOUN' },
  '_f._': { pos: 'NOUN', posDetalhada: 'NOUN' },
  '_s. m._': { pos: 'NOUN', posDetalhada: 'NOUN' },
  '_s. f._': { pos: 'NOUN', posDetalhada: 'NOUN' },
  '_s. 2 g._': { pos: 'NOUN', posDetalhada: 'NOUN' },
  
  // Adjetivos
  '_adj._': { pos: 'ADJ', posDetalhada: 'ADJ' },
  '_adj. 2 g._': { pos: 'ADJ', posDetalhada: 'ADJ' },
  
  // Verbos
  '_v. t._': { pos: 'VERB', posDetalhada: 'VERB' },
  '_v. i._': { pos: 'VERB', posDetalhada: 'VERB' },
  '_v. p._': { pos: 'VERB', posDetalhada: 'VERB' },
  '_v. t. d._': { pos: 'VERB', posDetalhada: 'VERB' },
  '_v. t. i._': { pos: 'VERB', posDetalhada: 'VERB' },
  '_v._': { pos: 'VERB', posDetalhada: 'VERB' },
  
  // Advérbios
  '_adv._': { pos: 'ADV', posDetalhada: 'ADV' },
  '_loc. adv._': { pos: 'ADV', posDetalhada: 'ADV' },
  
  // Interjeições
  '_interj._': { pos: 'INTJ', posDetalhada: 'INTJ' },
  
  // Preposições
  '_prep._': { pos: 'ADP', posDetalhada: 'ADP' },
  '_loc. prep._': { pos: 'ADP', posDetalhada: 'ADP' },
  
  // Conjunções
  '_conj._': { pos: 'CCONJ', posDetalhada: 'CCONJ' },
  '_conj. subord._': { pos: 'SCONJ', posDetalhada: 'SCONJ' },
  
  // Pronomes
  '_pron._': { pos: 'PRON', posDetalhada: 'PRON' },
  '_pron. pess._': { pos: 'PRON', posDetalhada: 'PRON' },
  
  // Prefixos e Sufixos (Marcadores Gramaticais)
  '_pref._': { pos: 'X', posDetalhada: 'X' },
  '_suf._': { pos: 'X', posDetalhada: 'X' },
};

// Cache em memória
let gutenbergCache: Map<string, GutenbergPOSResult> | null = null;
let cacheLoadedAt: number | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

/**
 * Carrega dados do Gutenberg e cacheia
 */
async function loadGutenbergCache(): Promise<Map<string, GutenbergPOSResult>> {
  // Verificar cache válido
  if (gutenbergCache && cacheLoadedAt && (Date.now() - cacheLoadedAt < CACHE_TTL_MS)) {
    return gutenbergCache;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query apenas entradas com classe_gramatical
  const { data: entries, error } = await supabase
    .from('gutenberg_lexicon')
    .select('verbete_normalizado, classe_gramatical')
    .not('classe_gramatical', 'is', null)
    .limit(64000); // ~64k palavras

  if (error) {
    console.error('Error loading Gutenberg:', error);
    return new Map();
  }

  const cache = new Map<string, GutenbergPOSResult>();

  entries?.forEach(entry => {
    const palavra = entry.verbete_normalizado.toLowerCase();
    const classeGramatical = entry.classe_gramatical?.trim() || '';

    // Mapear para POS padrão
    const posMapping = GUTENBERG_TO_POS[classeGramatical];
    
    if (posMapping) {
      cache.set(palavra, {
        lema: palavra, // Gutenberg já tem forma canônica
        pos: posMapping.pos,
        posDetalhada: posMapping.posDetalhada,
        fonte: 'gutenberg',
        confianca: 0.92, // Alta confiança (dicionário histórico)
      });
    }
  });

  // Atualizar cache
  gutenbergCache = cache;
  cacheLoadedAt = Date.now();

  console.log(`✅ Gutenberg POS cache loaded: ${cache.size} palavras`);

  return cache;
}

/**
 * Busca POS no Gutenberg
 */
export async function getGutenbergPOS(palavra: string): Promise<GutenbergPOSResult | null> {
  const cache = await loadGutenbergCache();
  return cache.get(palavra.toLowerCase()) || null;
}

/**
 * Estatísticas do cache Gutenberg
 */
export function getGutenbergCacheStats() {
  if (!gutenbergCache) return null;

  const posCounts: Record<string, number> = {};
  
  gutenbergCache.forEach(entry => {
    posCounts[entry.pos] = (posCounts[entry.pos] || 0) + 1;
  });

  return {
    totalEntries: gutenbergCache.size,
    cacheAge: cacheLoadedAt ? Date.now() - cacheLoadedAt : 0,
    posDistribution: posCounts,
  };
}
