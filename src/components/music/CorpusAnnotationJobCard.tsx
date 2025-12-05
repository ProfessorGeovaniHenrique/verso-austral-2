/**
 * Card para iniciar/monitorar anotação semântica de corpus inteiro
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Play, Pause, Square, Clock, Users, Music, RefreshCw } from 'lucide-react';
import { useCorpusAnnotationJob } from '@/hooks/useCorpusAnnotationJob';
import { supabase } from '@/integrations/supabase/client';

interface CorpusAnnotationJobCardProps {
  corpusId: string;
  corpusName: string;
}

export function CorpusAnnotationJobCard({ corpusId, corpusName }: CorpusAnnotationJobCardProps) {
  const {
    job,
    artistJobProgress,
    isLoading,
    progress,
    eta,
    startCorpusJob,
    pauseJob,
    resumeJob,
    cancelJob,
  } = useCorpusAnnotationJob(corpusId);

  const [coverage, setCoverage] = useState<{ annotated: number; total: number } | null>(null);

  // Buscar cobertura atual
  useEffect(() => {
    async function fetchCoverage() {
      // Contar músicas com anotações
      const { count: annotatedCount } = await supabase
        .from('semantic_disambiguation_cache')
        .select('song_id', { count: 'exact', head: true })
        .not('song_id', 'is', null);

      // Contar total de músicas do corpus com letra
      const { data: artists } = await supabase
        .from('artists')
        .select('id')
        .eq('corpus_id', corpusId);

      if (artists && artists.length > 0) {
        const { count: totalCount } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .in('artist_id', artists.map(a => a.id))
          .not('lyrics', 'is', null);

        setCoverage({
          annotated: annotatedCount || 0,
          total: totalCount || 0,
        });
      }
    }

    fetchCoverage();
  }, [corpusId, job?.processed_songs]);

  const getStatusBadge = () => {
    if (!job) return null;

    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pendente: { label: 'Pendente', variant: 'secondary' },
      processando: { label: 'Processando', variant: 'default' },
      pausado: { label: 'Pausado', variant: 'outline' },
      concluido: { label: 'Concluído', variant: 'secondary' },
      erro: { label: 'Erro', variant: 'destructive' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
    };

    const config = statusConfig[job.status] || { label: job.status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isActive = job && ['processando', 'pausado', 'pendente'].includes(job.status);

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Anotação Semântica do Corpus
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cobertura atual */}
        {coverage && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cobertura atual:</span>
            <span className="font-medium">
              {coverage.total > 0
                ? `${((coverage.annotated / coverage.total) * 100).toFixed(1)}%`
                : '0%'}
              <span className="text-muted-foreground ml-1">
                ({coverage.annotated.toLocaleString()}/{coverage.total.toLocaleString()} músicas)
              </span>
            </span>
          </div>
        )}

        {/* Botão iniciar ou controles do job ativo */}
        {!isActive ? (
          <Button
            onClick={() => startCorpusJob(corpusId)}
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Anotar Corpus {corpusName} Inteiro
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Progresso por artistas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Artistas
                </span>
                <span>
                  {job.processed_artists}/{job.total_artists} ({progress.artistsPercent}%)
                </span>
              </div>
              <Progress value={progress.artistsPercent} className="h-2" />
            </div>

            {/* Progresso por músicas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  Músicas
                </span>
                <span>
                  {job.processed_songs.toLocaleString()}/{job.total_songs.toLocaleString()}
                </span>
              </div>
              <Progress value={progress.songsPercent} className="h-2" />
            </div>

            {/* Artista atual */}
            {job.current_artist_name && job.status === 'processando' && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">🎤 {job.current_artist_name}</span>
                  {artistJobProgress && (
                    <span className="text-xs text-muted-foreground">
                      {artistJobProgress.processed_words.toLocaleString()}/
                      {artistJobProgress.total_words.toLocaleString()} palavras
                    </span>
                  )}
                </div>
                {artistJobProgress && artistJobProgress.total_words > 0 && (
                  <Progress
                    value={(artistJobProgress.processed_words / artistJobProgress.total_words) * 100}
                    className="h-1.5"
                  />
                )}
              </div>
            )}

            {/* ETA */}
            {eta && job.status === 'processando' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Tempo estimado: ~{eta}</span>
              </div>
            )}

            {/* Erro */}
            {job.erro_mensagem && (
              <div className="p-2 bg-destructive/10 text-destructive text-sm rounded">
                {job.erro_mensagem}
              </div>
            )}

            {/* Controles */}
            <div className="flex gap-2">
              {job.status === 'processando' && (
                <Button variant="outline" size="sm" onClick={pauseJob} className="flex-1">
                  <Pause className="h-4 w-4 mr-1" />
                  Pausar
                </Button>
              )}
              {job.status === 'pausado' && (
                <Button variant="outline" size="sm" onClick={resumeJob} className="flex-1">
                  <Play className="h-4 w-4 mr-1" />
                  Retomar
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={cancelJob}
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
