/**
 * 🪝 USE TIMELINE DATA
 * Hook to generate timeline data from temporal analysis
 */

import { useMemo } from 'react';
import { TemporalAnalysis } from '@/services/temporalAnalysisService';
import { StyleEvolutionMetric, ComparativeTimelineData, TimelineSeries } from './types';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

/**
 * Convert temporal analyses to timeline metrics
 */
export function useTimelineMetrics(
  analyses: Map<string, TemporalAnalysis>
): StyleEvolutionMetric[] {
  return useMemo(() => {
    const metrics: StyleEvolutionMetric[] = [];
    let colorIndex = 0;

    analyses.forEach((analysis, palavra) => {
      metrics.push({
        id: palavra,
        label: palavra,
        description: `Frequência normalizada de "${palavra}"`,
        color: CHART_COLORS[colorIndex % CHART_COLORS.length],
        values: analysis.dataPoints.map(dp => ({
          ano: dp.ano,
          valor: dp.frequenciaNormalizada,
        })),
        unit: '/10k',
      });
      colorIndex++;
    });

    return metrics;
  }, [analyses]);
}

/**
 * Generate comparative timeline data from two corpora
 */
export function useComparativeTimelineData(
  analysesA: Map<string, TemporalAnalysis>,
  analysesB: Map<string, TemporalAnalysis>,
  corpusNameA: string,
  corpusNameB: string
): ComparativeTimelineData | null {
  return useMemo(() => {
    if (analysesA.size === 0 && analysesB.size === 0) {
      return null;
    }

    // Convert to series
    const convertToSeries = (analyses: Map<string, TemporalAnalysis>): TimelineSeries[] => {
      const series: TimelineSeries[] = [];
      
      analyses.forEach((analysis, palavra) => {
        series.push({
          id: palavra,
          label: palavra,
          color: CHART_COLORS[series.length % CHART_COLORS.length],
          data: analysis.dataPoints.map(dp => ({
            ano: dp.ano,
            valor: dp.frequencia,
            valorNormalizado: dp.frequenciaNormalizada,
            metadata: dp.ocorrencias,
          })),
          tendencia: analysis.tendencia,
        });
      });

      return series;
    };

    const seriesA = convertToSeries(analysesA);
    const seriesB = convertToSeries(analysesB);

    // Find shared years
    const yearsA = new Set<number>();
    const yearsB = new Set<number>();

    analysesA.forEach(a => a.dataPoints.forEach(dp => yearsA.add(dp.ano)));
    analysesB.forEach(a => a.dataPoints.forEach(dp => yearsB.add(dp.ano)));

    // All years from both corpora
    const allYears = new Set([...yearsA, ...yearsB]);
    const sharedYears = Array.from(allYears).sort((a, b) => a - b);

    return {
      corpusA: {
        name: corpusNameA,
        series: seriesA,
      },
      corpusB: {
        name: corpusNameB,
        series: seriesB,
      },
      sharedYears,
    };
  }, [analysesA, analysesB, corpusNameA, corpusNameB]);
}

/**
 * Generate sample stylistic metrics for demonstration
 */
export function useSampleStylisticMetrics(): StyleEvolutionMetric[] {
  return useMemo(() => {
    const years = Array.from({ length: 35 }, (_, i) => 1990 + i);
    
    return [
      {
        id: 'ttr',
        label: 'TTR',
        description: 'Type-Token Ratio - diversidade lexical',
        color: CHART_COLORS[0],
        values: years.map(ano => ({
          ano,
          valor: 0.4 + Math.random() * 0.2 + (ano - 1990) * 0.002,
        })),
        unit: '',
      },
      {
        id: 'lexical_density',
        label: 'Densidade Léxica',
        description: 'Proporção de palavras de conteúdo',
        color: CHART_COLORS[1],
        values: years.map(ano => ({
          ano,
          valor: 0.5 + Math.random() * 0.15,
        })),
        unit: '',
      },
      {
        id: 'avg_word_length',
        label: 'Comp. Médio',
        description: 'Comprimento médio das palavras',
        color: CHART_COLORS[2],
        values: years.map(ano => ({
          ano,
          valor: 4.5 + Math.random() * 1.5,
        })),
        unit: 'chars',
      },
      {
        id: 'hapax',
        label: 'Hapax %',
        description: 'Porcentagem de palavras únicas',
        color: CHART_COLORS[3],
        values: years.map(ano => ({
          ano,
          valor: 30 + Math.random() * 20 - (ano - 1990) * 0.3,
        })),
        unit: '%',
      },
      {
        id: 'sentence_length',
        label: 'Comp. Sentença',
        description: 'Comprimento médio das sentenças',
        color: CHART_COLORS[4],
        values: years.map(ano => ({
          ano,
          valor: 8 + Math.random() * 6,
        })),
        unit: 'palavras',
      },
    ];
  }, []);
}
