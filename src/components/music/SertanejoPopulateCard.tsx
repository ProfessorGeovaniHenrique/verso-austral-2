/**
 * SertanejoPopulateCard - Card para popular Corpus Sertanejo
 * Sistema de jobs assíncronos com progresso real-time
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
  Guitar,
  Music,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Users,
  FileMusic,
  XCircle,
  Play,
  Clock,
  Wifi,
  RotateCcw,
  Pause,
} from 'lucide-react';
import { useSertanejoScrapingJob } from '@/hooks/useSertanejoScrapingJob';

interface SertanejoPopulateCardProps {
  onComplete?: () => void;
}

export function SertanejoPopulateCard({ onComplete }: SertanejoPopulateCardProps) {
  const [artistLimit, setArtistLimit] = useState<string>('30');
  const [songsPerArtist, setSongsPerArtist] = useState<string>('15');
  
  const { 
    activeJob, 
    lastCompletedJob,
    isLoading,
    isStarting,
    isResuming,
    progress, 
    isAbandoned,
    startJob, 
    pauseJob,
    cancelJob, 
    resumeJob,
    restartJob,
    isProcessing,
    isPaused,
    isCancelling,
  } = useSertanejoScrapingJob();

  const handleRestartJob = async () => {
    await restartJob(parseInt(artistLimit), parseInt(songsPerArtist));
  };

  const handleStart = async () => {
    await startJob(parseInt(artistLimit), parseInt(songsPerArtist));
    onComplete?.();
  };

  const job = activeJob || lastCompletedJob;
  const isCompleted = !activeJob && lastCompletedJob?.status === 'concluido';
  const hasActiveJob = !!activeJob;

  if (isLoading) {
    return (
      <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Guitar className="h-5 w-5 text-amber-600" />
          Corpus Sertanejo
          {isCompleted && <Badge variant="default" className="bg-green-500">Populado</Badge>}
          {isProcessing && <Badge variant="default" className="bg-blue-500 animate-pulse">Processando</Badge>}
          {isPaused && <Badge variant="outline" className="border-amber-500 text-amber-600">Pausado</Badge>}
        </CardTitle>
        <CardDescription>
          {isCompleted 
            ? 'O corpus foi populado com sucesso!' 
            : hasActiveJob 
              ? 'Scraping em andamento...'
              : 'Popular automaticamente com artistas sertanejo'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ============ FORMULÁRIO INICIAL ============ */}
        {!hasActiveJob && !isCompleted && (
          <>
            <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-muted-foreground">
                Popule automaticamente com os artistas mais acessados do gênero sertanejo 
                no <a 
                  href="https://www.letras.mus.br/mais-acessadas/sertanejo/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Letras.mus.br
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
                    <SelectItem value="15">15 artistas</SelectItem>
                    <SelectItem value="30">30 artistas</SelectItem>
                    <SelectItem value="45">45 artistas</SelectItem>
                    <SelectItem value="60">60 artistas</SelectItem>
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
                    <SelectItem value="10">10 músicas</SelectItem>
                    <SelectItem value="15">15 músicas</SelectItem>
                    <SelectItem value="20">20 músicas</SelectItem>
                    <SelectItem value="25">25 músicas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Estimativa: ~{parseInt(artistLimit) * parseInt(songsPerArtist)} músicas com letras
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
              Popular Corpus Sertanejo
            </Button>
          </>
        )}

        {/* ============ PROGRESSO EM TEMPO REAL ============ */}
        {hasActiveJob && (
          <div className="space-y-4">
            {/* Status e progresso */}
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
                <div className="font-bold text-amber-600 flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />
                  {activeJob.artists_processed}
                </div>
                <div className="text-xs text-muted-foreground">Artistas</div>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                <div className="font-bold text-amber-600 flex items-center justify-center gap-1">
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
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <Wifi className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Processamento automático ativo.</strong> Você pode fechar esta página - 
                o processo continua em segundo plano e será retomado automaticamente se houver interrupção.
              </AlertDescription>
            </Alert>

            {/* Alerta de abandonado */}
            {isAbandoned && (
              <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  Job parece estar pausado. Será retomado automaticamente em breve, ou clique para retomar agora.
                </AlertDescription>
              </Alert>
            )}

            {/* Botões de controle */}
            <div className="flex gap-2">
              {isProcessing && (
                <Button 
                  variant="secondary" 
                  onClick={pauseJob}
                  className="flex-1"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
              )}
              
              {isPaused && (
                <Button 
                  variant="default" 
                  onClick={resumeJob} 
                  className="flex-1"
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
                onClick={handleRestartJob}
                className="flex-1"
                disabled={isStarting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reiniciar do Zero
              </Button>
              
              {!isCancelling && (
                <Button 
                  variant="destructive" 
                  onClick={cancelJob}
                  className="flex-1"
                  disabled={isCancelling}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
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
                <div className="text-xl font-bold text-amber-600">
                  {lastCompletedJob.artists_processed}
                </div>
                <div className="text-xs text-muted-foreground">Artistas</div>
              </div>
              <div className="p-3 rounded bg-white/50 dark:bg-black/20">
                <div className="text-xl font-bold text-amber-600">
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

            {/* Botão para iniciar novo scraping */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.reload()}
            >
              <Music className="h-4 w-4 mr-2" />
              Iniciar Novo Scraping
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
