import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CodexDrawer } from './CodexDrawer';
import { GalaxyLegendPanel } from './GalaxyLegendPanel';
import { VerticalZoomControls } from './VerticalZoomControls';

interface RightControlPanelProps {
  hoveredNode: any;
  level: 'universe' | 'galaxy';
  showGalaxyLegend: boolean;
  
  // Zoom controls
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onPauseToggle: () => void;
  isPaused: boolean;
  
  // Mouse events para manter Codex aberto
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const RightControlPanel = ({ 
  hoveredNode, 
  level, 
  showGalaxyLegend,
  onZoomIn,
  onZoomOut,
  onReset,
  onPauseToggle,
  isPaused,
  onMouseEnter,
  onMouseLeave
}: RightControlPanelProps) => {
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isFutureCollapsed, setIsFutureCollapsed] = useState(false);

  return (
    <div 
      className="h-full w-full flex flex-col overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Zoom Controls - Horizontal no Topo */}
      <div className="p-4 border-b border-cyan-400/20">
        <div className="flex items-center justify-center">
          <VerticalZoomControls
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onReset={onReset}
            onFit={onReset}
            onRefresh={() => {}}
            onPauseToggle={onPauseToggle}
            isPaused={isPaused}
            orientation="horizontal"
          />
        </div>
      </div>

      {/* Área Rolável */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Codex Drawer - Sempre aberto quando há node */}
        <CodexDrawer word={hoveredNode} level={level} />

        {/* Separador */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        </div>

        {/* Galaxy Legend - Colapsável */}
        {showGalaxyLegend && (
          <div className="space-y-2">
            {/* Header Colapsável */}
            <button
              onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-cyan-400/30 hover:border-cyan-400/60 transition-all bg-black/30 backdrop-blur-sm"
            >
              <span className="text-cyan-400 font-mono text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                LEGENDA GALÁXIA
              </span>
              {isLegendCollapsed ? (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            {/* Conteúdo Colapsável */}
            <div className={`transition-all duration-300 overflow-hidden ${
              isLegendCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
            }`}>
              <GalaxyLegendPanel visible={true} />
            </div>
          </div>
        )}

        {/* Separador */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* Future Features - Colapsável */}
        <div className="space-y-2">
          <button
            onClick={() => setIsFutureCollapsed(!isFutureCollapsed)}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-cyan-400/30 hover:border-cyan-400/60 transition-all bg-black/30 backdrop-blur-sm"
          >
            <span className="text-cyan-400 font-mono text-sm font-bold">
              🚀 PRÓXIMAS FEATURES
            </span>
            {isFutureCollapsed ? (
              <ChevronDown className="w-4 h-4 text-cyan-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          <div className={`transition-all duration-300 overflow-hidden ${
            isFutureCollapsed ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'
          }`}>
            <div className="border-2 border-dashed border-cyan-400/30 rounded-lg p-4 backdrop-blur-sm bg-black/30">
              <div className="text-cyan-400/50 text-xs text-center font-mono">
                <ul className="text-left space-y-1 text-[10px]">
                  <li>• Gráficos estatísticos</li>
                  <li>• Histórico de seleções</li>
                  <li>• Filtros avançados</li>
                  <li>• Exportação de dados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
