import { CodexDrawer } from './CodexDrawer';
import { GalaxyLegendPanel } from './GalaxyLegendPanel';

interface RightControlPanelProps {
  hoveredNode: any;
  level: 'universe' | 'galaxy';
  showGalaxyLegend: boolean;
}

export const RightControlPanel = ({ 
  hoveredNode, 
  level, 
  showGalaxyLegend 
}: RightControlPanelProps) => {
  return (
    <div 
      className="fixed right-[110px] top-0 h-full w-[420px] z-30 p-4 flex flex-col gap-4"
      style={{
        background: 'linear-gradient(270deg, rgba(0, 0, 0, 0.85), transparent)',
        pointerEvents: 'none'
      }}
    >
      {/* Codex Drawer - Animação Bandeja */}
      <div style={{ pointerEvents: 'auto' }}>
        <CodexDrawer word={hoveredNode} level={level} />
      </div>

      {/* Separador Holográfico */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent relative">
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
      </div>

      {/* Galaxy Legend Panel */}
      <div style={{ pointerEvents: 'auto' }}>
        <GalaxyLegendPanel visible={showGalaxyLegend} />
      </div>

      {/* Separador Holográfico */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      {/* Future Features Placeholder */}
      <div 
        className="w-full border-2 border-dashed border-cyan-400/30 rounded-lg p-4 backdrop-blur-sm"
        style={{ 
          pointerEvents: 'auto',
          background: 'rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="text-cyan-400/50 text-xs text-center font-mono">
          🚀 Espaço Reservado para:
          <ul className="mt-2 text-left space-y-1 text-[10px]">
            <li>• Gráficos estatísticos</li>
            <li>• Histórico de seleções</li>
            <li>• Filtros avançados</li>
            <li>• Exportação de dados</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
