/**
 * EnrichmentLiveCardOptimized - Card de monitoramento otimizado
 * 
 * REFATORAÇÃO: Recebe métricas via props ao invés de instanciar próprio hook
 * Elimina múltiplos timers e re-renders
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Clock,
  Music,
  TrendingUp,
  CheckCircle2,
  Pause,
  Play,
  Timer,
  Loader2,
  Zap,
  Gauge,
  X,
} from 'lucide-react';
import { useProgressWithETA } from '@/hooks/useProgressWithETA';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { EnrichmentJob } from '@/hooks/useEnrichmentJob';
import type { EnrichmentLiveMetrics } from '@/contexts/EnrichmentJobsContext';

interface EnrichmentLiveCardOptimizedProps {
  job: EnrichmentJob;
  liveMetrics: EnrichmentLiveMetrics;
  formattedEta: string | null;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  isActionLoading?: boolean;
}

export const EnrichmentLiveCardOptimized = React.memo(function EnrichmentLiveCardOptimized({
  job,
  liveMetrics,
  formattedEta,
  onPause,
  onResume,
  onCancel,
  isActionLoading,
}: EnrichmentLiveCardOptimizedProps) {
  const progress = job.total_songs > 0
    ? Math.round((job.songs_processed / job.total_songs) * 100)
    : 0;

  const etaInfo = useProgressWithETA(progress, job.tempo_inicio, job.songs_processed);

  const elapsedSeconds = job.tempo_inicio
    ? differenceInSeconds(new Date(), new Date(job.tempo_inicio))
    : 0;

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const secondsPerSong = job.songs_processed > 0 && elapsedSeconds > 0
    ? (elapsedSeconds / job.songs_processed).toFixed(1)
    : '-';

  const songsPerMinute = job.songs_processed > 0 && elapsedSeconds > 0
    ? Math.round((job.songs_processed / elapsedSeconds) * 60)
    : 0;

  const isProcessing = job.status === 'processando';
  const isPaused = job.status === 'pausado';

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isProcessing && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
            )}
            {isPaused && <Pause className="h-4 w-4 text-yellow-500" />}
            Job Ativo - {job.job_type === 'metadata' ? 'Metadados' : job.job_type}
          </CardTitle>

          <div className="flex items-center gap-2">
            {isProcessing && onPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Pause className="h-4 w-4 mr-1" />
                )}
                Pausar
              </Button>
            )}

            {isPaused && onResume && (
              <Button
                variant="default"
                size="sm"
                onClick={onResume}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Retomar
              </Button>
            )}
            
            {onCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancel}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {job.artist_name || job.corpus_type || 'Escopo Global'} • {job.scope}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progresso principal */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              <span className="text-green-600 font-medium">{job.songs_succeeded}</span>
              {' / '}
              {job.total_songs} músicas
              {job.songs_failed > 0 && (
                <span className="text-destructive ml-1">
                  ({job.songs_failed} falhas)
                </span>
              )}
            </span>
            <span>Chunk {job.chunks_processed || 0}</span>
          </div>
        </div>

        {/* Métricas em tempo real */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Timer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold">{formatElapsed(elapsedSeconds)}</div>
            <div className="text-xs text-muted-foreground">Decorrido</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <div className="text-lg font-bold">{secondsPerSong}s</div>
            <div className="text-xs text-muted-foreground">por música</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-bold">
              {songsPerMinute || liveMetrics.processingRate || '-'}
            </div>
            <div className="text-xs text-muted-foreground">músicas/min</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <div className="text-lg font-bold truncate">
              {etaInfo?.remainingFormatted || formattedEta || '-'}
            </div>
            <div className="text-xs text-muted-foreground">ETA</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Gauge className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <div className="text-lg font-bold">{job.chunks_processed || 0}</div>
            <div className="text-xs text-muted-foreground">chunks</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Activity className={cn(
              "h-4 w-4 mx-auto mb-1",
              liveMetrics.isAlive ? "text-green-500" : "text-muted-foreground"
            )} />
            <div className="text-lg font-bold">
              {liveMetrics.songsUpdatedLast5Minutes}
            </div>
            <div className="text-xs text-muted-foreground">últimos 5min</div>
          </div>
        </div>

        {/* Última música processada */}
        {liveMetrics.lastProcessedSong && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Music className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {liveMetrics.lastProcessedSong.title}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {liveMetrics.lastProcessedSong.artist}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {liveMetrics.lastProcessedSong.hasComposer && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Compositor
                    </Badge>
                  )}
                  {liveMetrics.lastProcessedSong.hasYear && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Ano
                    </Badge>
                  )}
                  {liveMetrics.lastProcessedSong.hasYoutube && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      YouTube
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(liveMetrics.lastProcessedSong.updatedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </div>
            </div>
          </div>
        )}

        {/* Status de heartbeat */}
        {isProcessing && (
          <div className={cn(
            "flex items-center justify-center gap-2 py-2 rounded-lg text-sm",
            liveMetrics.isAlive
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
          )}>
            {liveMetrics.isAlive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Processamento ativo
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                Aguardando atualizações...
              </>
            )}
          </div>
        )}

        {isPaused && (
          <div className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <Pause className="h-4 w-4" />
            Job pausado - clique em Retomar para continuar
          </div>
        )}
      </CardContent>
    </Card>
  );
});
