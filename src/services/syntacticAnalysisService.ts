/**
 * Syntactic Analysis Service
 * Based on Leech & Short (2007) Chapter 7 "The Rhetoric of Text"
 */

import { CorpusComPOS, POSStatistics } from '@/data/types/pos-annotation.types';
import { SyntacticProfile } from '@/data/types/stylistic-analysis.types';

export function calculateSyntacticProfile(annotatedCorpus: CorpusComPOS): SyntacticProfile {
  const allTokens = annotatedCorpus.musicas.flatMap(m => m.tokens);
  
  // Calculate sentence lengths using LINE BREAKS (verses) for music lyrics
  // Music lyrics rarely use traditional punctuation, so we use verses as "sentences"
  const sentences: number[] = [];
  
  annotatedCorpus.musicas.forEach(musica => {
    // Get lyrics from musica object (may be stored as 'letra' or need to reconstruct from tokens)
    const letra = (musica as any).letra || '';
    
    if (letra) {
      // Split by line breaks to get verses
      const versos = letra
        .split(/\n+/)
        .filter((v: string) => v.trim().length > 0);
      
      versos.forEach((verso: string) => {
        // Count words in each verse
        const palavrasNoVerso = verso
          .split(/\s+/)
          .filter((p: string) => p.length > 1 && !/^[.,!?;:()"\-]+$/.test(p));
        
        if (palavrasNoVerso.length > 0) {
          sentences.push(palavrasNoVerso.length);
        }
      });
    }
  });
  
  // Fallback: If no verses found, try punctuation-based detection (formal texts)
  if (sentences.length === 0) {
    let currentSentenceLength = 0;
    allTokens.forEach(token => {
      currentSentenceLength++;
      if (['.', '!', '?', ';'].includes(token.palavra)) {
        if (currentSentenceLength > 1) {
          sentences.push(currentSentenceLength);
        }
        currentSentenceLength = 0;
      }
    });
    
    // Last fallback: treat entire corpus as one "sentence"
    if (sentences.length === 0 && allTokens.length > 0) {
      sentences.push(allTokens.length);
    }
  }
  
  // Calculate average and standard deviation
  const averageSentenceLength = sentences.length > 0 
    ? sentences.reduce((a, b) => a + b, 0) / sentences.length 
    : 0;
  
  const variance = sentences.length > 0
    ? sentences.reduce((acc, len) => acc + Math.pow(len - averageSentenceLength, 2), 0) / sentences.length
    : 0;
  const sentenceLengthStdDev = Math.sqrt(variance);

  // POS distribution
  const posDistribution: Record<string, number> = {};
  const posPercentages: Record<string, number> = {};
  
  allTokens.forEach(token => {
    const pos = token.pos || 'UNKNOWN';
    posDistribution[pos] = (posDistribution[pos] || 0) + 1;
  });

  const totalTokens = allTokens.length;
  Object.entries(posDistribution).forEach(([pos, count]) => {
    posPercentages[pos] = (count / totalTokens) * 100;
  });

  // Voice distribution (simplified - based on verb forms)
  const verbs = allTokens.filter(t => t.pos === 'VERB');
  const passiveMarkers = allTokens.filter(t => 
    t.pos === 'AUX' && ['ser', 'estar', 'sido', 'foi'].includes(t.lema.toLowerCase())
  );
  
  const voiceDistribution = {
    active: verbs.length - passiveMarkers.length,
    passive: passiveMarkers.length
  };

  // Tense distribution (from features)
  const tenseDistribution: Record<string, number> = {};
  verbs.forEach(verb => {
    const tense = verb.features.Tense || 'unknown';
    tenseDistribution[tense] = (tenseDistribution[tense] || 0) + 1;
  });

  // Modifier density
  const adjectives = posDistribution['ADJ'] || 0;
  const nouns = posDistribution['NOUN'] || 0;
  const adverbs = posDistribution['ADV'] || 0;
  
  const modifierDensity = {
    adjNounRatio: nouns > 0 ? adjectives / nouns : 0,
    advVerbRatio: verbs.length > 0 ? adverbs / verbs.length : 0
  };

  // Syntactic complexity (based on subordinate conjunctions and relative pronouns)
  const complexMarkers = allTokens.filter(t => 
    t.pos === 'SCONJ' || (t.pos === 'PRON' && ['que', 'qual', 'onde'].includes(t.palavra.toLowerCase()))
  );
  const syntacticComplexity = sentences.length > 0 
    ? complexMarkers.length / sentences.length 
    : 0;

  return {
    corpusType: annotatedCorpus.tipo,
    averageSentenceLength,
    sentenceLengthStdDev,
    posDistribution,
    posPercentages,
    voiceDistribution,
    tenseDistribution,
    modifierDensity,
    syntacticComplexity
  };
}
