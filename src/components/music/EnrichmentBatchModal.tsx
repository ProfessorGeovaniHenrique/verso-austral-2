import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useEnrichmentJob } from '@/hooks/useEnrichmentJob';
import { 
  Sparkles, 
  Pause, 
  Play, 
  Square,
  X, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EnrichmentBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Por artista
  artistId?: string;
  artistName?: string;
  // Por seleção
  songIds: string[];
  // Callback
  onComplete?: () => void;
}

export function EnrichmentBatchModal({
  open,
  onOpenChange,
  artistId,
  artistName,
  songIds,
  onComplete,
}: EnrichmentBatchModalProps) {
  const [forceReenrich, setForceReenrich] = useState(false);

  // Usa artistId se disponível, senão usa songIds (seleção)
  const scope = artistId ? 'artist' : 'selection';

  const {
    activeJob,
    lastCompletedJob,
    isLoading,
    startJob,
    pauseJob,
    resumeJob,
    cancelJob,
    progress
  } = useEnrichmentJob({
    jobType: 'metadata',
    artistId: artistId || undefined,
    autoRefresh: true,
    refreshInterval: 3000
  });

  // Job atual (ativo ou último completado)
  const currentJob = activeJob || lastCompletedJob;
  const isProcessing = activeJob?.status === 'processando';
  const isPaused = activeJob?.status === 'pausado';
  const isCompleted = currentJob?.status === 'concluido';
  const hasError = currentJob?.status === 'erro';
  const isCancelled = currentJob?.status === 'cancelado';
  const isIdle = !currentJob && !isLoading;

  // Chamar onComplete quando job terminar
  useEffect(() => {
    if (isCompleted && onComplete) {
      onComplete();
    }
  }, [isCompleted, onComplete]);

  const handleStartJob = async () => {
    await startJob({
      songIds,
      artistId: artistId || undefined,
      artistName: artistName || undefined,
      forceReenrich,
      jobType: 'metadata',
      scope
    });
  };

  // Não cancela o job ao fechar - ele continua em background
  const handleClose = () => {
    onOpenChange(false);
  };

  // Calcular métricas
  const elapsedMs = currentJob?.tempo_inicio 
    ? Date.now() - new Date(currentJob.tempo_inicio).getTime() 
    : 0;
  const avgTimePerSong = currentJob?.songs_processed && currentJob.songs_processed > 0 
    ? elapsedMs / currentJob.songs_processed 
    : 0;
  const remainingSongs = (currentJob?.total_songs || 0) - (currentJob?.songs_processed || 0);
  const estimatedRemainingMs = avgTimePerSong * remainingSongs;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Título descritivo
  const title = artistName 
    ? `${artistName} • ${songIds.length} músicas`
    : `${songIds.length} músicas selecionadas`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enriquecimento em Lote
            {isProcessing && <Badge variant="default" className="bg-blue-500">Processando</Badge>}
            {isPaused && <Badge variant="secondary">Pausado</Badge>}
            {isCompleted && <Badge variant="default" className="bg-green-500">Concluído</Badge>}
            {hasError && <Badge variant="destructive">Erro</Badge>}
            {isCancelled && <Badge variant="outline">Cancelado</Badge>}
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estado: Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Estado: Sem job ativo - Configuração inicial */}
          {isIdle && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/30">
                <Checkbox
                  id="force-reenrich"
                  checked={forceReenrich}
                  onCheckedChange={(checked) => setForceReenrich(checked === true)}
                />
                <Label htmlFor="force-reenrich" className="text-sm cursor-pointer leading-tight">
                  <div className="font-medium">Forçar re-enriquecimento</div>
                  <div className="text-xs text-muted-foreground">
                    Processar mesmo músicas já enriquecidas
                  </div>
                </Label>
              </div>

              <Button onClick={handleStartJob} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Iniciar Enriquecimento
              </Button>
            </div>
          )}

          {/* Estado: Job em andamento ou finalizado */}
          {currentJob && !isLoading && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Progresso</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{currentJob.songs_processed || 0}</div>
                  <div className="text-xs text-muted-foreground">Processadas</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">{currentJob.songs_succeeded || 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Sucesso</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-2xl font-bold text-red-600">{currentJob.songs_failed || 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Falhas</div>
                </div>
              </div>

              {/* Tempo estimado */}
              {isProcessing && estimatedRemainingMs > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Tempo restante estimado: {formatTime(estimatedRemainingMs)}</span>
                </div>
              )}

              {/* Status info */}
              {currentJob.updated_at && (
                <p className="text-xs text-muted-foreground text-center">
                  Atualizado {formatDistanceToNow(new Date(currentJob.updated_at), { addSuffix: true, locale: ptBR })}
                </p>
              )}

              {/* Erro */}
              {hasError && currentJob.erro_mensagem && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{currentJob.erro_mensagem}</p>
                </div>
              )}

              {/* Sucesso */}
              {isCompleted && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-600">Enriquecimento concluído com sucesso!</p>
                </div>
              )}

              {/* Controles */}
              <div className="flex gap-2">
                {isProcessing && (
                  <>
                    <Button variant="outline" onClick={() => pauseJob()} className="flex-1">
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                    <Button variant="destructive" onClick={() => cancelJob()} size="icon">
                      <Square className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {isPaused && (
                  <>
                    <Button onClick={() => resumeJob()} className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Retomar
                    </Button>
                    <Button variant="destructive" onClick={() => cancelJob()} size="icon">
                      <Square className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {(isCompleted || hasError || isCancelled) && (
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Fechar
                  </Button>
                )}
              </div>

              {/* Info background processing */}
              {(isProcessing || isPaused) && (
                <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg text-xs">
                  <span className="text-blue-600">
                    Job continua em background ao fechar
                  </span>
                  <a 
                    href="/music-catalog?tab=enrichment" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    Ver Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
