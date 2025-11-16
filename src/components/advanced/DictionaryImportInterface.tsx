import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Database, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportJob {
  id: string;
  type: 'dialectal' | 'gutenberg';
  volume?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  processed: number;
  total: number;
  errors: number;
}

export function DictionaryImportInterface() {
  const [isImporting, setIsImporting] = useState(false);
  const { data: jobs, isLoading: jobsLoading } = useDictionaryImportJobs();
  const resultsRef = useRef<HTMLDivElement>(null);

  const importDialectalVolume = async (volumeNum: 'I' | 'II') => {
    setIsImporting(true);
    const jobId = `dialectal-${volumeNum}-${Date.now()}`;
    
    setJobs(prev => [...prev, {
      id: jobId,
      type: 'dialectal',
      volume: volumeNum,
      status: 'pending',
      processed: 0,
      total: 0,
      errors: 0
    }]);

    try {
      // Carregar arquivo raw do projeto
      const fileName = volumeNum === 'I' 
        ? '/src/data/dictionaries/dialectal-volume-I-raw.txt' 
        : '/src/data/dictionaries/dialectal-volume-II-raw.txt';
      
      const response = await fetch(fileName);
      if (!response.ok) {
        throw new Error(`Erro ao carregar arquivo: ${fileName}`);
      }
      
      const rawContent = await response.text();
      console.log(`[DictionaryImport] Arquivo carregado: ${rawContent.length} caracteres`);
      
      // Importar e aplicar pré-processador
      const { preprocessDialectalText, getPreprocessingStats } = await import('@/lib/preprocessDialectalText');
      const processedContent = preprocessDialectalText(rawContent, volumeNum);
      
      // Mostrar estatísticas de pré-processamento
      const stats = getPreprocessingStats(processedContent);
      console.log(`[DictionaryImport] Estatísticas após pré-processamento:`, stats);
      
      toast.info(`Volume ${volumeNum}: ${stats.estimatedVerbetes} verbetes detectados. Iniciando importação...`);
      
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'processing', total: stats.estimatedVerbetes } : j
      ));

      const { data, error } = await supabase.functions.invoke('process-dialectal-dictionary', {
        body: { 
          fileContent: processedContent,
          volumeNum 
        }
      });

      if (error) throw error;

      setJobs(prev => prev.map(j => 
        j.id === jobId ? {
          ...j,
          status: 'completed',
          processed: data.processed,
          total: data.processed + data.errors,
          errors: data.errors
        } : j
      ));

      toast.success(`Volume ${volumeNum} processado: ${data.processed} verbetes importados!`);
    } catch (error) {
      console.error('Erro ao importar volume:', error);
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'error' } : j
      ));
      toast.error(`Erro ao processar Volume ${volumeNum}`);
    } finally {
      setIsImporting(false);
    }
  };

  const importGutenberg = async () => {
    setIsImporting(true);
    const jobId = `gutenberg-${Date.now()}`;
    
    setJobs(prev => [...prev, {
      id: jobId,
      type: 'gutenberg',
      status: 'pending',
      processed: 0,
      total: 0,
      errors: 0
    }]);

    try {
      // Carregar arquivo Gutenberg
      const response = await fetch('/src/data/dictionaries/gutenberg-completo.txt');
      const fileContent = await response.text();
      
      toast.info('Iniciando processamento do Dicionário Gutenberg...');
      
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'processing', total: 700000 } : j
      ));

      // Processar em lotes de 1000
      let startIndex = 0;
      const batchSize = 1000;
      let totalProcessed = 0;

      while (startIndex < 10000) { // Limitar a 10k para teste
        const { data, error } = await supabase.functions.invoke('process-gutenberg-dictionary', {
          body: { fileContent, batchSize, startIndex }
        });

        if (error) throw error;

        totalProcessed += data.processed;
        startIndex = data.endIndex;

        setJobs(prev => prev.map(j => 
          j.id === jobId ? {
            ...j,
            processed: totalProcessed,
            errors: (j.errors || 0) + (data.errors || 0)
          } : j
        ));

        if (!data.hasMore || startIndex >= 10000) break;
      }

      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'completed' } : j
      ));

      toast.success(`Gutenberg processado: ${totalProcessed} verbetes importados!`);
    } catch (error) {
      console.error('Erro ao importar Gutenberg:', error);
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'error' } : j
      ));
      toast.error('Erro ao processar Dicionário Gutenberg');
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de ação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Dicionário Dialectal
            </CardTitle>
            <CardDescription>Cultura Pampeana (2 volumes)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => importDialectalVolume('I')}
              disabled={isImporting}
              className="w-full"
              variant="outline"
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Importar Volume I
            </Button>
            <Button
              onClick={() => importDialectalVolume('II')}
              disabled={isImporting}
              className="w-full"
              variant="outline"
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Importar Volume II
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              Dicionário Gutenberg
            </CardTitle>
            <CardDescription>Cândido de Figueiredo (~700k verbetes)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={importGutenberg}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Importar Dicionário Completo
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Processamento em lotes de 1000 verbetes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Geral</CardTitle>
            <CardDescription>Jobs de importação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total de jobs:</span>
                <Badge variant="secondary">{jobs.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Concluídos:</span>
                <Badge variant="default">
                  {jobs.filter(j => j.status === 'completed').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Erros:</span>
                <Badge variant="destructive">
                  {jobs.filter(j => j.status === 'error').length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de jobs com progresso */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jobs de Importação</CardTitle>
            <CardDescription>Acompanhe o progresso em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="font-semibold">
                          {job.type === 'dialectal' 
                            ? `Dicionário Dialectal - Volume ${job.volume}`
                            : 'Dicionário Gutenberg'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.status === 'completed' ? 'Concluído' : 
                           job.status === 'error' ? 'Erro no processamento' :
                           job.status === 'processing' ? 'Processando...' :
                           'Aguardando...'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        job.status === 'completed' ? 'default' :
                        job.status === 'error' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>

                  {job.status === 'processing' && job.total > 0 && (
                    <div className="space-y-2">
                      <Progress 
                        value={(job.processed / job.total) * 100} 
                        className="h-2"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{job.processed} / {job.total} verbetes</span>
                        <span>{Math.round((job.processed / job.total) * 100)}%</span>
                      </div>
                    </div>
                  )}

                  {job.status === 'completed' && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Processados:</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {job.processed}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total:</p>
                        <p className="font-semibold">{job.total}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Erros:</p>
                        <p className="font-semibold text-destructive">{job.errors}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      {jobs.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Como Importar Dicionários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>1. Dicionário Dialectal:</strong> Importe os volumes I e II separadamente. 
              Cada volume contém aproximadamente 1.500-2.500 verbetes da cultura pampeana gaúcha.
            </p>
            <p>
              <strong>2. Dicionário Gutenberg:</strong> Contém ~700.000 verbetes do português geral 
              (Cândido de Figueiredo). O processamento é feito em lotes para otimização.
            </p>
            <p className="text-xs bg-muted p-3 rounded-md">
              💡 <strong>Dica:</strong> Os dicionários Houaiss e UNESP já foram configurados anteriormente 
              e podem ser processados pela interface de Backend Lexicon.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
