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
      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-40">
        <div className="flex flex-col gap-2 backdrop-blur-xl border-2 rounded-xl p-2 shadow-2xl"
             style={{
               background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(27, 94, 32, 0.7))',
               borderColor: '#00E5FF',
               boxShadow: '0 0 30px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 229, 255, 0.1)'
             }}>
          {/* Home/Reset */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="h-10 w-10 text-white hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
              >
                <Home className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-card border-[#00E5FF] text-foreground">
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
                className="h-10 w-10 text-white hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-card border-[#00E5FF] text-foreground">
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
              <div className="text-xs text-center mt-2" style={{ color: '#00E5FF' }}>
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
                className="h-10 w-10 text-white hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-card border-[#00E5FF] text-foreground">
              <p>Diminuir zoom</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-full h-px my-1" style={{ background: 'rgba(0, 229, 255, 0.3)' }} />

          {/* Fit to Screen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onFit}
                className="h-10 w-10 text-white hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-card border-[#00E5FF] text-foreground">
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
                className="h-10 w-10 text-white hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-card border-[#00E5FF] text-foreground">
              <p>Recarregar</p>
            </TooltipContent>
          </Tooltip>

          {/* Pause/Play Animation */}
          {onPauseToggle && (
            <>
              <div className="w-full h-px my-1" style={{ background: 'rgba(0, 229, 255, 0.3)' }} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPauseToggle}
                    className="h-10 w-10 text-white hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
                  >
                    {isPaused ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-card border-[#00E5FF] text-foreground">
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
                  className="h-10 w-10 text-white hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-card border-[#00E5FF] text-foreground">
                <p>Tela cheia</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Pause Indicator */}
        {isPaused && onPauseToggle && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border-2"
               style={{
                 background: 'rgba(0, 229, 255, 0.2)',
                 color: '#00E5FF',
                 borderColor: '#00E5FF'
               }}>
            ⏸️ Pausado
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
