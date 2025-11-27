/**
 * Classificador de stopwords PT-BR para anotação semântica
 * Separa palavras "safe" (classificação direta) de "context-dependent" (requer Gemini)
 */

interface StopwordResult {
  tagset_codigo: string;
  confianca: number;
  justificativa: string;
}

/**
 * Stopwords "SAFE" - sempre MG (Marcadores Gramaticais) independente do contexto
 */
const SAFE_STOPWORDS = new Set([
  // Artigos
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  
  // Preposições simples
  'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas',
  'por', 'pelo', 'pela', 'pelos', 'pelas',
  'para', 'pra', 'pro', 'prá', 'prás',
  'com', 'sem', 'sob', 'sobre',
  'entre', 'até', 'desde', 'perante', 'ante', 'após', 'contra',
  'durante', 'mediante', 'segundo', 'conforme',
  
  // Conjunções
  'e', 'ou', 'mas', 'porém', 'contudo', 'todavia', 'entretanto',
  'portanto', 'logo', 'pois', 'porque',
  
  // Pronomes pessoais
  'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
  'me', 'te', 'se', 'lhe', 'lhes', 'nos', 'vos',
  
  // Pronomes possessivos
  'meu', 'minha', 'meus', 'minhas',
  'teu', 'tua', 'teus', 'tuas',
  'seu', 'sua', 'seus', 'suas',
  'nosso', 'nossa', 'nossos', 'nossas',
  'vosso', 'vossa', 'vossos', 'vossas',
  
  // Advérbios funcionais
  'não', 'sim', 'já', 'ainda', 'sempre', 'nunca',
  'também', 'só', 'apenas', 'quase', 'talvez',
  'aqui', 'ali', 'lá', 'aí', 'cá',
  'muito', 'pouco', 'mais', 'menos', 'tão', 'tanto',
  'bem', 'mal',
  
  // Outros marcadores
  'daí', 'então', 'mesmo', 'próprio',
]);

/**
 * Stopwords "CONTEXT-DEPENDENT" - requerem análise contextual via Gemini
 * Exemplos: "que" (pronome vs. conjunção), "como" (modo vs. comparação),
 *          "onde" (lugar vs. relativo), "se" (condicional vs. reflexivo)
 */
const CONTEXT_DEPENDENT_STOPWORDS = new Set([
  'que', 'qual', 'quais', 'cujo', 'cuja', 'cujos', 'cujas',
  'quem', 'quanto', 'quanta', 'quantos', 'quantas',
  'como', 'onde', 'quando', 'quanto',
  'este', 'esse', 'aquele', 'isto', 'isso', 'aquilo',
  'esta', 'essa', 'aquela', 'estas', 'essas', 'aquelas',
  'estes', 'esses', 'aqueles',
]);

/**
 * Verbos auxiliares comuns → AP (Atividades e Práticas)
 */
const AUXILIARY_VERBS = new Set([
  'ser', 'estar', 'ter', 'haver', 'ir', 'vir',
  'ficar', 'andar', 'continuar', 'parecer',
  'poder', 'dever', 'querer', 'precisar', 'conseguir',
]);

/**
 * Classifica stopwords "safe" diretamente
 * @returns SemanticDomainResult se é stopword safe, null caso contrário
 */
export function classifySafeStopword(palavra: string): StopwordResult | null {
  const palavraNorm = palavra.toLowerCase();
  
  // 1. Stopwords safe → MG com confiança 0.99
  if (SAFE_STOPWORDS.has(palavraNorm)) {
    return {
      tagset_codigo: 'MG',
      confianca: 0.99,
      justificativa: 'Marcador gramatical (stopword safe)',
    };
  }
  
  // 2. Verbos auxiliares → AP com confiança 0.95
  if (AUXILIARY_VERBS.has(palavraNorm)) {
    return {
      tagset_codigo: 'AP',
      confianca: 0.95,
      justificativa: 'Verbo auxiliar comum',
    };
  }
  
  // 3. Se é context-dependent, retornar null (forçar Gemini)
  if (CONTEXT_DEPENDENT_STOPWORDS.has(palavraNorm)) {
    return null; // Gemini decidirá baseado no contexto
  }
  
  return null; // Não é stopword
}

/**
 * Verifica se palavra é context-dependent (bloqueia classificação por regra)
 */
export function isContextDependent(palavra: string): boolean {
  return CONTEXT_DEPENDENT_STOPWORDS.has(palavra.toLowerCase());
}

/**
 * Estatísticas de cobertura de stopwords
 */
export function getStopwordsCoverage() {
  return {
    safe: SAFE_STOPWORDS.size,
    contextDependent: CONTEXT_DEPENDENT_STOPWORDS.size,
    auxiliaryVerbs: AUXILIARY_VERBS.size,
    total: SAFE_STOPWORDS.size + CONTEXT_DEPENDENT_STOPWORDS.size + AUXILIARY_VERBS.size,
  };
}
