import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Orbit, Star, CircleDot, Filter, Settings } from "lucide-react";
import { FilterDropdownPanel } from "./FilterDropdownPanel";
import { VisualizationControlsDropdown } from "./VisualizationControlsDropdown";
import type { VisualizationFilters } from "@/data/types/fogPlanetVisualization.types";
import type { NavigationLevel } from "@/hooks/useNavigationLevel";

interface SpaceNavigationHubProps {
  level: NavigationLevel;
  selectedDomain?: string | null;
  onNavigate: (level: NavigationLevel) => void;
  onReset: () => void;
  
  // Filtros
  filters: {
    minFrequency: number;
    prosody: string[];
    domains: string[];
    searchQuery: string;
  };
  onFilterChange: (filters: any) => void;
  activeFilterCount?: number;
  availableDomains: Array<{ label: string; color: string; corTexto: string }>;
  
  // Controles de Visualização
  visualizationFilters: VisualizationFilters;
  onVisualizationFilterChange: (filters: Partial<VisualizationFilters>) => void;
}

export const SpaceNavigationHub = ({
  level,
  selectedDomain,
  onNavigate,
  onReset,
  filters,
  onFilterChange,
  activeFilterCount = 0,
  availableDomains,
  visualizationFilters,
  onVisualizationFilterChange
}: SpaceNavigationHubProps) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isControlsDropdownOpen, setIsControlsDropdownOpen] = useState(false);

  const handleClearFilters = () => {
    onFilterChange({ minFrequency: 0, prosody: [], domains: [], searchQuery: '' });
  };

  return (
    <div 
      className="absolute left-8 z-50 space-navigation-console"
      style={{ top: '20px' }}
    >
      <div 
        className="relative flex flex-col gap-4 px-6 py-4 rounded-2xl border-2 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(27, 94, 32, 0.85))',
          borderColor: '#00E5FF',
          boxShadow: '0 0 30px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 229, 255, 0.1)'
        }}
      >
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 px-2 py-1.5 bg-black/40 rounded border border-cyan-500/20">
          <button
            onClick={() => onNavigate('universe')}
            className={`text-[10px] font-mono transition-colors ${
              level === 'universe' 
                ? 'text-cyan-400 font-bold cursor-default' 
                : 'text-white/60 hover:text-white cursor-pointer'
            }`}
            disabled={level === 'universe'}
          >
            🌌 DOMÍNIOS
          </button>
          {(level === 'galaxy' || level === 'stellar-system') && (
            <>
              <span className="text-cyan-500/50 text-[10px]">›</span>
              <button
                onClick={() => onNavigate('galaxy')}
                className={`text-[10px] font-mono transition-colors ${
                  level === 'galaxy' 
                    ? 'text-cyan-400 font-bold cursor-default' 
                    : 'text-white/60 hover:text-white cursor-pointer'
                }`}
                disabled={level === 'galaxy'}
              >
                🌀 CONSTELAÇÕES
              </button>
            </>
          )}
          {level === 'stellar-system' && selectedDomain && (
            <>
              <span className="text-cyan-500/50 text-[10px]">›</span>
              <span className="text-cyan-400 font-bold text-[10px] font-mono cursor-default">
                ⭐ {selectedDomain.toUpperCase()}
              </span>
            </>
          )}
        </div>
        
        <div className="flex gap-6 items-center">
          {/* Botão de Filtros */}
          <div className="relative">
            <Button
              variant={isFilterDropdownOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setIsFilterDropdownOpen(!isFilterDropdownOpen);
                setIsControlsDropdownOpen(false);
              }}
              className="space-nav-btn"
              style={{
                background: isFilterDropdownOpen ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent',
                borderColor: '#00E5FF',
                color: '#FFFFFF'
              }}
            >
              <Filter className="w-4 h-4 mr-1" />
              FILTROS
            </Button>
            {activeFilterCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 bg-cyan-500 text-black text-xs px-1.5 py-0.5 min-w-5 h-5"
                style={{ fontSize: '10px' }}
              >
                {activeFilterCount}
              </Badge>
            )}
          </div>
          
          {/* Botão de Controles de Visualização */}
          <div className="relative">
            <Button
              variant={isControlsDropdownOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setIsControlsDropdownOpen(!isControlsDropdownOpen);
                setIsFilterDropdownOpen(false);
              }}
              className="space-nav-btn"
              style={{
                background: isControlsDropdownOpen ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent',
                borderColor: '#00E5FF',
                color: '#FFFFFF'
              }}
            >
              <Settings className="w-4 h-4 mr-1" />
              CONTROLES
            </Button>
          </div>
          
          {/* Navegação de Níveis */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('universe')}
                disabled={level === 'universe'}
                className="text-[10px] font-mono"
                style={{
                  background: level === 'universe' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent',
                  borderColor: '#00E5FF',
                  color: '#FFFFFF',
                  opacity: level === 'universe' ? 1 : 0.6
                }}
              >
                <Orbit className="w-3 h-3 mr-1" />
                UNIVERSO
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('galaxy')}
                disabled={!selectedDomain || level === 'galaxy'}
                className="text-[10px] font-mono"
                style={{
                  background: level === 'galaxy' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent',
                  borderColor: '#00E5FF',
                  color: '#FFFFFF',
                  opacity: level === 'galaxy' ? 1 : !selectedDomain ? 0.3 : 0.6
                }}
              >
                <Star className="w-3 h-3 mr-1" />
                GALÁXIA
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('stellar-system')}
                disabled={!selectedDomain || level === 'stellar-system'}
                className="text-[10px] font-mono"
                style={{
                  background: level === 'stellar-system' ? 'linear-gradient(45deg, #00E5FF, #1B5E20)' : 'transparent',
                  borderColor: '#00E5FF',
                  color: '#FFFFFF',
                  opacity: level === 'stellar-system' ? 1 : !selectedDomain ? 0.3 : 0.6
                }}
              >
                <CircleDot className="w-3 h-3 mr-1" />
                SISTEMA
              </Button>
            </div>
          </div>
          
          {/* Botão Reset */}
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-[10px] font-mono"
            style={{
              borderColor: '#FF6B6B',
              color: '#FF6B6B'
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            RESET
          </Button>
        </div>
        
        {/* FilterDropdownPanel */}
        <FilterDropdownPanel
          isOpen={isFilterDropdownOpen}
          filters={filters}
          onFilterChange={onFilterChange}
          availableDomains={availableDomains}
          onClear={handleClearFilters}
        />
        
        {/* VisualizationControlsDropdown */}
        <VisualizationControlsDropdown
          isOpen={isControlsDropdownOpen}
          filters={visualizationFilters}
          onFilterChange={onVisualizationFilterChange}
        />
      </div>
    </div>
  );
};
