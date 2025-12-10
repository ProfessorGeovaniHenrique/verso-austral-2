/**
 * Painel de visualização da Pipeline de Processamento Completo
 * Sprint 3: Pipeline Unificada
 * Memoizado para evitar re-renders
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Play,
  Pause,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Brain,
  Star,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useProcessingPipeline, ProcessingJob } from '@/hooks/useProcessingPipeline';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  processando: { label: 'Processando', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  pausado: { label: 'Pausado', variant: 'outline', icon: <Pause className="h-3 w-3" /> },
  concluido: { label: 'Concluído', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  erro: { label: 'Erro', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  cancelado: { label: 'Cancelado', variant: 'secondary', icon: <X className="h-3 w-3" /> },
};

interface PhaseCardProps {
  icon: React.ReactNode;
  title: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  value: string;
  subtext?: string;
}

const PhaseCard = React.memo(function PhaseCard({ icon, title, status, value, subtext }: PhaseCardProps) {
  const statusColors = {
    pending: 'border-muted bg-muted/30',
    active: 'border-primary bg-primary/10',
    complete: 'border-green-500 bg-green-500/10',
    error: 'border-destructive bg-destructive/10'
  };

  return (
    <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${statusColors[status]} transition-all`}>
      <div className="mb-2">{icon}</div>
      <div className="text-xs font-medium text-muted-foreground uppercase">{title}</div>
      <div className="text-lg font-bold">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
    </div>
  );
});

// Componente principal memoizado
export const ProcessingPipelinePanel = React.memo(function ProcessingPipelinePanel() {
  const {
    job,
    jobs,
    isLoading,
    isStarting,
    isProcessing,
    isPaused,
    progress,
    eta,
    phaseStats,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    refetch
  } = useProcessingPipeline();

  const [scope, setScope] = useState<'global' | 'corpus' | 'artist'>('global');
  const [skipEnrichment, setSkipEnrichment] = useState(false);
  const [skipAnnotation, setSkipAnnotation] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Se há um job ativo, mostrar painel de progresso
  if (job && (job.status === 'processando' || job.status === 'pausado')) {
    const enrichmentPhase = job.songs_enriched > 0 ? 'complete' : (isProcessing ? 'active' : 'pending');
    const annotationPhase = job.songs_annotated > 0 
      ? (job.songs_annotated >= job.songs_processed ? 'complete' : 'active')
      : 'pending';
    const qualityPhase = job.avg_quality_score > 0 ? 'complete' : 'pending';

    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Pipeline de Processamento Completo</CardTitle>
              <Badge variant={STATUS_CONFIG[job.status].variant} className="gap-1">
                {STATUS_CONFIG[job.status].icon}
                {STATUS_CONFIG[job.status].label}
              </Badge>
            </div>
            <div className="flex gap-2">
              {isProcessing && (
                <Button variant="outline" size="sm" onClick={pauseProcessing}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </Button>
              )}
              {isPaused && (
                <Button variant="default" size="sm" onClick={resumeProcessing}>
                  <Play className="mr-2 h-4 w-4" />
                  Retomar
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={cancelProcessing}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visualização das 3 fases */}
          <div className="grid grid-cols-3 gap-4">
            <PhaseCard
              icon={<Sparkles className={`h-6 w-6 ${enrichmentPhase === 'active' ? 'text-primary animate-pulse' : enrichmentPhase === 'complete' ? 'text-green-500' : 'text-muted-foreground'}`} />}
              title="Enriquecimento"
              status={enrichmentPhase}
              value={`${job.songs_enriched}/${job.songs_processed}`}
              subtext={`${phaseStats.enrichment.successRate}% sucesso`}
            />
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <PhaseCard
              icon={<Brain className={`h-6 w-6 ${annotationPhase === 'active' ? 'text-primary animate-pulse' : annotationPhase === 'complete' ? 'text-green-500' : 'text-muted-foreground'}`} />}
              title="Anotação"
              status={annotationPhase}
              value={`${job.songs_annotated}/${job.songs_processed}`}
              subtext={`${phaseStats.annotation.successRate}% sucesso`}
            />
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          <div className="flex justify-center">
            <PhaseCard
              icon={<Star className={`h-6 w-6 ${qualityPhase === 'complete' ? 'text-amber-500' : 'text-muted-foreground'}`} />}
              title="Quality Score"
              status={qualityPhase}
              value={`${Math.round(job.avg_quality_score)}`}
              subtext="média do catálogo"
            />
          </div>

          {/* Progress bar unificada */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso geral</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {job.songs_processed} de {job.total_songs} músicas
                {job.songs_failed > 0 && (
                  <span className="text-destructive ml-2">({job.songs_failed} falhas)</span>
                )}
              </span>
              {eta && <span>ETA: {eta}</span>}
            </div>
          </div>

          {/* Métricas de qualidade */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(job.quality_distribution).map(([range, count]) => (
              <div key={range} className="text-center p-2 rounded bg-muted/50">
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{range} pts</div>
              </div>
            ))}
          </div>

          {/* Info do job */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
            <span>Escopo: {job.scope}{job.scope_filter ? ` (${job.scope_filter})` : ''}</span>
            <span>Chunk {job.chunks_processed + 1}</span>
            {job.started_at && (
              <span>
                Iniciado {formatDistanceToNow(new Date(job.started_at), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se não há job ativo, mostrar controles para iniciar
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Pipeline de Processamento Completo</CardTitle>
              <CardDescription>
                Enriquecimento + Anotação Semântica + Quality Score em um único fluxo
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controles para iniciar */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Escopo</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Todo o Catálogo</SelectItem>
                <SelectItem value="corpus">Por Corpus</SelectItem>
                <SelectItem value="artist">Por Artista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Opções</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="skip-enrich" 
                  checked={skipEnrichment}
                  onCheckedChange={(c) => setSkipEnrichment(!!c)}
                />
                <Label htmlFor="skip-enrich" className="text-sm font-normal">
                  Pular enriquecimento
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="skip-annotate" 
                  checked={skipAnnotation}
                  onCheckedChange={(c) => setSkipAnnotation(!!c)}
                />
                <Label htmlFor="skip-annotate" className="text-sm font-normal">
                  Pular anotação semântica
                </Label>
              </div>
            </div>
          </div>
        </div>

        <Button 
          className="w-full" 
          onClick={() => startProcessing({ scope, skipEnrichment, skipAnnotation })}
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Iniciar Pipeline Completa
            </>
          )}
        </Button>

        {/* Histórico de jobs recentes */}
        {jobs.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Jobs Recentes</h4>
            <div className="space-y-2">
              {jobs.slice(0, 5).map((j) => (
                <div key={j.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_CONFIG[j.status]?.variant || 'secondary'} className="gap-1">
                      {STATUS_CONFIG[j.status]?.icon}
                      {STATUS_CONFIG[j.status]?.label || j.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {j.songs_processed}/{j.total_songs}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-600 font-medium">
                      Score: {Math.round(j.avg_quality_score)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(j.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
