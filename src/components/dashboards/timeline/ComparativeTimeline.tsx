/**
 * 🔄 COMPARATIVE TIMELINE
 * Side-by-side animated comparison of two corpora over time
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, TrendingUp, TrendingDown, Equal } from 'lucide-react';
import { ComparativeTimelineData, TimelineSeries } from './types';

interface ComparativeTimelineProps {
  data: ComparativeTimelineData;
  currentYear: number;
  selectedMetric?: string;
}

const CORPUS_COLORS = {
  A: {
    primary: 'hsl(var(--chart-1))',
    secondary: 'hsl(var(--chart-1) / 0.3)',
  },
  B: {
    primary: 'hsl(var(--chart-3))',
    secondary: 'hsl(var(--chart-3) / 0.3)',
  },
};

function calculateDifference(seriesA: TimelineSeries[], seriesB: TimelineSeries[], year: number, metricId?: string): {
  diff: number;
  direction: 'A' | 'B' | 'equal';
  valueA: number;
  valueB: number;
} {
  const getValueForYear = (series: TimelineSeries[], y: number) => {
    const targetSeries = metricId 
      ? series.find(s => s.id === metricId)
      : series[0];
    
    if (!targetSeries) return 0;
    const point = targetSeries.data.find(d => d.ano === y);
    return point?.valorNormalizado ?? point?.valor ?? 0;
  };

  const valueA = getValueForYear(seriesA, year);
  const valueB = getValueForYear(seriesB, year);
  
  const diff = Math.abs(valueA - valueB);
  const direction = valueA > valueB ? 'A' : valueB > valueA ? 'B' : 'equal';

  return { diff, direction, valueA, valueB };
}

export function ComparativeTimeline({
  data,
  currentYear,
  selectedMetric,
}: ComparativeTimelineProps) {
  const { corpusA, corpusB, sharedYears } = data;

  // Prepare unified chart data
  const chartData = useMemo(() => {
    return sharedYears
      .filter(year => year <= currentYear)
      .map(ano => {
        const point: Record<string, number | string> = { ano };

        // Get values from corpus A
        corpusA.series.forEach(series => {
          const dp = series.data.find(d => d.ano === ano);
          point[`${corpusA.name}_${series.id}`] = dp?.valorNormalizado ?? dp?.valor ?? 0;
        });

        // Get values from corpus B
        corpusB.series.forEach(series => {
          const dp = series.data.find(d => d.ano === ano);
          point[`${corpusB.name}_${series.id}`] = dp?.valorNormalizado ?? dp?.valor ?? 0;
        });

        return point;
      });
  }, [corpusA, corpusB, sharedYears, currentYear]);

  // Current year comparison
  const comparison = useMemo(() => {
    return calculateDifference(corpusA.series, corpusB.series, currentYear, selectedMetric);
  }, [corpusA.series, corpusB.series, currentYear, selectedMetric]);

  // Active series (first or selected)
  const activeSeries = selectedMetric || (corpusA.series[0]?.id ?? '');

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Comparação Temporal
          <Badge variant="outline" className="ml-auto">
            {currentYear}
          </Badge>
        </CardTitle>
        <CardDescription>
          {corpusA.name} vs {corpusB.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Summary */}
        <motion.div
          key={currentYear}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4 items-center"
        >
          {/* Corpus A Value */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">{corpusA.name}</div>
            <motion.div
              key={`A-${currentYear}`}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold"
              style={{ color: CORPUS_COLORS.A.primary }}
            >
              {comparison.valueA.toFixed(2)}
            </motion.div>
          </div>

          {/* Comparison Indicator */}
          <div className="text-center">
            <motion.div
              className="flex items-center justify-center gap-2"
              animate={{
                x: comparison.direction === 'A' ? -5 : comparison.direction === 'B' ? 5 : 0,
              }}
            >
              {comparison.direction === 'A' && (
                <TrendingUp className="h-6 w-6" style={{ color: CORPUS_COLORS.A.primary }} />
              )}
              {comparison.direction === 'B' && (
                <TrendingDown className="h-6 w-6" style={{ color: CORPUS_COLORS.B.primary }} />
              )}
              {comparison.direction === 'equal' && (
                <Equal className="h-6 w-6 text-muted-foreground" />
              )}
            </motion.div>
            <div className="text-sm text-muted-foreground mt-1">
              Δ {comparison.diff.toFixed(2)}
            </div>
          </div>

          {/* Corpus B Value */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">{corpusB.name}</div>
            <motion.div
              key={`B-${currentYear}`}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold"
              style={{ color: CORPUS_COLORS.B.primary }}
            >
              {comparison.valueB.toFixed(2)}
            </motion.div>
          </div>
        </motion.div>

        <Separator />

        {/* Comparative Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradientA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CORPUS_COLORS.A.primary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CORPUS_COLORS.A.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CORPUS_COLORS.B.primary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CORPUS_COLORS.B.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="ano"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted))' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => `Ano: ${label}`}
              />
              <Legend />

              {/* Corpus A Area */}
              <Area
                type="monotone"
                dataKey={`${corpusA.name}_${activeSeries}`}
                name={corpusA.name}
                stroke={CORPUS_COLORS.A.primary}
                fill="url(#gradientA)"
                strokeWidth={2}
                animationDuration={500}
              />

              {/* Corpus B Area */}
              <Area
                type="monotone"
                dataKey={`${corpusB.name}_${activeSeries}`}
                name={corpusB.name}
                stroke={CORPUS_COLORS.B.primary}
                fill="url(#gradientB)"
                strokeWidth={2}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Year markers */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Início: {sharedYears[0]}</span>
          <span>Atual: {currentYear}</span>
          <span>Fim: {sharedYears[sharedYears.length - 1]}</span>
        </div>
      </CardContent>
    </Card>
  );
}
