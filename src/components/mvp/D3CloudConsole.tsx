import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings2, Type, Palette, Layout } from "lucide-react";

interface D3CloudConsoleProps {
  padding: number;
  spiral: 'archimedean' | 'rectangular';
  rotation: number;
  onPaddingChange: (value: number) => void;
  onSpiralChange: (value: 'archimedean' | 'rectangular') => void;
  onRotationChange: (value: number) => void;
  fontFamily: string;
  fontWeight: 'normal' | 'semibold' | 'bold';
  onFontFamilyChange: (value: string) => void;
  onFontWeightChange: (value: 'normal' | 'semibold' | 'bold') => void;
  showTooltips: boolean;
  animationSpeed: number;
  onShowTooltipsChange: (value: boolean) => void;
  onAnimationSpeedChange: (value: number) => void;
  onApplyPreset: (preset: string) => void;
}

export function D3CloudConsole(props: D3CloudConsoleProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Console de Personalização</h3>
      </div>
      
      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="layout"><Layout className="w-4 h-4 mr-2" />Layout</TabsTrigger>
          <TabsTrigger value="typography"><Type className="w-4 h-4 mr-2" />Tipografia</TabsTrigger>
          <TabsTrigger value="visual"><Palette className="w-4 h-4 mr-2" />Visual</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="layout" className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label>Densidade (Espaçamento: {props.padding}px)</Label>
            <Slider min={2} max={20} step={1} value={[props.padding]} onValueChange={(v) => props.onPaddingChange(v[0])} />
          </div>
          <div className="space-y-2">
            <Label>Algoritmo de Layout</Label>
            <Select value={props.spiral} onValueChange={props.onSpiralChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="archimedean">Espiral de Arquimedes</SelectItem>
                <SelectItem value="rectangular">Espiral Retangular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rotação ({props.rotation}°)</Label>
            <Slider min={-90} max={90} step={15} value={[props.rotation]} onValueChange={(v) => props.onRotationChange(v[0])} />
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => props.onRotationChange(0)}>0°</Button>
              <Button size="sm" variant="outline" onClick={() => props.onRotationChange(-90)}>-90°</Button>
              <Button size="sm" variant="outline" onClick={() => props.onRotationChange(90)}>90°</Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="typography" className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label>Família de Fonte</Label>
            <Select value={props.fontFamily} onValueChange={props.onFontFamilyChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Peso da Fonte</Label>
            <Select value={props.fontWeight} onValueChange={props.onFontWeightChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal (400)</SelectItem>
                <SelectItem value="semibold">Semi-Bold (600)</SelectItem>
                <SelectItem value="bold">Bold (700)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
        
        <TabsContent value="visual" className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <Label>Mostrar Tooltips</Label>
            <Switch checked={props.showTooltips} onCheckedChange={props.onShowTooltipsChange} />
          </div>
          <div className="space-y-2">
            <Label>Velocidade ({props.animationSpeed}ms)</Label>
            <Slider min={100} max={1000} step={50} value={[props.animationSpeed]} onValueChange={(v) => props.onAnimationSpeedChange(v[0])} />
          </div>
        </TabsContent>
        
        <TabsContent value="presets" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => props.onApplyPreset('academic')}>
              <span className="font-semibold">Acadêmico</span>
              <span className="text-xs text-muted-foreground">Formal</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => props.onApplyPreset('creative')}>
              <span className="font-semibold">Criativo</span>
              <span className="text-xs text-muted-foreground">Dinâmico</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => props.onApplyPreset('compact')}>
              <span className="font-semibold">Compacto</span>
              <span className="text-xs text-muted-foreground">Denso</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => props.onApplyPreset('presentation')}>
              <span className="font-semibold">Apresentação</span>
              <span className="text-xs text-muted-foreground">Projetor</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
