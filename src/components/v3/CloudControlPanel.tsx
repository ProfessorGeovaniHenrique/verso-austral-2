import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Minus, RotateCcw, Move } from "lucide-react";

export type LayerMode = 'domains' | 'balanced' | 'words';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface CloudControlPanelProps {
  camera: Camera;
  onCameraChange: (camera: Camera) => void;
  font: string;
  onFontChange: (font: string) => void;
  layerMode: LayerMode;
  onLayerModeChange: (mode: LayerMode) => void;
  stats: {
    fps: number;
    visibleNodes: number;
  };
}

export function CloudControlPanel({
  camera,
  onCameraChange,
  font,
  onFontChange,
  layerMode,
  onLayerModeChange,
  stats
}: CloudControlPanelProps) {
  
  const handleZoomIn = () => {
    onCameraChange({ ...camera, zoom: Math.min(3, camera.zoom * 1.2) });
  };

  const handleZoomOut = () => {
    onCameraChange({ ...camera, zoom: Math.max(0.5, camera.zoom / 1.2) });
  };

  const handleReset = () => {
    onCameraChange({ x: 0, y: 0, zoom: 1 });
  };

  const layerModeToValue = (mode: LayerMode): number => {
    return { domains: 0, balanced: 1, words: 2 }[mode];
  };

  const valueToLayerMode = (value: number): LayerMode => {
    return ['domains', 'balanced', 'words'][value] as LayerMode;
  };

  return (
    <div className="w-72 bg-slate-900/95 border-l border-cyan-500/30 backdrop-blur-lg flex flex-col">
      <div className="p-4 border-b border-cyan-500/20">
        <h3 className="text-lg font-bold text-cyan-400 font-orbitron">CONTROLES</h3>
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Zoom Controls */}
        <div className="space-y-2">
          <Label className="text-cyan-400 font-semibold">Zoom</Label>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleZoomIn}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleZoomOut}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleReset}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-slate-400 font-mono text-center">
            {Math.round(camera.zoom * 100)}%
          </div>
        </div>

        {/* Font Selector */}
        <div className="space-y-2">
          <Label className="text-cyan-400 font-semibold">Fonte</Label>
          <Select value={font} onValueChange={onFontChange}>
            <SelectTrigger className="bg-slate-800 border-cyan-500/30 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Orbitron">Orbitron (Sci-Fi)</SelectItem>
              <SelectItem value="Audiowide">Audiowide (Bold)</SelectItem>
              <SelectItem value="Rajdhani">Rajdhani (Future)</SelectItem>
              <SelectItem value="Arial">Arial (Classic)</SelectItem>
              <SelectItem value="Courier New">Courier (Mono)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Layer Toggle */}
        <div className="space-y-3">
          <Label className="text-cyan-400 font-semibold">Camada em Destaque</Label>
          <Slider
            value={[layerModeToValue(layerMode)]}
            onValueChange={([v]) => onLayerModeChange(valueToLayerMode(v))}
            min={0}
            max={2}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>Domínios</span>
            <span>Balanceado</span>
            <span>Palavras</span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 pt-4 border-t border-cyan-500/20">
          <Label className="text-cyan-400 font-semibold">Performance</Label>
          <div className="text-xs font-mono text-slate-300 space-y-1 bg-slate-950/50 p-3 rounded">
            <div className="flex justify-between">
              <span className="text-slate-400">FPS:</span>
              <span className="text-cyan-400">{stats.fps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nós visíveis:</span>
              <span className="text-cyan-400">{stats.visibleNodes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-cyan-500/20 bg-slate-950/30">
        <div className="flex items-center gap-2 text-xs text-cyan-400/60">
          <Move className="w-3 h-3" />
          <span>Arraste para mover, scroll para zoom</span>
        </div>
      </div>
    </div>
  );
}
