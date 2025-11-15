import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineFooterProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onPrevDomain: () => void;
  onNextDomain: () => void;
  currentProgress?: number;
}

export function TimelineFooter({
  isPaused,
  onTogglePause,
  onPrevDomain,
  onNextDomain,
  currentProgress = 45,
}: TimelineFooterProps) {
  const currentDate = new Date();
  const timestamp = currentDate.toISOString().replace('T', ' ').substring(0, 19);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[600px] p-4"
      style={{
        background: 'rgba(10, 14, 39, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid hsl(var(--primary) / 0.2)',
        borderRadius: '12px',
        boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)',
      }}
    >
      {/* Controls row */}
      <div className="flex items-center justify-between mb-3">
        {/* Navigation buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onPrevDomain}
            className="text-primary hover:bg-primary/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onTogglePause}
            className="text-primary hover:bg-primary/10"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onNextDomain}
            className="text-primary hover:bg-primary/10"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground font-mono">
          {timestamp}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-background/20 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${currentProgress}%` }}
          transition={{ duration: 0.5 }}
          className="absolute left-0 top-0 h-full bg-primary"
          style={{
            boxShadow: '0 0 10px hsl(var(--primary))',
          }}
        />

        {/* Marker at current position */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${currentProgress}%` }}
          transition={{ duration: 0.5 }}
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background"
          style={{
            boxShadow: '0 0 8px hsl(var(--primary))',
          }}
        />
      </div>

      {/* Progress label */}
      <div className="flex justify-between items-center mt-2 text-[10px] text-muted-foreground font-mono">
        <span>EXPLORATION PROGRESS</span>
        <span>{currentProgress}%</span>
      </div>
    </motion.div>
  );
}
