import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Trash2, CheckSquare } from 'lucide-react';
import { useDictionaryImportJobs, verifyDictionaryIntegrity, clearAndReimport, resumeImport } from '@/hooks/useDictionaryImportJobs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DictionaryImportTester } from './DictionaryImportTester';
import { NotificationSettings } from './NotificationSettings';
import { CancelJobDialog } from './CancelJobDialog';
import { CancellationHistory } from './CancellationHistory';
import { useDictionaryJobNotifications } from '@/hooks/useDictionaryJobNotifications';
import { useQueryClient } from '@tanstack/react-query';

const MAX_FILE_SIZE = 10_000_000; // 10MB

export function DictionaryImportInterface() {
  const [isImportingVolI, setIsImportingVolI] = useState(false);
  const [isImportingVolII, setIsImportingVolII] = useState(false);
  const [isImportingGutenberg, setIsImportingGutenberg] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { data: jobs } = useDictionaryImportJobs();
  const resultsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // ✅ FASE 3 - BLOCO 2: Configurações de notificações persistidas
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem('dict-notifications-enabled') === 'true'
  );
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('dict-notifications-sound') === 'true'
  );

  // ✅ FASE 3 - BLOCO 2: Ativar hook de notificações em tempo real
  useDictionaryJobNotifications({
    enabled: notificationsEnabled,
    soundEnabled,
    onComplete: (jobId) => {
      console.log('✅ Job concluído:', jobId);
    },
    onError: (jobId, error) => {
      console.error('❌ Job com erro:', jobId, error);
    },
    onCancelled: (jobId) => {
      console.log('🛑 Job cancelado:', jobId);
    },
    onStalled: (jobId) => {
      console.warn('⚠️ Job travado:', jobId);
    }
  });

  // ✅ FASE 3 - BLOCO 2: Persistir configurações no localStorage
  useEffect(() => {
    localStorage.setItem('dict-notifications-enabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('dict-notifications-sound', String(soundEnabled));
  }, [soundEnabled]);

  const importDialectalVolume = async (volumeNum: 'I' | 'II') => {
    const setter = volumeNum === 'I' ? setIsImportingVolI : setIsImportingVolII;
    setter(true);
    try {
      const fileName = volumeNum === 'I' 
        ? '/src/data/dictionaries/dialectal-volume-I-raw.txt' 
        : '/src/data/dictionaries/dialectal-volume-II-raw.txt';
      
      const response = await fetch(fileName);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(`Arquivo não encontrado: Volume ${volumeNum}`);
          setter(false);
          return;
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const rawContent = await response.text();
      
      // ✅ SPRINT 2: Validação de tamanho de arquivo (10MB máx)
      const fileSizeBytes = new Blob([rawContent]).size;
      if (fileSizeBytes > MAX_FILE_SIZE) {
        toast.error(
          `Arquivo muito grande: ${(fileSizeBytes / 1_000_000).toFixed(2)}MB (máximo: 10MB)`,
          { duration: 5000 }
        );
        setter(false);
        return;
      }
      
      if (!rawContent || rawContent.trim().length === 0) {
        toast.error(`Arquivo vazio: Volume ${volumeNum}`);
        setter(false);
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
      setter(false);
    }
  };

  const importGutenberg = async () => {
    setIsImportingGutenberg(true);
    try {
      toast.info('Gutenberg: ~700k verbetes. Processamento em lotes de 5.000...');
      
      const response = await fetch('/data/dictionaries/gutenberg-raw.txt');
      if (!response.ok) {
        toast.error('Arquivo Gutenberg não encontrado');
        return;
      }
      
      const fileContent = await response.text();
      if (!fileContent || fileContent.trim().length === 0) {
        toast.error('Arquivo Gutenberg vazio');
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-gutenberg-dictionary', {
        body: { 
          fileContent, 
          batchSize: 5000,
          startIndex: 0
        }
      });

      if (error) throw error;
      toast.success(`Importação Gutenberg iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`Erro ao iniciar importação do Gutenberg: ${error.message}`);
    } finally {
      setIsImportingGutenberg(false);
    }
  };

  const handleVerifyIntegrity = async (tipoDicionario: string) => {
    setIsVerifying(true);
    const result = await verifyDictionaryIntegrity(tipoDicionario);
    toast.info(result.message);
    setIsVerifying(false);
  };

  const handleResume = async (job: any) => {
    const volumeNum = job.tipo_dicionario.includes('_I') ? 'I' : 'II';
    const setter = volumeNum === 'I' ? setIsImportingVolI : setIsImportingVolII;
    setter(true);
    const fileName = volumeNum === 'I' 
      ? '/src/data/dictionaries/dialectal-volume-I-raw.txt' 
      : '/src/data/dictionaries/dialectal-volume-II-raw.txt';
    
    const response = await fetch(fileName);
    const rawContent = await response.text();
    
    // ✅ SPRINT 2: Validação de tamanho de arquivo (10MB máx)
    const fileSizeBytes = new Blob([rawContent]).size;
    if (fileSizeBytes > MAX_FILE_SIZE) {
      toast.error(
        `Arquivo muito grande: ${(fileSizeBytes / 1_000_000).toFixed(2)}MB (máximo: 10MB)`,
        { duration: 5000 }
      );
      setter(false);
      return;
    }
    
    const { preprocessDialectalText } = await import('@/lib/preprocessDialectalText');
    const processedContent = preprocessDialectalText(rawContent, volumeNum);
    
    await resumeImport(job, processedContent);
    setter(false);
  };

  const handleClearAndReimport = async (tipoDicionario: string) => {
    await clearAndReimport(tipoDicionario);
  };

  const getStatusIcon = (status: string | null, isStalled?: boolean) => {
    if (isStalled) {
      return <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />;
    }
    switch (status) {
      case 'iniciado': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processando': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'concluido': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'erro': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (job: any) => {
    if (job.isStalled) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          ⚠️ Travado (sem atualização &gt; 5min)
        </Badge>
      );
    }
    
    const isIncomplete = job.status === 'concluido' && job.progresso < 100;
    if (isIncomplete) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500">Parcial ({job.progresso}%)</Badge>;
    }
    
    switch (job.status) {
      case 'iniciado':
        return <Badge variant="secondary">🔄 Iniciado</Badge>;
      case 'processando':
        return (
          <Badge className="bg-blue-600">
            <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />
            Processando
          </Badge>
        );
      case 'concluido':
        return <Badge className="bg-green-600">✅ Concluído</Badge>;
      case 'erro':
        return <Badge variant="destructive">❌ Erro</Badge>;
      default:
        return <Badge>{job.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Importação de Dicionários</h2>
          <p className="text-muted-foreground">Importe e gerencie dicionários dialectais</p>
        </div>

        {/* ✅ FASE 3 - BLOCO 2: Configurações de Notificações em Tempo Real */}
        <NotificationSettings
          enabled={notificationsEnabled}
          soundEnabled={soundEnabled}
          onEnabledChange={setNotificationsEnabled}
          onSoundEnabledChange={setSoundEnabled}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Dialetal Vol. I
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => importDialectalVolume('I')} disabled={isImportingVolI || isImportingVolII || isImportingGutenberg} className="w-full">
                {isImportingVolI ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : 'Importar'}
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
              <Button onClick={() => importDialectalVolume('II')} disabled={isImportingVolI || isImportingVolII || isImportingGutenberg} className="w-full">
                {isImportingVolII ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : 'Importar'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {jobs && jobs.length > 0 && (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Histórico de Importações</h3>
            {jobs.some(j => j.isStalled) && (
              <Badge variant="destructive" className="animate-pulse">
                ⚠️ {jobs.filter(j => j.isStalled).length} job(s) travado(s)
              </Badge>
            )}
            {jobs.some(j => j.status === 'processando' || j.status === 'iniciado') && !jobs.some(j => j.isStalled) && (
              <Badge variant="secondary" className="animate-pulse">
                {jobs.filter(j => j.status === 'processando' || j.status === 'iniciado').length} ativo(s)
              </Badge>
            )}
          </div>
          {jobs.map(job => {
            const isIncomplete = job.status === 'concluido' && job.progresso < 100;
            return (
              <Card 
                key={job.id} 
                className={`${isIncomplete ? 'border-yellow-500' : ''} ${job.isStalled ? 'border-destructive bg-destructive/5' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(job.status, job.isStalled)}
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
                    {/* ✅ FASE 3 - BLOCO 3: Botão de Cancelamento para jobs ativos */}
                    {(job.status === 'iniciado' || job.status === 'processando') && (
                      <CancelJobDialog
                        jobId={job.id}
                        jobType={job.tipo_dicionario}
                        onCancelled={() => queryClient.invalidateQueries({ queryKey: ['dictionary-import-jobs'] })}
                      />
                    )}
                    
                    {isIncomplete && (
                      <Button 
                        size="sm" 
                        onClick={() => handleResume(job)}
                        disabled={isImportingVolI || isImportingVolII || isImportingGutenberg}
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

      {/* ✅ FASE 3 - BLOCO 3: Histórico de Cancelamentos */}
      <CancellationHistory />
    </div>
  );
}
