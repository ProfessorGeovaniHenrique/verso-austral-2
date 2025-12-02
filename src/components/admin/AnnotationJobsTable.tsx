import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Job {
  id: string;
  artist_name: string;
  status: string;
  processed_words: number;
  total_words: number;
  progress: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  last_chunk_at: string | null;
  chunks_processed: number | null;
}

interface AnnotationJobsTableProps {
  jobs: Job[];
  onRefresh: () => void;
}

const STUCK_THRESHOLD_MINUTES = 5; // Job considerado travado após 5 min sem atividade

export function AnnotationJobsTable({ jobs, onRefresh }: AnnotationJobsTableProps) {
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);

  const isJobStuck = (job: Job): boolean => {
    if (job.status !== 'processando') return false;
    if (!job.last_chunk_at) return true; // Nunca processou

    const lastActivity = new Date(job.last_chunk_at).getTime();
    const now = Date.now();
    const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
    
    return minutesSinceActivity > STUCK_THRESHOLD_MINUTES;
  };

  const getMinutesSinceActivity = (job: Job): number | null => {
    if (!job.last_chunk_at) return null;
    const lastActivity = new Date(job.last_chunk_at).getTime();
    return Math.round((Date.now() - lastActivity) / (1000 * 60));
  };

  const handleCancel = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('semantic_annotation_jobs')
        .update({ 
          status: 'cancelado',
          tempo_fim: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Job cancelado com sucesso');
      onRefresh();
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Erro ao cancelar job');
    }
  };

  const handleResume = async (jobId: string) => {
    setResumingJobId(jobId);
    try {
      // Primeiro, buscar dados do job atual
      const { data: jobData, error: fetchError } = await supabase
        .from('semantic_annotation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError || !jobData) {
        throw new Error('Job não encontrado');
      }

      // Resetar last_chunk_at para permitir novo processamento
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      const { error: updateError } = await supabase
        .from('semantic_annotation_jobs')
        .update({ 
          status: 'processando',
          last_chunk_at: oneMinuteAgo,
          erro_mensagem: null
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      // Invocar edge function para continuar processamento
      const { data, error: invokeError } = await supabase.functions.invoke('annotate-artist-songs', {
        body: { 
          jobId,
          continueFrom: {
            songIndex: jobData.current_song_index || 0,
            wordIndex: jobData.current_word_index || 0,
          }
        }
      });

      if (invokeError) {
        console.warn('Edge function invoke warning:', invokeError);
        // Não falhar - a função pode ter iniciado
      }

      toast.success('Job retomado! Processamento reiniciado.');
      onRefresh();
    } catch (error) {
      console.error('Error resuming job:', error);
      toast.error('Erro ao retomar job');
    } finally {
      setResumingJobId(null);
    }
  };

  const getStatusBadge = (job: Job) => {
    const stuck = isJobStuck(job);
    
    if (stuck) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Travado
        </Badge>
      );
    }

    const statusConfig = {
      processando: { label: '🔄 Processando', variant: 'default' as const },
      pausado: { label: '⏸️ Pausado', variant: 'secondary' as const },
      pendente: { label: '⏳ Pendente', variant: 'outline' as const },
      completo: { label: '✅ Completo', variant: 'default' as const },
      concluido: { label: '✅ Concluído', variant: 'default' as const },
      erro: { label: '❌ Erro', variant: 'destructive' as const },
      cancelado: { label: '🚫 Cancelado', variant: 'secondary' as const }
    };

    const config = statusConfig[job.status as keyof typeof statusConfig] || { label: job.status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateETA = (job: Job) => {
    if (job.status !== 'processando' || job.processed_words === 0) return 'N/A';
    if (isJobStuck(job)) return 'Travado';
    
    const elapsed = Date.now() - new Date(job.tempo_inicio).getTime();
    const wordsPerMs = job.processed_words / elapsed;
    const remainingWords = job.total_words - job.processed_words;
    const etaMs = remainingWords / wordsPerMs;
    
    return formatDistanceToNow(new Date(Date.now() + etaMs), { 
      locale: ptBR,
      addSuffix: false 
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Jobs de Anotação Semântica</CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum job ativo no momento
            </p>
          ) : (
            jobs.map(job => {
              const stuck = isJobStuck(job);
              const minutesSince = getMinutesSinceActivity(job);
              const isResuming = resumingJobId === job.id;

              return (
                <div 
                  key={job.id} 
                  className={`border rounded-lg p-4 space-y-3 ${stuck ? 'border-destructive bg-destructive/5' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{job.artist_name}</h4>
                        {getStatusBadge(job)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {job.processed_words.toLocaleString()} / {job.total_words.toLocaleString()} palavras
                        {job.chunks_processed !== null && ` • ${job.chunks_processed} chunks`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Iniciado {formatDistanceToNow(new Date(job.tempo_inicio), { locale: ptBR, addSuffix: true })}
                        {!stuck && job.status === 'processando' && ` • ETA: ${calculateETA(job)}`}
                      </p>
                      
                      {stuck && minutesSince !== null && (
                        <p className="text-xs text-destructive font-medium">
                          ⚠️ Sem atividade há {minutesSince} minutos - clique em "Retomar" para continuar
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Botão Retomar - para jobs pausados ou travados */}
                      {(job.status === 'pausado' || stuck) && (
                        <Button
                          size="sm"
                          variant={stuck ? "default" : "outline"}
                          onClick={() => handleResume(job.id)}
                          disabled={isResuming}
                          className={stuck ? "bg-primary hover:bg-primary/90" : ""}
                        >
                          {isResuming ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          <span className="ml-1">Retomar</span>
                        </Button>
                      )}
                      
                      {/* Botão Cancelar */}
                      {(job.status === 'processando' || job.status === 'pausado') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancel(job.id)}
                          disabled={isResuming}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <Progress value={job.progress} className="h-2" />
                  
                  {job.erro_mensagem && (
                    <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                      {job.erro_mensagem}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
