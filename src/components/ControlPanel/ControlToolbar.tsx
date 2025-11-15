import { Home, ZoomIn, ZoomOut, Maximize, Pause, Play, Sparkles, Map, Rocket, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ControlToolbarProps {
  isMinimized?: boolean;
  onExpandConsole?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isPaused: boolean;
  onPauseToggle: () => void;
  isCodexOpen: boolean;
  isLegendOpen: boolean;
  isFutureOpen: boolean;
  onToggleCodex: () => void;
  onToggleLegend: () => void;
  onToggleFuture: () => void;
  showLegend: boolean;
}

export const ControlToolbar = ({ 
  isMinimized = false,
  onExpandConsole,
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
        className="h-full w-[60px] flex flex-col gap-1 p-2 backdrop-blur-xl border-l-2"
        style={{
          background: 'linear-gradient(180deg, rgba(10, 14, 39, 0.95), rgba(27, 94, 32, 0.85))',
          borderColor: 'hsl(var(--primary))',
          boxShadow: '-10px 0 30px hsl(var(--primary) / 0.2), inset 0 0 20px hsl(var(--primary) / 0.1)'
        }}
      >
        {/* Botão Expandir Console (quando minimizado) */}
        {isMinimized && onExpandConsole && (
          <>
            <ToolbarButton 
              icon={PanelLeft} 
              onClick={onExpandConsole} 
              tooltip="Expandir Console"
              active={true}
            />
            <ToolbarDivider />
          </>
        )}
        
        {/* Zoom Controls */}
        <ToolbarButton icon={Home} onClick={onReset} tooltip="Resetar Vista" />
        <ToolbarButton icon={ZoomIn} onClick={onZoomIn} tooltip="Aumentar Zoom" />
        <ToolbarButton icon={ZoomOut} onClick={onZoomOut} tooltip="Diminuir Zoom" />
        <ToolbarButton icon={Maximize} onClick={onReset} tooltip="Ajustar à Tela" />
        
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
