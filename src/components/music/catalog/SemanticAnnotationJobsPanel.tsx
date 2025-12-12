/**
 * SemanticAnnotationJobsPanel - Painel de gerenciamento de jobs de anotação semântica
 * 
 * Integra AnnotationJobsTable existente com controles e estatísticas
 * Exibe tanto jobs de corpus (corpus_annotation_jobs) quanto jobs de artista (semantic_annotation_jobs)
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Play, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Pause,
  Clock,
  XCircle,
  AlertTriangle,
  Database
} from 'lucide-react';
import { useSemanticAnnotationStats } from '@/hooks/useSemanticAnnotationStats';
import { useCorpusAnnotationJobs } from '@/hooks/useCorpusAnnotationJobs';
import { AnnotationJobsTable } from '@/components/admin/AnnotationJobsTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SemanticAnnotationJobsPanelProps {
  isActive?: boolean;
}

export function SemanticAnnotationJobsPanel({ isActive = true }: SemanticAnnotationJobsPanelProps) {
  const [selectedCorpus, setSelectedCorpus] = useState<string>('gaucho');
  const [isStartingAnnotation, setIsStartingAnnotation] = useState(false);

  const { 
    stats, 
    isLoading, 
    isRefetching,
    refetch,
    lastUpdated 
  } = useSemanticAnnotationStats({ 
    enabled: isActive,
    refetchInterval: 5000
  });

  const {
    jobs: corpusJobs,
    activeJobs: activeCorpusJobs,
    isLoading: isLoadingCorpusJobs,
    refetch: refetchCorpusJobs,
    cancelJob: cancelCorpusJob,
    isStuck
  } = useCorpusAnnotationJobs();

  const handleRefresh = () => {
    refetch();
    refetchCorpusJobs();
  };

  const handleStartCorpusAnnotation = async () => {
    setIsStartingAnnotation(true);
    const toastId = toast.loading(`Iniciando anotação do corpus ${selectedCorpus}...`);

    try {
      const { data, error } = await supabase.functions.invoke('annotate-corpus', {
        body: { 
          corpusName: selectedCorpus
        }
      });

      if (error) {
        // Tentar extrair JSON do erro 409
        const errorContext = error.context as { body?: string } | undefined;
        if (errorContext?.body) {
          try {
            const parsed = JSON.parse(errorContext.body);
            if (parsed.existingJobId) {
              toast.info(`Já existe um job ativo para ${selectedCorpus}. Aguarde a conclusão ou cancele-o.`, { id: toastId });
              handleRefresh();
              return;
            }
          } catch {
            // Não é JSON, continuar com erro padrão
          }
        }
        throw error;
      }

      toast.success(`Anotação do corpus ${selectedCorpus} iniciada!`, { id: toastId });
      handleRefresh();
    } catch (error: any) {
      console.error('Error starting corpus annotation:', error);
      toast.error(error.message || 'Erro ao iniciar anotação', { id: toastId });
    } finally {
      setIsStartingAnnotation(false);
    }
  };

  const handleCancelCorpusJob = async (jobId: string) => {
    const success = await cancelCorpusJob(jobId);
    if (success) {
      refetch(); // Também atualizar stats gerais
    }
  };

  // IDs de jobs de artista vinculados a corpus jobs ativos (evitar duplicação)
  const artistJobIdsInCorpus = useMemo(() => {
    return new Set(
      activeCorpusJobs
        .filter(cj => cj.current_artist_job_id)
        .map(cj => cj.current_artist_job_id)
    );
  }, [activeCorpusJobs]);

  // Transform jobs para formato esperado, FILTRANDO duplicatas de corpus jobs
  const transformedJobs = useMemo(() => {
    return stats.activeJobs
      .filter(job => !artistJobIdsInCorpus.has(job.id))
      .map(job => ({
        id: job.id,
        artist_name: job.artist_name,
        status: job.status,
        processed_words: job.processed_words,
        total_words: job.total_words,
        progress: job.progress,
        tempo_inicio: job.tempo_inicio,
        tempo_fim: job.tempo_fim,
        erro_mensagem: job.erro_mensagem,
        last_chunk_at: job.last_chunk_at,
        chunks_processed: job.chunks_processed,
        current_song_index: job.current_song_index,
        current_word_index: job.current_word_index
      }));
  }, [stats.activeJobs, artistJobIdsInCorpus]);

  // Progresso global baseado em PALAVRAS quando há corpus job, senão jobs
  const globalProgress = useMemo(() => {
    if (activeCorpusJobs.length > 0) {
      const corpusJob = activeCorpusJobs[0];
      if (corpusJob.total_words_estimated && corpusJob.total_words_estimated > 0) {
        return Math.round((corpusJob.processed_words / corpusJob.total_words_estimated) * 100);
      }
    }
    if (stats.totalJobs === 0) return 0;
    return Math.round((stats.completed / stats.totalJobs) * 100);
  }, [stats, activeCorpusJobs]);

  const getStatusBadge = (status: string, stuck: boolean) => {
    if (stuck) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Travado</Badge>;
    }
    switch (status) {
      case 'processando':
        return <Badge variant="default" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processando</Badge>;
      case 'pausado':
        return <Badge variant="secondary" className="gap-1"><Pause className="h-3 w-3" /> Pausado</Badge>;
      case 'concluido':
        return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Cancelado</Badge>;
      case 'erro':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Jobs de Anotação Semântica</h3>
          <Badge variant="outline" className="text-xs">
            sync: {lastUpdated.toLocaleTimeString('pt-BR')}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching || isLoadingCorpusJobs}
          >
            {isRefetching || isLoadingCorpusJobs ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Jobs de Corpus Ativos */}
      {activeCorpusJobs.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Jobs de Corpus Ativos
              <Badge variant="default">{activeCorpusJobs.length}</Badge>
            </CardTitle>
            <CardDescription>
              Jobs processando corpus completo (todos artistas)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeCorpusJobs.map(job => {
              const stuck = isStuck(job);
              const artistProgress = job.total_artists > 0 
                ? Math.round((job.processed_artists / job.total_artists) * 100) 
                : 0;
              
              return (
                <div key={job.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{job.corpus_name}</span>
                      {getStatusBadge(job.status, stuck)}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelCorpusJob(job.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>

                  {stuck && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                      <AlertTriangle className="h-4 w-4" />
                      Job travado há mais de 30 minutos sem progresso. Cancele e reinicie.
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Artistas</span>
                      <span>{job.processed_artists || 0} / {job.total_artists || 0}</span>
                    </div>
                    <Progress value={artistProgress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Músicas:</span>{' '}
                      <span className="font-medium">{job.processed_songs?.toLocaleString() || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Palavras:</span>{' '}
                      <span className="font-medium">{job.processed_words?.toLocaleString() || 0}</span>
                    </div>
                    {job.current_artist_name && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Artista atual:</span>{' '}
                        <span className="font-medium">{job.current_artist_name}</span>
                      </div>
                    )}
                  </div>

                  {job.erro_mensagem && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {job.erro_mensagem}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="col-span-2">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {activeCorpusJobs.length > 0 ? 'Progresso do Corpus' : 'Jobs Concluídos'}
              </span>
              <span className="text-lg font-bold">{globalProgress}%</span>
            </div>
            <Progress value={globalProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {activeCorpusJobs.length > 0 
                ? `${activeCorpusJobs[0].processed_words?.toLocaleString() || 0} palavras processadas`
                : `${stats.completed.toLocaleString()} de ${stats.totalJobs.toLocaleString()} jobs`
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-2xl font-bold">{stats.processing}</span>
            </div>
            <p className="text-xs text-muted-foreground">Processando</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Pause className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold">{stats.paused}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pausados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold">{stats.failed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      {/* Card de Palavras Anotadas */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Palavras Anotadas (Total)</p>
              <p className="text-2xl font-bold">{stats.totalWordsAnnotated.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Palavras Processadas (Todos Jobs)</p>
              <p className="text-2xl font-bold">{stats.totalWordsProcessed.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controle de Iniciar Anotação por Corpus */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Iniciar Anotação por Corpus</CardTitle>
          <CardDescription>
            Processa sequencialmente todos os artistas do corpus selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedCorpus} onValueChange={setSelectedCorpus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o corpus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaucho">🌾 Corpus Gaúcho</SelectItem>
                <SelectItem value="nordestino">🌵 Corpus Nordestino</SelectItem>
                <SelectItem value="sertanejo">🤠 Corpus Sertanejo</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleStartCorpusAnnotation}
              disabled={isStartingAnnotation || activeCorpusJobs.length > 0}
            >
              {isStartingAnnotation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Anotação
            </Button>

            {activeCorpusJobs.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {activeCorpusJobs.length} job(s) de corpus em andamento
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Jobs de Artista Ativos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : transformedJobs.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Jobs de Artista Ativos
              <Badge variant="default">{transformedJobs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnnotationJobsTable 
              jobs={transformedJobs} 
              onRefresh={handleRefresh} 
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Nenhum job de artista ativo no momento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
