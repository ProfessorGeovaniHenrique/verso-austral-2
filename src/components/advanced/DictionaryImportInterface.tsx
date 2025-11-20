import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Trash2, CheckSquare, Download } from 'lucide-react';
import { useDictionaryImportJobs, verifyDictionaryIntegrity, clearAndReimport, resumeImport } from '@/hooks/useDictionaryImportJobs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DictionaryImportTester } from './DictionaryImportTester';
import { NotificationSettings } from './NotificationSettings';
import { CancelJobDialog } from './CancelJobDialog';
import { CancellationHistory } from './CancellationHistory';
import { useDictionaryJobNotifications } from '@/hooks/useDictionaryJobNotifications';
import { useQueryClient } from '@tanstack/react-query';

export function DictionaryImportInterface() {
  const [isImportingVolI, setIsImportingVolI] = useState(false);
  const [isImportingVolII, setIsImportingVolII] = useState(false);
  const [isImportingGutenberg, setIsImportingGutenberg] = useState(false);
  const [isImportingHouaiss, setIsImportingHouaiss] = useState(false);
  const [isImportingUnesp, setIsImportingUnesp] = useState(false);
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
      toast.info(`Iniciando importação do Volume ${volumeNum}...`);
      
      const { data, error } = await supabase.functions.invoke('import-dialectal-backend', {
        body: { volumeNum }
      });

      if (error) throw error;
      
      toast.success(`Importação iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`Erro ao iniciar importação do Volume ${volumeNum}: ${error.message}`);
    } finally {
      setter(false);
    }
  };

  const importGutenberg = async () => {
    setIsImportingGutenberg(true);
    try {
      toast.info('Iniciando importação do Gutenberg...');
      
      const { data, error } = await supabase.functions.invoke('import-gutenberg-backend', {
        body: {}
      });
      
      if (error) throw error;
      
      toast.success(`Importação iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`Erro ao iniciar importação do Gutenberg: ${error.message}`);
    } finally {
      setIsImportingGutenberg(false);
    }
  };

  const importHouaiss = async () => {
    setIsImportingHouaiss(true);
    try {
      toast.info('Iniciando importação do Houaiss...');
      
      const { data, error } = await supabase.functions.invoke('import-houaiss-backend', {
        body: {}
      });
      
      if (error) throw error;
      
      toast.success(`Importação iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`Erro ao iniciar importação do Houaiss: ${error.message}`);
    } finally {
      setIsImportingHouaiss(false);
    }
  };

  const importUnesp = async () => {
    setIsImportingUnesp(true);
    try {
      toast.info('Iniciando importação do UNESP...');
      
      const { data, error } = await supabase.functions.invoke('import-unesp-backend', {
        body: {}
      });
      
      if (error) throw error;
      
      toast.success(`Importação iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`Erro ao iniciar importação do UNESP: ${error.message}`);
    } finally {
      setIsImportingUnesp(false);
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
    
    try {
      toast.info(`Retomando importação do ${job.tipo_dicionario}...`);
      await resumeImport(job, ''); // Edge function busca o arquivo diretamente do GitHub
      toast.success('Importação retomada com sucesso!');
    } catch (error: any) {
      toast.error(`Erro ao retomar: ${error.message}`);
    } finally {
      setter(false);
    }
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
        <Badge variant="destructive" className="text-xs h-6 animate-pulse">
          ⚠️ Travado
        </Badge>
      );
    }
    
    const isIncomplete = job.status === 'concluido' && job.progresso < 100;
    if (isIncomplete) {
      return (
        <Badge variant="outline" className="text-xs h-6 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
          Parcial
        </Badge>
      );
    }
    
    switch (job.status) {
      case 'iniciado':
        return <Badge variant="secondary" className="text-xs h-6">Iniciado</Badge>;
      case 'processando':
        return <Badge className="text-xs h-6 bg-blue-600">Processando</Badge>;
      case 'concluido':
        return <Badge className="text-xs h-6 bg-green-600">✓ Completo</Badge>;
      case 'erro':
        return <Badge variant="destructive" className="text-xs h-6">Erro</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="text-xs h-6">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs h-6">{job.status}</Badge>;
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

        <div className="grid gap-4 md:grid-cols-3">
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

          {/* Card Gutenberg */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Gutenberg - Dicionário Completo
              </CardTitle>
              <CardDescription>
                Importar dicionário Gutenberg completo (carregado diretamente do GitHub)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={importGutenberg} 
                disabled={isImportingVolI || isImportingVolII || isImportingGutenberg} 
                className="w-full"
              >
                {isImportingGutenberg ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando do GitHub...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Importar Gutenberg
                  </>
                )}
              </Button>
            <p className="text-sm text-muted-foreground">
              O dicionário será carregado diretamente do repositório GitHub.
              Importação completa em lote com processamento paralelo.
            </p>
          </CardContent>
        </Card>

        {/* Card Houaiss */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Dicionário Houaiss (Sinônimos)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={importHouaiss}
              disabled={isImportingHouaiss}
              className="w-full"
            >
              {isImportingHouaiss ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando Houaiss...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Importar Houaiss
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Sinônimos e relações lexicais carregados do GitHub.
            </p>
          </CardContent>
        </Card>

        {/* Card UNESP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Dicionário UNESP (Definições)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={importUnesp}
              disabled={isImportingUnesp}
              className="w-full"
            >
              {isImportingUnesp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando UNESP...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Importar UNESP
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Definições lexicográficas carregadas do GitHub.
            </p>
          </CardContent>
        </Card>
        </div>
      </div>

      {jobs && jobs.length > 0 && (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Dicionários Importados</h3>
              <p className="text-sm text-muted-foreground">
                {jobs.filter(j => j.status === 'concluido' && j.progresso === 100).length} completos • 
                {jobs.filter(j => j.status === 'processando' || j.status === 'iniciado').length} ativos
              </p>
            </div>
            
            <div className="flex gap-2">
              {jobs.some(j => j.isStalled) && (
                <Badge variant="destructive" className="animate-pulse">
                  {jobs.filter(j => j.isStalled).length} travado{jobs.filter(j => j.isStalled).length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {jobs.map(job => {
            const isIncomplete = job.status === 'concluido' && job.progresso < 100;
            const isActive = job.status === 'processando' || job.status === 'iniciado';
            
            return (
              <Card 
                key={job.id} 
                className={`${isIncomplete ? 'border-yellow-500' : ''} ${job.isStalled ? 'border-destructive bg-destructive/5' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {getStatusIcon(job.status, job.isStalled)}
                        {job.tipo_dicionario.replace(/_/g, ' ')}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {job.verbetes_inseridos.toLocaleString()} / {job.total_verbetes.toLocaleString()} verbetes
                        {job.erros > 0 && <span className="text-destructive ml-2">• {job.erros} erros</span>}
                      </CardDescription>
                    </div>
                    {getStatusBadge(job)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 pt-0">
                  {(isActive || isIncomplete) && (
                    <div className="space-y-1">
                      <Progress value={job.progresso} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">{job.progresso}%</p>
                    </div>
                  )}
                  
                  {isIncomplete && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-xs">
                      <p className="text-yellow-700 dark:text-yellow-400 font-medium">
                        ⚠️ Importação incompleta
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1.5">
                      {isActive && (
                        <CancelJobDialog
                          jobId={job.id}
                          jobType={job.tipo_dicionario}
                          onCancelled={() => queryClient.invalidateQueries({ queryKey: ['dictionary-import-jobs'] })}
                        />
                      )}
                      
                      {isIncomplete && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResume(job)}
                          disabled={isImportingVolI || isImportingVolII || isImportingGutenberg || isImportingHouaiss || isImportingUnesp}
                          className="h-8 px-2 text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retomar
                        </Button>
                      )}
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remover {job.verbetes_inseridos.toLocaleString()} verbetes do {job.tipo_dicionario}?
                            Você precisará reimportar após esta ação.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleClearAndReimport(job.tipo_dicionario)}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  {job.erro_mensagem && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {job.erro_mensagem}
                    </p>
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
