/**
 * 📊 TIMELINE COMPONENTS
 * Animated timeline visualization for stylistic evolution
 */

export { AnimatedTimeline } from './AnimatedTimeline';
export { TimelineControls } from './TimelineControls';
export { StyleEvolutionChart } from './StyleEvolutionChart';
export { ComparativeTimeline } from './ComparativeTimeline';

// Hooks
export { 
  useTimelineMetrics, 
  useComparativeTimelineData, 
  useSampleStylisticMetrics 
} from './useTimelineData';

export type {
  TimelineDataPoint,
  TimelineSeries,
  TimelineControlsState,
  StyleEvolutionMetric,
  ComparativeTimelineData,
} from './types';
