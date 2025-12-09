/**
 * AnnotationProgressCard
 * Sprint AUD-C1: Progress display for user corpus annotation
 * Sprint AUD-U: Added ETA display
 * Sprint BUG-SEM-3: Enhanced chunk progress with speed metrics
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Clock, Zap, Layers } from "lucide-react";
import { useProgressWithETA } from "@/hooks/useProgressWithETA";

interface AnnotationProgressCardProps {
  step: 'idle' | 'pos' | 'semantic' | 'calculating';
  progress: number;
  message: string;
  startedAt?: Date | string | null;
  processedItems?: number;
  currentChunk?: number;
  totalChunks?: number;
}

export function AnnotationProgressCard({ 
  step, 
  progress, 
  message,
  startedAt,
  processedItems,
  currentChunk,
  totalChunks
}: AnnotationProgressCardProps) {
  const eta = useProgressWithETA(progress, startedAt, processedItems);
  
  if (step === 'idle') return null;
  
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
            <Progress value={progress} className="mt-2 h-2" />
          </div>
          <Badge variant="outline">{progress.toFixed(0)}%</Badge>
        </div>
        
        <div className="flex flex-wrap justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {step === 'pos' && 'Anotando classes gramaticais com IA...'}
            {step === 'semantic' && 'Classificando domínios semânticos...'}
            {step === 'calculating' && 'Finalizando cálculos de métricas...'}
          </p>
          
          <div className="flex items-center gap-3 text-xs">
            {/* Chunk progress for semantic annotation */}
            {step === 'semantic' && currentChunk && totalChunks && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Layers className="h-3 w-3" />
                <span>Chunk {currentChunk}/{totalChunks}</span>
              </div>
            )}
            
            {/* Speed metric */}
            {eta?.wordsPerSecond && eta.wordsPerSecond > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>{eta.wordsPerSecond.toFixed(1)} pal/s</span>
              </div>
            )}
            
            {/* ETA */}
            {eta && (
              <div className="flex items-center gap-1.5 text-primary">
                <Clock className="h-3 w-3" />
                <span>{eta.remainingFormatted}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
