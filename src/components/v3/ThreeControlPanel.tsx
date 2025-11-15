import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { RotateCw, Zap, Network, TrendingUp, Filter, Eye, Layers } from 'lucide-react';
import { ViewMode } from '@/hooks/useThreeSemanticData';

interface ThreeControlPanelProps {
  font: string;
  onFontChange: (font: string) => void;
  autoRotate: boolean;
  onAutoRotateChange: (value: boolean) => void;
  autoRotateSpeed: number;
  onAutoRotateSpeedChange: (value: number) => void;
  bloomEnabled: boolean;
  onBloomToggle: (value: boolean) => void;
  showConnections: boolean;
  onConnectionsToggle: (value: boolean) => void;
  onResetCamera: () => void;
  stats: { fps: number; triangles: number; nodes: number; domains: number; words: number };
  minFrequency: number;
  onMinFrequencyChange: (value: number) => void;
  prosodyFilter: 'all' | 'Positiva' | 'Negativa' | 'Neutra';
  onProsodyFilterChange: (value: 'all' | 'Positiva' | 'Negativa' | 'Neutra') => void;
  selectedDomains: string[];
  onSelectedDomainsChange: (domains: string[]) => void;
  availableDomains: Array<{ name: string; color: string }>;
  showOnlyKeywords: boolean;
  onShowOnlyKeywordsChange: (value: boolean) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ThreeControlPanel(props: ThreeControlPanelProps) {
  return (
    <div className="w-80 bg-slate-900/95 border-l border-cyan-500/30 backdrop-blur-lg p-4 space-y-4 overflow-y-auto">
      <div className="text-lg font-bold text-cyan-400 border-b border-cyan-500/30 pb-2">Controles 3D</div>
      
      <div className="space-y-2">
        <Label className="text-cyan-400 flex items-center gap-2"><Layers className="w-4 h-4" />Modo</Label>
        <RadioGroup value={props.viewMode} onValueChange={(v) => props.onViewModeChange(v as ViewMode)}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="constellation" id="c" />
            <Label htmlFor="c" className="text-sm cursor-pointer">Constelação</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="orbital" id="o" />
            <Label htmlFor="o" className="text-sm cursor-pointer">Orbital</Label>
          </div>
        </RadioGroup>
      </div>
      
      <Separator />
      
      <Button onClick={props.onResetCamera} variant="outline" className="w-full" size="sm">
        <RotateCw className="w-4 h-4 mr-2" />Resetar
      </Button>
      
      <div className="flex items-center justify-between">
        <Label className="text-sm">Auto-Rotação</Label>
        <Switch checked={props.autoRotate} onCheckedChange={props.onAutoRotateChange} />
      </div>
      
      {props.autoRotate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Velocidade</Label>
            <span className="text-xs text-cyan-400">{props.autoRotateSpeed.toFixed(1)}x</span>
          </div>
          <Slider
            value={[props.autoRotateSpeed]}
            onValueChange={([value]) => props.onAutoRotateSpeedChange(value)}
            min={0.5}
            max={5.0}
            step={0.5}
            className="w-full"
          />
        </div>
      )}
      
      <Separator />
      
      <Select value={props.font} onValueChange={props.onFontChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Orbitron">Orbitron</SelectItem>
          <SelectItem value="Audiowide">Audiowide</SelectItem>
          <SelectItem value="Rajdhani">Rajdhani</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="flex items-center justify-between">
        <Label className="text-sm flex items-center gap-2"><Zap className="w-4 h-4" />Bloom</Label>
        <Switch checked={props.bloomEnabled} onCheckedChange={props.onBloomToggle} />
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="text-sm flex items-center gap-2"><Network className="w-4 h-4" />Conexões</Label>
        <Switch checked={props.showConnections} onCheckedChange={props.onConnectionsToggle} />
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <Label className="text-cyan-400 flex items-center gap-2"><Filter className="w-4 h-4" />Filtros</Label>
        <div className="flex justify-between"><Label className="text-xs">Freq. Min:</Label><span className="text-xs font-mono">{props.minFrequency}</span></div>
        <Slider value={[props.minFrequency]} onValueChange={([v]) => props.onMinFrequencyChange(v)} min={0} max={20} step={1} />
        
        <Select value={props.prosodyFilter} onValueChange={(v) => props.onProsodyFilterChange(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="Positiva">Positiva</SelectItem>
            <SelectItem value="Neutra">Neutra</SelectItem>
            <SelectItem value="Negativa">Negativa</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2">
          <Switch checked={props.showOnlyKeywords} onCheckedChange={props.onShowOnlyKeywordsChange} />
          <Label className="text-xs cursor-pointer">Top 10</Label>
        </div>
      </div>
      
      <Separator />
      
      <div className="text-xs font-mono space-y-1 bg-slate-950/50 p-2 rounded">
        <div className="flex justify-between"><span>Nós:</span><span>{props.stats.nodes}</span></div>
        <div className="flex justify-between"><span>Domínios:</span><span>{props.stats.domains}</span></div>
        <div className="flex justify-between"><span>Palavras:</span><span>{props.stats.words}</span></div>
      </div>
    </div>
  );
}
