import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Sparkles, Smile, Frown, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterDropdownPanelProps {
  isOpen: boolean;
  filters: {
    minFrequency: number;
    prosody: string[];
    domains: string[];
    searchQuery: string;
  };
  onFilterChange: (filters: any) => void;
  availableDomains: Array<{ label: string; color: string; corTexto: string }>;
  onClear: () => void;
}

export function FilterDropdownPanel({ 
  isOpen, 
  filters, 
  onFilterChange, 
  availableDomains,
  onClear 
}: FilterDropdownPanelProps) {
  
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scaleY: 0 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -20, scaleY: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            transformOrigin: 'top center',
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            width: '600px',
            maxHeight: '500px',
            background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.98), rgba(27, 94, 32, 0.95))',
            borderRadius: '16px',
            border: '2px solid #00E5FF',
            boxShadow: '0 10px 40px rgba(0, 229, 255, 0.4)',
            backdropFilter: 'blur(20px)',
            zIndex: 60
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-cyan-500/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-mono">FILTROS AVANÇADOS</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClear}
              className="text-cyan-400 hover:text-cyan-300 text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          </div>

          {/* Content - 2 colunas */}
          <div className="grid grid-cols-2 gap-4 p-4 overflow-y-auto" style={{ maxHeight: '420px' }}>
            
            {/* COLUNA ESQUERDA */}
            <div className="space-y-4">
              {/* Frequência Mínima */}
              <div className="space-y-2">
                <Label className="text-xs text-cyan-300">
                  Frequência Mínima: {filters.minFrequency}
                </Label>
                <Slider
                  value={[filters.minFrequency]}
                  onValueChange={([v]) => onFilterChange({ ...filters, minFrequency: v })}
                  min={0}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Busca por Palavra */}
              <div className="space-y-2">
                <Label className="text-xs text-cyan-300">Buscar Palavra</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-cyan-500/50" />
                  <Input
                    placeholder="Digite uma palavra..."
                    value={filters.searchQuery}
                    onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
                    className="pl-8 bg-black/30 border-cyan-500/30 text-white text-xs"
                  />
                </div>
              </div>

              {/* Prosódia Semântica */}
              <div className="space-y-2">
                <Label className="text-xs text-cyan-300">Prosódia Semântica</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="prosody-positiva"
                      checked={filters.prosody.includes('positiva')}
                      onCheckedChange={() => toggleProsody('positiva')}
                      className="border-cyan-500/30"
                    />
                    <label htmlFor="prosody-positiva" className="text-xs text-white flex items-center gap-1 cursor-pointer">
                      <Smile className="w-3 h-3 text-green-400" />
                      Positiva
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="prosody-neutra"
                      checked={filters.prosody.includes('neutra')}
                      onCheckedChange={() => toggleProsody('neutra')}
                      className="border-cyan-500/30"
                    />
                    <label htmlFor="prosody-neutra" className="text-xs text-white flex items-center gap-1 cursor-pointer">
                      <Minus className="w-3 h-3 text-yellow-400" />
                      Neutra
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="prosody-negativa"
                      checked={filters.prosody.includes('negativa')}
                      onCheckedChange={() => toggleProsody('negativa')}
                      className="border-cyan-500/30"
                    />
                    <label htmlFor="prosody-negativa" className="text-xs text-white flex items-center gap-1 cursor-pointer">
                      <Frown className="w-3 h-3 text-red-400" />
                      Negativa
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA - Domínios Semânticos */}
            <div className="space-y-2">
              <Label className="text-xs text-cyan-300">Domínios Semânticos</Label>
              <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/50">
                {availableDomains.map((domain) => (
                  <div key={domain.label} className="flex items-center gap-2">
                    <Checkbox
                      id={`domain-${domain.label}`}
                      checked={filters.domains.includes(domain.label)}
                      onCheckedChange={() => toggleDomain(domain.label)}
                      className="border-cyan-500/30"
                    />
                    <label 
                      htmlFor={`domain-${domain.label}`} 
                      className="text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: domain.color }}
                      />
                      <span style={{ color: domain.corTexto }}>{domain.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
