/**
 * EnrichmentMetricsBar - Barra de métricas em tempo real
 * Sprint AUD-P1
 */

import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Zap, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EnrichmentMetricsBarProps {
  processingRate: number;
  formattedEta: string | null;
  lastUpdateAt: Date | null;
  isProcessing: boolean;
  pendingSongs: number;
}

export function EnrichmentMetricsBar({
  processingRate,
  formattedEta,
  lastUpdateAt,
  isProcessing,
  pendingSongs,
}: EnrichmentMetricsBarProps) {
  const isAlive = lastUpdateAt 
    ? new Date().getTime() - lastUpdateAt.getTime() < 2 * 60 * 1000
    : false;
  
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
      {/* Taxa de processamento */}
      <div className="flex items-center gap-2">
        <Zap className={`h-4 w-4 ${isProcessing ? 'text-amber-500' : 'text-muted-foreground'}`} />
        <span className="text-muted-foreground">Taxa:</span>
        <span className="font-medium">
          {processingRate > 0 ? `${processingRate.toFixed(1)}/min` : '—'}
        </span>
      </div>
      
      {/* ETA */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">ETA:</span>
        <span className="font-medium">
          {formattedEta || (pendingSongs > 0 ? 'Calculando...' : 'Completo')}
        </span>
      </div>
      
      {/* Heartbeat */}
      <div className="flex items-center gap-2 ml-auto">
        {isProcessing && (
          <Badge 
            variant={isAlive ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            <Activity className={`h-3 w-3 ${isAlive ? 'animate-pulse' : ''}`} />
            {isAlive ? 'Ativo' : 'Inativo'}
          </Badge>
        )}
        
        {lastUpdateAt && (
          <span className="text-xs text-muted-foreground">
            Última atualização: {formatDistanceToNow(lastUpdateAt, { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
        )}
      </div>
      
      {/* Warning se backlog grande */}
      {pendingSongs > 50000 && !isProcessing && (
        <div className="flex items-center gap-1 text-amber-600 text-xs w-full mt-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Backlog elevado: {pendingSongs.toLocaleString()} músicas aguardando processamento</span>
        </div>
      )}
    </div>
  );
}
