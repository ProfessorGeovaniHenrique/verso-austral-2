import { motion } from 'framer-motion';
import { CircuitBoard, Minimize2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelSection } from './PanelSection';
import { CodexDrawer } from '../CodexDrawer';
import { GalaxyLegendPanel } from '../GalaxyLegendPanel';

interface ControlPanelProps {
  mode?: 'docked' | 'floating';
  hoveredNode: any;
  level: 'universe' | 'galaxy' | 'stellar-system';
  codexState: 'closed' | 'auto-open' | 'pinned';
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  openSections: {
    codex: boolean;
    legend: boolean;
    future: boolean;
  };
  onMinimize?: () => void;
  onFloat?: () => void;
}
export const ControlPanel = ({
  mode = 'docked',
  hoveredNode,
  level,
  codexState,
  onMouseEnter,
  onMouseLeave,
  openSections,
  onMinimize,
  onFloat
}: ControlPanelProps) => {
  const showCodex = codexState !== 'closed' && hoveredNode;
  return <motion.div initial={mode === 'docked' ? {
    x: 420
  } : false} animate={{
    x: 0
  }} transition={{
    type: "spring",
    stiffness: 260,
    damping: 20
  }} className="w-[420px] h-full flex flex-col rounded-l-2xl border-2 backdrop-blur-xl overflow-hidden" style={{
    background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(27, 94, 32, 0.85))',
    borderColor: 'hsl(var(--primary))',
    boxShadow: '0 0 30px hsl(var(--primary) / 0.3), inset 0 0 20px hsl(var(--primary) / 0.1)'
  }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* Header */}
      <div className="p-4 border-b relative" style={{
      borderColor: 'hsl(var(--primary) / 0.3)'
    }}>
        {/* Corner indicators */}
        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 animate-pulse" style={{
        borderColor: 'hsl(var(--primary))'
      }} />
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 animate-pulse" style={{
        borderColor: 'hsl(var(--primary))'
      }} />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 animate-pulse" style={{
        borderColor: 'hsl(var(--primary))'
      }} />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 animate-pulse" style={{
        borderColor: 'hsl(var(--primary))'
      }} />
        
        <div className="flex items-center justify-between relative z-10">
          <h2 className="text-primary font-mono text-lg font-bold flex items-center gap-2">
            <CircuitBoard className="w-5 h-5" />
            CONSOLE DE CONTROLE
            {codexState === 'pinned' && <span className="ml-2 text-yellow-400 animate-pulse" title="Codex Travado">
                📌
              </span>}
          </h2>
          
          {/* Botões de controle - apenas no modo docked */}
          {mode === 'docked' && (onMinimize || onFloat) && <div className="flex items-center gap-1">
              {onMinimize && <Button size="icon" variant="ghost" onClick={onMinimize} className="h-8 w-8 text-primary hover:bg-primary/20">
                  <Minimize2 className="w-4 h-4" />
                </Button>}
            </div>}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
        
        {/* Codex Section */}
        {openSections.codex && <PanelSection title="CODEX LINGUÍSTICO" icon="💫" isOpen={true} hideToggle className={codexState !== 'closed' && level === 'galaxy' ? "min-h-[600px]" : codexState !== 'closed' ? "min-h-[500px]" : ""}>
            <div className={level === 'galaxy' && codexState !== 'closed' ? "max-h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent" : codexState !== 'closed' ? "max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent" : ""}>
              {showCodex ? <CodexDrawer word={hoveredNode} level={level} /> : <div className="text-primary/50 text-sm font-mono text-center py-8">
                  Passe o mouse sobre um elemento para visualizar dados
                </div>}
            </div>
          </PanelSection>}

        {/* Visualization Controls Section - REMOVIDO */}
        
        {/* Separador */}
        {openSections.codex && (openSections.legend || openSections.future) && <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>}
        
        {/* Legend Section */}
        {openSections.legend && level === 'galaxy' && <PanelSection title="LEGENDA DAS CONSTELAÇÕES" icon="🗺️" isOpen={true} hideToggle>
            <GalaxyLegendPanel visible={true} isCodexOpen={codexState !== 'closed'} />
          </PanelSection>}
        
        {/* Separador */}
        {openSections.legend && openSections.future && <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />}
        
        {/* Future Section */}
        {openSections.future && <PanelSection title="PRÓXIMAS FEATURES" icon="🚀" isOpen={true} hideToggle>
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 backdrop-blur-sm bg-black/30">
              <div className="text-primary/50 text-xs font-mono space-y-1">
                <p>• Gráficos estatísticos avançados</p>
                <p>• Histórico de seleções do usuário</p>
                <p>• Filtros semânticos avançados</p>
                <p>• Exportação de dados e relatórios</p>
                <p>• Análise comparativa entre domínios</p>
              </div>
            </div>
          </PanelSection>}
        
      </div>
    </motion.div>;
};