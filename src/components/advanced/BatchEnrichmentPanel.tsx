import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, PlayCircle, Download, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface BatchEnrichmentPanelProps {
  corpusType: 'gaucho' | 'nordestino';
}

interface EnrichmentJob {
  id: string;
  corpus_type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_songs: number;
  processed_songs: number;
  auto_validated: number;
  needs_review: number;
  errors: string[];
  review_csv_url: string | null;
  updated_corpus_url: string | null;
  backup_url: string | null;
  started_at: string;
  completed_at: string | null;
  metadata: any;
}

export function BatchEnrichmentPanel({ corpusType }: BatchEnrichmentPanelProps) {
  const [job, setJob] = useState<EnrichmentJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Polling para atualizar status
  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('enrichment_jobs')
          .select('*')
          .eq('id', job.id)
          .single();

        if (!error && data) {
          setJob(data as EnrichmentJob);
          
          if (data.status === 'completed') {
            toast.success('Enriquecimento concluído!');
          } else if (data.status === 'failed') {
            toast.error('Enriquecimento falhou. Verifique os erros.');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar status:', error);
      }
    }, 2000); // Poll a cada 2 segundos

    return () => clearInterval(pollInterval);
  }, [job]);

  // Timer para tempo decorrido
  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return;
    }

    const startTime = new Date(job.started_at).getTime();
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [job]);

  const handleStartEnrichment = async () => {
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-enrich-corpus', {
        body: { corpusType }
      });

      if (error) {
        console.error('Edge Function error:', error);
        toast.error(`Erro ao iniciar enriquecimento: ${error.message}`);
        return;
      }

      if (!data || !data.jobId) {
        toast.error('Resposta inválida da Edge Function');
        return;
      }

      setJob({ 
        id: data.jobId, 
        status: 'queued',
        corpus_type: corpusType,
        total_songs: 0,
        processed_songs: 0,
        auto_validated: 0,
        needs_review: 0,
        errors: [],
        review_csv_url: null,
        updated_corpus_url: null,
        backup_url: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        metadata: {}
      });
      
      toast.success('Enriquecimento iniciado! O processamento está em andamento.');
    } catch (error) {
      console.error('Erro ao iniciar:', error);
      toast.error(`Erro ao iniciar enriquecimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsStarting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  const calculateETA = (): string => {
    if (!job || job.processed_songs === 0) return 'Calculando...';
    
    const avgTimePerSong = elapsedTime / job.processed_songs;
    const remainingSongs = job.total_songs - job.processed_songs;
    const etaSeconds = Math.ceil(avgTimePerSong * remainingSongs);
    
    return formatTime(etaSeconds);
  };

  const progressPercentage = job && job.total_songs > 0 
    ? (job.processed_songs / job.total_songs) * 100 
    : 0;

  // Estado inicial: Botão de início
  if (!job) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🤖 Enriquecimento Automático em Lote</CardTitle>
          <CardDescription>
            Processe todo o corpus {corpusType === 'gaucho' ? 'gaúcho' : 'nordestino'} automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="font-semibold mb-2">ℹ️ Como funciona:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Identifica músicas sem compositor/ano/álbum</li>
              <li>• Busca metadados no MusicBrainz e via IA</li>
              <li>• Auto-valida sugestões com confiança ≥ 85%</li>
              <li>• Gera CSV de revisão para casos duvidosos</li>
              <li>• Cria backup e atualiza corpus automaticamente</li>
            </ul>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="space-y-1">
              <p className="text-sm font-medium">Tempo estimado</p>
              <p className="text-2xl font-bold">~17 minutos</p>
              <p className="text-xs text-muted-foreground">Para ~847 músicas (1.2s/música)</p>
            </div>
            <Button 
              size="lg"
              onClick={handleStartEnrichment}
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Iniciar Enriquecimento
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado de processamento
  if (job.status === 'processing' || job.status === 'queued') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Enriquecendo corpus {corpusType === 'gaucho' ? 'gaúcho' : 'nordestino'}...
          </CardTitle>
          <CardDescription>
            Processamento em andamento. Não feche esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {job.processed_songs}/{job.total_songs} músicas processadas
              </span>
              <span className="text-muted-foreground">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4 bg-success/5">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Auto-validadas</span>
              </div>
              <p className="text-2xl font-bold">{job.auto_validated}</p>
              <p className="text-xs text-muted-foreground">Confiança ≥ 85%</p>
            </div>

            <div className="rounded-lg border border-border p-4 bg-warning/5">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Para revisão</span>
              </div>
              <p className="text-2xl font-bold">{job.needs_review}</p>
              <p className="text-xs text-muted-foreground">Confiança &lt; 85%</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tempo decorrido</p>
                <p className="text-lg font-bold">{formatTime(elapsedTime)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">ETA</p>
              <p className="text-lg font-bold">{calculateETA()}</p>
            </div>
          </div>

          {job.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                ⚠️ {job.errors.length} erro(s) encontrado(s)
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {job.errors.slice(0, 5).map((error, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {error}</p>
                ))}
                {job.errors.length > 5 && (
                  <p className="text-xs text-muted-foreground italic">
                    ...e mais {job.errors.length - 5} erros
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Estado concluído
  if (job.status === 'completed') {
    const autoValidatedPercent = job.total_songs > 0 
      ? ((job.auto_validated / job.total_songs) * 100).toFixed(1)
      : 0;
    const reviewPercent = job.total_songs > 0 
      ? ((job.needs_review / job.total_songs) * 100).toFixed(1)
      : 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Enriquecimento Concluído!
          </CardTitle>
          <CardDescription>
            Processamento finalizado em {formatTime(elapsedTime)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-success/50 bg-success/5 p-6">
            <h4 className="font-semibold mb-4">📊 Resultados:</h4>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total processado</p>
                <p className="text-3xl font-bold">{job.total_songs}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auto-validadas</p>
                <p className="text-3xl font-bold text-success">
                  {job.auto_validated}
                  <span className="text-lg ml-1">({autoValidatedPercent}%)</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Para revisão</p>
                <p className="text-3xl font-bold text-warning">
                  {job.needs_review}
                  <span className="text-lg ml-1">({reviewPercent}%)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">📥 Downloads disponíveis:</h4>
            
            {job.review_csv_url && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open(job.review_csv_url!, '_blank')}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar CSV de Revisão ({job.needs_review} músicas)
              </Button>
            )}

            {job.updated_corpus_url && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open(job.updated_corpus_url!, '_blank')}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar Corpus Atualizado
              </Button>
            )}

            {job.backup_url && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  supabase.storage
                    .from('corpus')
                    .download(job.backup_url!)
                    .then(({ data }) => {
                      if (data) {
                        const url = URL.createObjectURL(data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `backup-${corpusType}-original.txt`;
                        a.click();
                      }
                    });
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar Backup Original
              </Button>
            )}
          </div>

          <Button 
            variant="default" 
            className="w-full"
            onClick={() => setJob(null)}
          >
            Iniciar Novo Enriquecimento
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado de erro
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Erro no Enriquecimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm">O processamento falhou. Erros:</p>
          <ul className="mt-2 space-y-1">
            {job.errors.map((error, i) => (
              <li key={i} className="text-xs text-muted-foreground">• {error}</li>
            ))}
          </ul>
        </div>
        <Button onClick={() => setJob(null)}>Tentar Novamente</Button>
      </CardContent>
    </Card>
  );
}
