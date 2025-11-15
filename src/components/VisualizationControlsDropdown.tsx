import { motion, AnimatePresence } from 'framer-motion';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import type { VisualizationFilters } from "@/data/types/fogPlanetVisualization.types";

interface VisualizationControlsDropdownProps {
  isOpen: boolean;
  filters: VisualizationFilters;
  onFilterChange: (filters: Partial<VisualizationFilters>) => void;
}

export function VisualizationControlsDropdown({ 
  isOpen, 
  filters, 
  onFilterChange 
}: VisualizationControlsDropdownProps) {
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
            width: '500px',
            background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.98), rgba(27, 94, 32, 0.95))',
            borderRadius: '16px',
            border: '2px solid #00E5FF',
            boxShadow: '0 10px 40px rgba(0, 229, 255, 0.4)',
            backdropFilter: 'blur(20px)',
            zIndex: 60
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 p-4 border-b border-cyan-500/30">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono">CONTROLES DE VISUALIZAÇÃO</h3>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Frequência Mínima */}
            <div className="space-y-2">
              <Label className="text-xs text-cyan-300">
                Frequência Mínima: {filters.minFrequency}
              </Label>
              <Slider
                value={[filters.minFrequency]}
                onValueChange={([v]) => onFilterChange({ minFrequency: v })}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Máximo de Palavras */}
            <div className="space-y-2">
              <Label className="text-xs text-cyan-300">
                Max Palavras: {filters.maxWords}
              </Label>
              <Slider
                value={[filters.maxWords]}
                onValueChange={([v]) => onFilterChange({ maxWords: v })}
                min={5}
                max={50}
                step={5}
                className="w-full"
              />
            </div>

            {/* Opacidade FOG */}
            <div className="space-y-2">
              <Label className="text-xs text-cyan-300">
                Opacidade FOG: {(filters.fogIntensity * 100).toFixed(1)}%
              </Label>
              <Slider
                value={[filters.fogIntensity]}
                onValueChange={([v]) => onFilterChange({ fogIntensity: v })}
                min={0.002}
                max={1.0}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Intensidade Glow */}
            <div className="space-y-2">
              <Label className="text-xs text-cyan-300">
                Intensidade Glow: {(filters.glowIntensity * 100).toFixed(0)}%
              </Label>
              <Slider
                value={[filters.glowIntensity]}
                onValueChange={([v]) => onFilterChange({ glowIntensity: v })}
                min={0.5}
                max={1.5}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Filtro de Prosódia */}
            <div className="space-y-2">
              <Label className="text-xs text-cyan-300">
                Filtro Prosódia
              </Label>
              <Select
                value={filters.prosodyFilter?.[0] || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    onFilterChange({ prosodyFilter: [] });
                  } else {
                    onFilterChange({ prosodyFilter: [value as any] });
                  }
                }}
              >
                <SelectTrigger className="w-full bg-black/30 border-cyan-500/30 text-white text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="positiva">Positiva</SelectItem>
                  <SelectItem value="negativa">Negativa</SelectItem>
                  <SelectItem value="neutra">Neutra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mostrar Labels */}
            <div className="flex items-center justify-between pt-2">
              <Label className="text-xs text-cyan-300">Mostrar Labels</Label>
              <Switch
                checked={filters.showLabels}
                onCheckedChange={(checked) => onFilterChange({ showLabels: checked })}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
