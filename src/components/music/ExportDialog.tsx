import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ExportFormat, ExportOptions } from './AdvancedExportMenu';

interface ExportDialogProps {
  open: boolean;
  format: ExportFormat;
  onClose: () => void;
  onConfirm: (options: ExportOptions) => void;
}

const AVAILABLE_FIELDS = [
  { key: 'title', label: 'Título' },
  { key: 'artist', label: 'Artista' },
  { key: 'composer', label: 'Compositor' },
  { key: 'album', label: 'Álbum' },
  { key: 'year', label: 'Ano' },
  { key: 'genre', label: 'Gênero' },
  { key: 'confidence', label: 'Score de Confiança' },
  { key: 'youtube_url', label: 'URL do YouTube' },
];

export function ExportDialog({ open, format, onClose, onConfirm }: ExportDialogProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'title',
    'artist',
    'composer',
    'year',
    'genre',
    'confidence',
  ]);
  const [minConfidence, setMinConfidence] = useState(0);
  const [fileName, setFileName] = useState(`export-${Date.now()}`);

  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFields.length === AVAILABLE_FIELDS.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(AVAILABLE_FIELDS.map(f => f.key));
    }
  };

  const handleConfirm = () => {
    onConfirm({
      includeFields: selectedFields,
      minConfidence,
      fileName,
    });
  };

  const formatLabel = {
    xlsx: 'Excel',
    json: 'JSON',
    csv: 'CSV',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar como {formatLabel[format]}</DialogTitle>
          <DialogDescription>
            Configure as opções de exportação personalizada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="fileName">Nome do Arquivo</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="export-data"
            />
            <p className="text-xs text-muted-foreground">
              Extensão será adicionada automaticamente (.{format})
            </p>
          </div>

          {/* Min Confidence Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Confiança Mínima</Label>
              <span className="text-sm font-medium">{minConfidence}%</span>
            </div>
            <Slider
              value={[minConfidence]}
              onValueChange={([value]) => setMinConfidence(value)}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Exportar apenas músicas com score igual ou superior a {minConfidence}%
            </p>
          </div>

          {/* Fields Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Campos para Exportar</Label>
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedFields.length === AVAILABLE_FIELDS.length
                  ? 'Desmarcar Todos'
                  : 'Selecionar Todos'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_FIELDS.map(field => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <label
                    htmlFor={field.key}
                    className="text-sm cursor-pointer select-none"
                  >
                    {field.label}
                  </label>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {selectedFields.length} campo(s) selecionado(s)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={selectedFields.length === 0}>
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
