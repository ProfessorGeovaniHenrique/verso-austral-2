import { TrendingUp, TrendingDown } from "lucide-react";
import { CorpusWord, KeywordEntry } from "@/data/types/corpus-tools.types";
import { calculateLogLikelihood, calculateMutualInformation, interpretLL } from "@/lib/keywordCalculator";
import { calculateTotalTokens } from "@/lib/corpusParser";

/**
 * Generate keywords by comparing study corpus against reference corpus
 * 
 * @param corpusEstudo - Study corpus words
 * @param corpusReferencia - Reference corpus words
 * @param minLL - Minimum Log-Likelihood threshold (default 6.63 = p < 0.01)
 * @returns Array of keyword entries sorted by LL
 */
export function generateKeywords(
  corpusEstudo: CorpusWord[],
  corpusReferencia: CorpusWord[],
  minLL: number = 6.63
): KeywordEntry[] {
  const totalEstudo = calculateTotalTokens(corpusEstudo);
  const totalReferencia = calculateTotalTokens(corpusReferencia);
  
  // Create lookup map for reference corpus
  const refMap = new Map(
    corpusReferencia.map(w => [w.headword.toLowerCase(), w])
  );
  
  const keywords: KeywordEntry[] = [];
  
  for (const wordEstudo of corpusEstudo) {
    const wordRef = refMap.get(wordEstudo.headword.toLowerCase());
    const freqRef = wordRef?.freq || 0;
    
    // Calculate normalized frequencies per million words
    const normFreqEstudo = (wordEstudo.freq / totalEstudo) * 1000000;
    const normFreqRef = freqRef > 0 ? (freqRef / totalReferencia) * 1000000 : 0;
    
    // Calculate statistics
    const ll = calculateLogLikelihood(
      wordEstudo.freq,
      totalEstudo,
      freqRef,
      totalReferencia
    );
    
    const mi = calculateMutualInformation(
      wordEstudo.freq,
      totalEstudo,
      freqRef,
      totalReferencia
    );
    
    // Determine effect (super vs sub-representado)
    const efeito = normFreqEstudo > normFreqRef 
      ? 'super-representado' 
      : 'sub-representado';
    
    const efeitoIcon = efeito === 'super-representado' ? TrendingUp : TrendingDown;
    
    // Only include words that meet minimum LL threshold
    if (ll >= minLL) {
      keywords.push({
        palavra: wordEstudo.headword,
        freqEstudo: wordEstudo.freq,
        freqReferencia: freqRef,
        normFreqEstudo,
        normFreqReferencia: normFreqRef,
        ll,
        mi,
        efeito,
        significancia: interpretLL(ll),
        efeitoIcon
      });
    }
  }
  
  // Sort by Log-Likelihood (descending)
  return keywords.sort((a, b) => b.ll - a.ll);
}
