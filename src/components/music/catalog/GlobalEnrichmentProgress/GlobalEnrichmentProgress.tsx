/**
 * GlobalEnrichmentProgress - Dashboard de progresso global de enriquecimento
 * Sprint AUD-P1
 */

import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, Music } from 'lucide-react';
import { useGlobalEnrichmentStats } from '@/hooks/useGlobalEnrichmentStats';
import { useEnrichmentJobsContext } from '@/contexts/EnrichmentJobsContext';
import { CorpusProgressCard } from './CorpusProgressCard';
import { EnrichmentMetricsBar } from './EnrichmentMetricsBar';
import { ProcessingControls } from './ProcessingControls';

interface GlobalEnrichmentProgressProps {
  showDetails?: boolean;
}

export function GlobalEnrichmentProgress({ showDetails = true }: GlobalEnrichmentProgressProps) {
  const [startingCorpusId, setStartingCorpusId] = useState<string | null>(null);
  
  const stats = useGlobalEnrichmentStats();
  const { activeJobs } = useEnrichmentJobsContext();
  
  const processingJob = activeJobs.find(j => j.status === 'processando');
  
  const handleStartCorpusJob = async (corpusId: string, corpusType: string) => {
    setStartingCorpusId(corpusId);
    try {
      await stats.startCorpusJob(corpusId, corpusType);
    } finally {
      setStartingCorpusId(null);
    }
  };
  
  if (stats.isLoading) {
    return <GlobalEnrichmentProgressSkeleton />;
  }
  
  return (
    <div className="space-y-4">
      {/* Header com progresso global */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-medium">Progresso Global</span>
            <Badge variant="outline" className="ml-2">
              {stats.enrichedSongs.toLocaleString()} / {stats.totalSongs.toLocaleString()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">
              {stats.globalProgress.toFixed(1)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={stats.refetch}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Progress value={stats.globalProgress} className="h-3" />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{stats.pendingSongs.toLocaleString()} pendentes</span>
          {stats.errorSongs > 0 && (
            <span className="text-destructive">{stats.errorSongs} com erro</span>
          )}
        </div>
      </div>
      
      {/* Métricas em tempo real */}
      <EnrichmentMetricsBar
        processingRate={stats.processingRate}
        formattedEta={stats.formattedEta}
        lastUpdateAt={stats.lastUpdateAt}
        isProcessing={stats.isProcessing}
        pendingSongs={stats.pendingSongs}
      />
      
      {/* Controles de job ativo */}
      {processingJob && (
        <ProcessingControls activeJob={processingJob} />
      )}
      
      {/* Cards por corpus */}
      {showDetails && stats.corpora.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Progresso por Corpus</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.corpora.map(corpus => (
              <CorpusProgressCard
                key={corpus.corpusId}
                corpus={corpus}
                onStartJob={handleStartCorpusJob}
                isStarting={startingCorpusId === corpus.corpusId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GlobalEnrichmentProgressSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
