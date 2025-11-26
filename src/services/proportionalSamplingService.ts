/**
 * Proportional Sampling Service
 * Implements random proportional sampling for cross-corpus statistical analysis
 */

import { CorpusCompleto, SongEntry } from '@/data/types/full-text-corpus.types';
import { CorpusType } from '@/data/types/corpus-tools.types';

/**
 * Selects a random proportional sample from reference corpus
 * 
 * @param referenceCorpus - Full reference corpus
 * @param targetSize - Target size in words (based on ratio * studySize)
 * @param seed - Optional seed for reproducibility
 * @returns Sampled corpus with approximately targetSize words
 */
export function sampleProportionalCorpus(
  referenceCorpus: CorpusCompleto,
  targetSize: number,
  seed?: number
): CorpusCompleto {
  const totalWords = referenceCorpus.totalPalavras;

  // If target size >= total words, return complete corpus
  if (targetSize >= totalWords) {
    return referenceCorpus;
  }

  // Calculate how many songs we need
  const avgWordsPerSong = totalWords / referenceCorpus.totalMusicas;
  const estimatedSongsNeeded = Math.ceil(targetSize / avgWordsPerSong);

  // Shuffle songs (with optional seed for reproducibility)
  const shuffledSongs = shuffleArray([...referenceCorpus.musicas], seed);

  // Select songs until we reach target size
  const sampledSongs: SongEntry[] = [];
  let currentWordCount = 0;

  for (let i = 0; i < shuffledSongs.length && currentWordCount < targetSize; i++) {
    sampledSongs.push(shuffledSongs[i]);
    currentWordCount += shuffledSongs[i].palavras.length;
  }

  return {
    tipo: referenceCorpus.tipo,
    totalMusicas: sampledSongs.length,
    totalPalavras: currentWordCount,
    musicas: sampledSongs
  };
}

/**
 * Estimates corpus size without loading full corpus
 * Queries database for word counts
 * 
 * @param corpusType - Type of corpus (gaucho, nordestino)
 * @param mode - Selection mode (complete, artist, song)
 * @param identifier - Artist name or song ID (if applicable)
 * @returns Estimated word count
 */
export async function estimateCorpusSize(
  corpusType: CorpusType,
  mode: 'complete' | 'artist' | 'song',
  identifier?: string
): Promise<number> {
  // Mock estimates for now - in production, this would query database
  const mockEstimates = {
    gaucho: {
      complete: 1200000,
      perArtist: 50000,
      perSong: 200
    },
    nordestino: {
      complete: 800000,
      perArtist: 40000,
      perSong: 180
    }
  };

  const estimates = mockEstimates[corpusType] || mockEstimates.gaucho;

  switch (mode) {
    case 'complete':
      return estimates.complete;
    case 'artist':
      return estimates.perArtist;
    case 'song':
      return estimates.perSong;
    default:
      return estimates.complete;
  }
}

/**
 * Calculates recommended ratio based on study corpus size
 * Follows statistical best practices for comparative analysis
 * 
 * @param studySize - Size of study corpus in words
 * @returns Recommended ratio (1, 3, 5, or 10)
 */
export function recommendRatio(studySize: number): number {
  if (studySize < 1000) return 10; // Very small corpus needs large reference
  if (studySize < 10000) return 5; // Small corpus
  if (studySize < 100000) return 3; // Medium corpus
  return 1; // Large corpus can use 1:1
}

/**
 * Validates that corpus sizes are appropriate for comparison
 * 
 * @param studySize - Study corpus size
 * @param referenceSize - Reference corpus size
 * @returns Validation result with warnings
 */
export function validateCorpusSizes(
  studySize: number,
  referenceSize: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (studySize < 100) {
    warnings.push('Corpus de estudo muito pequeno (< 100 palavras) - resultados podem não ser confiáveis');
  }

  if (referenceSize < studySize) {
    warnings.push('Corpus de referência menor que corpus de estudo - considere aumentar a proporção');
  }

  const ratio = referenceSize / studySize;
  if (ratio < 1) {
    warnings.push(`Proporção atual: ${ratio.toFixed(2)}x - recomendado mínimo 1x`);
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Fisher-Yates shuffle algorithm
 * Optional seed for reproducibility
 */
function shuffleArray<T>(array: T[], seed?: number): T[] {
  const arr = [...array];
  let random = seed !== undefined ? seededRandom(seed) : Math.random;

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

/**
 * Seeded random number generator
 * For reproducible sampling
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return function() {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

/**
 * Calculates statistical significance between two proportions
 * Uses Chi-square test
 * 
 * @param studyCount - Count in study corpus
 * @param studyTotal - Total words in study corpus
 * @param refCount - Count in reference corpus
 * @param refTotal - Total words in reference corpus
 * @returns p-value and significance level
 */
export function calculateSignificance(
  studyCount: number,
  studyTotal: number,
  refCount: number,
  refTotal: number
): { pValue: number; significance: 'ns' | '*' | '**' | '***' } {
  // Chi-square calculation
  const studyProp = studyCount / studyTotal;
  const refProp = refCount / refTotal;
  const totalCount = studyCount + refCount;
  const totalWords = studyTotal + refTotal;
  const expectedStudy = (totalCount * studyTotal) / totalWords;
  const expectedRef = (totalCount * refTotal) / totalWords;

  const chiSquare =
    Math.pow(studyCount - expectedStudy, 2) / expectedStudy +
    Math.pow(refCount - expectedRef, 2) / expectedRef;

  // Convert to p-value (simplified - in production use proper chi-square distribution)
  let pValue: number;
  if (chiSquare < 3.84) pValue = 0.1; // Not significant
  else if (chiSquare < 6.63) pValue = 0.05; // *
  else if (chiSquare < 10.83) pValue = 0.01; // **
  else pValue = 0.001; // ***

  let significance: 'ns' | '*' | '**' | '***';
  if (pValue > 0.05) significance = 'ns';
  else if (pValue > 0.01) significance = '*';
  else if (pValue > 0.001) significance = '**';
  else significance = '***';

  return { pValue, significance };
}
