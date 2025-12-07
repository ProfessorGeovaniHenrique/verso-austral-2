/**
 * 🎬 ANIMATED TIMELINE
 * Main component integrating timeline controls with style evolution visualization
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { TimelineControls } from './TimelineControls';
import { StyleEvolutionChart } from './StyleEvolutionChart';
import { ComparativeTimeline } from './ComparativeTimeline';
import { 
  TimelineControlsState, 
  StyleEvolutionMetric, 
  ComparativeTimelineData 
} from './types';

interface AnimatedTimelineProps {
  metrics: StyleEvolutionMetric[];
  comparativeData?: ComparativeTimelineData;
  title?: string;
  description?: string;
  onExport?: (format: 'png' | 'csv') => void;
}

export function AnimatedTimeline({
  metrics,
  comparativeData,
  title = 'Timeline de Evolução Estilística',
  description = 'Visualize a evolução das métricas estilísticas ao longo do tempo',
  onExport,
}: AnimatedTimelineProps) {
  // Calculate year range from metrics
  const yearRange = React.useMemo(() => {
    const allYears: number[] = [];
    metrics.forEach(m => m.values.forEach(v => allYears.push(v.ano)));
    if (comparativeData) {
      allYears.push(...comparativeData.sharedYears);
    }
    
    if (allYears.length === 0) {
      return { start: 1990, end: 2024 };
    }
    
    return {
      start: Math.min(...allYears),
      end: Math.max(...allYears),
    };
  }, [metrics, comparativeData]);

  // Timeline state
  const [controlsState, setControlsState] = useState<TimelineControlsState>({
    isPlaying: false,
    currentYear: yearRange.start,
    startYear: yearRange.start,
    endYear: yearRange.end,
    speed: 1,
    showMarkers: true,
    showTrendlines: true,
  });

  // Animation interval ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update year range when metrics change
  useEffect(() => {
    setControlsState(prev => ({
      ...prev,
      startYear: yearRange.start,
      endYear: yearRange.end,
      currentYear: Math.max(prev.currentYear, yearRange.start),
    }));
  }, [yearRange]);

  // Playback animation
  useEffect(() => {
    if (controlsState.isPlaying) {
      const intervalMs = 1000 / controlsState.speed;
      
      intervalRef.current = setInterval(() => {
        setControlsState(prev => {
          if (prev.currentYear >= prev.endYear) {
            // Stop at end
            return { ...prev, isPlaying: false };
          }
          return { ...prev, currentYear: prev.currentYear + 1 };
        });
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [controlsState.isPlaying, controlsState.speed]);

  // Handlers
  const handlePlayPause = useCallback(() => {
    setControlsState(prev => {
      // If at end, restart from beginning
      if (prev.currentYear >= prev.endYear && !prev.isPlaying) {
        return { ...prev, isPlaying: true, currentYear: prev.startYear };
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  }, []);

  const handleSkipToStart = useCallback(() => {
    setControlsState(prev => ({
      ...prev,
      currentYear: prev.startYear,
      isPlaying: false,
    }));
  }, []);

  const handleSkipToEnd = useCallback(() => {
    setControlsState(prev => ({
      ...prev,
      currentYear: prev.endYear,
      isPlaying: false,
    }));
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setControlsState(prev => ({
      ...prev,
      currentYear: year,
      isPlaying: false,
    }));
  }, []);

  const handleStateChange = useCallback((partial: Partial<TimelineControlsState>) => {
    setControlsState(prev => ({ ...prev, ...partial }));
  }, []);

  const handleReset = useCallback(() => {
    setControlsState(prev => ({
      ...prev,
      currentYear: prev.startYear,
      isPlaying: false,
      speed: 1,
      showMarkers: true,
      showTrendlines: true,
    }));
    toast.info('Timeline reiniciada');
  }, []);

  const handleExport = useCallback((format: 'png' | 'csv') => {
    if (onExport) {
      onExport(format);
    } else {
      toast.info(`Exportação ${format.toUpperCase()} em desenvolvimento`);
    }
  }, [onExport]);

  // Check if we have data
  const hasData = metrics.length > 0 && metrics.some(m => m.values.length > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum dado temporal disponível para visualização.</p>
            <p className="text-sm mt-2">Execute uma análise para gerar dados.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reiniciar
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
                <Download className="h-4 w-4 mr-2" />
                PNG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TimelineControls
            state={controlsState}
            onStateChange={handleStateChange}
            onPlayPause={handlePlayPause}
            onSkipToStart={handleSkipToStart}
            onSkipToEnd={handleSkipToEnd}
            onYearChange={handleYearChange}
          />
        </CardContent>
      </Card>

      {/* Style Evolution Chart */}
      <StyleEvolutionChart
        metrics={metrics}
        currentYear={controlsState.currentYear}
        showTrendlines={controlsState.showTrendlines}
        showMarkers={controlsState.showMarkers}
      />

      {/* Comparative Timeline (if data provided) */}
      {comparativeData && (
        <ComparativeTimeline
          data={comparativeData}
          currentYear={controlsState.currentYear}
        />
      )}
    </motion.div>
  );
}
