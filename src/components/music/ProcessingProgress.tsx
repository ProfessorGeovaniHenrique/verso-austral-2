import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Gauge, Music } from 'lucide-react';

type ProcessingStatus = 'idle' | 'processing' | 'paused' | 'completed' | 'error';

interface ProcessingProgressProps {
  current: number;
  total: number;
  startTime: Date;
  status: ProcessingStatus;
}

export function ProcessingProgress({ current, total, startTime, status }: ProcessingProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  const calculateETA = () => {
    if (status !== 'processing' || current === 0) return null;
    
    const elapsed = Date.now() - startTime.getTime();
    const avgTimePerItem = elapsed / current;
    const remaining = total - current;
    const etaMs = avgTimePerItem * remaining;
    
    return new Date(Date.now() + etaMs);
  };

  const calculateRate = () => {
    if (status !== 'processing' || current === 0) return 0;
    
    const elapsed = (Date.now() - startTime.getTime()) / 1000 / 60; // em minutos
    return Math.round(current / elapsed);
  };

  const eta = calculateETA();
  const rate = calculateRate();

  const getStatusColor = () => {
    switch (status) {
      case 'processing': return 'text-primary';
      case 'paused': return 'text-yellow-500';
      case 'completed': return 'text-green-500';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progresso</span>
              <span className={getStatusColor()}>{percentage}%</span>
            </div>
            <Progress value={percentage} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{current} de {total} músicas</span>
              <span>{total - current} restantes</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Processadas</span>
                <span className="text-lg font-semibold">{current}</span>
              </div>
            </div>

            {status === 'processing' && rate > 0 && (
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Taxa</span>
                  <span className="text-lg font-semibold">{rate}/min</span>
                </div>
              </div>
            )}

            {status === 'processing' && eta && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">ETA</span>
                  <span className="text-sm font-medium">
                    {formatDistanceToNow(eta, { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
