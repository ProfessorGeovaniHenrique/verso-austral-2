/**
 * 📈 STYLE EVOLUTION CHART
 * Animated chart showing stylistic metrics evolution over time
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StyleEvolutionMetric } from './types';

interface StyleEvolutionChartProps {
  metrics: StyleEvolutionMetric[];
  currentYear: number;
  showTrendlines?: boolean;
  showMarkers?: boolean;
  title?: string;
  description?: string;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function calculateTrend(values: { ano: number; valor: number }[]): 'crescente' | 'decrescente' | 'estável' {
  if (values.length < 2) return 'estável';
  
  const first = values[0].valor;
  const last = values[values.length - 1].valor;
  const diff = ((last - first) / Math.max(first, 0.001)) * 100;
  
  if (diff > 15) return 'crescente';
  if (diff < -15) return 'decrescente';
  return 'estável';
}

function TrendIcon({ trend }: { trend: 'crescente' | 'decrescente' | 'estável' }) {
  switch (trend) {
    case 'crescente':
      return <TrendingUp className="h-4 w-4 text-chart-1" />;
    case 'decrescente':
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

export function StyleEvolutionChart({
  metrics,
  currentYear,
  showTrendlines = true,
  showMarkers = true,
  title = 'Evolução Estilística',
  description = 'Métricas estilísticas ao longo do tempo',
}: StyleEvolutionChartProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    const allYears = new Set<number>();
    metrics.forEach(metric => {
      metric.values.forEach(v => allYears.add(v.ano));
    });

    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    return sortedYears.map(ano => {
      const point: Record<string, number> = { ano };
      
      metrics.forEach(metric => {
        const value = metric.values.find(v => v.ano === ano);
        point[metric.id] = value?.valor ?? 0;
      });

      return point;
    });
  }, [metrics]);

  // Filter data up to current year for animation
  const animatedData = useMemo(() => {
    return chartData.filter(d => d.ano <= currentYear);
  }, [chartData, currentYear]);

  // Current values
  const currentValues = useMemo(() => {
    return metrics.map(metric => {
      const value = metric.values.find(v => v.ano === currentYear);
      return {
        ...metric,
        currentValue: value?.valor ?? 0,
        trend: calculateTrend(metric.values.filter(v => v.ano <= currentYear)),
      };
    });
  }, [metrics, currentYear]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="outline" className="ml-auto">
            {currentYear}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Values Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <AnimatePresence mode="popLayout">
            {currentValues.map((metric, idx) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-muted/50 rounded-lg p-3 text-center"
              >
                <div className="text-xs text-muted-foreground truncate">
                  {metric.label}
                </div>
                <motion.div
                  key={`${metric.id}-${currentYear}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-lg font-bold"
                  style={{ color: metric.color || CHART_COLORS[idx % CHART_COLORS.length] }}
                >
                  {metric.currentValue.toFixed(2)}
                  {metric.unit && <span className="text-xs ml-1">{metric.unit}</span>}
                </motion.div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <TrendIcon trend={metric.trend} />
                  <span className="text-xs text-muted-foreground">
                    {metric.trend}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={animatedData}>
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
                formatter={(value: number, name: string) => {
                  const metric = metrics.find(m => m.id === name);
                  return [
                    `${value.toFixed(2)}${metric?.unit || ''}`,
                    metric?.label || name,
                  ];
                }}
              />
              <Legend />

              {/* Reference line for current year */}
              {showMarkers && (
                <ReferenceLine
                  x={currentYear}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}

              {/* Lines for each metric */}
              {metrics.map((metric, idx) => (
                <React.Fragment key={metric.id}>
                  {showTrendlines && (
                    <Area
                      type="monotone"
                      dataKey={metric.id}
                      fill={metric.color || CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={0.1}
                      stroke="none"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey={metric.id}
                    name={metric.label}
                    stroke={metric.color || CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={showMarkers ? { r: 3 } : false}
                    activeDot={{ r: 6 }}
                    animationDuration={500}
                  />
                </React.Fragment>
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
}
