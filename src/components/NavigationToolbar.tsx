import { ZoomIn, ZoomOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface NavigationToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToView?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

export function NavigationToolbar({
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToView,
  zoomLevel = 1,
  onZoomChange,
  className = ""
}: NavigationToolbarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const zoomPercent = Math.round(zoomLevel * 100);

  const handleSliderChange = (value: number[]) => {
    if (onZoomChange) {
      onZoomChange(value[0] / 100);
    }
  };

  return (
    <TooltipProvider>
      <div
        className={`absolute right-5 top-1/2 -translate-y-1/2 z-50 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-30 hover:opacity-100'
        } ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col gap-2 bg-background/90 backdrop-blur-md border border-border rounded-xl p-2 shadow-lg">
          {/* Reset/Home button at top */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onReset}
                className="h-8 w-8 hover:bg-muted transition-colors rounded-lg"
              >
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Resetar visualização</p>
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Zoom In */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onZoomIn}
                className="h-8 w-8 hover:bg-muted transition-colors rounded-lg"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Aumentar zoom</p>
            </TooltipContent>
          </Tooltip>

          {/* Vertical Slider */}
          <div className="py-2 px-1 flex items-center justify-center">
            <Slider
              orientation="vertical"
              value={[zoomPercent]}
              onValueChange={handleSliderChange}
              min={50}
              max={300}
              step={10}
              className="h-24"
            />
          </div>

          {/* Zoom Out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onZoomOut}
                className="h-8 w-8 hover:bg-muted transition-colors rounded-lg"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Diminuir zoom</p>
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Zoom level indicator */}
          <div className="text-[10px] font-semibold text-center text-muted-foreground px-1">
            {zoomPercent}%
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
