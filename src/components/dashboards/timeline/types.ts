/**
 * 📊 TIMELINE TYPES
 * Types for animated timeline components
 */

export interface TimelineDataPoint {
  ano: number;
  valor: number;
  valorNormalizado: number;
  metadata?: {
    artista?: string;
    musica?: string;
    album?: string;
  }[];
}

export interface TimelineSeries {
  id: string;
  label: string;
  color: string;
  data: TimelineDataPoint[];
  tendencia: 'crescente' | 'decrescente' | 'estável';
}

export interface TimelineControlsState {
  isPlaying: boolean;
  currentYear: number;
  startYear: number;
  endYear: number;
  speed: number;
  showMarkers: boolean;
  showTrendlines: boolean;
}

export interface StyleEvolutionMetric {
  id: string;
  label: string;
  description: string;
  color: string;
  values: { ano: number; valor: number }[];
  unit?: string;
}

export interface ComparativeTimelineData {
  corpusA: {
    name: string;
    series: TimelineSeries[];
  };
  corpusB: {
    name: string;
    series: TimelineSeries[];
  };
  sharedYears: number[];
}
