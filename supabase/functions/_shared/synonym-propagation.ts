/**
 * 🎯 SYNONYM PROPAGATION
 * 
 * Propaga domínios semânticos via sinônimos do Rocha Pombo
 * Expande cobertura de 927 palavras-base para ~4,600 palavras (5x multiplicador)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

interface SynonymPropagationResult {
  propagated: number;
  synonyms: string[];
}

interface InheritedDomainResult {
  tagset_codigo: string;
  confianca: number;
  fonte: 'cache' | 'gemini_flash' | 'rule_based';
  justificativa: string;
  synonymSource: string;
}

// Cache em memória
let synonymCache: Map<string, string[]> | null = null;
let cacheLoadedAt: number | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

/**
 * Carrega sinônimos do Rocha Pombo e cacheia
 */
async function loadSynonymCache(): Promise<Map<string, string[]>> {
  // Verificar cache válido
  if (synonymCache && cacheLoadedAt && (Date.now() - cacheLoadedAt < CACHE_TTL_MS)) {
    return synonymCache;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query lexical_synonyms
  const { data: entries, error } = await supabase
    .from('lexical_synonyms')
    .select('palavra, sinonimos')
    .not('sinonimos', 'is', null);

  if (error) {
    console.error('Error loading synonyms:', error);
    return new Map();
  }

  const cache = new Map<string, string[]>();

  entries?.forEach(entry => {
    const palavra = entry.palavra.toLowerCase();
    const sinonimos = (entry.sinonimos || []).map((s: string) => s.toLowerCase());
    
    if (sinonimos.length > 0) {
      cache.set(palavra, sinonimos);
    }
  });

  // Atualizar cache
  synonymCache = cache;
  cacheLoadedAt = Date.now();

  console.log(`✅ Synonym cache loaded: ${cache.size} palavras com sinônimos`);

  return cache;
}

/**
 * Propaga domínio semântico para sinônimos
 * 
 * @param palavra - Palavra original que recebeu anotação
 * @param tagset_codigo - Código do domínio semântico
 * @param confianca - Confiança da anotação original
 * @returns Número de sinônimos propagados
 */
export async function propagateSemanticDomain(
  palavra: string,
  tagset_codigo: string,
  confianca: number
): Promise<SynonymPropagationResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const synonymCache = await loadSynonymCache();
  
  const sinonimos = synonymCache.get(palavra.toLowerCase()) || [];
  
  if (sinonimos.length === 0) {
    return { propagated: 0, synonyms: [] };
  }

  console.log(`🔄 Propagando domínio ${tagset_codigo} para ${sinonimos.length} sinônimos de "${palavra}"`);

  // Reduzir confiança para sinônimos (85% do original)
  const synonymConfidence = Math.max(0.70, confianca * 0.85);

  const propagationPromises = sinonimos.map(async (sinonimo) => {
    // Verificar se sinônimo já está no cache
    const { data: existing } = await supabase
      .from('semantic_disambiguation_cache')
      .select('id')
      .eq('palavra', sinonimo)
      .eq('contexto_hash', 'synonym_propagation')
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  Sinônimo "${sinonimo}" já está no cache`);
      return false;
    }

    // Inserir no cache
    const { error } = await supabase
      .from('semantic_disambiguation_cache')
      .insert({
        palavra: sinonimo,
        contexto_hash: 'synonym_propagation',
        lema: sinonimo,
        pos: null,
        tagset_codigo,
        confianca: synonymConfidence,
        fonte: 'synonym_propagation',
        justificativa: `Domínio herdado de sinônimo "${palavra}" (Rocha Pombo)`,
      });

    if (error) {
      console.error(`Erro ao propagar para "${sinonimo}":`, error);
      return false;
    }

    console.log(`✅ Propagado: "${sinonimo}" → ${tagset_codigo} (${synonymConfidence.toFixed(2)})`);
    return true;
  });

  const results = await Promise.all(propagationPromises);
  const propagated = results.filter(Boolean).length;

  return { propagated, synonyms: sinonimos };
}

/**
 * Herda domínio semântico de sinônimos quando palavra não tem classificação
 * 
 * @param palavra - Palavra a ser classificada
 * @returns Domínio herdado de sinônimo ou null
 */
export async function inheritDomainFromSynonyms(
  palavra: string
): Promise<InheritedDomainResult | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const synonymCache = await loadSynonymCache();

  // Buscar sinônimos da palavra
  const sinonimos = synonymCache.get(palavra.toLowerCase()) || [];
  
  if (sinonimos.length === 0) {
    return null;
  }

  console.log(`🔍 Verificando domínios dos ${sinonimos.length} sinônimos de "${palavra}"`);

  // Verificar cache para cada sinônimo
  for (const sinonimo of sinonimos) {
    const { data: synonymDomain, error } = await supabase
      .from('semantic_disambiguation_cache')
      .select('tagset_codigo, confianca, fonte')
      .eq('palavra', sinonimo)
      .order('confianca', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && synonymDomain) {
      console.log(`✅ Domínio herdado de sinônimo "${sinonimo}": ${synonymDomain.tagset_codigo}`);
      
      // Reduzir confiança para 80% quando herdado
      const inheritedConfidence = Math.max(0.65, synonymDomain.confianca * 0.80);

      return {
        tagset_codigo: synonymDomain.tagset_codigo,
        confianca: inheritedConfidence,
        fonte: 'rule_based',
        justificativa: `Domínio herdado de sinônimo "${sinonimo}" (confiança reduzida para ${(inheritedConfidence * 100).toFixed(0)}%)`,
        synonymSource: sinonimo,
      };
    }
  }

  console.log(`⚠️ Nenhum sinônimo de "${palavra}" tem domínio no cache`);
  return null;
}

/**
 * Estatísticas do cache de sinônimos
 */
export function getSynonymCacheStats() {
  if (!synonymCache) return null;

  let totalSynonyms = 0;
  synonymCache.forEach(syns => totalSynonyms += syns.length);

  return {
    totalBaseWords: synonymCache.size,
    totalSynonyms,
    averageSynonymsPerWord: totalSynonyms / synonymCache.size,
    cacheAge: cacheLoadedAt ? Date.now() - cacheLoadedAt : 0,
  };
}
