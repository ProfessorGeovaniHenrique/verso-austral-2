/**
 * Sistema de Detecção de Locuções do Português Brasileiro
 * Detecta e unifica locuções gramaticais em tokens únicos
 */

export interface Locution {
  pattern: string[];       // Padrão da locução (ex: ["a", "fim", "de"])
  unified: string;        // Forma unificada (ex: "a_fim_de")
  tag: string;           // Tag gramatical (ex: "MG.CON.REL.FIN")
  category: string;      // Categoria semântica (ex: "Finalidade")
  caseSensitive?: boolean; // Se requer case sensitivity
}

export interface Token {
  palavra: string;
  palavraOriginal?: string;
  isLocution: boolean;
  tag?: string;
  category?: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Base de locuções do português brasileiro
 * Organizadas por tipo gramatical
 */
export const LOCUTIONS: Locution[] = [
  // ============ LOCUÇÕES PREPOSITIVAS ============
  
  // Finalidade
  { pattern: ['a', 'fim', 'de'], unified: 'a_fim_de', 
    tag: 'MG.CON.REL.FIN', category: 'Finalidade' },
  { pattern: ['com', 'o', 'intuito', 'de'], unified: 'com_o_intuito_de', 
    tag: 'MG.CON.REL.FIN', category: 'Finalidade' },
  { pattern: ['com', 'vistas', 'a'], unified: 'com_vistas_a', 
    tag: 'MG.CON.REL.FIN', category: 'Finalidade' },
  
  // Causa
  { pattern: ['por', 'causa', 'de'], unified: 'por_causa_de', 
    tag: 'MG.CON.REL.CAU', category: 'Causa' },
  { pattern: ['devido', 'a'], unified: 'devido_a', 
    tag: 'MG.CON.REL.CAU', category: 'Causa' },
  { pattern: ['em', 'virtude', 'de'], unified: 'em_virtude_de', 
    tag: 'MG.CON.REL.CAU', category: 'Causa' },
  { pattern: ['por', 'motivo', 'de'], unified: 'por_motivo_de', 
    tag: 'MG.CON.REL.CAU', category: 'Causa' },
  
  // Instrumento/Meio
  { pattern: ['por', 'meio', 'de'], unified: 'por_meio_de', 
    tag: 'MG.CON.REL.INS', category: 'Instrumento' },
  { pattern: ['através', 'de'], unified: 'através_de', 
    tag: 'MG.CON.REL.INS', category: 'Instrumento' },
  { pattern: ['por', 'intermédio', 'de'], unified: 'por_intermédio_de', 
    tag: 'MG.CON.REL.INS', category: 'Instrumento' },
  
  // Lugar
  { pattern: ['em', 'cima', 'de'], unified: 'em_cima_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['por', 'cima', 'de'], unified: 'por_cima_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['em', 'baixo', 'de'], unified: 'em_baixo_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['por', 'baixo', 'de'], unified: 'por_baixo_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['ao', 'lado', 'de'], unified: 'ao_lado_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['perto', 'de'], unified: 'perto_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['longe', 'de'], unified: 'longe_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['junto', 'a'], unified: 'junto_a', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['junto', 'de'], unified: 'junto_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['em', 'frente', 'a'], unified: 'em_frente_a', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['em', 'frente', 'de'], unified: 'em_frente_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['atrás', 'de'], unified: 'atrás_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['dentro', 'de'], unified: 'dentro_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  { pattern: ['fora', 'de'], unified: 'fora_de', 
    tag: 'MG.CON.REL.LUG.EST', category: 'Lugar Estático' },
  
  // Companhia
  { pattern: ['junto', 'com'], unified: 'junto_com', 
    tag: 'MG.CON.REL.COM', category: 'Companhia' },
  { pattern: ['juntamente', 'com'], unified: 'juntamente_com', 
    tag: 'MG.CON.REL.COM', category: 'Companhia' },
  
  // ============ LOCUÇÕES CONJUNTIVAS ============
  
  // Adversativas
  { pattern: ['no', 'entanto'], unified: 'no_entanto', 
    tag: 'MG.CON.ORA.OPO.ADV', category: 'Oposição Adversativa' },
  { pattern: ['não', 'obstante'], unified: 'não_obstante', 
    tag: 'MG.CON.ORA.OPO.ADV', category: 'Oposição Adversativa' },
  { pattern: ['ainda', 'assim'], unified: 'ainda_assim', 
    tag: 'MG.CON.ORA.OPO.ADV', category: 'Oposição Adversativa' },
  { pattern: ['em', 'vez', 'de'], unified: 'em_vez_de', 
    tag: 'MG.CON.ORA.OPO.ADV', category: 'Oposição Adversativa' },
  
  // Concessivas
  { pattern: ['apesar', 'de'], unified: 'apesar_de', 
    tag: 'MG.CON.ORA.OPO.CON', category: 'Oposição Concessiva' },
  { pattern: ['ainda', 'que'], unified: 'ainda_que', 
    tag: 'MG.CON.ORA.OPO.CON', category: 'Oposição Concessiva' },
  { pattern: ['mesmo', 'que'], unified: 'mesmo_que', 
    tag: 'MG.CON.ORA.OPO.CON', category: 'Oposição Concessiva' },
  { pattern: ['por', 'mais', 'que'], unified: 'por_mais_que', 
    tag: 'MG.CON.ORA.OPO.CON', category: 'Oposição Concessiva' },
  { pattern: ['por', 'menos', 'que'], unified: 'por_menos_que', 
    tag: 'MG.CON.ORA.OPO.CON', category: 'Oposição Concessiva' },
  
  // Causais
  { pattern: ['já', 'que'], unified: 'já_que', 
    tag: 'MG.CON.ORA.CAU', category: 'Causa' },
  { pattern: ['visto', 'que'], unified: 'visto_que', 
    tag: 'MG.CON.ORA.CAU', category: 'Causa' },
  { pattern: ['uma', 'vez', 'que'], unified: 'uma_vez_que', 
    tag: 'MG.CON.ORA.CAU', category: 'Causa' },
  { pattern: ['por', 'isso', 'que'], unified: 'por_isso_que', 
    tag: 'MG.CON.ORA.CAU', category: 'Causa' },
  
  // Condicionais
  { pattern: ['desde', 'que'], unified: 'desde_que', 
    tag: 'MG.CON.ORA.CON', category: 'Condição' },
  { pattern: ['contanto', 'que'], unified: 'contanto_que', 
    tag: 'MG.CON.ORA.CON', category: 'Condição' },
  { pattern: ['a', 'não', 'ser', 'que'], unified: 'a_não_ser_que', 
    tag: 'MG.CON.ORA.CON', category: 'Condição' },
  { pattern: ['a', 'menos', 'que'], unified: 'a_menos_que', 
    tag: 'MG.CON.ORA.CON', category: 'Condição' },
  
  // Temporais
  { pattern: ['à', 'medida', 'que'], unified: 'à_medida_que', 
    tag: 'MG.CON.ORA.TEM.SIM', category: 'Tempo Simultaneidade' },
  { pattern: ['ao', 'passo', 'que'], unified: 'ao_passo_que', 
    tag: 'MG.CON.ORA.TEM.SIM', category: 'Tempo Simultaneidade' },
  { pattern: ['antes', 'que'], unified: 'antes_que', 
    tag: 'MG.CON.ORA.TEM.ANT', category: 'Tempo Anterioridade' },
  { pattern: ['até', 'que'], unified: 'até_que', 
    tag: 'MG.CON.ORA.TEM.ANT', category: 'Tempo Anterioridade' },
  { pattern: ['depois', 'que'], unified: 'depois_que', 
    tag: 'MG.CON.ORA.TEM.POS', category: 'Tempo Posterioridade' },
  { pattern: ['logo', 'que'], unified: 'logo_que', 
    tag: 'MG.CON.ORA.TEM.POS', category: 'Tempo Posterioridade' },
  { pattern: ['assim', 'que'], unified: 'assim_que', 
    tag: 'MG.CON.ORA.TEM.POS', category: 'Tempo Posterioridade' },
  { pattern: ['sempre', 'que'], unified: 'sempre_que', 
    tag: 'MG.CON.ORA.TEM.SIM', category: 'Tempo Simultaneidade' },
  { pattern: ['toda', 'vez', 'que'], unified: 'toda_vez_que', 
    tag: 'MG.CON.ORA.TEM.SIM', category: 'Tempo Simultaneidade' },
  
  // Finais
  { pattern: ['para', 'que'], unified: 'para_que', 
    tag: 'MG.CON.ORA.FIN', category: 'Finalidade' },
  { pattern: ['a', 'fim', 'de', 'que'], unified: 'a_fim_de_que', 
    tag: 'MG.CON.ORA.FIN', category: 'Finalidade' },
  
  // Comparativas
  { pattern: ['assim', 'como'], unified: 'assim_como', 
    tag: 'MG.CON.ORA.COM', category: 'Comparação' },
  { pattern: ['tal', 'como'], unified: 'tal_como', 
    tag: 'MG.CON.ORA.COM', category: 'Comparação' },
  { pattern: ['mais', 'que'], unified: 'mais_que', 
    tag: 'MG.CON.ORA.COM', category: 'Comparação' },
  { pattern: ['menos', 'que'], unified: 'menos_que', 
    tag: 'MG.CON.ORA.COM', category: 'Comparação' },
  { pattern: ['tanto', 'quanto'], unified: 'tanto_quanto', 
    tag: 'MG.CON.ORA.COM', category: 'Comparação' },
  
  // Consecutivas
  { pattern: ['de', 'modo', 'que'], unified: 'de_modo_que', 
    tag: 'MG.CON.ORA.CON.SEQ', category: 'Consequência' },
  { pattern: ['de', 'forma', 'que'], unified: 'de_forma_que', 
    tag: 'MG.CON.ORA.CON.SEQ', category: 'Consequência' },
  { pattern: ['de', 'maneira', 'que'], unified: 'de_maneira_que', 
    tag: 'MG.CON.ORA.CON.SEQ', category: 'Consequência' },
  { pattern: ['tanto', 'que'], unified: 'tanto_que', 
    tag: 'MG.CON.ORA.CON.SEQ', category: 'Consequência' },
  
  // Aditivas
  { pattern: ['além', 'disso'], unified: 'além_disso', 
    tag: 'MG.CON.ORA.ADI.AFI', category: 'Adição Afirmativa' },
  { pattern: ['além', 'de'], unified: 'além_de', 
    tag: 'MG.CON.ORA.ADI.AFI', category: 'Adição Afirmativa' },
  
  // ============ LOCUÇÕES ADVERBIAIS ============
  
  // Tempo
  { pattern: ['de', 'repente'], unified: 'de_repente', 
    tag: 'MG.MOD.CIR.TEM', category: 'Tempo' },
  { pattern: ['às', 'vezes'], unified: 'às_vezes', 
    tag: 'MG.MOD.CIR.TEM', category: 'Tempo' },
  { pattern: ['de', 'vez', 'em', 'quando'], unified: 'de_vez_em_quando', 
    tag: 'MG.MOD.CIR.TEM', category: 'Tempo' },
  { pattern: ['de', 'quando', 'em', 'quando'], unified: 'de_quando_em_quando', 
    tag: 'MG.MOD.CIR.TEM', category: 'Tempo' },
  { pattern: ['à', 'noite'], unified: 'à_noite', 
    tag: 'MG.MOD.CIR.TEM', category: 'Tempo' },
  { pattern: ['à', 'tarde'], unified: 'à_tarde', 
    tag: 'MG.MOD.CIR.TEM', category: 'Tempo' },
  { pattern: ['de', 'manhã'], unified: 'de_manhã', 
    tag: 'MG.MOD.CIR.TEM', category: 'Tempo' },
  { pattern: ['à', 'toa'], unified: 'à_toa', 
    tag: 'MG.MOD.CIR.MOD', category: 'Modo' },
  
  // Lugar
  { pattern: ['em', 'cima'], unified: 'em_cima', 
    tag: 'MG.MOD.CIR.LUG', category: 'Lugar' },
  { pattern: ['em', 'baixo'], unified: 'em_baixo', 
    tag: 'MG.MOD.CIR.LUG', category: 'Lugar' },
  { pattern: ['por', 'aqui'], unified: 'por_aqui', 
    tag: 'MG.MOD.CIR.LUG', category: 'Lugar' },
  { pattern: ['por', 'ali'], unified: 'por_ali', 
    tag: 'MG.MOD.CIR.LUG', category: 'Lugar' },
  { pattern: ['por', 'aí'], unified: 'por_aí', 
    tag: 'MG.MOD.CIR.LUG', category: 'Lugar' },
  
  // Modo
  { pattern: ['de', 'cor'], unified: 'de_cor', 
    tag: 'MG.MOD.CIR.MOD', category: 'Modo' },
  { pattern: ['de', 'propósito'], unified: 'de_propósito', 
    tag: 'MG.MOD.CIR.MOD', category: 'Modo' },
  { pattern: ['às', 'pressas'], unified: 'às_pressas', 
    tag: 'MG.MOD.CIR.MOD', category: 'Modo' },
  { pattern: ['às', 'claras'], unified: 'às_claras', 
    tag: 'MG.MOD.CIR.MOD', category: 'Modo' },
  { pattern: ['às', 'escuras'], unified: 'às_escuras', 
    tag: 'MG.MOD.CIR.MOD', category: 'Modo' },
  { pattern: ['de', 'súbito'], unified: 'de_súbito', 
    tag: 'MG.MOD.CIR.MOD', category: 'Modo' },
  { pattern: ['em', 'vão'], unified: 'em_vão', 
    tag: 'MG.MOD.CIR.MOD', category: 'Modo' },
  
  // Negação
  { pattern: ['de', 'jeito', 'nenhum'], unified: 'de_jeito_nenhum', 
    tag: 'MG.MOD.CIR.NEG.TOT', category: 'Negação Total' },
  { pattern: ['de', 'forma', 'alguma'], unified: 'de_forma_alguma', 
    tag: 'MG.MOD.CIR.NEG.TOT', category: 'Negação Total' },
  { pattern: ['de', 'modo', 'algum'], unified: 'de_modo_algum', 
    tag: 'MG.MOD.CIR.NEG.TOT', category: 'Negação Total' },
  
  // Afirmação
  { pattern: ['com', 'certeza'], unified: 'com_certeza', 
    tag: 'MG.MOD.CIR.AFI', category: 'Afirmação' },
  { pattern: ['sem', 'dúvida'], unified: 'sem_dúvida', 
    tag: 'MG.MOD.CIR.AFI', category: 'Afirmação' },
  { pattern: ['de', 'fato'], unified: 'de_fato', 
    tag: 'MG.MOD.CIR.AFI', category: 'Afirmação' },
];

// Ordenar locuções por tamanho (maiores primeiro) para priorizar correspondências mais longas
LOCUTIONS.sort((a, b) => b.pattern.length - a.pattern.length);

/**
 * Normaliza palavra para comparação (lowercase, sem acentos)
 */
function normalizeForComparison(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Detecta e unifica locuções em uma sequência de tokens
 */
export function detectAndMergeLocutions(words: string[]): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < words.length) {
    let matched = false;

    // Tentar encontrar a locução mais longa possível
    for (const locution of LOCUTIONS) {
      const patternLength = locution.pattern.length;
      
      // Verificar se há palavras suficientes restantes
      if (i + patternLength > words.length) continue;

      // Extrair candidato
      const candidate = words.slice(i, i + patternLength);
      
      // Comparar (normalizando para case-insensitive)
      const matches = locution.pattern.every((word, idx) => 
        normalizeForComparison(candidate[idx]) === normalizeForComparison(word)
      );

      if (matches) {
        // Locução encontrada!
        tokens.push({
          palavra: locution.unified,
          palavraOriginal: candidate.join(' '),
          isLocution: true,
          tag: locution.tag,
          category: locution.category,
          startIndex: i,
          endIndex: i + patternLength - 1
        });
        
        i += patternLength;
        matched = true;
        break;
      }
    }

    // Se nenhuma locução foi encontrada, adicionar palavra individual
    if (!matched) {
      tokens.push({
        palavra: words[i],
        isLocution: false,
        startIndex: i,
        endIndex: i
      });
      i++;
    }
  }

