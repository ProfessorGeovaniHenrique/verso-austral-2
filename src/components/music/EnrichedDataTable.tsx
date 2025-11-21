import { useState } from 'react';
import { DataTable, ColumnDef } from './DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Edit, Trash2, Download, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface EnrichedSong {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  year?: string;
  genre?: string;
  confidence: number;
  status?: string;
}

interface EnrichedDataTableProps {
  songs: EnrichedSong[];
  onView?: (song: EnrichedSong) => void;
  onEdit?: (song: EnrichedSong) => void;
  onDelete?: (ids: string[]) => void;
  onExport?: (ids: string[]) => void;
  onEnrich?: (songId: string) => void;
  enrichingIds?: Set<string>;
}

export function EnrichedDataTable({ songs, onView, onEdit, onDelete, onExport, onEnrich, enrichingIds = new Set() }: EnrichedDataTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    if (selectedIds.size === songs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(songs.map(s => s.id)));
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'warning' as const, icon: AlertCircle },
      enriched: { label: 'Enriquecida', variant: 'success' as const, icon: CheckCircle2 },
      processed: { label: 'Processada', variant: 'info' as const, icon: CheckCircle2 },
      error: { label: 'Erro', variant: 'destructive' as const, icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence || confidence === 0) return <span className="text-muted-foreground text-sm">-</span>;
    
    const variant = confidence >= 0.8 ? 'success' as const : confidence >= 0.5 ? 'warning' as const : 'destructive' as const;
    
    return <Badge variant={variant}>✓ {(confidence * 100).toFixed(0)}%</Badge>;
  };

  const columns: ColumnDef<EnrichedSong>[] = [
    {
      key: 'select',
      label: '',
      render: (_, row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => toggleSelection(row.id)}
        />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => getStatusBadge(value as string),
    },
    {
      key: 'title',
      label: 'Título',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'artist',
      label: 'Artista',
      sortable: true,
    },
    {
      key: 'composer',
      label: 'Compositor',
      sortable: true,
      render: (value) => value || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'year',
      label: 'Ano',
      sortable: true,
      render: (value) => value || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'genre',
      label: 'Gênero',
      sortable: true,
      render: (value) => value ? <Badge variant="secondary">{value}</Badge> : <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'confidence',
      label: 'Confiança',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          {getConfidenceBadge(value)}
          <span className="text-xs text-muted-foreground">{value}/100</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, row) => {
        const isEnriching = enrichingIds.has(row.id);
        return (
          <div className="flex items-center gap-1">
            {onEnrich && row.status === 'pending' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEnrich(row.id);
                      }}
                      disabled={isEnriching}
                    >
                      {isEnriching ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enriquecer música</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(row);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <div className="flex-1" />
          {onExport && (
            <Button variant="outline" size="sm" onClick={() => onExport(Array.from(selectedIds))}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={songs}
        pageSize={20}
        searchPlaceholder="Buscar por título, artista ou compositor..."
        getRowId={(row) => row.id}
      />
    </div>
  );
}
