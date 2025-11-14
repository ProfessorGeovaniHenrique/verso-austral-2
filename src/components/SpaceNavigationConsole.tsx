import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Orbit, Star, CircleDot } from "lucide-react";

interface SpaceNavigationConsoleProps {
  level: 'universe' | 'galaxy' | 'stellar';
  currentSystem: string;
  currentCoords: string;
  filters: {
    minFrequency: number;
    prosody: string;
    categories: string[];
    searchQuery: string;
  };
  onNavigate: (level: 'universe' | 'galaxy' | 'stellar') => void;
  onFilterChange: (filters: any) => void;
  onReset: () => void;
}

export const SpaceNavigationConsole = ({
  level,
  currentSystem,
  currentCoords,
  filters,
  onNavigate,
  onFilterChange,
  onReset
}: SpaceNavigationConsoleProps) => {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-50 flex gap-6 items-center px-6 py-4 rounded-2xl border-2 backdrop-blur-xl"
         style={{
           top: '10px',
           background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(27, 94, 32, 0.85))',
           borderColor: '#00E5FF',
           boxShadow: '0 0 30px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 229, 255, 0.1)'
         }}>
      
      {/* Navegação de Níveis */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-cyan-300 uppercase tracking-wider font-bold">Sistema de Navegação</span>
        <div className="flex gap-2">
          <Button
            variant={level === 'universe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onNavigate('universe')}
            className="space-nav-btn"
            style={{
              background: level === 'universe' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent',
              borderColor: '#00E5FF',
              color: '#FFFFFF'
            }}
          >
            <Orbit className="w-4 h-4 mr-1" />
            UNIVERSO
          </Button>
          <Button
            variant={level === 'galaxy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onNavigate('galaxy')}
            className="space-nav-btn"
            style={{
              background: level === 'galaxy' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent',
              borderColor: '#00E5FF',
              color: '#FFFFFF'
            }}
          >
            <Star className="w-4 h-4 mr-1" />
            GALÁXIA
          </Button>
          <Button
            variant={level === 'stellar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onNavigate('stellar')}
            className="space-nav-btn"
            style={{
              background: level === 'stellar' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent',
              borderColor: '#00E5FF',
              color: '#FFFFFF'
            }}
          >
            <CircleDot className="w-4 h-4 mr-1" />
            SISTEMA
          </Button>
        </div>
      </div>

      {/* Divisor */}
      <div className="w-px h-12 bg-cyan-400/30"></div>

      {/* Filtros */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-cyan-300 uppercase tracking-wider font-bold">Filtros de Dados</span>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70">Freq. Mín:</span>
            <div className="w-24">
              <Slider
                value={[filters.minFrequency]}
                onValueChange={(value) => onFilterChange({ ...filters, minFrequency: value[0] })}
                min={1}
                max={20}
                step={1}
                className="space-slider"
              />
            </div>
            <span className="text-xs text-cyan-300 font-mono w-6">{filters.minFrequency}</span>
          </div>
          
          <Select
            value={filters.prosody}
            onValueChange={(value) => onFilterChange({ ...filters, prosody: value })}
          >
            <SelectTrigger className="w-32 h-8 text-xs border-cyan-400/50 bg-black/30">
              <SelectValue placeholder="Prosódia" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-cyan-400/50">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="positive">Positiva</SelectItem>
              <SelectItem value="neutral">Neutra</SelectItem>
              <SelectItem value="negative">Negativa</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8"
            style={{ borderColor: '#00E5FF', color: '#00E5FF' }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            RESET
          </Button>
        </div>
      </div>

      {/* Divisor */}
      <div className="w-px h-12 bg-cyan-400/30"></div>

      {/* Status Display */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-cyan-300/70 uppercase">Sistema:</span>
          <span className="text-xs text-yellow-400 font-mono font-bold">{currentSystem}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-cyan-300/70 uppercase">Coord:</span>
          <span className="text-xs text-green-400 font-mono">{currentCoords}</span>
        </div>
      </div>
    </div>
  );
};
