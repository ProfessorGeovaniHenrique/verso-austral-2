import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface D3CloudControlsProps {
  padding: number;
  spiral: 'archimedean' | 'rectangular';
  rotation: number;
  onPaddingChange: (value: number) => void;
  onSpiralChange: (value: 'archimedean' | 'rectangular') => void;
  onRotationChange: (value: number) => void;
}

export function D3CloudControls(props: D3CloudControlsProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Densidade: {props.padding}px</Label>
        <Slider min={2} max={20} step={1} value={[props.padding]} onValueChange={(v) => props.onPaddingChange(v[0])} />
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={props.spiral} onValueChange={props.onSpiralChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="archimedean">Arquimedes</SelectItem>
            <SelectItem value="rectangular">Retangular</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Rotação: {props.rotation}°</Label>
        <Slider min={-90} max={90} step={15} value={[props.rotation]} onValueChange={(v) => props.onRotationChange(v[0])} />
      </div>
    </Card>
  );
}
