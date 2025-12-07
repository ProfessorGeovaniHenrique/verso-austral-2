/**
 * 🎮 TIMELINE CONTROLS
 * Playback controls for animated timeline with play/pause, speed, and year selection
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TimelineControlsState } from './types';

interface TimelineControlsProps {
  state: TimelineControlsState;
  onStateChange: (state: Partial<TimelineControlsState>) => void;
  onPlayPause: () => void;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
  onYearChange: (year: number) => void;
}

export function TimelineControls({
  state,
  onStateChange,
  onPlayPause,
  onSkipToStart,
  onSkipToEnd,
  onYearChange,
}: TimelineControlsProps) {
  const { isPlaying, currentYear, startYear, endYear, speed, showMarkers, showTrendlines } = state;
  
  const totalYears = endYear - startYear;
  const progress = totalYears > 0 ? ((currentYear - startYear) / totalYears) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-4 space-y-4"
    >
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{startYear}</span>
          <motion.span
            key={currentYear}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="font-bold text-foreground text-lg"
          >
            {currentYear}
          </motion.span>
          <span>{endYear}</span>
        </div>
        
        <Slider
          value={[currentYear]}
          min={startYear}
          max={endYear}
          step={1}
          onValueChange={([value]) => onYearChange(value)}
          className="cursor-pointer"
        />
        
        {/* Animated progress indicator */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onSkipToStart}
          disabled={currentYear === startYear}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="default"
            size="lg"
            onClick={onPlayPause}
            className="w-16 h-16 rounded-full"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>
        </motion.div>

        <Button
          variant="outline"
          size="icon"
          onClick={onSkipToEnd}
          disabled={currentYear === endYear}
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Settings Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Velocidade: {speed}x</Label>
                <Slider
                  value={[speed]}
                  min={0.5}
                  max={3}
                  step={0.5}
                  onValueChange={([value]) => onStateChange({ speed: value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Mostrar Marcadores</Label>
                <Switch
                  checked={showMarkers}
                  onCheckedChange={(checked) => onStateChange({ showMarkers: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Linhas de Tendência</Label>
                <Switch
                  checked={showTrendlines}
                  onCheckedChange={(checked) => onStateChange({ showTrendlines: checked })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Status indicator */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span>Reproduzindo a {speed}x...</span>
        </motion.div>
      )}
    </motion.div>
  );
}
