import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle } from 'lucide-react';

export interface ColumnMapping {
  titulo: string;
  artista: string;
  album?: string;
  ano?: string;
  genero?: string;
}

interface ColumnMapperProps {
  detectedColumns: string[];
  onMappingComplete: (mapping: ColumnMapping) => void;
  previewData: any[];
}

const REQUIRED_FIELDS = ['titulo', 'artista'];
const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  titulo: 'Título da Música',
  artista: 'Nome do Artista',
  album: 'Álbum (opcional)',
  ano: 'Ano (opcional)',
  genero: 'Gênero (opcional)',
};

export function ColumnMapper({ detectedColumns, onMappingComplete, previewData }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [isValid, setIsValid] = useState(false);

  const autoDetectMapping = () => {
    const detected: Partial<ColumnMapping> = {};
    
    detectedColumns.forEach(col => {
      const normalized = col.toLowerCase().trim();
      
      if (normalized.includes('titulo') || normalized.includes('música') || normalized.includes('musica') || normalized.includes('song')) {
        detected.titulo = col;
      } else if (normalized.includes('artista') || normalized.includes('artist') || normalized.includes('cantor')) {
        detected.artista = col;
      } else if (normalized.includes('album') || normalized.includes('álbum')) {
        detected.album = col;
      } else if (normalized.includes('ano') || normalized.includes('year')) {
        detected.ano = col;
      } else if (normalized.includes('genero') || normalized.includes('gênero') || normalized.includes('genre') || normalized.includes('estilo')) {
        detected.genero = col;
      }
    });
    
    setMapping(detected);
  };

  useEffect(() => {
    autoDetectMapping();
  }, [detectedColumns]);

  useEffect(() => {
    const hasAllRequired = REQUIRED_FIELDS.every(field => mapping[field as keyof ColumnMapping]);
    setIsValid(hasAllRequired);
  }, [mapping]);

  const handleFieldChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (isValid) {
      onMappingComplete(mapping as ColumnMapping);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Mapeamento de Colunas</CardTitle>
              <CardDescription>
                Conecte as colunas da sua planilha aos campos do sistema
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={autoDetectMapping}>
              <Sparkles className="mr-2 h-4 w-4" />
              Auto-detectar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(FIELD_LABELS).map(([field, label]) => {
            const isRequired = REQUIRED_FIELDS.includes(field);
            const currentValue = mapping[field as keyof ColumnMapping];
            
            return (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>
                  {label}
                  {isRequired && <Badge variant="destructive" className="ml-2">Obrigatório</Badge>}
                </Label>
                <Select
                  value={currentValue || ''}
                  onValueChange={(value) => handleFieldChange(field as keyof ColumnMapping, value)}
                >
                  <SelectTrigger id={field}>
                    <SelectValue placeholder="Selecione uma coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {detectedColumns.map(col => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          
          {!isValid && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Preencha todos os campos obrigatórios</p>
            </div>
          )}
          
          <Button onClick={handleSubmit} disabled={!isValid} className="w-full">
            Confirmar Mapeamento
          </Button>
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview dos Dados</CardTitle>
            <CardDescription>Primeiras 5 linhas do arquivo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(FIELD_LABELS).map(field => (
                      <TableHead key={field}>
                        {FIELD_LABELS[field as keyof ColumnMapping]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 5).map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.keys(FIELD_LABELS).map(field => {
                        const colName = mapping[field as keyof ColumnMapping];
                        return (
                          <TableCell key={field}>
                            {colName ? row[colName] || '-' : '-'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
