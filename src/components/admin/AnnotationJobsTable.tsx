import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Play, X, AlertTriangle, RefreshCw, Clock, Zap, Timer, RotateCcw, HelpCircle, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useJobAutoRefresh } from '@/hooks/useJobAutoRefresh';
import { useActionFeedback } from '@/hooks/useActionFeedback';
import { PIPELINE_METRIC_DEFINITIONS } from '@/lib/pipelineMetricDefinitions';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  artist_name: string;
  status: string;
  processed_words: number;
  total_words: number;
  progress: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  last_chunk_at: string | null;
  chunks_processed: number | null;
  current_song_index?: number | null;
  current_word_index?: number | null;
}

interface AnnotationJobsTableProps {
  jobs: Job[];
  onRefresh: () => void;
}

// Componente de tooltip inline para métricas
function MetricWithTooltip({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-sm cursor-help">
            {children}
            <HelpCircle className="h-3 w-3 text-muted-foreground opacity-60" aria-hidden="true" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-sm">
          <p className="font-medium mb-1">{label}</p>
          <p className="text-muted-foreground">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AnnotationJobsTable({ jobs, onRefresh }: AnnotationJobsTableProps) {
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const { showSuccess, isSuccess } = useActionFeedback({ duration: 2500 });
  const defs = PIPELINE_METRIC_DEFINITIONS.annotationJobs;

  const {
    timeToRefresh,
    isRefreshing,
    lastRefreshAt,
    autoResumeEnabled,
    toggleAutoResume,
    autoResumeAttempts,
    autoResumeStats,
    maxAutoResumeAttempts,
    resetAttempts,
    isJobStuck,
    getProcessingRate,
    getETASeconds,
    getElapsedSeconds
  } = useJobAutoRefresh(jobs, onRefresh, {
    refreshInterval: 30000,
    enableAutoResume: true,
    maxAutoResumeAttempts: 3,
    stuckThresholdMinutes: 5
  });

  const getMinutesSinceActivity = (job: Job): number | null => {
    if (!job.last_chunk_at) return null;
    const lastActivity = new Date(job.last_chunk_at).getTime();
    return Math.round((Date.now() - lastActivity) / (1000 * 60));
  };

  const handleCancel = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('semantic_annotation_jobs')
        .update({ 
          status: 'cancelado',
          tempo_fim: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Job cancelado com sucesso');
      onRefresh();
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Erro ao cancelar job');
    }
  };

  const handleResume = async (jobId: string) => {
    setResumingJobId(jobId);
    try {
      const { data: jobData, error: fetchError } = await supabase
        .from('semantic_annotation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError || !jobData) {
        throw new Error('Job não encontrado');
      }

      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      const { error: updateError } = await supabase
        .from('semantic_annotation_jobs')
        .update({ 
          status: 'processando',
          last_chunk_at: oneMinuteAgo,
          erro_mensagem: null
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      await supabase.functions.invoke('annotate-artist-songs', {
        body: { 
          jobId,
          continueFrom: {
            songIndex: jobData.current_song_index || 0,
            wordIndex: jobData.current_word_index || 0,
          }
        }
      });

      // Reset auto-resume attempts for this job
      resetAttempts(jobId);
      
      // Show visual feedback
      showSuccess(jobId);
      toast.success('Job retomado! Processamento reiniciado.');
      onRefresh();
    } catch (error) {
      console.error('Error resuming job:', error);
      toast.error('Erro ao retomar job');
    } finally {
      setResumingJobId(null);
    }
  };

  const getStatusBadge = (job: Job) => {
    const stuck = isJobStuck(job);
    
    if (stuck) {
      const attempts = autoResumeAttempts[job.id] || 0;
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          Travado {attempts > 0 && `(${attempts}/${maxAutoResumeAttempts})`}
        </Badge>
      );
    }

    const statusConfig = {
      processando: { label: '🔄 Processando', variant: 'default' as const },
      pausado: { label: '⏸️ Pausado', variant: 'secondary' as const },
      pendente: { label: '⏳ Pendente', variant: 'outline' as const },
      completo: { label: '✅ Completo', variant: 'default' as const },
      concluido: { label: '✅ Concluído', variant: 'default' as const },
      erro: { label: '❌ Erro', variant: 'destructive' as const },
      cancelado: { label: '🚫 Cancelado', variant: 'secondary' as const }
    };

    const config = statusConfig[job.status as keyof typeof statusConfig] || { label: job.status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatRate = (rate: number): string => {
    if (rate < 1) return `${(rate * 60).toFixed(1)}/min`;
    return `${rate.toFixed(2)}/s`;
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Última atualização: {lastRefreshAt.toLocaleTimeString('pt-BR')}
        </p>
        
        <div className="flex items-center gap-4">
          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${isRefreshing ? 'border-primary animate-pulse' : 'border-muted'}`}>
              <span className="text-xs font-mono">{timeToRefresh}</span>
            </div>
            <span className="text-muted-foreground text-xs">Auto-refresh</span>
          </div>
          
          {/* Auto-resume toggle with tooltip */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={autoResumeEnabled}
                    onCheckedChange={toggleAutoResume}
                    id="auto-resume"
                  />
                  <label htmlFor="auto-resume" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                    Auto-retomada
                    <HelpCircle className="h-3 w-3 opacity-60" aria-hidden="true" />
                  </label>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p>{defs.autoRetomada.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} aria-label="Atualizar lista de jobs">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Auto-resume stats */}
      {autoResumeStats.attemptsToday > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="text-muted-foreground">Retomadas hoje:</span>
              <span className="font-medium">{autoResumeStats.attemptsToday}</span>
            </span>
            <span className="text-green-600">✓ {autoResumeStats.successfulResumes}</span>
            <span className="text-red-600">✗ {autoResumeStats.failedResumes}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => resetAttempts()} aria-label="Limpar histórico de retomadas">
            Limpar histórico
          </Button>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum job ativo no momento
          </p>
        ) : (
          jobs.map(job => {
            const stuck = isJobStuck(job);
            const minutesSince = getMinutesSinceActivity(job);
            const isResuming = resumingJobId === job.id;
            const rate = getProcessingRate(job);
            const etaSeconds = getETASeconds(job);
            const elapsedSeconds = getElapsedSeconds(job);
            const attempts = autoResumeAttempts[job.id] || 0;
            const jobSuccess = isSuccess(job.id);

            return (
              <div 
                key={job.id} 
                className={cn(
                  "border rounded-lg p-4 space-y-3 transition-all duration-300",
                  stuck && 'border-destructive bg-destructive/5',
                  jobSuccess && 'ring-2 ring-green-500 bg-green-500/5 animate-in fade-in duration-300'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{job.artist_name}</h4>
                      {getStatusBadge(job)}
                      {jobSuccess && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 animate-in zoom-in duration-200">
                          <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                          Retomado
                        </Badge>
                      )}
                    </div>
                    
                    {/* Detailed metrics with tooltips */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      <MetricWithTooltip label={defs.tempo.label} tooltip={defs.tempo.tooltip}>
                        <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                        <span className="text-muted-foreground">Tempo:</span>
                        <span className="font-medium">{formatTime(elapsedSeconds)}</span>
                      </MetricWithTooltip>
                      
                      {rate > 0 && !stuck && (
                        <MetricWithTooltip label={defs.taxa.label} tooltip={defs.taxa.tooltip}>
                          <Zap className="h-3 w-3 text-yellow-500" aria-hidden="true" />
                          <span className="text-muted-foreground">Taxa:</span>
                          <span className="font-medium">{formatRate(rate)}</span>
                        </MetricWithTooltip>
                      )}
                      
                      {etaSeconds && !stuck && (
                        <MetricWithTooltip label={defs.eta.label} tooltip={defs.eta.tooltip}>
                          <Timer className="h-3 w-3 text-primary" aria-hidden="true" />
                          <span className="text-muted-foreground">ETA:</span>
                          <span className="font-medium">{formatTime(etaSeconds)}</span>
                        </MetricWithTooltip>
                      )}
                      
                      {job.chunks_processed !== null && (
                        <MetricWithTooltip label={defs.chunks.label} tooltip={defs.chunks.tooltip}>
                          <span className="text-muted-foreground">Chunks:</span>
                          <span className="font-medium">{job.chunks_processed}</span>
                        </MetricWithTooltip>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {job.processed_words.toLocaleString()} / {job.total_words.toLocaleString()} palavras
                      <span className="ml-2 text-xs">
                        ({job.total_words > 0 
                          ? ((job.processed_words / job.total_words) * 100).toFixed(1) 
                          : '0.0'}%)
                      </span>
                    </p>
                    
                    {stuck && minutesSince !== null && (
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-destructive font-medium">
                          ⚠️ Sem atividade há {minutesSince} minutos
                        </p>
                        {autoResumeEnabled && attempts < maxAutoResumeAttempts && (
                          <Badge variant="outline" className="text-xs">
                            🔄 Retomada automática em breve...
                          </Badge>
                        )}
                        {attempts >= maxAutoResumeAttempts && (
                          <Badge variant="destructive" className="text-xs">
                            ❌ Limite de tentativas atingido
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {(job.status === 'pausado' || stuck) && (
                      <Button
                        size="sm"
                        variant={stuck ? "default" : "outline"}
                        onClick={() => handleResume(job.id)}
                        disabled={isResuming}
                        className={cn(
                          stuck && "bg-primary hover:bg-primary/90",
                          jobSuccess && "bg-green-500 hover:bg-green-600"
                        )}
                        aria-label={`Retomar job de ${job.artist_name}`}
                      >
                        {isResuming ? (
                          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : jobSuccess ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Play className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="ml-1">{jobSuccess ? 'Retomado!' : 'Retomar'}</span>
                      </Button>
                    )}
                    
                    {(job.status === 'processando' || job.status === 'pausado') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancel(job.id)}
                        disabled={isResuming}
                        aria-label={`Cancelar job de ${job.artist_name}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                <Progress value={job.progress} className="h-2" />
                
                {job.erro_mensagem && (
                  <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                    {job.erro_mensagem}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
