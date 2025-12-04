/**
 * Card para exibir status e controles de jobs de enriquecimento
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  X, 
  RefreshCw, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useEnrichmentJob, EnrichmentJob, EnrichmentJobType } from '@/hooks/useEnrichmentJob';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
            {statusConfig && (
              <Badge variant={statusConfig.variant} className="gap-1">
                {statusConfig.icon}
                {statusConfig.label}
                {isAbandoned && ' (Travado)'}
              </Badge>
            )}
          </div>
          {job?.artist_name && (
            <CardDescription>
              Artista: {job.artist_name}
            </CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent className={compact ? 'p-0 space-y-2' : 'space-y-3'}>
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
