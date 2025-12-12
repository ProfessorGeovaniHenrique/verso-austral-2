/**
 * BackpressureAlert - Alerta visual quando sistema está em backpressure
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { useBackpressureStatus } from '@/hooks/useBackpressureStatus';

interface BackpressureAlertProps {
  enabled?: boolean;
  compact?: boolean;
}

export function BackpressureAlert({ enabled = true, compact = false }: BackpressureAlertProps) {
  const { status, cooldownMinutesRemaining, isSystemHealthy, isLoading } = useBackpressureStatus(enabled);

  if (isLoading || !status) {
    return null;
  }

  // Sistema saudável - não mostrar nada ou mostrar badge compacto
  if (isSystemHealthy) {
    if (compact) {
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
          <CheckCircle2 className="h-3 w-3" />
          Sistema OK
        </Badge>
      );
    }
    return null;
  }

  // Sistema em backpressure ativo
  if (status.isActive && cooldownMinutesRemaining) {
    const progress = status.cooldownRemainingMs 
      ? Math.max(0, 100 - (status.cooldownRemainingMs / (5 * 60 * 1000)) * 100)
      : 0;

    if (compact) {
      return (
        <Badge variant="destructive" className="gap-1 animate-pulse">
          <Clock className="h-3 w-3" />
          Pausa: {cooldownMinutesRemaining}min
        </Badge>
      );
    }

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Sistema em Backpressure
          <Badge variant="outline" className="ml-2">
            {cooldownMinutesRemaining} min restantes
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm">
            <strong>Motivo:</strong> {status.triggerReason || 'Sobrecarga detectada'}
          </p>
          <p className="text-sm text-muted-foreground">
            Jobs pausados automaticamente para permitir recuperação do banco de dados.
            Retomada automática após cooldown.
          </p>
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Recuperação em progresso...
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Sistema em modo degradado
  if (status.status === 'degraded') {
    if (compact) {
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 border-amber-300">
          <Activity className="h-3 w-3" />
          Lento ({status.metrics.dbLatencyMs}ms)
        </Badge>
      );
    }

    return (
      <Alert className="mb-4 border-amber-300 bg-amber-50">
        <Activity className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700">Sistema em Modo Degradado</AlertTitle>
        <AlertDescription className="text-amber-600">
          <p className="text-sm">
            Latência do banco: <strong>{status.metrics.dbLatencyMs}ms</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Processamento reduzido para evitar sobrecarga. Jobs continuam em velocidade reduzida.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Sistema unhealthy mas sem cooldown ativo
  if (status.status === 'unhealthy') {
    if (compact) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Instável
        </Badge>
      );
    }

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sistema Instável</AlertTitle>
        <AlertDescription>
          <p className="text-sm">
            Taxa de erros: <strong>{status.metrics.errorRate}%</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            O sistema pode entrar em backpressure automaticamente se a situação persistir.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
