import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Trash2, CheckSquare } from 'lucide-react';
import { useDictionaryImportJobs, verifyDictionaryIntegrity, clearAndReimport, resumeImport } from '@/hooks/useDictionaryImportJobs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function DictionaryImportInterface() {
  const [isImporting, setIsImporting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { data: jobs } = useDictionaryImportJobs();
  const resultsRef = useRef<HTMLDivElement>(null);

  const importDialectalVolume = async (volumeNum: 'I' | 'II') => {
    setIsImporting(true);
    try {
      const fileName = volumeNum === 'I' 
        ? '/src/data/dictionaries/dialectal-volume-I-raw.txt' 
        : '/src/data/dictionaries/dialectal-volume-II-raw.txt';
      
      const response = await fetch(fileName);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(`Arquivo não encontrado: Volume ${volumeNum}`);
          setIsImporting(false);
          return;
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const rawContent = await response.text();
      if (!rawContent || rawContent.trim().length === 0) {
        toast.error(`Arquivo vazio: Volume ${volumeNum}`);
        setIsImporting(false);
        return;
      }
      
      const { preprocessDialectalText, getPreprocessingStats } = await import('@/lib/preprocessDialectalText');
      const processedContent = preprocessDialectalText(rawContent, volumeNum);
      const stats = getPreprocessingStats(processedContent);
      
      toast.info(`Volume ${volumeNum}: ${stats.estimatedVerbetes} verbetes. Processando...`);

      const { data, error } = await supabase.functions.invoke('process-dialectal-dictionary', {
        body: { fileContent: processedContent, volumeNum, offsetInicial: 0 }
      });

      if (error) throw error;
      toast.success(`Importação iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`Erro ao iniciar importação do Volume ${volumeNum}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleVerifyIntegrity = async (tipoDicionario: string) => {
    setIsVerifying(true);
    const result = await verifyDictionaryIntegrity(tipoDicionario);
    toast.info(result.message);
    setIsVerifying(false);
  };

  const handleResume = async (job: any) => {
    setIsImporting(true);
    const volumeNum = job.tipo_dicionario.includes('_I') ? 'I' : 'II';
    const fileName = volumeNum === 'I' 
      ? '/src/data/dictionaries/dialectal-volume-I-raw.txt' 
      : '/src/data/dictionaries/dialectal-volume-II-raw.txt';
    
    const response = await fetch(fileName);
    const rawContent = await response.text();
    const { preprocessDialectalText } = await import('@/lib/preprocessDialectalText');
    const processedContent = preprocessDialectalText(rawContent, volumeNum);
    
    await resumeImport(job, processedContent);
    setIsImporting(false);
  };

  const handleClearAndReimport = async (tipoDicionario: string) => {
    await clearAndReimport(tipoDicionario);
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'iniciado': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processando': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'concluido': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'erro': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (job: any) => {
    const isIncomplete = job.status === 'concluido' && job.progresso < 100;
    if (isIncomplete) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500">Parcial ({job.progresso}%)</Badge>;
    }
    return <Badge>{job.status}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Importação de Dicionários</h2>
          <p className="text-muted-foreground">Importe e gerencie dicionários dialectais</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Dialetal Vol. I
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => importDialectalVolume('I')} disabled={isImporting} className="w-full">
                {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : 'Importar'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Dialetal Vol. II
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => importDialectalVolume('II')} disabled={isImporting} className="w-full">
                {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : 'Importar'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {jobs && jobs.length > 0 && (
        <div ref={resultsRef} className="space-y-4">
          <h3 className="text-xl font-semibold">Histórico de Importações</h3>
          {jobs.map(job => {
            const isIncomplete = job.status === 'concluido' && job.progresso < 100;
            return (
              <Card key={job.id} className={isIncomplete ? 'border-yellow-500' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      {job.tipo_dicionario}
                    </CardTitle>
                    {getStatusBadge(job)}
                  </div>
                  <CardDescription>
                    {job.verbetes_inseridos}/{job.total_verbetes} verbetes inseridos
                    {job.erros > 0 && ` • ${job.erros} erros`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={job.progresso} />
                  
                  {isIncomplete && (
                    <div className="bg-yellow-500/10 border border-yellow-500 rounded-md p-3 text-sm">
                      <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                        ⚠️ Importação incompleta: Apenas {job.progresso}% processado
                      </p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {isIncomplete && (
                      <Button 
                        size="sm" 
                        onClick={() => handleResume(job)}
                        disabled={isImporting}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retomar
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleVerifyIntegrity(job.tipo_dicionario)}
                      disabled={isVerifying}
                      className="flex items-center gap-1"
                    >
                      <CheckSquare className="h-3 w-3" />
                      Verificar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Limpar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso irá remover TODAS as {job.verbetes_inseridos} entradas do {job.tipo_dicionario} do banco de dados. 
                            Você precisará reimportar manualmente após esta ação.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleClearAndReimport(job.tipo_dicionario)}>
                            Confirmar Limpeza
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {job.erro_mensagem && (
                    <p className="text-sm text-destructive">{job.erro_mensagem}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