  return tokens;
}

/**
 * Detecta se uma palavra é um nome próprio (primeira letra maiúscula)
 * Requer análise contextual adicional
 */
export function isPotentialProperNoun(word: string, context?: {
  isStartOfSentence: boolean;
  previousTag?: string;
}): boolean {
  // Palavra precisa começar com maiúscula
  if (word[0] !== word[0].toUpperCase()) return false;
  
  // Se está no início da sentença, precisa de contexto adicional
  if (context?.isStartOfSentence) {
    // Verificar se a palavra anterior sugere nome próprio
    // (ex: "São", "Dom", títulos, etc.)
    return false; // Requer análise mais profunda
  }
  
  // Se não está no início, maiúscula indica nome próprio
  return true;
}

/**
 * Classifica nome próprio em subcategoria
 */
export function classifyProperNoun(word: string, fullContext?: string): string {
  const normalized = word.toLowerCase();
  
  // Nomes religiosos comuns
  const religious = ['deus', 'cristo', 'jesus', 'nossa', 'são', 'santo', 'santa', 'oxalá'];
  if (religious.some(r => normalized.includes(r))) {
    return 'MG.NPR.REL';
  }
  
  // Estados e cidades conhecidos (lista parcial)
  const places = ['brasil', 'rio', 'são paulo', 'bahia', 'pernambuco', 'ceará', 'pampas'];
  if (places.some(p => normalized.includes(p))) {
    return 'MG.NPR.LOC';
  }
  
  // Padrão: considerar como pessoa
  return 'MG.NPR.PES';
}

/**
 * Processa texto completo: detecta locuções e nomes próprios
 */
export function processTextWithLocutions(text: string): Token[] {
  // Tokenizar (simplificado - usar biblioteca apropriada em produção)
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  // Detectar locuções
  const tokens = detectAndMergeLocutions(words);
  
  // Enriquecer com detecção de nomes próprios
  return tokens.map((token, idx) => {
    if (!token.isLocution && token.palavra[0] === token.palavra[0].toUpperCase()) {
      const isStartOfSentence = idx === 0 || text[token.startIndex - 1] === '.';
      
      if (isPotentialProperNoun(token.palavra, { isStartOfSentence })) {
        return {
          ...token,
          tag: classifyProperNoun(token.palavra, text),
          category: 'Nome Próprio'
        };
      }
    }
    
    return token;
  });
}
