/**
 * 🎯 SEMANTIC RULES FROM DIALECTAL LEXICON
 * 
 * Enriquece regras de classificação semântica usando o dialectal_lexicon
 * Mapeia categorias temáticas para domínios N1
 * 
 * FASE 1 REFINAMENTO: Expandido para carregar 100% das palavras do dicionário (5.968+)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

interface LexiconRule {
  palavra: string;
  tagset_codigo: string;
  tagsets_alternativos?: string[];
  is_polysemous?: boolean;
  confianca: number;
  justificativa: string;
  // NOVOS CAMPOS FASE 1:
  existeNoDicionario: boolean;
  definicaoAbreviada?: string;  // Primeiros 100 chars
  classeGramatical?: string;
  origemPrimaria?: string;
  influenciaPlatina?: boolean;
}

/**
 * Mapeamento de categorias temáticas → Domínios N1/N2
 * CÓDIGOS ATUALIZADOS conforme semantic_tagset validado
 */
const CATEGORY_TO_DOMAIN_MAP: Record<string, { codigo: string; nome: string }> = {
  // Natureza - CÓDIGOS ATUALIZADOS
  'fauna': { codigo: 'NA.FA', nome: 'Fauna' },
  'flora': { codigo: 'NA.FL', nome: 'Flora' },
  'clima': { codigo: 'NA.FN', nome: 'Fenômenos Naturais' },
  'fenomenos_naturais': { codigo: 'NA.FN', nome: 'Fenômenos Naturais' },
  'elementos_celestes': { codigo: 'NA.EC', nome: 'Elementos Celestes' },
  'geografia_natural': { codigo: 'NA.GE', nome: 'Geografia e Paisagem' },
  'geografia': { codigo: 'NA.GE', nome: 'Geografia e Paisagem' },
  
  // Atividades e Práticas - EXPANDIDO
  'lida_campeira': { codigo: 'AP.TRA.RUR', nome: 'Trabalho Rural' },
  'trabalho_rural': { codigo: 'AP.TRA.RUR', nome: 'Trabalho Rural' },
  'gastronomia': { codigo: 'AP.ALI', nome: 'Alimentação e Culinária' },
  'transporte': { codigo: 'AP.DES', nome: 'Transporte e Deslocamento' },
  
  // Ações e Processos (Ações Concretas)
  'movimento': { codigo: 'AC.MD', nome: 'Movimento e Deslocamento' },
  'locomocao': { codigo: 'AC.MD.LOC', nome: 'Locomoção' },
  'manipulacao': { codigo: 'AC.MI', nome: 'Manipulação e Interação' },
  'transformacao_fisica': { codigo: 'AC.TR', nome: 'Transformação' },
  'percepcao_ativa': { codigo: 'AC.PS', nome: 'Percepção Sensorial Ativa' },
  'expressao_fisica': { codigo: 'AC.EC', nome: 'Expressão e Comunicação Física' },
  
  // Cultura e Conhecimento
  'musica_danca': { codigo: 'CC.ART.MUS', nome: 'Música' },
  'literatura': { codigo: 'CC.ART', nome: 'Arte e Expressão Cultural' },
  'poesia': { codigo: 'CC.ART.POE', nome: 'Literatura em Poesia' },
  'tradicoes': { codigo: 'CC', nome: 'Cultura e Conhecimento' },
  'religiosidade': { codigo: 'CC.REL', nome: 'Religiosidade e Espiritualidade' },
  'educacao': { codigo: 'CC.EDU', nome: 'Educação e Aprendizado' },
  'ciencia': { codigo: 'CC.CIT', nome: 'Ciência e Tecnologia' },
  'comunicacao': { codigo: 'CC.COM', nome: 'Comunicação e Mídia' },
  
  // Sentimentos - CÓDIGOS ATUALIZADOS
  'sentimentos': { codigo: 'SE', nome: 'Sentimentos e Emoções' },
  'alegria': { codigo: 'SE.ALE', nome: 'Alegria e Felicidade' },
  'amor': { codigo: 'SE.AMO', nome: 'Amor e Afeto' },
  'tristeza': { codigo: 'SE.TRI', nome: 'Tristeza e Saudade' },
  'saudade': { codigo: 'SE.TRI', nome: 'Tristeza e Saudade' },
  'medo': { codigo: 'SE.MED', nome: 'Medo e Ansiedade' },
  'raiva': { codigo: 'SE.RAI', nome: 'Raiva e Frustração' },
  
  // Abstrações
  'filosofia': { codigo: 'AB.FIL', nome: 'Conceitos Filosóficos e Éticos' },
  'etica': { codigo: 'AB.FIL.MOR', nome: 'Valores Morais' },
  'politica_abstrata': { codigo: 'AB.SOC', nome: 'Conceitos Sociais e Políticos' },
  'existencial': { codigo: 'AB.EXI', nome: 'Conceitos Existenciais e Metafísicos' },
  
  // Objetos e Artefatos
  'vestimenta': { codigo: 'OA', nome: 'Objetos' },
  'ferramentas': { codigo: 'OA', nome: 'Objetos' },
  'utensilios': { codigo: 'OA', nome: 'Objetos' },
  'arreios': { codigo: 'OA', nome: 'Objetos' },
  
  // Estruturas e Lugares
  'construcoes': { codigo: 'EL', nome: 'Estruturas' },
  'locais': { codigo: 'EL', nome: 'Estruturas' },
  
  // Sociedade e Política
  'politica': { codigo: 'SP.POL', nome: 'Processos Políticos' },
  'social': { codigo: 'SP.EST', nome: 'Estrutura Social' },
  'governo': { codigo: 'SP.GOV', nome: 'Governo e Estado' },
  'familia': { codigo: 'SP.EST', nome: 'Estrutura Social' },
  
  // Saúde e Bem-Estar
  'saude': { codigo: 'SB', nome: 'Saúde e Bem-Estar' },
  'medicina': { codigo: 'SB.TRA', nome: 'Tratamentos e Cuidados Médicos' },
  'psicologia': { codigo: 'SB.MEN', nome: 'Saúde Mental e Psicologia' },
};

