/**
 * ProcessingControls - Controles de jobs ativos
 * Sprint AUD-P1
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, X, Loader2, RefreshCw } from 'lucide-react';
import { useEnrichmentJobsContext } from '@/contexts/EnrichmentJobsContext';
import type { EnrichmentJob } from '@/hooks/useEnrichmentJob';

interface ProcessingControlsProps {
  activeJob: EnrichmentJob;
}

export function ProcessingControls({ activeJob }: ProcessingControlsProps) {
  const { pauseJob, resumeJob, cancelJob, actionLoading } = useEnrichmentJobsContext();
  
  const isActioning = actionLoading === activeJob.id;
  const progress = activeJob.total_songs > 0
    ? Math.round((activeJob.songs_processed / activeJob.total_songs) * 100)
    : 0;
  
  const isPaused = activeJob.status === 'pausado';
  const isProcessing = activeJob.status === 'processando';
  const isCancelling = activeJob.is_cancelling;
  
  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      {/* Header com info do job */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isPaused ? 'secondary' : 'default'}>
            {isPaused && <Pause className="h-3 w-3 mr-1" />}
            {isProcessing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {isCancelling && <X className="h-3 w-3 mr-1" />}
            {isCancelling ? 'Cancelando...' : isPaused ? 'Pausado' : 'Processando'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {activeJob.corpus_type || activeJob.scope}
          </span>
        </div>
        
        <span className="text-sm font-medium">
          {activeJob.songs_processed.toLocaleString()}/{activeJob.total_songs.toLocaleString()}
        </span>
      </div>
      
      {/* Barra de progresso */}
      <Progress value={progress} className="h-2" />
      
      {/* Stats rápidas */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="text-green-600">✓ {activeJob.songs_succeeded} OK</span>
        {activeJob.songs_failed > 0 && (
          <span className="text-destructive">✗ {activeJob.songs_failed} falhas</span>
        )}
      </div>
      
      {/* Botões de controle */}
      <div className="flex gap-2">
        {isProcessing && !isCancelling && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseJob(activeJob.id)}
            disabled={isActioning}
          >
            {isActioning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </>
            )}
          </Button>
        )}
        
        {isPaused && (
          <Button
            size="sm"
            variant="default"
            onClick={() => resumeJob(activeJob)}
            disabled={isActioning}
          >
            {isActioning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Retomar
              </>
            )}
          </Button>
        )}
        
        {!isCancelling && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => cancelJob(activeJob.id)}
            disabled={isActioning}
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        )}
        
        {isCancelling && (
          <Badge variant="outline" className="text-amber-600">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Aguardando cancelamento...
          </Badge>
        )}
      </div>
    </div>
  );
}
