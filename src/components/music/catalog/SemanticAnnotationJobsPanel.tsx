/**
 * SemanticAnnotationJobsPanel - Painel de gerenciamento de jobs de anotação semântica
 * 
 * Integra AnnotationJobsTable existente com controles e estatísticas
 */

import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';
import { useSemanticAnnotationStats } from '@/hooks/useSemanticAnnotationStats';
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

  const handleStartCorpusAnnotation = async () => {
    setIsStartingAnnotation(true);
    const toastId = toast.loading(`Iniciando anotação do corpus ${selectedCorpus}...`);

    try {
      const { data, error } = await supabase.functions.invoke('annotate-corpus', {
        body: { 
          corpusType: selectedCorpus,
          action: 'start'
        }
      });

      if (error) throw error;

      toast.success(`Anotação do corpus ${selectedCorpus} iniciada!`, { id: toastId });
      refetch();
    } catch (error: any) {
      console.error('Error starting corpus annotation:', error);
      toast.error(error.message || 'Erro ao iniciar anotação', { id: toastId });
    } finally {
      setIsStartingAnnotation(false);
    }
  };

  // Transform jobs para formato esperado pelo AnnotationJobsTable
  const transformedJobs = stats.activeJobs.map(job => ({
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

  const globalProgress = stats.totalJobs > 0 
    ? Math.round((stats.completed / stats.totalJobs) * 100)
    : 0;

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
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="col-span-2">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progresso Global</span>
              <span className="text-lg font-bold">{globalProgress}%</span>
            </div>
            <Progress value={globalProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completed.toLocaleString()} de {stats.totalJobs.toLocaleString()} jobs
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
              disabled={isStartingAnnotation || stats.processing > 0}
            >
              {isStartingAnnotation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Anotação
            </Button>

            {stats.processing > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {stats.processing} job(s) em andamento
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Jobs Ativos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : transformedJobs.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Jobs Ativos
              <Badge variant="default">{transformedJobs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnnotationJobsTable 
              jobs={transformedJobs} 
              onRefresh={refetch} 
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Nenhum job de anotação ativo no momento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
