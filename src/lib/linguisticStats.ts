import { DominioSemantico } from "@/data/types/corpus.types";

export interface DomainStats {
  domain: string;
  color: string;
  totalFrequency: number;
  normalizedFrequency: number;
  lexicalRichness: number;
  logLikelihood: number;
  miScore: number;
  wordCount: number;
}

// Tamanho do corpus de estudo (estimativa baseada nos dados)
const CORPUS_SIZE = 10000;

// Corpus de referência (corpus geral do português brasileiro)
const REFERENCE_SIZE = 100000000;

/**
 * Calcula Log-Likelihood para comparação de frequências entre corpora
 * LL > 15.13 = significância extrema (p < 0.0001)
 * LL > 10.83 = significância alta (p < 0.001)
 * LL > 6.63 = significância média (p < 0.01)
 */
function calculateLogLikelihood(
  observedFreq: number,
  corpusSize: number,
  referenceFreq: number,
  referenceSize: number
): number {
  const a = observedFreq;
  const b = referenceFreq;
  const c = corpusSize;
  const d = referenceSize;
  
  const E1 = c * ((a + b) / (c + d));
  const E2 = d * ((a + b) / (c + d));
  
  if (E1 === 0 || E2 === 0 || a === 0 || b === 0) return 0;
  
  const ll = 2 * ((a * Math.log(a / E1)) + (b * Math.log(b / E2)));
  
  return Math.round(ll * 100) / 100;
}

/**
 * Calcula Mutual Information Score (MI)
 * MI > 3.0 = colocação forte
 * MI > 1.0 = colocação moderada
 */
function calculateMutualInformation(
  observedFreq: number,
  corpusSize: number,
  expectedFreq: number
): number {
  if (observedFreq === 0 || expectedFreq === 0) return 0;
  
  const observed = observedFreq / corpusSize;
  const expected = expectedFreq / corpusSize;
  
  const mi = Math.log2(observed / expected);
  
  return Math.round(mi * 100) / 100;
}

/**
 * Calcula estatísticas completas para um domínio semântico
 */
export function calculateDomainStats(dominio: DominioSemantico): DomainStats {
  const totalFrequency = dominio.ocorrencias;
  const wordCount = dominio.palavrasComFrequencia.length;
  
  // Riqueza lexical (Type-Token Ratio normalizado)
  const lexicalRichness = Math.round((wordCount / totalFrequency) * 100) / 100;
  
  // Frequência normalizada (por 1000 palavras)
  const normalizedFrequency = Math.round((totalFrequency / CORPUS_SIZE) * 1000 * 100) / 100;
  
  // Estimativa de frequência no corpus de referência (baseada no percentual)
  const referenceFreq = Math.round((dominio.percentualCorpusNE / 100) * REFERENCE_SIZE);
  
  // Log Likelihood
  const logLikelihood = calculateLogLikelihood(
    totalFrequency,
    CORPUS_SIZE,
    referenceFreq,
    REFERENCE_SIZE
  );
  
  // MI Score (usando frequência esperada do corpus de referência)
  const miScore = calculateMutualInformation(
    totalFrequency,
    CORPUS_SIZE,
    referenceFreq
  );
  
  return {
    domain: dominio.dominio,
    color: dominio.cor,
    totalFrequency,
    normalizedFrequency,
    lexicalRichness,
    logLikelihood,
    miScore,
    wordCount
  };
}

/**
 * Calcula estatísticas para todos os domínios
 */
export function calculateAllDomainStats(dominios: DominioSemantico[]): DomainStats[] {
  return dominios
    .filter(d => d.dominio !== "Palavras Funcionais")
    .map(calculateDomainStats)
    .sort((a, b) => b.totalFrequency - a.totalFrequency);
}
