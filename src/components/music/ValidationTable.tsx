import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, AlertTriangle, Trash2, Wand2 } from 'lucide-react';

export type ValidationStatus = 'valid' | 'warning' | 'error';

export interface ValidationError {
  field: string;
  message: string;
}

export interface MusicEntry {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
  genre?: string;
  status: ValidationStatus;
  errors: ValidationError[];
}

interface ValidationTableProps {
  entries: MusicEntry[];
  onEdit: (id: string, field: string, value: string) => void;
  onRemove: (ids: string[]) => void;
  onAutoFix: (ids: string[]) => void;
}

export function ValidationTable({ entries, onEdit, onRemove, onAutoFix }: ValidationTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | 'all'>('all');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  const filteredEntries = entries.filter(entry => 
    statusFilter === 'all' || entry.status === statusFilter
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const handleCellEdit = (id: string, field: string, value: string) => {
    onEdit(id, field, value);
    setEditingCell(null);
  };

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const statusCounts = {
    valid: entries.filter(e => e.status === 'valid').length,
    warning: entries.filter(e => e.status === 'warning').length,
    error: entries.filter(e => e.status === 'error').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Validação de Dados</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {entries.length} entrada(s) • {selectedIds.size} selecionada(s)
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAutoFix(Array.from(selectedIds))}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Corrigir Selecionados
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onRemove(Array.from(selectedIds));
                    setSelectedIds(new Set());
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover Selecionados
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Badge
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            Todos ({entries.length})
          </Badge>
          <Badge
            variant={statusFilter === 'valid' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('valid')}
          >
            ✓ Válidos ({statusCounts.valid})
          </Badge>
          <Badge
            variant={statusFilter === 'warning' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('warning')}
          >
            ⚠ Avisos ({statusCounts.warning})
          </Badge>
          <Badge
            variant={statusFilter === 'error' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('error')}
          >
            ✕ Erros ({statusCounts.error})
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === filteredEntries.length && filteredEntries.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Artista</TableHead>
                <TableHead>Álbum</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Gênero</TableHead>
                <TableHead>Problemas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(entry.id)}
                      onCheckedChange={() => toggleSelection(entry.id)}
                    />
                  </TableCell>
                  <TableCell>{getStatusIcon(entry.status)}</TableCell>
                  
                  {['title', 'artist', 'album', 'year', 'genre'].map(field => {
                    const isEditing = editingCell?.id === entry.id && editingCell?.field === field;
                    const value = entry[field as keyof MusicEntry] as string || '';
                    
                    return (
                      <TableCell
                        key={field}
                        onDoubleClick={() => setEditingCell({ id: entry.id, field })}
                      >
                        {isEditing ? (
                          <Input
                            defaultValue={value}
                            autoFocus
                            onBlur={(e) => handleCellEdit(entry.id, field, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(entry.id, field, e.currentTarget.value);
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <span className="cursor-pointer hover:underline">
                            {value || <span className="text-muted-foreground">-</span>}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  
                  <TableCell>
                    {entry.errors.length > 0 ? (
                      <div className="space-y-1">
                        {entry.errors.map((error, idx) => (
                          <p key={idx} className="text-xs text-destructive">
                            {error.field}: {error.message}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhum</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredEntries.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma entrada encontrada
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
