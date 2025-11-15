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
  
  // Proporção relativa da palavra no domínio (0-1)
  const proportionInDomain = wordFreq / domainTotalFreq;
  
  // Peso absoluto no corpus
  const absoluteWeight = wordFreq / corpusSize;
  
  // Score híbrido (favorece palavras frequentes E concentradas)
  // Range: 0-10
  const score = (proportionInDomain * 4) + (absoluteWeight * 600);
  
  return Math.min(Math.max(score, 0), 10);
}

/**
 * Distribui palavras em camadas orbitais baseado em frequência bruta
 * ao invés de MI Score (mais intuitivo para corpus pequeno)
 * 
 * @param frequency - Frequência bruta da palavra
 * @returns Objeto com camada, raio base e limites
 */
export function frequencyToOrbitalLayer(frequency: number): {
  layer: number;
  radius: number;
  minRadius: number;
  maxRadius: number;
} {
  // Mapear frequência BRUTA para camadas (corpus gaúcho: 1-28)
  // Camadas bem espaçadas para evitar aglomeração
  const layers = [
    { layer: 1, minFreq: 15, radius: 2.5, spread: 1.0 },  // Muito frequente: 2.0-3.0
    { layer: 2, minFreq: 10, radius: 4.0, spread: 1.0 },  // Frequente: 3.5-4.5
    { layer: 3, minFreq: 6,  radius: 6.0, spread: 1.2 },  // Médio-alto: 5.4-6.6
    { layer: 4, minFreq: 4,  radius: 8.0, spread: 1.4 },  // Médio: 7.3-8.7
    { layer: 5, minFreq: 2,  radius: 10.0, spread: 1.6 }, // Baixo: 9.2-10.8
    { layer: 6, minFreq: 0,  radius: 12.5, spread: 2.0 }, // Muito baixo: 11.5-13.5
  ];
  
  const layerData = layers.find(l => frequency >= l.minFreq) || layers[5];
  
  return {
    layer: layerData.layer,
    radius: layerData.radius,
    minRadius: layerData.radius - layerData.spread / 2,
    maxRadius: layerData.radius + layerData.spread / 2,
  };
}

/**
 * Mapeia MI Score para uma das 6 camadas orbitais discretas
 * Retorna um objeto com { layer, radius, minRadius, maxRadius }
 */
export function miScoreToOrbitalLayer(miScore: number): {
  layer: number;
  radius: number;
  minRadius: number;
  maxRadius: number;
} {
  // Definir 6 camadas orbitais correspondentes às camadas da FOG
  const layers = [
    { layer: 1, minMI: 5.0, maxMI: Infinity, radius: 2.0, spread: 0.3 },  // Muito alto
    { layer: 2, minMI: 4.0, maxMI: 5.0,      radius: 2.6, spread: 0.3 },  // Alto
    { layer: 3, minMI: 3.0, maxMI: 4.0,      radius: 3.2, spread: 0.3 },  // Médio-alto
    { layer: 4, minMI: 2.0, maxMI: 3.0,      radius: 3.8, spread: 0.3 },  // Médio
    { layer: 5, minMI: 1.0, maxMI: 2.0,      radius: 4.4, spread: 0.3 },  // Baixo
    { layer: 6, minMI: 0.0, maxMI: 1.0,      radius: 5.0, spread: 0.3 },  // Muito baixo
  ];
  
  // Encontrar a camada correspondente
  const layerData = layers.find(l => miScore >= l.minMI && miScore < l.maxMI) || layers[5];
  
  return {
    layer: layerData.layer,
    radius: layerData.radius,
    minRadius: layerData.radius - layerData.spread / 2,
    maxRadius: layerData.radius + layerData.spread / 2,
  };
}

/**
 * Calcula ângulo uniforme dentro de um setor baseado no índice da palavra
 */
export function calculateUniformAngle(
  wordIndex: number,
  totalWordsInLayer: number,
  sectorStart: number, // Em radianos
  sectorSpread: number  // Em radianos
): number {
  // Distribuir uniformemente dentro do setor
  const angleStep = sectorSpread / Math.max(totalWordsInLayer, 1);
  return sectorStart + (wordIndex * angleStep);
}

/**
 * Mapeia MI Score para distância orbital (LEGACY - mantido para compatibilidade)
 * MI alto (> 3.0) = órbita próxima (associação forte)
 * MI médio (1.0-3.0) = órbita média
 * MI baixo (< 1.0) = órbita distante
 */
export function miScoreToOrbitalRadius(miScore: number): number {
  // Normalizar MI Score (geralmente entre 0 e 6)
  const normalizedMI = Math.min(miScore, 6) / 6; // 0 a 1
  
  // Inverter: MI alto = distância baixa
  const distanceFromCore = 1.0 - normalizedMI;
  
  // Mapear para raios orbitais - AJUSTADO para garantir visibilidade
  // Todos os planetas ficam FORA da FOG (raio > 1.5)
  // Camada 1 (MI > 4.5): 1.8 - 2.2 (próximo, mas fora da FOG)
  // Camada 2 (MI 3.0-4.5): 2.2 - 3.0
  // Camada 3 (MI 1.5-3.0): 3.0 - 3.8
  // Camada 4 (MI < 1.5): 3.8 - 4.5
  const minRadius = 1.8;  // ERA 0.5 - agora garantidamente fora da FOG
  const maxRadius = 4.5;  // ERA 4.0 - órbitas mais distantes
  
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
