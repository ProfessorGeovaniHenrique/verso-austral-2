/**
 * Card para exibir status e controles de jobs de enriquecimento
 * Sprint ENRICH-ARCHITECTURE-FIX: Monitoramento de saúde adicionado
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  X, 
  RefreshCw, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Zap,
  Activity
} from 'lucide-react';
import { useEnrichmentJob, EnrichmentJobType } from '@/hooks/useEnrichmentJob';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo } from 'react';

interface EnrichmentJobCardProps {
  artistId?: string;
  artistName?: string;
  corpusId?: string;
  corpusType?: string;
  jobType?: EnrichmentJobType;
  onComplete?: () => void;
  compact?: boolean;
}

const JOB_TYPE_LABELS: Record<EnrichmentJobType, string> = {
  metadata: 'Metadados',
  youtube: 'YouTube',
  lyrics: 'Letras',
  full: 'Completo',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  processando: { label: 'Processando', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  pausado: { label: 'Pausado', variant: 'outline', icon: <Pause className="h-3 w-3" /> },
  concluido: { label: 'Concluído', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  erro: { label: 'Erro', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  cancelado: { label: 'Cancelado', variant: 'secondary', icon: <X className="h-3 w-3" /> },
};

// Thresholds para alertas de saúde
const HEALTH_THRESHOLDS = {
  heartbeatWarning: 60, // segundos
  heartbeatCritical: 180, // segundos
  minSongsPerMinute: 2, // mínimo aceitável
};

export function EnrichmentJobCard({
  artistId,
  artistName,
  corpusId,
  corpusType,
  jobType = 'metadata',
  onComplete,
  compact = false,
}: EnrichmentJobCardProps) {
  const {
    activeJob,
    lastCompletedJob,
    isLoading,
    isStarting,
    isResuming,
    progress,
    isAbandoned,
    isProcessing,
    isPaused,
    isCancelling,
    hasActiveJob,
    startJob,
    pauseJob,
    cancelJob,
    resumeJob,
    resumeJobWithForce,
    forceRestartJob,
  } = useEnrichmentJob({ artistId, corpusId, jobType });

  // Calcular métricas de saúde
  const healthMetrics = useMemo(() => {
    if (!activeJob) return null;
    
    const metadata = activeJob.metadata as Record<string, unknown> || {};
    const lastChunkStats = metadata.lastChunkStats as Record<string, unknown> || {};
    
    // Tempo desde último heartbeat
    const lastHeartbeat = activeJob.last_chunk_at 
      ? differenceInSeconds(new Date(), new Date(activeJob.last_chunk_at))
      : null;
    
    // Velocidade de processamento
    const songsPerMinute = lastChunkStats.songsPerMinute as number || 0;
    const avgTimePerSong = lastChunkStats.avgTimePerSongMs as number || 0;
    
    // Circuit breaker state
    const consecutiveChunkFailures = metadata.consecutiveChunkFailures as number || 0;
    const chunksWithoutProgress = metadata.chunksWithoutProgress as number || 0;
    const circuitBreakerTriggered = metadata.circuitBreakerTriggered as boolean || false;
    const circuitBreakerReason = metadata.circuitBreakerReason as string || '';
    
    // Calcular status de saúde
    let healthStatus: 'good' | 'warning' | 'critical' = 'good';
    let healthMessage = '';
    
    if (circuitBreakerTriggered) {
      healthStatus = 'critical';
      healthMessage = circuitBreakerReason;
    } else if (lastHeartbeat !== null && lastHeartbeat > HEALTH_THRESHOLDS.heartbeatCritical) {
      healthStatus = 'critical';
      healthMessage = `Sem heartbeat há ${Math.round(lastHeartbeat / 60)}min`;
    } else if (lastHeartbeat !== null && lastHeartbeat > HEALTH_THRESHOLDS.heartbeatWarning) {
      healthStatus = 'warning';
      healthMessage = 'Heartbeat atrasado';
    } else if (consecutiveChunkFailures >= 2) {
      healthStatus = 'warning';
      healthMessage = `${consecutiveChunkFailures} chunks falharam`;
    } else if (songsPerMinute > 0 && songsPerMinute < HEALTH_THRESHOLDS.minSongsPerMinute) {
      healthStatus = 'warning';
      healthMessage = 'Velocidade baixa';
    }
    
    // Calcular ETA
    const remaining = activeJob.total_songs - activeJob.songs_processed;
    const etaMinutes = songsPerMinute > 0 ? Math.round(remaining / songsPerMinute) : null;
    
    return {
      lastHeartbeat,
      songsPerMinute,
      avgTimePerSong,
      consecutiveChunkFailures,
      chunksWithoutProgress,
      circuitBreakerTriggered,
      circuitBreakerReason,
      healthStatus,
      healthMessage,
      etaMinutes,
    };
  }, [activeJob]);

  const handleStart = async () => {
    await startJob({
      jobType,
      scope: artistId ? 'artist' : corpusId ? 'corpus' : 'all',
      artistId,
      artistName,
      corpusId,
      corpusType,
    });
  };

  const job = activeJob || lastCompletedJob;
  const statusConfig = job ? STATUS_CONFIG[job.status] : null;

  if (isLoading) {
    return (
      <Card className={compact ? 'p-3' : ''}>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Sem job ativo - mostrar botão de iniciar
  if (!hasActiveJob && !lastCompletedJob) {
    return (
      <Card className={compact ? 'p-3' : ''}>
        <CardContent className={compact ? 'p-0' : 'pt-4'}>
          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="w-full"
            variant="outline"
          >
            {isStarting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isStarting ? 'Iniciando...' : `Enriquecer ${JOB_TYPE_LABELS[jobType]}`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Job ativo ou último concluído
  return (
    <Card className={compact ? 'p-3' : ''}>
      {!compact && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Enriquecimento de {JOB_TYPE_LABELS[job?.job_type || jobType]}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Health indicator */}
              {hasActiveJob && healthMetrics && (
                <Badge 
                  variant={
                    healthMetrics.healthStatus === 'critical' ? 'destructive' :
                    healthMetrics.healthStatus === 'warning' ? 'outline' : 'secondary'
                  }
                  className="gap-1"
                >
                  {healthMetrics.healthStatus === 'critical' ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : healthMetrics.healthStatus === 'warning' ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <Activity className="h-3 w-3" />
                  )}
                  {healthMetrics.healthStatus === 'good' ? 'Saudável' : 
                   healthMetrics.healthStatus === 'warning' ? 'Alerta' : 'Crítico'}
                </Badge>
              )}
              {statusConfig && (
                <Badge variant={statusConfig.variant} className="gap-1">
                  {statusConfig.icon}
                  {statusConfig.label}
                  {isAbandoned && ' (Travado)'}
                </Badge>
              )}
            </div>
          </div>
          {job?.artist_name && (
            <CardDescription>
              Artista: {job.artist_name}
            </CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent className={compact ? 'p-0 space-y-2' : 'space-y-3'}>
        {/* Alerta de saúde */}
        {hasActiveJob && healthMetrics && healthMetrics.healthMessage && (
          <Alert variant={healthMetrics.healthStatus === 'critical' ? 'destructive' : 'default'} className="py-2">
            <AlertDescription className="text-xs flex items-center gap-2">
              {healthMetrics.healthStatus === 'critical' ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {healthMetrics.healthMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Progresso */}
        {hasActiveJob && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded bg-muted p-1.5">
                <div className="font-semibold">{activeJob?.songs_processed || 0}</div>
                <div className="text-muted-foreground">Processadas</div>
              </div>
              <div className="rounded bg-green-500/10 p-1.5">
                <div className="font-semibold text-green-600">{activeJob?.songs_succeeded || 0}</div>
                <div className="text-muted-foreground">Sucesso</div>
              </div>
              <div className="rounded bg-red-500/10 p-1.5">
                <div className="font-semibold text-red-600">{activeJob?.songs_failed || 0}</div>
                <div className="text-muted-foreground">Falhas</div>
              </div>
            </div>

            {/* Métricas de performance */}
            {healthMetrics && (healthMetrics.songsPerMinute > 0 || healthMetrics.etaMinutes) && (
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {healthMetrics.songsPerMinute > 0 ? (
                    <span>{healthMetrics.songsPerMinute} músicas/min</span>
                  ) : (
                    <span>Calculando...</span>
                  )}
                </div>
                {healthMetrics.etaMinutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>ETA: {healthMetrics.etaMinutes}min</span>
                  </div>
                )}
              </div>
            )}

            {/* Última atualização */}
            {activeJob?.last_chunk_at && (
              <p className="text-xs text-muted-foreground">
                Última atualização: {formatDistanceToNow(new Date(activeJob.last_chunk_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </p>
            )}
          </>
        )}

        {/* Último job concluído */}
        {!hasActiveJob && lastCompletedJob && (
          <div className="text-sm text-muted-foreground">
            <p>
              Último: {lastCompletedJob.songs_succeeded}/{lastCompletedJob.total_songs} músicas enriquecidas
            </p>
            {lastCompletedJob.tempo_fim && (
              <p className="text-xs">
                {formatDistanceToNow(new Date(lastCompletedJob.tempo_fim), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </p>
            )}
          </div>
        )}

        {/* Controles */}
        <div className="flex gap-2">
          {hasActiveJob ? (
            <>
              {isProcessing && !isCancelling && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={pauseJob}
                  className="flex-1"
                >
                  <Pause className="mr-1 h-3 w-3" />
                  Pausar
                </Button>
              )}

              {isPaused && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={resumeJob}
                  disabled={isResuming}
                  className="flex-1"
                >
                  {isResuming ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3 w-3" />
                  )}
                  Retomar
                </Button>
              )}

              {isAbandoned && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={resumeJobWithForce}
                    disabled={isResuming}
                    className="flex-1"
                  >
                    {isResuming ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    Forçar Retomada
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => forceRestartJob({
                      jobType,
                      scope: artistId ? 'artist' : corpusId ? 'corpus' : 'all',
                      artistId,
                      artistName,
                      corpusId,
                      corpusType,
                    })}
                    disabled={isStarting}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    Reiniciar
                  </Button>
                </>
              )}

              {!isCancelling && !isAbandoned && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={cancelJob}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              {isCancelling && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Cancelando...
                </Badge>
              )}
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={isStarting}
              className="flex-1"
            >
              {isStarting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {isStarting ? 'Iniciando...' : 'Novo Enriquecimento'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}