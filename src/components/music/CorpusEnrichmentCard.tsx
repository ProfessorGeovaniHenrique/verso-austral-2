/**
 * CorpusEnrichmentCard - Card genérico para enriquecer corpus
 * Suporta múltiplos corpus types com configuração customizada
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Users,
  FileMusic,
  XCircle,
  Play,
  Pause,
  Clock,
  Wifi,
  RotateCcw,
  Music,
  LucideIcon,
} from 'lucide-react';
import { useCorpusScrapingJob, CorpusType } from '@/hooks/useCorpusScrapingJob';
import { cn } from '@/lib/utils';

interface CorpusEnrichmentCardProps {
  corpusType: CorpusType;
  title: string;
  description: string;
  icon: LucideIcon;
  colorScheme: 'emerald' | 'amber' | 'blue' | 'purple';
  sourceUrl: string;
  sourceName: string;
  defaultArtistLimit?: number;
  defaultSongsPerArtist?: number;
  artistLimitOptions?: number[];
  songsPerArtistOptions?: number[];
  onComplete?: () => void;
}

const colorClasses = {
  emerald: {
    card: 'border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-500',
    metric: 'text-emerald-600',
    alert: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
    alertText: 'text-emerald-800 dark:text-emerald-200',
  },
  amber: {
    card: 'border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    icon: 'text-amber-600',
    badge: 'bg-amber-500',
    metric: 'text-amber-600',
    alert: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    alertText: 'text-amber-800 dark:text-amber-200',
  },
  blue: {
    card: 'border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
    icon: 'text-blue-600',
    badge: 'bg-blue-500',
    metric: 'text-blue-600',
    alert: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    alertText: 'text-blue-800 dark:text-blue-200',
  },
  purple: {
    card: 'border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20',
    icon: 'text-purple-600',
    badge: 'bg-purple-500',
    metric: 'text-purple-600',
    alert: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
    alertText: 'text-purple-800 dark:text-purple-200',
  },
};

export function CorpusEnrichmentCard({
  corpusType,
  title,
  description,
  icon: Icon,
  colorScheme,
  sourceUrl,
  sourceName,
  defaultArtistLimit = 30,
  defaultSongsPerArtist = 15,
  artistLimitOptions = [15, 30, 50, 100],
  songsPerArtistOptions = [10, 15, 20, 25],
  onComplete,
}: CorpusEnrichmentCardProps) {
  const [artistLimit, setArtistLimit] = useState<string>(String(defaultArtistLimit));
  const [songsPerArtist, setSongsPerArtist] = useState<string>(String(defaultSongsPerArtist));
  
  const colors = colorClasses[colorScheme];
  
  const { 
    activeJob, 
    lastCompletedJob,
    isLoading,
    isStarting,
    isResuming,
    progress, 
    isAbandoned,
    isStuck,
    startJob, 
    pauseJob,
    cancelJob, 
    resumeJob,
    restartJob,
    isProcessing,
    isPaused,
    isCompleted,
    isCancelling,
    hasActiveJob,
  } = useCorpusScrapingJob(corpusType);

  const handleStart = async () => {
    await startJob(parseInt(artistLimit), parseInt(songsPerArtist));
    onComplete?.();
  };

  const handleRestart = async () => {
    await restartJob(parseInt(artistLimit), parseInt(songsPerArtist));
  };

  const job = activeJob || lastCompletedJob;

  if (isLoading) {
    return (
      <Card className={colors.card}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className={cn("h-6 w-6 animate-spin", colors.icon)} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={colors.card}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", colors.icon)} />
          {title}
          {isCompleted && <Badge variant="default" className="bg-green-500">Populado</Badge>}
          {isProcessing && <Badge variant="default" className={cn(colors.badge, "animate-pulse")}>Processando</Badge>}
          {isPaused && <Badge variant="outline" className={cn("border-current", colors.icon)}>Pausado</Badge>}
          {isStuck && <Badge variant="destructive">Travado</Badge>}
        </CardTitle>
        <CardDescription>
          {isCompleted 
            ? 'O corpus foi populado com sucesso!' 
            : hasActiveJob 
              ? 'Scraping em andamento...'
              : description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ============ FORMULÁRIO INICIAL ============ */}
        {!hasActiveJob && !isCompleted && (
          <>
            <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-current/20">
              <p className="text-sm text-muted-foreground">
                Popular com artistas de{' '}
                <a 
                  href={sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {sourceName}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Artistas a importar
                </label>
                <Select value={artistLimit} onValueChange={setArtistLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {artistLimitOptions.map(n => (
                      <SelectItem key={n} value={String(n)}>{n} artistas</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Músicas por artista
                </label>
                <Select value={songsPerArtist} onValueChange={setSongsPerArtist}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {songsPerArtistOptions.map(n => (
                      <SelectItem key={n} value={String(n)}>{n} músicas</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Estimativa: ~{parseInt(artistLimit) * parseInt(songsPerArtist)} músicas
            </div>

            <Button 
              className="w-full" 
              onClick={handleStart}
              disabled={isStarting}
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Music className="h-4 w-4 mr-2" />
              )}
              Popular {title}
            </Button>
          </>
        )}

        {/* ============ PROGRESSO EM TEMPO REAL ============ */}
        {hasActiveJob && activeJob && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Artista {activeJob.current_artist_index} de {activeJob.total_artists}
              </span>
              <Badge variant="outline" className="font-mono">
                Chunk {activeJob.chunks_processed || 0}
              </Badge>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            {/* Métricas */}
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                <div className={cn("font-bold flex items-center justify-center gap-1", colors.metric)}>
                  <Users className="h-3 w-3" />
                  {activeJob.artists_processed}
                </div>
                <div className="text-xs text-muted-foreground">Artistas</div>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                <div className={cn("font-bold flex items-center justify-center gap-1", colors.metric)}>
                  <Music className="h-3 w-3" />
                  {activeJob.songs_created}
                </div>
                <div className="text-xs text-muted-foreground">Músicas</div>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                <div className="font-bold text-green-600 flex items-center justify-center gap-1">
                  <FileMusic className="h-3 w-3" />
                  {activeJob.songs_with_lyrics}
                </div>
                <div className="text-xs text-muted-foreground">Com Letras</div>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                <div className="font-bold text-gray-500 flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activeJob.artists_skipped}
                </div>
                <div className="text-xs text-muted-foreground">Pulados</div>
              </div>
            </div>

            {/* Alerta de background */}
            {isProcessing && !isStuck && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <Wifi className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Processamento automático ativo.</strong> Você pode fechar esta página.
                </AlertDescription>
              </Alert>
            )}

            {/* Alerta de travado/abandonado */}
            {(isAbandoned || isStuck) && (
              <Alert className={colors.alert}>
                <AlertCircle className={cn("h-4 w-4", colors.icon)} />
                <AlertDescription className={colors.alertText}>
                  {isStuck 
                    ? 'Job parece travado. Clique em Retomar para continuar.'
                    : 'Job pausado. Será retomado automaticamente ou clique para retomar agora.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Botões de controle */}
            <div className="flex gap-2 flex-wrap">
              {isProcessing && !isCancelling && (
                <Button variant="secondary" onClick={pauseJob} size="sm">
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
              )}
              
              {(isPaused || isStuck || isAbandoned) && (
                <Button 
                  variant="default" 
                  onClick={resumeJob} 
                  size="sm"
                  disabled={isResuming}
                >
                  {isResuming ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Retomar
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={handleRestart}
                size="sm"
                disabled={isStarting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reiniciar
              </Button>
              
              {!isCancelling && (
                <Button 
                  variant="destructive" 
                  onClick={cancelJob}
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
              
              {isCancelling && (
                <Badge variant="outline" className="self-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Cancelando...
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* ============ CONCLUÍDO ============ */}
        {isCompleted && lastCompletedJob && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="p-3 rounded bg-white/50 dark:bg-black/20">
                <div className={cn("text-xl font-bold", colors.metric)}>
                  {lastCompletedJob.artists_processed}
                </div>
                <div className="text-xs text-muted-foreground">Artistas</div>
              </div>
              <div className="p-3 rounded bg-white/50 dark:bg-black/20">
                <div className={cn("text-xl font-bold", colors.metric)}>
                  {lastCompletedJob.songs_created}
                </div>
                <div className="text-xs text-muted-foreground">Músicas</div>
              </div>
              <div className="p-3 rounded bg-white/50 dark:bg-black/20">
                <div className="text-xl font-bold text-green-600">
                  {lastCompletedJob.songs_with_lyrics}
                </div>
                <div className="text-xs text-muted-foreground">Com Letras</div>
              </div>
              <div className="p-3 rounded bg-white/50 dark:bg-black/20">
                <div className="text-xl font-bold text-gray-500">
                  {lastCompletedJob.artists_skipped}
                </div>
                <div className="text-xs text-muted-foreground">Pulados</div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Concluído em {new Date(lastCompletedJob.completed_at!).toLocaleString('pt-BR')}
            </p>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleRestart}
              disabled={isStarting}
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Iniciar Novo Scraping
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
