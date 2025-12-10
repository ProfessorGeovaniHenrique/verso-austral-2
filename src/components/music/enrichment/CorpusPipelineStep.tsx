/**
 * Componente de etapa do pipeline de corpus
 * Sprint AUD-P3: Batch Execution
 */

import { Check, Loader2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { CorpusStatus } from '@/hooks/useEnrichmentOrchestration';

interface CorpusPipelineStepProps {
  corpus: CorpusStatus;
  index: number;
  isLast: boolean;
}

export function CorpusPipelineStep({ corpus, index, isLast }: CorpusPipelineStepProps) {
  const getStatusIcon = () => {
    if (corpus.isCompleted) {
      return <Check className="h-4 w-4 text-primary-foreground" />;
    }
    if (corpus.isActive) {
      return <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />;
    }
    if (corpus.songsFailed > 0 && corpus.songsProcessed > 0) {
      return <AlertCircle className="h-4 w-4 text-destructive-foreground" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = () => {
    if (corpus.isCompleted) return 'bg-primary';
    if (corpus.isActive) return 'bg-amber-500';
    if (corpus.songsFailed > 0) return 'bg-destructive';
    return 'bg-muted';
  };

  const progress = corpus.isActive && (corpus.songsProcessed + corpus.pendingCount) > 0
    ? Math.round((corpus.songsProcessed / (corpus.songsProcessed + corpus.pendingCount)) * 100)
    : corpus.isCompleted ? 100 : 0;

  return (
    <div className="flex items-start gap-3">
      {/* Indicador vertical */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
          getStatusColor()
        )}>
          {getStatusIcon()}
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 h-16 mt-2 transition-colors",
            corpus.isCompleted ? "bg-primary" : "bg-muted"
          )} />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 pb-8">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            "font-medium",
            corpus.isActive && "text-amber-600",
            corpus.isCompleted && "text-primary"
          )}>
            {corpus.name}
          </h4>
          <span className="text-xs text-muted-foreground">
            {corpus.isCompleted && "Concluído"}
            {corpus.isActive && "Processando..."}
            {!corpus.isCompleted && !corpus.isActive && "Pendente"}
          </span>
        </div>

        {/* Progress bar para corpus ativo */}
        {corpus.isActive && (
          <div className="mt-2 space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{corpus.songsProcessed.toLocaleString()} processadas</span>
              <span>{corpus.pendingCount.toLocaleString()} pendentes</span>
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          {corpus.isCompleted && (
            <>
              <span className="text-primary">
                ✓ {corpus.songsProcessed.toLocaleString()} processadas
              </span>
              {corpus.songsFailed > 0 && (
                <span className="text-destructive">
                  ✗ {corpus.songsFailed.toLocaleString()} falhas
                </span>
              )}
            </>
          )}
          {!corpus.isCompleted && !corpus.isActive && (
            <span>{corpus.pendingCount.toLocaleString()} músicas pendentes</span>
          )}
        </div>
      </div>
    </div>
  );
}
