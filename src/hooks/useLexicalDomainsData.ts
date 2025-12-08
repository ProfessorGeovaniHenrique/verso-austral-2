/**
 * Hook para calcular dados de domínios e keywords a partir do LexicalProfile
 * Sprint LF-5 Fase 3: Hook de Dados Unificado
 */

import { useMemo } from 'react';
import { LexicalProfile } from '@/data/types/stylistic-analysis.types';
import { DominioSemantico } from '@/data/types/corpus.types';

export interface LexicalKeyword {
  word: string;
  domain: string;
  frequency: number;
  frequencyPercent: number;
  ll?: number;
  mi?: number;
  effect: 'super' | 'sub' | 'neutral';
  prosody: 'positive' | 'negative' | 'neutral';
  isHapax: boolean;
}

export interface LexicalCloudNode {
  id: string;
  label: string;
  value: number;
  color: string;
  type: 'domain' | 'word';
}

export interface ProsodyDistribution {
  positive: number;
  negative: number;
  neutral: number;
  positiveWords: LexicalKeyword[];
  negativeWords: LexicalKeyword[];
  neutralWords: LexicalKeyword[];
}

export interface DomainStats {
  domain: string;
  wordCount: number;
  totalOccurrences: number;
  percentage: number;
  avgLL: number;
  avgMI: number;
  keywords: LexicalKeyword[];
}

// Paleta de cores para domínios
const DOMAIN_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(173, 80%, 40%)',
  'hsl(330, 81%, 60%)',
];

export function useLexicalDomainsData(
  studyProfile: LexicalProfile | null,
  studyDominios: DominioSemantico[],
  ignorarMG: boolean = true
) {
  return useMemo(() => {
    if (!studyProfile) {
      return {
        domains: [] as DomainStats[],
        keywords: [] as LexicalKeyword[],
        cloudData: [] as LexicalCloudNode[],
        prosodyDistribution: null as ProsodyDistribution | null,
        totalWords: 0,
        uniqueWords: 0,
      };
    }

    // Processar keywords a partir de wordFrequencies
    const keywords: LexicalKeyword[] = studyProfile.wordFrequencies
      .filter(wf => !ignorarMG || (wf.domain && !wf.domain.startsWith('MG')))
      .map(wf => ({
        word: wf.word,
        domain: wf.domain || 'Não classificado',
        frequency: wf.freq,
        frequencyPercent: (wf.freq / studyProfile.totalTokens) * 100,
        ll: undefined, // LL não disponível diretamente no LexicalProfile
        mi: undefined,
        effect: 'neutral' as const,
        prosody: 'neutral' as const,
        isHapax: wf.isHapax,
      }));

    // Agrupar por domínio para estatísticas
    const domainMap = new Map<string, LexicalKeyword[]>();
    keywords.forEach(kw => {
      const existing = domainMap.get(kw.domain) || [];
      existing.push(kw);
      domainMap.set(kw.domain, existing);
    });

    // Calcular estatísticas por domínio
    const domains: DomainStats[] = Array.from(domainMap.entries())
      .map(([domain, kws], idx) => ({
        domain,
        wordCount: kws.length,
        totalOccurrences: kws.reduce((sum, k) => sum + k.frequency, 0),
        percentage: (kws.reduce((sum, k) => sum + k.frequency, 0) / studyProfile.totalTokens) * 100,
        avgLL: 0,
        avgMI: 0,
        keywords: kws,
      }))
      .sort((a, b) => b.totalOccurrences - a.totalOccurrences);

    // Enriquecer com dados de studyDominios se disponível
    if (studyDominios.length > 0) {
      domains.forEach(d => {
        const matchingDominio = studyDominios.find(sd => sd.dominio === d.domain);
        if (matchingDominio) {
          d.avgLL = matchingDominio.avgLL || 0;
          d.avgMI = matchingDominio.avgMI || 0;
        }
      });
    }

    // Gerar dados para nuvem de domínios
    const cloudData: LexicalCloudNode[] = domains.slice(0, 20).map((d, idx) => ({
      id: d.domain,
      label: d.domain,
      value: d.totalOccurrences,
      color: DOMAIN_COLORS[idx % DOMAIN_COLORS.length],
      type: 'domain' as const,
    }));

    // Calcular distribuição de prosódia (simulada a partir de domínios conhecidos)
    // Domínios tipicamente positivos vs negativos
    const positivePatterns = ['Afeto', 'Natureza', 'Família', 'Celebração', 'Amor'];
    const negativePatterns = ['Morte', 'Violência', 'Dor', 'Tristeza', 'Conflito'];

    const positiveWords = keywords.filter(kw => 
      positivePatterns.some(p => kw.domain.toLowerCase().includes(p.toLowerCase()))
    );
    const negativeWords = keywords.filter(kw => 
      negativePatterns.some(p => kw.domain.toLowerCase().includes(p.toLowerCase()))
    );
    const neutralWords = keywords.filter(kw => 
      !positivePatterns.some(p => kw.domain.toLowerCase().includes(p.toLowerCase())) &&
      !negativePatterns.some(p => kw.domain.toLowerCase().includes(p.toLowerCase()))
    );

    const prosodyDistribution: ProsodyDistribution = {
      positive: positiveWords.length,
      negative: negativeWords.length,
      neutral: neutralWords.length,
      positiveWords,
      negativeWords,
      neutralWords,
    };

    return {
      domains,
      keywords,
      cloudData,
      prosodyDistribution,
      totalWords: studyProfile.totalTokens,
      uniqueWords: studyProfile.uniqueTokens,
    };
  }, [studyProfile, studyDominios, ignorarMG]);
}
