/**
 * Lexical Analysis Service
 * Implements Leech & Short's lexical analysis techniques
 */

import { CorpusCompleto } from '@/data/types/full-text-corpus.types';
import { CorpusComPOS, POSStatistics } from '@/data/types/pos-annotation.types';
import { LexicalProfile, LexicalComparison } from '@/data/types/stylistic-analysis.types';
import { DominioSemantico } from '@/data/types/corpus.types';

/**
 * Calculate comprehensive lexical profile for a corpus
 */
export function calculateLexicalProfile(
  corpus: CorpusCompleto,
  dominios: DominioSemantico[],
  posStats?: POSStatistics
): LexicalProfile {
  // Count tokens and types
  const allWords = corpus.musicas.flatMap(m => m.palavras);
  const totalTokens = allWords.length;
  const uniqueWords = new Set(allWords.map(w => w.toLowerCase()));
  const uniqueTokens = uniqueWords.size;

  // Calculate Type-Token Ratio (TTR)
  const ttr = uniqueTokens / totalTokens;

  // Calculate word frequencies
  const freqMap = new Map<string, number>();
  allWords.forEach(word => {
    const lower = word.toLowerCase();
    freqMap.set(lower, (freqMap.get(lower) || 0) + 1);
  });

  // Identify hapax legomena (words appearing only once)
  const hapaxWords = Array.from(freqMap.entries())
    .filter(([_, freq]) => freq === 1)
    .map(([word]) => word);
  const hapaxCount = hapaxWords.length;
  const hapaxPercentage = (hapaxCount / uniqueTokens) * 100;

  // Calculate lexical density (requires POS data)
  let lexicalDensity = 0;
  let nounVerbRatio = 0;
  if (posStats) {
    const contentWords = 
      (posStats.distribuicaoPOS['NOUN'] || 0) +
      (posStats.distribuicaoPOS['VERB'] || 0) +
      (posStats.distribuicaoPOS['ADJ'] || 0) +
      (posStats.distribuicaoPOS['ADV'] || 0);
    lexicalDensity = contentWords / totalTokens;
    
    const nouns = posStats.distribuicaoPOS['NOUN'] || 0;
    const verbs = posStats.distribuicaoPOS['VERB'] || 0;
    nounVerbRatio = verbs > 0 ? nouns / verbs : nouns;
  }

  // Calculate semantic field distribution
  const topSemanticFields = dominios
    .map(d => ({
      field: d.dominio,
      count: d.ocorrencias,
      percentage: d.percentual
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Build word frequency list
  const wordFrequencies = Array.from(freqMap.entries())
    .map(([word, freq]) => {
      // Find domain for this word
      const domain = dominios.find(d => 
        d.palavras.some(p => p.toLowerCase() === word)
      );

      return {
        word,
        freq,
        domain: domain?.dominio,
        isHapax: freq === 1
      };
    })
    .sort((a, b) => b.freq - a.freq);

  // Estimate concrete vs abstract (simplified)
  // This is a placeholder - proper implementation would require semantic analysis
  const concreteAbstractRatio = 1.0;

  return {
    corpusType: corpus.tipo,
    totalTokens,
    uniqueTokens,
    ttr,
    lexicalDensity,
    hapaxCount,
    hapaxPercentage,
    nounVerbRatio,
    topSemanticFields,
    wordFrequencies,
    concreteAbstractRatio
  };
}

/**
 * Compare two lexical profiles
 */
export function compareProfiles(
  studyProfile: LexicalProfile,
  referenceProfile: LexicalProfile
): LexicalComparison {
  const differences = {
    ttrDiff: ((studyProfile.ttr - referenceProfile.ttr) / referenceProfile.ttr) * 100,
    lexicalDensityDiff: ((studyProfile.lexicalDensity - referenceProfile.lexicalDensity) / referenceProfile.lexicalDensity) * 100,
    hapaxDiff: ((studyProfile.hapaxPercentage - referenceProfile.hapaxPercentage) / referenceProfile.hapaxPercentage) * 100,
    nounVerbRatioDiff: ((studyProfile.nounVerbRatio - referenceProfile.nounVerbRatio) / referenceProfile.nounVerbRatio) * 100
  };

  // Compare semantic fields
  const studyFieldMap = new Map(
    studyProfile.topSemanticFields.map(f => [f.field, f.percentage])
  );
  const refFieldMap = new Map(
    referenceProfile.topSemanticFields.map(f => [f.field, f.percentage])
  );

  const allFields = new Set([
    ...studyProfile.topSemanticFields.map(f => f.field),
    ...referenceProfile.topSemanticFields.map(f => f.field)
  ]);

  const significantFields = Array.from(allFields)
    .map(field => ({
      field,
      studyPercentage: studyFieldMap.get(field) || 0,
      referencePercentage: refFieldMap.get(field) || 0,
      difference: (studyFieldMap.get(field) || 0) - (refFieldMap.get(field) || 0)
    }))
    .filter(f => Math.abs(f.difference) > 2) // Only significant differences
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

  return {
    studyProfile,
    referenceProfile,
    differences,
    significantFields
  };
}

/**
 * Identify and extract hapax legomena with context
 */
export function identifyHapaxWithContext(
  corpus: CorpusCompleto,
  maxResults: number = 50
): Array<{ word: string; context: string; metadata: any }> {
  const freqMap = new Map<string, Array<{ context: string; metadata: any }>>();
  
  corpus.musicas.forEach(musica => {
    musica.palavras.forEach((palavra, idx) => {
      const lower = palavra.toLowerCase();
      const contextStart = Math.max(0, idx - 3);
      const contextEnd = Math.min(musica.palavras.length, idx + 4);
      const context = musica.palavras.slice(contextStart, contextEnd).join(' ');
      
      if (!freqMap.has(lower)) {
        freqMap.set(lower, []);
      }
      freqMap.get(lower)!.push({
        context,
        metadata: musica.metadata
      });
    });
  });

  // Filter hapax (frequency = 1) and return with context
  return Array.from(freqMap.entries())
    .filter(([_, occurrences]) => occurrences.length === 1)
    .map(([word, occurrences]) => ({
      word,
      context: occurrences[0].context,
      metadata: occurrences[0].metadata
    }))
    .slice(0, maxResults);
}

/**
 * Calculate diversity metrics
 */
export function calculateDiversityMetrics(profile: LexicalProfile) {
  return {
    vocabularyRichness: profile.ttr > 0.6 ? 'Alta' : profile.ttr > 0.4 ? 'Média' : 'Baixa',
    lexicalDensityLevel: profile.lexicalDensity > 0.6 ? 'Alto' : profile.lexicalDensity > 0.4 ? 'Médio' : 'Baixo',
    hapaxLevel: profile.hapaxPercentage > 30 ? 'Alto' : profile.hapaxPercentage > 15 ? 'Médio' : 'Baixo',
    styleType: profile.nounVerbRatio > 1.5 ? 'Nominal' : profile.nounVerbRatio < 0.8 ? 'Verbal' : 'Equilibrado'
  };
}

/**
 * Export lexical profile to CSV
 */
export function exportLexicalProfileToCSV(profile: LexicalProfile): string {
  let csv = 'Métrica,Valor\n';
  csv += `Corpus,${profile.corpusType}\n`;
  csv += `Total de Tokens,${profile.totalTokens}\n`;
  csv += `Tokens Únicos,${profile.uniqueTokens}\n`;
  csv += `Type-Token Ratio,${profile.ttr.toFixed(4)}\n`;
  csv += `Densidade Lexical,${profile.lexicalDensity.toFixed(4)}\n`;
  csv += `Hapax Legomena,${profile.hapaxCount}\n`;
  csv += `Hapax (%),${profile.hapaxPercentage.toFixed(2)}\n`;
  csv += `Razão Substantivo/Verbo,${profile.nounVerbRatio.toFixed(2)}\n\n`;

  csv += 'Campos Semânticos,Ocorrências,Percentual\n';
  profile.topSemanticFields.forEach(field => {
    csv += `${field.field},${field.count},${field.percentage.toFixed(2)}%\n`;
  });

  csv += '\n\nPalavras,Frequência,Domínio,Hapax\n';
  profile.wordFrequencies.slice(0, 100).forEach(word => {
    csv += `${word.word},${word.freq},${word.domain || 'N/A'},${word.isHapax ? 'Sim' : 'Não'}\n`;
  });

  return csv;
}
