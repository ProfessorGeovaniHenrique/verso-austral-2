import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, ZoomIn, ZoomOut, Maximize, RotateCcw, Pause, Play } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VerticalZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
  onRefresh: () => void;
  onFullscreen?: () => void;
  onPauseToggle?: () => void;
  isPaused?: boolean;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

export const VerticalZoomControls: React.FC<VerticalZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  onRefresh,
  onFullscreen,
  onPauseToggle,
  isPaused = false,
  zoomLevel = 100,
  onZoomChange,
}) => {
  return (
    <TooltipProvider>
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col gap-2 bg-[#2d2d2d]/90 backdrop-blur-md border border-border/50 rounded-xl p-2 shadow-2xl">
          {/* Home/Reset */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="h-10 w-10 hover:bg-primary/20 hover:text-primary"
              >
                <Home className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Resetar visualização</p>
            </TooltipContent>
          </Tooltip>

          {/* Zoom In */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onZoomIn}
                className="h-10 w-10 hover:bg-primary/20 hover:text-primary"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Aumentar zoom</p>
            </TooltipContent>
          </Tooltip>

          {/* Vertical Zoom Slider */}
          {onZoomChange && (
            <div className="py-2 px-1">
              <Slider
                orientation="vertical"
                value={[zoomLevel]}
                onValueChange={([value]) => onZoomChange(value)}
                min={50}
                max={200}
                step={5}
                className="h-24"
              />
              <div className="text-xs text-center text-muted-foreground mt-2">
                {zoomLevel}%
              </div>
            </div>
          )}

          {/* Zoom Out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onZoomOut}
                className="h-10 w-10 hover:bg-primary/20 hover:text-primary"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Diminuir zoom</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-full h-px bg-border/50 my-1" />

          {/* Fit to Screen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onFit}
                className="h-10 w-10 hover:bg-primary/20 hover:text-primary"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Ajustar à tela</p>
            </TooltipContent>
          </Tooltip>

          {/* Refresh */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                className="h-10 w-10 hover:bg-primary/20 hover:text-primary"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Recarregar</p>
            </TooltipContent>
          </Tooltip>

          {/* Pause/Play Animation */}
          {onPauseToggle && (
            <>
              <div className="w-full h-px bg-border/50 my-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPauseToggle}
                    className="h-10 w-10 hover:bg-primary/20 hover:text-primary"
                  >
                    {isPaused ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{isPaused ? 'Retomar animação' : 'Pausar animação'}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Fullscreen */}
          {onFullscreen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onFullscreen}
                  className="h-10 w-10 hover:bg-primary/20 hover:text-primary"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Tela cheia</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Pause Indicator */}
        {isPaused && onPauseToggle && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border border-primary/30">
            ⏸️ Pausado
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
