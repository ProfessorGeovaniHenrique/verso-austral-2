import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { X, Search, Sparkles, Heart, Meh, RotateCcw } from "lucide-react";

interface FilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: {
    minFrequency: number;
    prosody: string[];
    domains: string[];
    searchQuery: string;
  };
  onFilterChange: (filters: FilterPanelProps['filters']) => void;
  availableDomains: Array<{ label: string; color: string; corTexto: string }>;
}

export const FilterPanel = ({ 
  isOpen, 
  onToggle, 
  filters, 
  onFilterChange, 
  availableDomains 
}: FilterPanelProps) => {
  
  const handleClearFilters = () => {
    onFilterChange({
      minFrequency: 0,
      prosody: [],
      domains: [],
      searchQuery: ''
    });
  };

  const activeFilterCount = 
    (filters.minFrequency > 0 ? 1 : 0) +
    filters.prosody.length +
    filters.domains.length +
    (filters.searchQuery ? 1 : 0);

  const toggleProsody = (value: string) => {
    const newProsody = filters.prosody.includes(value)
      ? filters.prosody.filter(p => p !== value)
      : [...filters.prosody, value];
    onFilterChange({ ...filters, prosody: newProsody });
  };

  const toggleDomain = (domain: string) => {
    const newDomains = filters.domains.includes(domain)
      ? filters.domains.filter(d => d !== domain)
      : [...filters.domains, domain];
    onFilterChange({ ...filters, domains: newDomains });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onToggle}
        />
      )}
      
      {/* Panel */}
      <div 
        className="absolute left-0 top-0 h-full z-50 transition-transform duration-300 ease-in-out"
        style={{
          width: '320px',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          background: 'linear-gradient(180deg, rgba(10, 14, 39, 0.98), rgba(27, 94, 32, 0.95))',
          borderRight: '2px solid #00E5FF',
          boxShadow: '0 0 40px rgba(0, 229, 255, 0.4)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Filtros</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-cyan-500 text-black">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onToggle}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto" style={{ height: 'calc(100% - 180px)' }}>
          <Accordion type="multiple" defaultValue={["frequency", "prosody", "domains", "search"]}>
            
            {/* Frequência */}
            <AccordionItem value="frequency" className="border-cyan-500/20">
              <AccordionTrigger className="text-cyan-300 hover:text-cyan-200">
                Frequência Mínima
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <Slider
                    value={[filters.minFrequency]}
                    onValueChange={(value) => onFilterChange({ ...filters, minFrequency: value[0] })}
                    max={6}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="text-sm text-cyan-400 font-mono">
                    ≥ {filters.minFrequency.toFixed(1)}%
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Prosódia */}
            <AccordionItem value="prosody" className="border-cyan-500/20">
              <AccordionTrigger className="text-cyan-300 hover:text-cyan-200">
                Prosódia Semântica
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {[
                    { value: 'positiva', label: 'Positiva', icon: Heart, color: 'text-green-400' },
                    { value: 'negativa', label: 'Negativa', icon: X, color: 'text-red-400' },
                    { value: 'neutra', label: 'Neutra', icon: Meh, color: 'text-gray-400' }
                  ].map((prosody) => {
                    const Icon = prosody.icon;
                    const isActive = filters.prosody.includes(prosody.value);
                    return (
                      <Button
                        key={prosody.value}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleProsody(prosody.value)}
                        className="w-full justify-start"
                        style={{
                          background: isActive ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                          borderColor: isActive ? '#00E5FF' : 'rgba(100, 255, 218, 0.3)'
                        }}
                      >
                        <Icon className={`w-4 h-4 mr-2 ${prosody.color}`} />
                        {prosody.label}
                      </Button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Domínios */}
            <AccordionItem value="domains" className="border-cyan-500/20">
              <AccordionTrigger className="text-cyan-300 hover:text-cyan-200">
                Domínios Semânticos
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {availableDomains.map((domain) => {
                    const isChecked = filters.domains.includes(domain.label);
                    return (
                      <div
                        key={domain.label}
                        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-cyan-500/5 cursor-pointer"
                        onClick={() => toggleDomain(domain.label)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleDomain(domain.label)}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: domain.color }}
                          />
                          <span className="text-sm text-white">{domain.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Busca */}
            <AccordionItem value="search" className="border-cyan-500/20">
              <AccordionTrigger className="text-cyan-300 hover:text-cyan-200">
                Buscar Palavra
              </AccordionTrigger>
              <AccordionContent>
                <div className="relative pt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <Input
                    value={filters.searchQuery}
                    onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
                    placeholder="Digite uma palavra..."
                    className="pl-10 bg-cyan-950/30 border-cyan-500/30 text-white placeholder:text-cyan-400/50"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-cyan-500/30"
             style={{ background: 'rgba(10, 14, 39, 0.95)' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            disabled={activeFilterCount === 0}
            className="w-full border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </div>
    </>
  );
};
