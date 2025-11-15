import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RotateCw, Zap, Orbit } from 'lucide-react';

interface ThreeControlPanelProps {
  font: string;
  onFontChange: (font: string) => void;
  autoRotate: boolean;
  onAutoRotateChange: (value: boolean) => void;
  bloomEnabled: boolean;
  onBloomToggle: (value: boolean) => void;
  onResetCamera: () => void;
  stats: {
    nodeCount: number;
    domainCount: number;
    wordCount: number;
  };
}

export function ThreeControlPanel(props: ThreeControlPanelProps) {
  return (
    <div className="w-72 bg-slate-900/95 border-l border-cyan-500/30 backdrop-blur-lg p-4 space-y-6">
      <div className="text-lg font-bold text-cyan-400 border-b border-cyan-500/30 pb-2">
        Controles 3D
      </div>
      
      {/* Câmera */}
      <div className="space-y-2">
        <Label className="text-cyan-400 font-semibold">Câmera</Label>
        <Button
          onClick={props.onResetCamera}
          variant="outline"
          className="w-full border-cyan-500/50 hover:bg-cyan-500/10"
        >
          <RotateCw className="w-4 h-4 mr-2" />
          Resetar Posição
        </Button>
        
        <div className="flex items-center justify-between mt-3 bg-slate-950/50 p-2 rounded">
          <div className="flex items-center gap-2">
            <Orbit className="w-4 h-4 text-cyan-400" />
            <Label className="text-sm text-slate-300">Rotação Auto</Label>
          </div>
          <Switch
            checked={props.autoRotate}
            onCheckedChange={props.onAutoRotateChange}
          />
        </div>
      </div>
      
      {/* Fonte */}
      <div className="space-y-2">
        <Label className="text-cyan-400 font-semibold">Fonte</Label>
        <Select value={props.font} onValueChange={props.onFontChange}>
          <SelectTrigger className="border-cyan-500/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Orbitron">Orbitron (Sci-Fi)</SelectItem>
            <SelectItem value="Audiowide">Audiowide (Bold)</SelectItem>
            <SelectItem value="Rajdhani">Rajdhani (Future)</SelectItem>
            <SelectItem value="Arial">Arial (Classic)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Efeitos Visuais */}
      <div className="space-y-2">
        <Label className="text-cyan-400 font-semibold">Efeitos Visuais</Label>
        <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <Label className="text-sm text-slate-300">Bloom/Glow</Label>
          </div>
          <Switch
            checked={props.bloomEnabled}
            onCheckedChange={props.onBloomToggle}
          />
        </div>
      </div>
      
      {/* Estatísticas */}
      <div className="space-y-2">
        <Label className="text-cyan-400 font-semibold">Estatísticas</Label>
        <div className="text-xs font-mono text-slate-300 space-y-1 bg-slate-950/50 p-3 rounded">
          <div className="flex justify-between">
            <span className="text-slate-400">Total Nós:</span>
            <span className="text-cyan-300">{props.stats.nodeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Domínios:</span>
            <span className="text-purple-300">{props.stats.domainCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Palavras:</span>
            <span className="text-blue-300">{props.stats.wordCount}</span>
          </div>
        </div>
      </div>
      
      {/* Instruções */}
      <div className="text-xs text-slate-400 border-t border-slate-700 pt-4 space-y-2">
        <p className="font-semibold text-cyan-400">Controles:</p>
        <ul className="space-y-1">
          <li>• <span className="text-slate-300">Arrastar:</span> Rotacionar câmera</li>
          <li>• <span className="text-slate-300">Scroll:</span> Zoom in/out</li>
          <li>• <span className="text-slate-300">Clique:</span> Ver KWIC</li>
          <li>• <span className="text-slate-300">Botão direito:</span> Pan</li>
        </ul>
      </div>
      
      {/* Badge experimental */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
        <p className="text-xs text-purple-300 font-medium">
          ⚡ Versão Experimental
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Renderizado com Three.js + WebGL
        </p>
      </div>
    </div>
  );
}
