/**
 * CorpusProgressCard - Card de progresso por corpus
 * Sprint AUD-P1
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rocket, Loader2, CheckCircle, AlertCircle, Pause } from 'lucide-react';
import type { CorpusEnrichmentStats } from '@/hooks/useGlobalEnrichmentStats';

interface CorpusProgressCardProps {
  corpus: CorpusEnrichmentStats;
  onStartJob: (corpusId: string, corpusType: string) => void;
  isStarting: boolean;
}

export function CorpusProgressCard({ corpus, onStartJob, isStarting }: CorpusProgressCardProps) {
  const isComplete = corpus.progress >= 100;
  const hasErrors = corpus.errorSongs > 0;
  
  return (
    <Card 
      className="relative overflow-hidden"
      style={{ borderTopColor: corpus.color, borderTopWidth: '3px' }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{corpus.corpusName}</h4>
            {corpus.hasActiveJob && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processando
              </Badge>
            )}
            {isComplete && !corpus.hasActiveJob && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completo
              </Badge>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{corpus.enrichedSongs.toLocaleString()} enriquecidas</span>
            <span className="font-medium">{corpus.progress.toFixed(1)}%</span>
          </div>
          <Progress 
            value={corpus.progress} 
            className="h-2"
          />
        </div>
        
        {/* Stats row */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            {corpus.pendingSongs.toLocaleString()} pendentes
          </span>
          {hasErrors && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {corpus.errorSongs} erros
            </span>
          )}
        </div>
        
        {/* Action button */}
        {!isComplete && !corpus.hasActiveJob && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onStartJob(corpus.corpusId, corpus.corpusType)}
            disabled={isStarting}
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Processar Pendentes
          </Button>
        )}
        
        {corpus.hasActiveJob && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled
          >
            <Pause className="h-4 w-4 mr-2" />
            Em andamento...
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
