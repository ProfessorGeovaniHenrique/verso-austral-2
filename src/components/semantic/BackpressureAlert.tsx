/**
 * BackpressureAlert - Alerta visual quando sistema está em backpressure
 * SPRINT BP-2: Inclui contador de jobs ativos e alertas proativos
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Clock, Activity, CheckCircle2, Users, Gauge } from 'lucide-react';
import { useBackpressureStatus, type ConcurrencyLevel } from '@/hooks/useBackpressureStatus';

interface BackpressureAlertProps {
  enabled?: boolean;
  compact?: boolean;
  showJobCounter?: boolean;
}

const COOLDOWN_DURATIONS = {
  degraded: 3 * 60 * 1000,
  unhealthy: 10 * 60 * 1000,
  critical: 30 * 60 * 1000,
};

function getConcurrencyColor(level: ConcurrencyLevel): string {
  switch (level) {
    case 'NORMAL': return 'text-green-600 border-green-300 bg-green-50';
    case 'ELEVATED': return 'text-amber-600 border-amber-300 bg-amber-50';
    case 'HIGH': return 'text-orange-600 border-orange-300 bg-orange-50';
    case 'CRITICAL': return 'text-red-600 border-red-300 bg-red-50';
    default: return 'text-muted-foreground';
  }
}

function getConcurrencyLabel(level: ConcurrencyLevel): string {
  switch (level) {
    case 'NORMAL': return 'Normal';
    case 'ELEVATED': return 'Elevado';
    case 'HIGH': return 'Alto';
    case 'CRITICAL': return 'Crítico';
    default: return level;
  }
}

export function BackpressureAlert({ 
  enabled = true, 
  compact = false,
  showJobCounter = true 
}: BackpressureAlertProps) {
  const { 
    status, 
    cooldownMinutesRemaining, 
    isSystemHealthy, 
    isLoading,
    activeJobCount,
    maxConcurrentJobs,
    concurrencyLevel,
    canStartNewJob,
  } = useBackpressureStatus(enabled);

  if (isLoading || !status) {
    return null;
  }

  // Renderizar contador de jobs (sempre visível se showJobCounter = true)
  const JobCounter = () => {
    if (!showJobCounter) return null;
    
    const colorClass = getConcurrencyColor(concurrencyLevel);
    const percentage = (activeJobCount / maxConcurrentJobs) * 100;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${colorClass}`}>
              <Users className="h-3 w-3" />
              <span>{activeJobCount}/{maxConcurrentJobs}</span>
              <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-current transition-all duration-300" 
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">Jobs Ativos: {activeJobCount}/{maxConcurrentJobs}</p>
              <p className="text-xs text-muted-foreground">
                Nível de concorrência: {getConcurrencyLabel(concurrencyLevel)}
              </p>
              {!canStartNewJob && (
                <p className="text-xs text-destructive">
                  ⛔ Sistema não aceita novos jobs agora
                </p>
              )}
              {concurrencyLevel !== 'NORMAL' && (
                <p className="text-xs text-muted-foreground">
                  Delay aplicado: {status.concurrency?.delayMultiplier || 1}x
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Sistema saudável - mostrar badge compacto com contador
  if (isSystemHealthy) {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
            <CheckCircle2 className="h-3 w-3" />
            Sistema OK
          </Badge>
          <JobCounter />
        </div>
      );
    }
    return <JobCounter />;
  }

  // Sistema em backpressure ativo
  if (status.isActive && cooldownMinutesRemaining) {
    const cooldownDuration = status.cooldownLevel 
      ? COOLDOWN_DURATIONS[status.cooldownLevel] 
      : 5 * 60 * 1000;
    const progress = status.cooldownRemainingMs 
      ? Math.max(0, 100 - (status.cooldownRemainingMs / cooldownDuration) * 100)
      : 0;

    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <Clock className="h-3 w-3" />
            Pausa ({status.cooldownLevel}): {cooldownMinutesRemaining}min
          </Badge>
          <JobCounter />
        </div>
      );
    }

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Sistema em Backpressure
          <Badge variant="outline" className="ml-2">
            {status.cooldownLevel?.toUpperCase()} - {cooldownMinutesRemaining} min restantes
          </Badge>
          <JobCounter />
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm">
            <strong>Motivo:</strong> {status.triggerReason || 'Sobrecarga detectada'}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Latência DB:</span>{' '}
              <strong>{status.metrics.dbLatencyMs}ms</strong> (média: {status.metrics.dbLatencyAvg}ms)
            </div>
            <div>
              <span className="text-muted-foreground">Taxa de erros:</span>{' '}
              <strong>{status.metrics.errorRate}%</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Requests (1h):</span>{' '}
              <strong>{status.metrics.requestCount1h}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Erros (1h):</span>{' '}
              <strong>{status.metrics.errorCount1h}</strong>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Jobs pausados automaticamente para permitir recuperação do banco de dados.
            Retomada automática após cooldown.
          </p>
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Recuperação em progresso... ({Math.round(progress)}%)
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 border-amber-300">
            <Gauge className="h-3 w-3" />
            Degradado ({status.metrics.dbLatencyMs}ms)
          </Badge>
          <JobCounter />
        </div>
      );
    }

    return (
      <Alert className="mb-4 border-amber-300 bg-amber-50">
        <Activity className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700 flex items-center gap-2">
          Sistema em Modo Degradado
          <JobCounter />
        </AlertTitle>
        <AlertDescription className="text-amber-600">
          <p className="text-sm">
            Latência do banco: <strong>{status.metrics.dbLatencyMs}ms</strong> (média: {status.metrics.dbLatencyAvg}ms)
          </p>
          <p className="text-sm text-muted-foreground">
            Processamento reduzido para evitar sobrecarga. Jobs continuam em velocidade reduzida 
            ({status.concurrency?.delayMultiplier || 2}x delay).
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Sistema crítico
  if (status.status === 'critical') {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            CRÍTICO
          </Badge>
          <JobCounter />
        </div>
      );
    }

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Sistema em Estado Crítico
          <JobCounter />
        </AlertTitle>
        <AlertDescription>
          <p className="text-sm">
            <strong>Jobs ativos:</strong> {activeJobCount} | 
            <strong> Latência:</strong> {status.metrics.dbLatencyMs}ms |
            <strong> Taxa de erros:</strong> {status.metrics.errorRate}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            O sistema está em estado crítico. Todos os novos jobs estão bloqueados.
            Use o Kill Switch de emergência se necessário.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Sistema unhealthy mas sem cooldown ativo
  if (status.status === 'unhealthy') {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Instável
          </Badge>
          <JobCounter />
        </div>
      );
    }

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Sistema Instável
          <JobCounter />
        </AlertTitle>
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

  // Apenas mostrar contador se nenhuma condição acima
  return <JobCounter />;
}
