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
 * Calcula MI Score para uma palavra específica dentro de seu domínio
 * 
 * @param wordFreq - Frequência da palavra no domínio
 * @param domainTotalFreq - Frequência total do domínio
 * @param corpusSize - Tamanho total do corpus
 * @returns MI Score (0 a ~10, onde > 3.0 indica forte associação)
 */
export function calculateWordMIScore(
  wordFreq: number,
  domainTotalFreq: number,
  corpusSize: number
): number {
  if (wordFreq === 0 || domainTotalFreq === 0) return 0;
  
  // Probabilidade observada: P(palavra no domínio)
  const observedProb = wordFreq / domainTotalFreq;
  
  // Probabilidade esperada: P(palavra no corpus geral)
  const expectedProb = wordFreq / corpusSize;
  
  // MI = log2(P(observada) / P(esperada))
  const mi = Math.log2(observedProb / expectedProb);
  
  // Normalizar para valores positivos (MI pode ser negativo para palavras sub-representadas)
  // Retornar entre 0 e ~10
  return Math.max(0, Math.round(mi * 100) / 100);
}

/**
 * Mapeia MI Score para distância orbital
 * MI alto (> 3.0) = órbita próxima (associação forte)
 * MI médio (1.0-3.0) = órbita média
 * MI baixo (< 1.0) = órbita distante
 */
export function miScoreToOrbitalRadius(miScore: number): number {
  // Normalizar MI Score (geralmente entre 0 e 6)
  const normalizedMI = Math.min(miScore, 6) / 6; // 0 a 1
  
  // Inverter: MI alto = distância baixa
  const distanceFromCore = 1.0 - normalizedMI;
  
  // Mapear para raios orbitais
  // Camada 1 (MI > 4.5): 0.5 - 1.0 (núcleo)
  // Camada 2 (MI 3.0-4.5): 1.0 - 1.8
  // Camada 3 (MI 1.5-3.0): 1.8 - 2.8
  // Camada 4 (MI < 1.5): 2.8 - 4.0
  const minRadius = 0.5;
  const maxRadius = 4.0;
  
  return minRadius + (distanceFromCore * (maxRadius - minRadius));
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