/**
 * FASE 1: Mapeamento de Classes Gramaticais Dialetal → Domínios
 * Usado para palavras SEM categorias temáticas mas COM classe gramatical
 */
export const DIALECTAL_POS_TO_DOMAIN: Record<string, { codigo: string; confianca: number }> = {
  // Substantivos → Contexto necessário (não podemos classificar só pela classe)
  's.m.': { codigo: 'PENDING', confianca: 0.50 },
  'S.m.': { codigo: 'PENDING', confianca: 0.50 },
  's.f.': { codigo: 'PENDING', confianca: 0.50 },
  'S.f.': { codigo: 'PENDING', confianca: 0.50 },
  
  // Verbos → Ações (AC)
  'Tr.dir.': { codigo: 'AC', confianca: 0.85 },
  'v.t.d.': { codigo: 'AC', confianca: 0.85 },
  'Int.': { codigo: 'AC', confianca: 0.85 },
  'Intr.': { codigo: 'AC', confianca: 0.85 },
  'v.int.': { codigo: 'AC', confianca: 0.85 },
  'v.pron.': { codigo: 'AC', confianca: 0.85 },
  
  // Adjetivos → Sentimentos/Qualidades (SE)
  'Adj.': { codigo: 'SE', confianca: 0.80 },
  'adj.': { codigo: 'SE', confianca: 0.80 },
  
  // Fraseologias → Cultura (CC)
  'fraseol.': { codigo: 'CC', confianca: 0.90 },
  
  // Locuções
  'loc.': { codigo: 'EL', confianca: 0.70 },
  'loc.interj.': { codigo: 'SE', confianca: 0.90 },
  'loc.adv.': { codigo: 'MG', confianca: 0.85 },
  
  // Advérbios → Marcadores
  'Adv.': { codigo: 'MG', confianca: 0.90 },
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
 * FASE 1: Extrair primeira definição (suporta ambos formatos JSONB)
 */
function extractFirstDefinition(definicoes: any): string | undefined {
  if (!definicoes || !Array.isArray(definicoes) || definicoes.length === 0) {
    return undefined;
  }
  
  const first = definicoes[0];
  
  // Formato objeto: {texto: "...", acepcao: 1}
  if (typeof first === 'object' && first.texto) {
    return first.texto.substring(0, 100);
  }
  
  // Formato string: ["definição"]
  if (typeof first === 'string' && first !== '//' && first.length > 2) {
    return first.substring(0, 100);
  }
  
  return undefined;
}

/**
 * FASE 1: Carrega TODAS as regras do dialectal_lexicon (100% das 5.968+ palavras)
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

  // FASE 1: Query dialectal_lexicon TODAS as palavras (removido filtro de categorias)
  const { data: lexiconEntries, error } = await supabase
    .from('dialectal_lexicon')
    .select('verbete_normalizado, categorias_tematicas, classe_gramatical, definicoes, origem_primaria, influencia_platina');

  if (error) {
    console.error('❌ Error loading lexicon rules:', error);
    return new Map();
  }

  const rulesMap = new Map<string, LexiconRule>();

  // Processar cada entrada
  lexiconEntries?.forEach(entry => {
    const palavra = entry.verbete_normalizado.toLowerCase();
    const categorias = entry.categorias_tematicas || [];
    const classeGramatical = entry.classe_gramatical;
    const definicaoAbreviada = extractFirstDefinition(entry.definicoes);
    const origemPrimaria = entry.origem_primaria;
    const influenciaPlatina = entry.influencia_platina;

    let primaryMapping = null;
    const alternativeMappings: string[] = [];
    let confianca = 0.95;
    let justificativa = '';
    
    // PRIORIDADE 1: Mapear por categorias temáticas (se existirem)
    for (const categoria of categorias) {
      const mapping = CATEGORY_TO_DOMAIN_MAP[categoria];
      if (mapping) {
        if (!primaryMapping) {
          primaryMapping = mapping;
        } else {
          // Categorias adicionais → DSs alternativos (polissemia)
          alternativeMappings.push(mapping.codigo);
        }
      }
    }
    
    if (primaryMapping) {
      justificativa = `Palavra do léxico dialetal gaúcho - categoria: ${categorias[0]} → ${primaryMapping.nome}${alternativeMappings.length > 0 ? ` (+ ${alternativeMappings.length} DSs alternativos)` : ''}`;
    } else if (classeGramatical) {
      // PRIORIDADE 2: Mapear por classe gramatical (se não houver categoria)
      const posMapping = DIALECTAL_POS_TO_DOMAIN[classeGramatical];
      if (posMapping && posMapping.codigo !== 'PENDING') {
        primaryMapping = { codigo: posMapping.codigo, nome: 'Via classe gramatical' };
        confianca = posMapping.confianca;
        justificativa = `Palavra dialetal - POS: ${classeGramatical} → ${posMapping.codigo}`;
      }
    }
    
    // SEMPRE adicionar ao cache, mesmo que não tenha classificação final
    // (será útil para enriquecer prompt Gemini com definição e origem)
    rulesMap.set(palavra, {
      palavra,
      tagset_codigo: primaryMapping?.codigo || 'PENDING',
      tagsets_alternativos: alternativeMappings,
      is_polysemous: alternativeMappings.length > 0,
      confianca,
      justificativa: justificativa || `Palavra do dicionário gaúcho - ${classeGramatical || 'sem classe'}`,
      // NOVOS CAMPOS:
      existeNoDicionario: true,
      definicaoAbreviada,
      classeGramatical,
      origemPrimaria,
      influenciaPlatina,
    });
  });

  // Atualizar cache
  lexiconRulesCache = rulesMap;
  cacheLoadedAt = Date.now();

  console.log(`✅ FASE 1: Lexicon rules loaded: ${rulesMap.size} palavras (100% do dicionário)`);

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
