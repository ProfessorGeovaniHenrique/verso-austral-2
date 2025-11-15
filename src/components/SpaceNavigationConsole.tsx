import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Orbit, Star, CircleDot, Settings } from "lucide-react";

interface SpaceNavigationConsoleProps {
  level: 'universe' | 'galaxy' | 'stellar-system';
  selectedDomain?: string | null;
  onNavigate: (level: 'universe' | 'galaxy' | 'stellar-system') => void;
  onFilterChange: (filters: any) => void;
  onReset: () => void;
  isFilterPanelOpen?: boolean;
  onToggleFilterPanel?: () => void;
  activeFilterCount?: number;
}

export const SpaceNavigationConsole = ({
  level,
  selectedDomain,
  onNavigate,
  onFilterChange,
  onReset,
  isFilterPanelOpen = false,
  onToggleFilterPanel,
  activeFilterCount = 0
}: SpaceNavigationConsoleProps) => {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-50 flex flex-col gap-4 px-6 py-4 rounded-2xl border-2 backdrop-blur-xl"
         style={{
           top: '10px',
           background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(27, 94, 32, 0.85))',
           borderColor: '#00E5FF',
           boxShadow: '0 0 30px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 229, 255, 0.1)'
         }}>
      
      <div className="flex items-center gap-2 px-2 py-1.5 bg-black/40 rounded border border-cyan-500/20">
        <button
          onClick={() => onNavigate('universe')}
          className={`text-[10px] font-mono transition-colors ${
            level === 'universe' ? 'text-cyan-400 font-bold cursor-default' : 'text-white/60 hover:text-white cursor-pointer'
          }`}
          disabled={level === 'universe'}
        >
          🌌 DOMÍNIOS
        </button>
        {(level === 'galaxy' || level === 'stellar-system') && (
          <>
            <span className="text-cyan-500/50 text-[10px]">›</span>
            <button onClick={() => onNavigate('galaxy')} className={`text-[10px] font-mono transition-colors ${level === 'galaxy' ? 'text-cyan-400 font-bold cursor-default' : 'text-white/60 hover:text-white cursor-pointer'}`} disabled={level === 'galaxy'}>
              🌀 CONSTELAÇÕES
            </button>
          </>
        )}
        {level === 'stellar-system' && selectedDomain && (
          <>
            <span className="text-cyan-500/50 text-[10px]">›</span>
            <span className="text-cyan-400 font-bold text-[10px] font-mono cursor-default">⭐ {selectedDomain.toUpperCase()}</span>
          </>
        )}
      </div>
      
      <div className="flex gap-6 items-center">
      {onToggleFilterPanel && (
        <div className="relative">
          <Button variant={isFilterPanelOpen ? 'default' : 'outline'} size="sm" onClick={onToggleFilterPanel} className="space-nav-btn" style={{ background: isFilterPanelOpen ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent', borderColor: '#00E5FF', color: '#FFFFFF' }}>
            <Settings className="w-4 h-4 mr-1" />
            FILTROS
          </Button>
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-cyan-500 text-black text-xs px-1.5 py-0.5 min-w-5 h-5" style={{ fontSize: '10px' }}>
              {activeFilterCount}
            </Badge>
          )}
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('universe')} disabled={level === 'universe'} className="text-[10px] font-mono" style={{ background: level === 'universe' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent', borderColor: '#00E5FF', color: '#FFFFFF', opacity: level === 'universe' ? 1 : 0.6 }}>
            <Orbit className="w-3 h-3 mr-1" />
            UNIVERSO
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('galaxy')} disabled={!selectedDomain || level === 'galaxy'} className="text-[10px] font-mono" style={{ background: level === 'galaxy' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent', borderColor: '#00E5FF', color: '#FFFFFF', opacity: level === 'galaxy' ? 1 : !selectedDomain ? 0.3 : 0.6 }}>
            <Star className="w-3 h-3 mr-1" />
            GALÁXIA
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('stellar-system')} disabled={!selectedDomain || level === 'stellar-system'} className="text-[10px] font-mono" style={{ background: level === 'stellar-system' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent', borderColor: '#00E5FF', color: '#FFFFFF', opacity: level === 'stellar-system' ? 1 : !selectedDomain ? 0.3 : 0.6 }}>
            <CircleDot className="w-3 h-3 mr-1" />
            SISTEMA
          </Button>
        </div>
      </div>
      
      <Button variant="outline" size="sm" onClick={onReset} className="text-[10px] font-mono" style={{ borderColor: '#FF6B6B', color: '#FF6B6B' }}>
        <RotateCcw className="w-3 h-3 mr-1" />
        RESET
      </Button>
      </div>
    </div>
  );
};
