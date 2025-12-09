/**
 * ProcessingJobCard
 * Sprint AUD-C1: UI for in-progress annotation job
 * Sprint AUD-U: Enhanced ETA display with visual indicators
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Clock, Zap } from "lucide-react";
import { useProgressWithETA } from "@/hooks/useProgressWithETA";

interface ProcessingJobCardProps {
  job: {
    id: string;
    artist_name: string;
    status: string;
    chunks_processed: number;
    processed_words: number;
    total_words: number;
    new_words: number;
    cached_words: number;
    tempo_inicio?: string | null;
  };
  progress: number;
  eta?: string;
  wordsPerSecond?: number;
  onCancel: () => void;
}

export function ProcessingJobCard({
  job,
  progress,
  eta: etaProp,
  wordsPerSecond: wpsFromProp,
  onCancel,
}: ProcessingJobCardProps) {
  // Calcular ETA automaticamente se não fornecido
  const calculatedEta = useProgressWithETA(progress, job.tempo_inicio, job.processed_words);
  
  // Usar props se fornecidos, senão usar calculados
  const displayEta = etaProp || calculatedEta?.remainingFormatted;
  const displayWps = wpsFromProp ?? calculatedEta?.wordsPerSecond;
  
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div className="flex-1">
            <CardTitle className="text-lg">Processando Anotação Semântica</CardTitle>
            <CardDescription className="mt-1">
              {job.artist_name} - Chunk {job.chunks_processed} • {job.status === 'iniciado' ? 'Iniciando...' : 'Processando em auto-invocação'}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {job.processed_words.toLocaleString()} / {job.total_words.toLocaleString()}
          </Badge>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onCancel}
          >
            ⏹️ Interromper
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{job.new_words.toLocaleString()} novas</span>
              <span className="text-muted-foreground/60">•</span>
              <span>{job.cached_words.toLocaleString()} em cache</span>
              {displayWps && displayWps > 0 && (
                <>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {displayWps.toFixed(1)} palavras/s
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{progress.toFixed(1)}%</span>
              {displayEta && (
                <>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-primary font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {displayEta}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
