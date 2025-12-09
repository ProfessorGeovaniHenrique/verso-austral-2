/**
 * Card de monitoramento em tempo real para job de enriquecimento ativo
 * Exibe métricas live: música atual, taxa, ETA, heartbeat
 * 
 * SPRINT 1: Adicionadas métricas de velocidade (s/música) e ETA calculado
 */

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
  XCircle,
  Pause,
  Play,
  Timer,
  Loader2,
  RefreshCw,
  Zap,
  Gauge,
} from 'lucide-react';
import { useEnrichmentLiveMetrics } from '@/hooks/useEnrichmentLiveMetrics';
import { EnrichmentJob } from '@/hooks/useEnrichmentJob';
import { useProgressWithETA } from '@/hooks/useProgressWithETA';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EnrichmentLiveCardProps {
  job: EnrichmentJob;
  onPause?: () => void;
  onResume?: () => void;
  isActionLoading?: boolean;
}

export function EnrichmentLiveCard({ 
  job, 
  onPause, 
  onResume,
  isActionLoading 
}: EnrichmentLiveCardProps) {
  const { metrics, formattedEta, isLoading, refetch } = useEnrichmentLiveMetrics({
    jobId: job.id,
    enabled: job.status === 'processando',
    refreshInterval: 5000,
  });
  
  const progress = job.total_songs > 0
    ? Math.round((job.songs_processed / job.total_songs) * 100)
    : 0;
  
  // SPRINT 1: ETA calculado baseado em progresso real
  const etaInfo = useProgressWithETA(progress, job.tempo_inicio, job.songs_processed);
  
  // Tempo decorrido
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
  
  // SPRINT 1: Calcular velocidade (segundos por música)
  const secondsPerSong = job.songs_processed > 0 && elapsedSeconds > 0
    ? (elapsedSeconds / job.songs_processed).toFixed(1)
    : '-';
  
  // SPRINT 1: Músicas por minuto baseado em dados reais
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={refetch}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            
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
        
        {/* SPRINT 1: Métricas em tempo real otimizadas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Tempo decorrido */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Timer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold">{formatElapsed(elapsedSeconds)}</div>
            <div className="text-xs text-muted-foreground">Decorrido</div>
          </div>
          
          {/* SPRINT 1: Velocidade (s/música) */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <div className="text-lg font-bold">{secondsPerSong}s</div>
            <div className="text-xs text-muted-foreground">por música</div>
          </div>
          
          {/* Taxa de processamento */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-bold">
              {songsPerMinute || metrics.processingRate || '-'}
            </div>
            <div className="text-xs text-muted-foreground">músicas/min</div>
          </div>
          
          {/* ETA calculado */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <div className="text-lg font-bold truncate">
              {etaInfo?.remainingFormatted || formattedEta || '-'}
            </div>
            <div className="text-xs text-muted-foreground">ETA</div>
          </div>
          
          {/* SPRINT 1: Throughput Gauge */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Gauge className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <div className="text-lg font-bold">
              {job.chunks_processed || 0}
            </div>
            <div className="text-xs text-muted-foreground">chunks</div>
          </div>
          
          {/* Heartbeat */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Activity className={cn(
              "h-4 w-4 mx-auto mb-1",
              metrics.isAlive ? "text-green-500" : "text-muted-foreground"
            )} />
            <div className="text-lg font-bold">
              {metrics.songsUpdatedLast5Minutes}
            </div>
            <div className="text-xs text-muted-foreground">últimos 5min</div>
          </div>
        </div>
        
        {/* Última música processada */}
        {metrics.lastProcessedSong && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Music className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {metrics.lastProcessedSong.title}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {metrics.lastProcessedSong.artist}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {metrics.lastProcessedSong.hasComposer && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Compositor
                    </Badge>
                  )}
                  {metrics.lastProcessedSong.hasYear && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Ano
                    </Badge>
                  )}
                  {metrics.lastProcessedSong.hasYoutube && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      YouTube
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(metrics.lastProcessedSong.updatedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Mini-log de músicas recentes */}
        {metrics.recentSongs.length > 1 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Últimas processadas
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {metrics.recentSongs.slice(1).map((song) => (
                <div 
                  key={song.id} 
                  className="flex items-center justify-between text-xs py-1 px-2 bg-muted/20 rounded"
                >
                  <span className="truncate flex-1">{song.title}</span>
                  <span className="text-muted-foreground ml-2 whitespace-nowrap">
                    {formatDistanceToNow(new Date(song.updatedAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Status de heartbeat */}
        {isProcessing && (
          <div className={cn(
            "flex items-center justify-center gap-2 py-2 rounded-lg text-sm",
            metrics.isAlive 
              ? "bg-green-500/10 text-green-700 dark:text-green-400" 
              : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
          )}>
            {metrics.isAlive ? (
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
}
