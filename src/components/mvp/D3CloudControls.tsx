import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface D3CloudControlsProps {
  padding: number;
  spiral: 'archimedean' | 'rectangular';
  rotation: number;
  onPaddingChange: (value: number) => void;
  onSpiralChange: (value: 'archimedean' | 'rectangular') => void;
  onRotationChange: (value: number) => void;
}

export function D3CloudControls({
  padding,
  spiral,
  rotation,
  onPaddingChange,
  onSpiralChange,
  onRotationChange
}: D3CloudControlsProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Densidade */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Densidade (Espaçamento: {padding}px)
          </Label>
          <Slider
            min={2}
            max={20}
            step={1}
            value={[padding]}
            onValueChange={(v) => onPaddingChange(v[0])}
            className="w-full"
          />
        </div>

        {/* Tipo de Espiral */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Layout</Label>
          <Select value={spiral} onValueChange={onSpiralChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="archimedean">Espiral de Arquimedes</SelectItem>
              <SelectItem value="rectangular">Espiral Retangular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rotação */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Rotação das Palavras ({rotation}°)
          </Label>
          <Slider
            min={-90}
            max={90}
            step={15}
            value={[rotation]}
            onValueChange={(v) => onRotationChange(v[0])}
            className="w-full"
          />
        </div>
      </div>
    </Card>
  );
}
