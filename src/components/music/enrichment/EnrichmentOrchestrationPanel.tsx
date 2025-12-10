/**
 * Painel de Orquestração de Enriquecimento por Corpus
 * Sprint AUD-P3: Batch Execution
 */

import { useState } from 'react';
import { Play, Square, SkipForward, Trash2, RefreshCw, Clock, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEnrichmentOrchestration } from '@/hooks/useEnrichmentOrchestration';
import { CorpusPipelineStep } from './CorpusPipelineStep';

export function EnrichmentOrchestrationPanel() {
  const [jobType, setJobType] = useState<'metadata' | 'youtube' | 'full'>('metadata');
  
  const {
    data,
    isLoading,
    error,
    isStarting,
    isStopping,
    isSkipping,
    totalPending,
    totalCompleted,
    progress,
    eta,
    start,
    stop,
    skip,
    cleanup,
    refetch,
  } = useEnrichmentOrchestration();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Erro na Orquestração</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={refetch} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isRunning = data?.state.isRunning || false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Pipeline de Enriquecimento
              {isRunning && (
                <Badge variant="default" className="animate-pulse">
                  Em execução
                </Badge>
              )}
              {totalCompleted === 3 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Concluído
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Processamento sequencial: Gaúcho → Sertanejo → Nordestino
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Métricas Globais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{totalPending.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">
              {data?.state.totalProcessed.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Processadas</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-destructive">
              {data?.state.totalFailed.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{totalCompleted}/3</p>
            <p className="text-xs text-muted-foreground">Corpora</p>
          </div>
        </div>

        {/* Progress global */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso Global</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {eta && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {eta.rate.toFixed(1)} músicas/min
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{eta.remainingHours}h restantes
                </span>
              </div>
            )}
          </div>
        )}

        {/* Pipeline Visual */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <h4 className="text-sm font-medium mb-4">Pipeline de Corpus</h4>
          <div className="space-y-0">
            {data?.corpora.map((corpus, index) => (
              <CorpusPipelineStep
                key={corpus.id}
                corpus={corpus}
                index={index}
                isLast={index === data.corpora.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
          <Select value={jobType} onValueChange={(v) => setJobType(v as typeof jobType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metadata">Metadados</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="full">Completo</SelectItem>
            </SelectContent>
          </Select>

          {!isRunning ? (
            <Button
              onClick={() => start(undefined, jobType)}
              disabled={isStarting || totalCompleted === 3}
            >
              {isStarting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar Pipeline
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={stop}
                disabled={isStopping}
              >
                {isStopping ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Parando...
                  </>
                ) : (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Parar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => skip(jobType)}
                disabled={isSkipping}
              >
                {isSkipping ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Pulando...
                  </>
                ) : (
                  <>
                    <SkipForward className="mr-2 h-4 w-4" />
                    Pular Corpus
                  </>
                )}
              </Button>
            </>
          )}

          <Button variant="ghost" onClick={cleanup} className="ml-auto">
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar Órfãos
          </Button>
        </div>

        {/* Info sobre jobs limpos */}
        {data?.orphansCleaned && data.orphansCleaned > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {data.orphansCleaned} job(s) órfão(s) foram limpos automaticamente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
