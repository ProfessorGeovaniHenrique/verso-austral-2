/**
 * Detecção de Sobreposições entre Tagsets
 * Identifica pares de tagsets com alta similaridade semântica
 */

import { Tagset } from "@/hooks/useTagsets";
import { calculateSemanticSimilarity } from "./semanticSimilarity";

export interface OverlapPair {
  tagsetA: Tagset;
  tagsetB: Tagset;
  similarity: number;
  commonExamples: string[];
  commonWords: string[];
  overlapType: 'high' | 'medium' | 'low';
}

/**
 * Encontra exemplos compartilhados entre dois tagsets
 */
const findCommonExamples = (tagsetA: Tagset, tagsetB: Tagset): string[] => {
  if (!tagsetA.exemplos || !tagsetB.exemplos) return [];
  
  const exemplosA = new Set(tagsetA.exemplos.map(e => e.toLowerCase()));
  const exemplosB = new Set(tagsetB.exemplos.map(e => e.toLowerCase()));
  
  return [...exemplosA].filter(e => exemplosB.has(e));
};

/**
 * Extrai palavras-chave da descrição
 */
const extractKeywords = (text: string): Set<string> => {
  const stopwords = new Set([
    'a', 'o', 'e', 'de', 'da', 'do', 'em', 'um', 'uma', 'os', 'as',
    'para', 'com', 'por', 'que', 'não', 'se', 'na', 'no', 'ao', 'dos', 'das'
  ]);
  
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopwords.has(word))
  );
};

/**
 * Encontra palavras em comum nas descrições
 */
const findCommonWords = (tagsetA: Tagset, tagsetB: Tagset): string[] => {
  if (!tagsetA.descricao || !tagsetB.descricao) return [];
  
  const wordsA = extractKeywords(tagsetA.descricao);
  const wordsB = extractKeywords(tagsetB.descricao);
  
  return [...wordsA].filter(w => wordsB.has(w));
};

/**
 * Classifica tipo de sobreposição baseado na similaridade
 */
const classifyOverlapType = (similarity: number): 'high' | 'medium' | 'low' => {
  if (similarity >= 0.7) return 'high';
  if (similarity >= 0.4) return 'medium';
  return 'low';
};

/**
 * Detecta todos os pares de tagsets com sobreposição acima do threshold
 */
export const detectOverlappingTagsets = (
  tagsets: Tagset[],
  threshold: number = 0.3
): OverlapPair[] => {
  const pairs: OverlapPair[] = [];
  
  // Comparar todos os pares (n²/2)
  for (let i = 0; i < tagsets.length; i++) {
    for (let j = i + 1; j < tagsets.length; j++) {
      const tagsetA = tagsets[i];
      const tagsetB = tagsets[j];
      
      const similarity = calculateSemanticSimilarity(tagsetA, tagsetB);
      
      // Filtrar por threshold
      if (similarity < threshold) continue;
      
      const commonExamples = findCommonExamples(tagsetA, tagsetB);
      const commonWords = findCommonWords(tagsetA, tagsetB);
      
      pairs.push({
        tagsetA,
        tagsetB,
        similarity,
        commonExamples,
        commonWords,
        overlapType: classifyOverlapType(similarity)
      });
    }
  }
  
  // Ordenar por similaridade decrescente
  return pairs.sort((a, b) => b.similarity - a.similarity);
};
