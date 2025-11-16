/**
 * Types for Stylistic Analysis (Leech & Short)
 * Used for advanced literary and linguistic analysis
 */

import { CorpusType } from './corpus-tools.types';

export interface LexicalProfile {
  corpusType: CorpusType;
  totalTokens: number;
  uniqueTokens: number;
  ttr: number; // Type-Token Ratio
  lexicalDensity: number; // (NOUN + VERB + ADJ + ADV) / total
  hapaxCount: number;
  hapaxPercentage: number;
  nounVerbRatio: number;
  topSemanticFields: Array<{ field: string; count: number; percentage: number }>;
  wordFrequencies: Array<{ 
    word: string; 
    freq: number; 
    pos?: string; 
    domain?: string;
    isHapax: boolean;
  }>;
  concreteAbstractRatio: number;
}

export interface LexicalComparison {
  studyProfile: LexicalProfile;
  referenceProfile: LexicalProfile;
  differences: {
    ttrDiff: number;
    lexicalDensityDiff: number;
    hapaxDiff: number;
    nounVerbRatioDiff: number;
  };
  significantFields: Array<{
    field: string;
    studyPercentage: number;
    referencePercentage: number;
    difference: number;
  }>;
}

export interface SyntacticProfile {
  corpusType: CorpusType;
  averageSentenceLength: number;
  sentenceLengthStdDev: number;
  posDistribution: Record<string, number>;
  posPercentages: Record<string, number>;
  voiceDistribution: { active: number; passive: number };
  tenseDistribution: Record<string, number>;
  modifierDensity: { 
    adjNounRatio: number; 
    advVerbRatio: number;
  };
  syntacticComplexity: number;
}

export interface RhetoricalFigure {
  type: 'repetition' | 'alliteration' | 'assonance' | 'anaphora' | 'parallelism';
  example: string;
  context: string;
  position: number;
  musicaId?: string;
  metadata?: {
    artista?: string;
    musica?: string;
  };
}

export interface RhetoricalProfile {
  corpusType: CorpusType;
  totalFigures: number;
  figureDensity: number; // figures per 100 words
  figuresByType: Record<string, number>;
  figures: RhetoricalFigure[];
}

export interface CohesionProfile {
  corpusType: CorpusType;
  connectives: Array<{ 
    word: string; 
    type: 'additive' | 'adversative' | 'causal' | 'temporal' | 'conclusive'; 
    count: number;
  }>;
  connectiveDensity: number; // connectives per sentence
  connectiveVariation: number; // unique connectives
  anaphoricReferences: Array<{ 
    pronoun: string; 
    antecedent?: string; 
    position: number;
  }>;
  lexicalChains: Array<{ 
    words: string[]; 
    occurrences: number;
  }>;
}

export interface StyleReport {
  corpusType: CorpusType;
  generatedAt: Date;
  lexicalProfile: LexicalProfile;
  syntacticProfile?: SyntacticProfile;
  rhetoricalProfile?: RhetoricalProfile;
  cohesionProfile?: CohesionProfile;
  comparison?: {
    referenceCorpus: CorpusType;
    lexicalComparison: LexicalComparison;
  };
  insights: string[];
  radarData: Array<{
    category: string;
    value: number;
    referenceValue?: number;
  }>;
}
