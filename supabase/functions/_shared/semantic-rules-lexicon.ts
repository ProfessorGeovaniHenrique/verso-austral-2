/**
 * 🎯 SEMANTIC RULES FROM DIALECTAL LEXICON
 * 
 * Enriquece regras de classificação semântica usando o dialectal_lexicon
 * Mapeia categorias temáticas para domínios N1
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

interface LexiconRule {
  palavra: string;
  tagset_codigo: string;
  confianca: number;
  justificativa: string;
}

/**
 * Mapeamento de categorias temáticas → Domínios N1
 */
const CATEGORY_TO_DOMAIN_MAP: Record<string, { codigo: string; nome: string }> = {
  // Natureza
  'fauna': { codigo: 'NA', nome: 'Natureza' },
  'flora': { codigo: 'NA', nome: 'Natureza' },
  'clima': { codigo: 'NA', nome: 'Natureza' },
  'geografia_natural': { codigo: 'NA', nome: 'Natureza' },
  
  // Atividades e Práticas
  'lida_campeira': { codigo: 'AP', nome: 'Atividades' },
  'gastronomia': { codigo: 'AP', nome: 'Atividades' },
  'transporte': { codigo: 'AP', nome: 'Atividades' },
  'trabalho_rural': { codigo: 'AP', nome: 'Atividades' },
  
  // Cultura e Conhecimento
  'musica_danca': { codigo: 'CC', nome: 'Cultura' },
  'literatura': { codigo: 'CC', nome: 'Cultura' },
  'tradicoes': { codigo: 'CC', nome: 'Cultura' },
  'religiosidade': { codigo: 'CC', nome: 'Cultura' },
  
  // Objetos e Artefatos
  'vestimenta': { codigo: 'OA', nome: 'Objetos' },
  'ferramentas': { codigo: 'OA', nome: 'Objetos' },
  'utensilios': { codigo: 'OA', nome: 'Objetos' },
  'arreios': { codigo: 'OA', nome: 'Objetos' },
  
  // Estruturas e Lugares
  'geografia': { codigo: 'EL', nome: 'Estruturas' },
  'construcoes': { codigo: 'EL', nome: 'Estruturas' },
  'locais': { codigo: 'EL', nome: 'Estruturas' },
  
  // Sociedade
  'social': { codigo: 'SP', nome: 'Sociedade' },
  'familia': { codigo: 'SP', nome: 'Sociedade' },
  'politica': { codigo: 'SP', nome: 'Sociedade' },
};

/**
 * FASE 3: Mapeamento de Classes Gramaticais Gutenberg → Domínios
 * Usado como fallback quando palavra não encontrada em outros métodos
 */
export const GUTENBERG_POS_TO_DOMAIN: Record<string, { codigo: string; confianca: number }> = {
  // Interjeições → Sentimentos
  '_interj._': { codigo: 'SE', confianca: 0.90 },
  
  // Locuções adverbiais → Estruturas/Lugares (ex: "em casa", "no campo")
  '_loc. adv._': { codigo: 'EL', confianca: 0.75 },
  
  // Prefixos e Sufixos → Marcadores Gramaticais
  '_pref._': { codigo: 'MG', confianca: 0.98 },
  '_suf._': { codigo: 'MG', confianca: 0.98 },
  
  // Locuções prepositivas → Marcadores Gramaticais
  '_loc. prep._': { codigo: 'MG', confianca: 0.95 },
  
  // Conjunções → Marcadores Gramaticais
  '_conj._': { codigo: 'MG', confianca: 0.98 },
  '_conj. subord._': { codigo: 'MG', confianca: 0.98 },
};

let lexiconRulesCache: Map<string, LexiconRule> | null = null;
let cacheLoadedAt: number | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

/**
 * Carrega regras do dialectal_lexicon e cacheia em memória
 */
export async function loadLexiconRules(): Promise<Map<string, LexiconRule>> {
  // Verificar cache válido
  if (lexiconRulesCache && cacheLoadedAt && (Date.now() - cacheLoadedAt < CACHE_TTL_MS)) {
    return lexiconRulesCache;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query dialectal_lexicon com categorias temáticas
  const { data: lexiconEntries, error } = await supabase
    .from('dialectal_lexicon')
    .select('verbete_normalizado, categorias_tematicas, classe_gramatical')
    .not('categorias_tematicas', 'is', null);

  if (error) {
    console.error('Error loading lexicon rules:', error);
    return new Map();
  }

  const rulesMap = new Map<string, LexiconRule>();

  // Processar cada entrada
  lexiconEntries?.forEach(entry => {
    const palavra = entry.verbete_normalizado.toLowerCase();
    const categorias = entry.categorias_tematicas || [];

    // Mapear primeira categoria válida encontrada
    for (const categoria of categorias) {
      const mapping = CATEGORY_TO_DOMAIN_MAP[categoria];
      if (mapping) {
        rulesMap.set(palavra, {
          palavra,
          tagset_codigo: mapping.codigo,
          confianca: 0.95,
          justificativa: `Palavra do léxico dialetal gaúcho - categoria: ${categoria} → ${mapping.nome}`,
        });
        break; // Usar apenas primeira categoria
      }
    }
  });

  // Atualizar cache
  lexiconRulesCache = rulesMap;
  cacheLoadedAt = Date.now();

  console.log(`✅ Lexicon rules loaded: ${rulesMap.size} palavras`);

  return rulesMap;
}

/**
 * Busca regra no léxico dialetal
 */
export async function getLexiconRule(palavra: string): Promise<LexiconRule | null> {
  const rules = await loadLexiconRules();
  return rules.get(palavra.toLowerCase()) || null;
}

/**
 * Retorna estatísticas do cache de regras
 */
export function getLexiconRulesStats() {
  if (!lexiconRulesCache) return null;

  const domainCounts: Record<string, number> = {};
  
  lexiconRulesCache.forEach(rule => {
    domainCounts[rule.tagset_codigo] = (domainCounts[rule.tagset_codigo] || 0) + 1;
  });

  return {
    totalRules: lexiconRulesCache.size,
    cacheAge: cacheLoadedAt ? Date.now() - cacheLoadedAt : 0,
    domainDistribution: domainCounts,
  };
}
