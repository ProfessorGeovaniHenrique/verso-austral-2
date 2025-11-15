import { motion } from 'framer-motion';
import { PanelSection } from './PanelSection';
import { CodexDrawer } from '../CodexDrawer';
import { GalaxyLegendPanel } from '../GalaxyLegendPanel';

interface ControlPanelProps {
  hoveredNode: any;
  level: 'universe' | 'galaxy';
  codexState: 'closed' | 'auto-open' | 'pinned';
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  openSections: {
    codex: boolean;
    legend: boolean;
    future: boolean;
  };
}

export const ControlPanel = ({ 
  hoveredNode, 
  level,
  codexState,
  onMouseEnter,
  onMouseLeave,
  openSections
}: ControlPanelProps) => {
  const showCodex = codexState !== 'closed' && hoveredNode;

  return (
    <motion.div 
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="w-[420px] h-full flex flex-col bg-black/20 backdrop-blur-sm border-l border-primary/20"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="p-4 border-b border-primary/20">
        <h2 className="text-primary font-mono text-lg font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          CONSOLE DE CONTROLE
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
        
        {/* Codex Section - Sempre visível quando há dados */}
        {openSections.codex && (
          <PanelSection 
            title="CODEX LINGUÍSTICO"
            icon="💫"
            isOpen={true}
            hideToggle
          >
            {showCodex ? (
              <CodexDrawer word={hoveredNode} level={level} />
            ) : (
              <div className="text-primary/50 text-sm font-mono text-center py-8">
                Passe o mouse sobre um elemento para visualizar dados
              </div>
            )}
          </PanelSection>
        )}
        
        {/* Separador */}
        {openSections.codex && (openSections.legend || openSections.future) && (
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        )}
        
        {/* Legend Section */}
        {openSections.legend && level === 'galaxy' && (
          <PanelSection 
            title="LEGENDA GALÁXIA"
            icon="🗺️"
            isOpen={true}
            hideToggle
          >
            <GalaxyLegendPanel visible={true} />
          </PanelSection>
        )}
        
        {/* Separador */}
        {openSections.legend && openSections.future && (
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        )}
        
        {/* Future Section */}
        {openSections.future && (
          <PanelSection 
            title="PRÓXIMAS FEATURES"
            icon="🚀"
            isOpen={true}
            hideToggle
          >
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 backdrop-blur-sm bg-black/30">
              <div className="text-primary/50 text-xs font-mono space-y-1">
                <p>• Gráficos estatísticos avançados</p>
                <p>• Histórico de seleções do usuário</p>
                <p>• Filtros semânticos avançados</p>
                <p>• Exportação de dados e relatórios</p>
                <p>• Análise comparativa entre domínios</p>
              </div>
            </div>
          </PanelSection>
        )}
        
      </div>
    </motion.div>
  );
};
