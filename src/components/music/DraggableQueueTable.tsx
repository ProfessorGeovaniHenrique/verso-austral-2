import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, MoveUp, MoveDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type JobStatus = 'pending' | 'processing' | 'enriched' | 'error';

export interface ProcessingJob {
  id: string;
  title: string;
  artist: string;
  status: JobStatus;
  error?: string;
  progress?: number;
}

interface DraggableQueueTableProps {
  queue: ProcessingJob[];
  onReorder: (newQueue: ProcessingJob[]) => void;
  onRemove: (jobId: string) => void;
  onRetry: (jobId: string) => void;
}

export function DraggableQueueTable({ queue, onReorder, onRemove, onRetry }: DraggableQueueTableProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newQueue = [...queue];
    const draggedItem = newQueue[draggedIndex];
    
    newQueue.splice(draggedIndex, 1);
    newQueue.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    onReorder(newQueue);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveToTop = (index: number) => {
    if (index === 0) return;
    const newQueue = [...queue];
    const item = newQueue.splice(index, 1)[0];
    newQueue.unshift(item);
    onReorder(newQueue);
  };

  const moveToBottom = (index: number) => {
    if (index === queue.length - 1) return;
    const newQueue = [...queue];
    const item = newQueue.splice(index, 1)[0];
    newQueue.push(item);
    onReorder(newQueue);
  };

  const getStatusBadge = (status: JobStatus) => {
    const config = {
      pending: { label: 'Aguardando', variant: 'secondary' as const, color: 'text-gray-500' },
      processing: { label: 'Processando', variant: 'default' as const, color: 'text-blue-500' },
      enriched: { label: 'Concluído', variant: 'outline' as const, color: 'text-green-500' },
      error: { label: 'Erro', variant: 'destructive' as const, color: 'text-destructive' },
    };
    
    const { label, variant, color } = config[status];
    return <Badge variant={variant} className={color}>{label}</Badge>;
  };

  const statusCounts = {
    pending: queue.filter(j => j.status === 'pending').length,
    processing: queue.filter(j => j.status === 'processing').length,
    enriched: queue.filter(j => j.status === 'enriched').length,
    error: queue.filter(j => j.status === 'error').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fila de Processamento</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {queue.length} música(s) na fila
            </p>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="secondary">⏳ {statusCounts.pending}</Badge>
            <Badge variant="default">⚙️ {statusCounts.processing}</Badge>
            <Badge variant="outline" className="text-green-500">✓ {statusCounts.enriched}</Badge>
            <Badge variant="destructive">✕ {statusCounts.error}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Artista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma música na fila
                  </TableCell>
                </TableRow>
              )}
              
              {queue.map((job, index) => (
                <TableRow
                  key={job.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "cursor-move hover:bg-muted/50",
                    draggedIndex === index && "opacity-50"
                  )}
                >
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{job.title}</TableCell>
                  <TableCell>{job.artist}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(job.status)}
                      {job.error && (
                        <p className="text-xs text-destructive" title={job.error}>
                          {job.error.substring(0, 50)}...
                        </p>
                      )}
                      {job.status === 'processing' && job.progress !== undefined && (
                        <p className="text-xs text-muted-foreground">{job.progress}%</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveToTop(index)}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveToBottom(index)}
                        disabled={index === queue.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      {job.status === 'error' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRetry(job.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(job.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
