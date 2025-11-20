import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Trash2, CheckSquare, Download, Database, Eraser } from 'lucide-react';
import { useDictionaryImportJobs, verifyDictionaryIntegrity, clearAndReimport, resumeImport } from '@/hooks/useDictionaryImportJobs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DictionaryImportTester } from './DictionaryImportTester';
import { NotificationSettings } from './NotificationSettings';
import { CancelJobDialog } from './CancelJobDialog';
import { CancellationHistory } from './CancellationHistory';
import { useDictionaryJobNotifications } from '@/hooks/useDictionaryJobNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { deepCleanAllCaches } from '@/utils/cacheManagement';
import { DictionaryMetadataCard } from './lexicon-status/DictionaryMetadataCard';
import { BatchValidationDialog } from './lexicon-status/BatchValidationDialog';

export function DictionaryImportInterface() {
  const [isImportingGaucho, setIsImportingGaucho] = useState(false);
  const [isImportingGutenberg, setIsImportingGutenberg] = useState(false);
  const [isImportingRochaPombo, setIsImportingRochaPombo] = useState(false);
  const [isImportingNavarro, setIsImportingNavarro] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
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

  const importGauchoUnificado = async () => {
    setIsImportingGaucho(true);
    try {
      toast.info('Iniciando importação do Dicionário Gaúcho Unificado...');
      
      const { data, error } = await supabase.functions.invoke('import-dialectal-backend', {
        body: {}
      });

      if (error) throw error;
      
      toast.success(`✅ Importação do Gaúcho Unificado iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`❌ Erro ao iniciar importação do Gaúcho: ${error.message}`);
    } finally {
      setIsImportingGaucho(false);
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

  const importRochaPombo = async () => {
    setIsImportingRochaPombo(true);
    try {
      toast.info('Iniciando importação do Dicionário Rocha Pombo (ABL)...');
      
      const { data, error } = await supabase.functions.invoke('import-rocha-pombo-backend', {
        body: {}
      });
      
      if (error) throw error;
      
      toast.success(`Importação do Rocha Pombo iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`Erro ao iniciar importação do Rocha Pombo: ${error.message}`);
    } finally {
      setIsImportingRochaPombo(false);
    }
  };

  const importNavarro = async () => {
    setIsImportingNavarro(true);
    try {
      toast.info('Iniciando importação do Dicionário do Nordeste - Fred Navarro (2014)...');
      
      const { data, error } = await supabase.functions.invoke('import-navarro-backend', {
        body: {
          offset: 0
        }
      });

      if (error) throw error;
      
      toast.success(`✅ Importação do Navarro 2014 iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      console.error('Erro ao importar Navarro:', error);
      toast.error(`❌ Erro ao importar Navarro: ${error.message}`);
    } finally {
      setIsImportingNavarro(false);
    }
  };


  const handleVerifyIntegrity = async (tipoDicionario: string) => {
    setIsVerifying(true);
    const result = await verifyDictionaryIntegrity(tipoDicionario);
    toast.info(result.message);
    setIsVerifying(false);
  };

  const handleResume = async (job: any) => {
    // Determinar qual setState usar baseado no tipo de dicionário
    let setter: (value: boolean) => void;
    
    if (job.tipo_dicionario === 'gaucho_unificado' || job.tipo_dicionario.includes('dialectal')) {
      setter = setIsImportingGaucho;
    } else if (job.tipo_dicionario === 'GUTENBERG') {
      setter = setIsImportingGutenberg;
    } else if (job.tipo_dicionario === 'ROCHA_POMBO') {
      setter = setIsImportingRochaPombo;
    } else if (job.tipo_dicionario === 'nordestino_navarro') {
      setter = setIsImportingNavarro;
    } else {
      setter = () => {}; // Fallback
    }
    
    setter(true);
    
    try {
      toast.info(`Retomando importação do ${getDictionaryDisplayName(job.tipo_dicionario)}...`);
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

  // Helper para mapear tipos de dicionário para nomes amigáveis
  const getDictionaryDisplayName = (tipo: string): string => {
    const mapping: Record<string, string> = {
      'gaucho_unificado': 'Gaúcho Unificado',
      'dialectal_I': 'Gaúcho Vol. I (Legacy)',
      'dialectal_II': 'Gaúcho Vol. II (Legacy)',
      'nordestino_navarro': 'Navarro 2014',
      'GUTENBERG': 'Gutenberg',
      'ROCHA_POMBO': 'Rocha Pombo (ABL)'
    };
    return mapping[tipo] || tipo;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Importação de Dicionários</h2>
          <p className="text-muted-foreground">Importe e gerencie dicionários lexicográficos com validação automática</p>
        </div>

        {/* ✅ FASE 3 - BLOCO 2: Configurações de Notificações em Tempo Real */}
        <NotificationSettings
          enabled={notificationsEnabled}
          soundEnabled={soundEnabled}
          onEnabledChange={setNotificationsEnabled}
          onSoundEnabledChange={setSoundEnabled}
        />

        {/* ✅ FASE 3: Metadata Cards dos Dicionários - 4 Dicionários Unificados */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Dicionários Disponíveis</h3>
          <p className="text-sm text-muted-foreground">Ordem recomendada de importação: Rocha Pombo → Navarro → Gaúcho → Gutenberg</p>
          <div className="grid gap-4 md:grid-cols-2">
            {/* 1️⃣ Rocha Pombo (ABL) - Sinônimos primeiro */}
            <DictionaryMetadataCard
              metadata={{
                nome: 'Rocha Pombo (ABL)',
                fonte: 'Academia Brasileira de Letras',
                edicao: '2ª edição',
                ano: 2011,
                tipo: 'rochaPombo',
                esperado: 50000,
                atual: jobs?.find(j => j.tipo_dicionario === 'ROCHA_POMBO')?.verbetes_inseridos || 0,
                githubUrl: 'https://github.com/ProfessorGeovaniHenrique/estilisticadecorpus/tree/main/public/dictionaries',
                descricao: 'Dicionário oficial de sinônimos da ABL, referência nacional para sinonímia e antonímia.',
                licenca: 'ABL - Uso Acadêmico',
                customActions: (
                  <div className="flex gap-2">
                    <BatchValidationDialog
                      batchSize={1000}
                      dictionaryType="rochaPombo"
                      onSuccess={() => queryClient.invalidateQueries()}
                    />
                    <BatchValidationDialog
                      batchSize={10000}
                      dictionaryType="rochaPombo"
                      onSuccess={() => queryClient.invalidateQueries()}
                    />
                  </div>
                )
              }}
              onImport={importRochaPombo}
              isImporting={isImportingRochaPombo}
            />

            {/* 2️⃣ Navarro 2014 - Regionalismo Nordestino */}
            <DictionaryMetadataCard
              metadata={{
                nome: 'Dicionário do Nordeste',
                fonte: 'Fred Navarro',
                edicao: '1ª edição',
                ano: 2014,
                tipo: 'nordestino_navarro',
                esperado: 15000,
                atual: jobs?.find(j => j.tipo_dicionario === 'nordestino_navarro')?.verbetes_inseridos || 0,
                githubUrl: 'https://raw.githubusercontent.com/ProfessorGeovaniHenrique/estilisticadecorpus/main/public/corpus/nordestino_navarro_2014.txt',
                descricao: 'Dicionário especializado do léxico nordestino com regionalismos, expressões idiomáticas e marcadores culturais. Inclui variações dialetais de todos os estados do Nordeste.',
                licenca: 'CEPE - Uso Acadêmico',
                customActions: (
                  <div className="flex gap-2">
                    <BatchValidationDialog
                      batchSize={1000}
                      dictionaryType="nordestino"
                      onSuccess={() => queryClient.invalidateQueries()}
                    />
                    <BatchValidationDialog
                      batchSize={10000}
                      dictionaryType="nordestino"
                      onSuccess={() => queryClient.invalidateQueries()}
                    />
                  </div>
                )
              }}
              onImport={importNavarro}
              isImporting={isImportingNavarro}
            />

            {/* 3️⃣ Gaúcho Unificado - Regionalismo Gaúcho (NOVO - substitui Vol I e II) */}
            <DictionaryMetadataCard
              metadata={{
                nome: 'Gaúcho Unificado',
                fonte: 'Vocabulário Sul-Rio-Grandense',
                edicao: 'Volumes I e II Unificados (A-Z)',
                ano: 1964,
                tipo: 'gaucho_unificado',
                esperado: 7000,
                atual: jobs?.find(j => j.tipo_dicionario === 'gaucho_unificado')?.verbetes_inseridos || 0,
                githubUrl: 'https://github.com/ProfessorGeovaniHenrique/estilisticadecorpus/blob/main/public/dictionaries/VOLI.txt',
                descricao: 'Léxico regionalista gaúcho completo com termos campeiros, platinismos e expressões típicas de A a Z.',
                licenca: 'Domínio Público',
                customActions: (
                  <div className="flex gap-2">
                    <BatchValidationDialog
                      batchSize={1000}
                      dictionaryType="dialectal"
                      onSuccess={() => queryClient.invalidateQueries()}
                    />
                    <BatchValidationDialog
                      batchSize={10000}
                      dictionaryType="dialectal"
                      onSuccess={() => queryClient.invalidateQueries()}
                    />
                  </div>
                )
              }}
              onImport={importGauchoUnificado}
              isImporting={isImportingGaucho}
            />

            {/* 4️⃣ Gutenberg - Dicionário Geral por último */}
            <DictionaryMetadataCard
              metadata={{
                nome: 'Dicionário Gutenberg',
                fonte: 'Projeto Gutenberg',
                ano: 2024,
                tipo: 'gutenberg',
                esperado: 700000,
                atual: jobs?.find(j => j.tipo_dicionario === 'GUTENBERG')?.verbetes_inseridos || 0,
                githubUrl: 'https://github.com/ProfessorGeovaniHenrique/estilisticadecorpus/tree/main/public/dictionaries',
                descricao: 'Dicionário completo da língua portuguesa com definições, etimologias e exemplos de uso.',
                licenca: 'Gutenberg License',
                customActions: (
                  <div className="flex gap-2">
                    <BatchValidationDialog
                      batchSize={1000}
                      dictionaryType="gutenberg"
                      onSuccess={() => queryClient.invalidateQueries()}
                    />
                    <BatchValidationDialog
                      batchSize={10000}
                      dictionaryType="gutenberg"
                      onSuccess={() => queryClient.invalidateQueries()}
                    />
                  </div>
                )
              }}
              onImport={importGutenberg}
              isImporting={isImportingGutenberg}
            />
          </div>
        </div>

        {/* ✅ FASE 5: Validação em Lote */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Validação em Lote</h3>
              <p className="text-sm text-muted-foreground">Valide automaticamente entradas com alta confiança (≥90%)</p>
            </div>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Dialectal</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <BatchValidationDialog 
                  batchSize={100} 
                  dictionaryType="dialectal"
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['lexicon-stats'] })}
                />
                <BatchValidationDialog 
                  batchSize={1000} 
                  dictionaryType="dialectal"
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['lexicon-stats'] })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gutenberg</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <BatchValidationDialog 
                  batchSize={100} 
                  dictionaryType="gutenberg"
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['lexicon-stats'] })}
                />
                <BatchValidationDialog 
                  batchSize={1000} 
                  dictionaryType="gutenberg"
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['lexicon-stats'] })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Rocha Pombo</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-xs">
                  Validado pela ABL
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">UNESP</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-xs">
                  Validado Academicamente
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {jobs && jobs.length > 0 && (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Jobs de Importação</h3>
              <p className="text-sm text-muted-foreground">
                {jobs.filter(j => j.status === 'concluido' && j.progresso === 100).length} completos • 
                {jobs.filter(j => j.status === 'processando' || j.status === 'iniciado').length} ativos
                {jobs.some(j => j.isStalled) && ` • ${jobs.filter(j => j.isStalled).length} travados`}
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
                        {getDictionaryDisplayName(job.tipo_dicionario)}
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{job.progresso}%</span>
                          {job.stalledMinutes !== undefined && job.stalledMinutes > 0 && (
                            <Badge variant="destructive" className="text-xs h-5">
                              Travado há {job.stalledMinutes}min
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Progress value={job.progresso} className="h-2" />
                      {isActive && job.verbetes_inseridos > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ~{Math.round((job.total_verbetes - job.verbetes_inseridos) / (job.verbetes_inseridos / ((Date.now() - new Date(job.tempo_inicio!).getTime()) / 60000)))} min restantes
                        </p>
                      )}
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
                          disabled={isImportingGaucho || isImportingGutenberg || isImportingRochaPombo || isImportingNavarro}
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
                            Remover {job.verbetes_inseridos.toLocaleString()} verbetes do {getDictionaryDisplayName(job.tipo_dicionario)}?
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
