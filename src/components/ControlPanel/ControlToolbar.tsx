import { Home, ZoomIn, ZoomOut, Maximize, RotateCw, Pause, Play, Sparkles, Map, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ControlToolbarProps {
  // Zoom
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  
  // Animation
  isPaused: boolean;
  onPauseToggle: () => void;
  
  // Panel toggles
  isCodexOpen: boolean;
  isLegendOpen: boolean;
  isFutureOpen: boolean;
  onToggleCodex: () => void;
  onToggleLegend: () => void;
  onToggleFuture: () => void;
  
  showLegend: boolean;
}

export const ControlToolbar = ({ 
  onZoomIn,
  onZoomOut,
  onReset,
  isPaused,
  onPauseToggle,
  isCodexOpen,
  isLegendOpen,
  isFutureOpen,
  onToggleCodex,
  onToggleLegend,
  onToggleFuture,
  showLegend
}: ControlToolbarProps) => {
  return (
    <TooltipProvider>
      <div 
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1 p-2 rounded-xl backdrop-blur-xl border-2 bg-black/80 shadow-2xl"
        style={{
          borderColor: 'hsl(var(--primary))',
          boxShadow: '0 0 30px hsl(var(--primary) / 0.3), inset 0 0 20px hsl(var(--primary) / 0.1)'
        }}
      >
        {/* Zoom Controls Group */}
        <ToolbarButton icon={Home} onClick={onReset} tooltip="Resetar Vista" />
        <ToolbarButton icon={ZoomIn} onClick={onZoomIn} tooltip="Aumentar Zoom" />
        <ToolbarButton icon={ZoomOut} onClick={onZoomOut} tooltip="Diminuir Zoom" />
        <ToolbarButton icon={Maximize} onClick={onReset} tooltip="Ajustar à Tela" />
        <ToolbarButton icon={RotateCw} onClick={onReset} tooltip="Recarregar" />
        
        <ToolbarDivider />
        
        {/* Animation Control */}
        <ToolbarButton 
          icon={isPaused ? Play : Pause} 
          onClick={onPauseToggle} 
          tooltip={isPaused ? "Retomar Animação" : "Pausar Animação"}
          active={!isPaused}
        />
        
        <ToolbarDivider />
        
        {/* Panel Toggles */}
        <ToolbarButton 
          icon={Sparkles} 
          onClick={onToggleCodex} 
          tooltip="Toggle Codex Linguístico" 
          active={isCodexOpen}
        />
        
        {showLegend && (
          <ToolbarButton 
            icon={Map} 
            onClick={onToggleLegend} 
            tooltip="Toggle Legenda Galáxia" 
            active={isLegendOpen}
          />
        )}
        
        <ToolbarButton 
          icon={Rocket} 
          onClick={onToggleFuture} 
          tooltip="Toggle Próximas Features" 
          active={isFutureOpen}
        />
      </div>
    </TooltipProvider>
  );
};

const ToolbarButton = ({ 
  icon: Icon, 
  onClick, 
  tooltip, 
  active = false 
}: { 
  icon: any; 
  onClick: () => void; 
  tooltip: string; 
  active?: boolean;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={`h-10 w-10 transition-all ${
          active 
            ? 'bg-primary/30 text-primary border border-primary/60' 
            : 'text-foreground hover:bg-primary/20 hover:text-primary'
        }`}
      >
        <Icon className="h-5 w-5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="left">
      <p>{tooltip}</p>
    </TooltipContent>
  </Tooltip>
);

const ToolbarDivider = () => (
  <div 
    className="w-full h-[2px] my-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" 
  />
);
