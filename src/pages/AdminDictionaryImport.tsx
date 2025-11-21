import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MVPHeader } from '@/components/mvp/MVPHeader';
import { MVPFooter } from '@/components/mvp/MVPFooter';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { CancelJobDialog } from '@/components/advanced/CancelJobDialog';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@/lib/notifications';
import { useDictionaryImportJobs } from '@/hooks/useDictionaryImportJobs';
import { ClearDictionariesCard } from '@/components/advanced/lexicon-status/ClearDictionariesCard';
import { BatchValidationDialog } from '@/components/advanced/lexicon-status/BatchValidationDialog';
import { useLexiconStats } from '@/hooks/useLexiconStats';
import { DICTIONARY_CONFIG, DICTIONARY_LIST, getDictionaryConfig } from '@/config/dictionaries';
import { 
  PlayCircle, 
  XCircle, 
  CheckCircle, 
  Loader2, 
  Database,
  AlertCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function AdminDictionaryImport() {
  const navigate = useNavigate();
  const { data: jobs, isLoading, refetch } = useDictionaryImportJobs(2000);
  const [importingDict, setImportingDict] = useState<string | null>(null);
  const [clearingDict, setClearingDict] = useState<string | null>(null);
  const { data: lexiconStats, refetch: refetchStats } = useLexiconStats();

  // Separar jobs ativos e recentes
  const activeJobs = jobs?.filter(j => 
    ['iniciado', 'processando', 'pendente'].includes(j.status)
  ) || [];
  
  const recentJobs = jobs?.filter(j => 
    ['concluido', 'erro', 'cancelado'].includes(j.status)
  ).slice(0, 5) || [];

  const handleImport = async (dictId: string, file?: File) => {
    setImportingDict(dictId);
    
    try {
      const config = Object.values(DICTIONARY_CONFIG).find(c => c.id === dictId);
      if (!config) throw new Error(`Dicionário ${dictId} não configurado`);
      
      // Se é Gutenberg e tem arquivo, fazer upload
      if (dictId === 'gutenberg' && file) {
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await supabase.functions.invoke(config.importEndpoint, {
          body: formData,
        });

        if (error) throw error;

        notifications.success(
          'Upload concluído',
          `${config.name}: CSV processado com sucesso`
        );
      } else {
        // Timeout de 30s para evitar travamento do frontend
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
          const { data, error } = await supabase.functions.invoke(config.importEndpoint, {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (error) throw error;

          notifications.success(
            'Importação iniciada',
            `${config.name}: ${data.message || 'Processando em background'}`
          );
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            throw new Error('Timeout ao iniciar importação. A operação pode ainda estar sendo processada no servidor.');
          }
          throw err;
        }
      }
      
      await refetch();
    } catch (error: any) {
      notifications.error('Erro ao iniciar importação', error.message);
    } finally {
      setImportingDict(null);
    }
  };

  const handleFileUpload = (dictId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      notifications.error('Formato inválido', 'Por favor, selecione um arquivo CSV');
      return;
    }

    handleImport(dictId, file);
  };

  const handleClear = async (dictId: string) => {
    const config = Object.values(DICTIONARY_CONFIG).find(c => c.id === dictId);
    if (!config) throw new Error(`Dicionário ${dictId} não configurado`);
    
    if (!confirm(`⚠️ Confirma limpeza de TODOS os dados do dicionário ${config.name}?`)) {
      return;
    }

    setClearingDict(dictId);
    
    try {
      const { error } = await supabase.from(config.table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      notifications.success('Dicionário limpo', `${config.name} resetado com sucesso`);
      await refetch();
    } catch (error: any) {
      notifications.error('Erro ao limpar', error.message);
    } finally {
      setClearingDict(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any }> = {
      iniciado: { variant: 'secondary', icon: Clock },
      processando: { variant: 'default', icon: Loader2 },
      concluido: { variant: 'default', icon: CheckCircle },
      erro: { variant: 'destructive', icon: AlertCircle },
      cancelado: { variant: 'outline', icon: XCircle },
    };

    const config = variants[status] || variants.iniciado;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className={`h-3 w-3 ${status === 'processando' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MVPHeader />
        <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <MVPFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MVPHeader />
      
      <div className="container mx-auto pt-32 pb-8 px-4 max-w-7xl">
        <AdminBreadcrumb currentPage="Importação de Dicionários" />
        
        {/* Card de Limpeza */}
        <div className="mb-6">
          <ClearDictionariesCard 
            stats={lexiconStats}
            onSuccess={() => {
              refetchStats();
              refetch();
            }}
          />
        </div>

        {/* Card de Estatísticas de Validação */}
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20 ring-2 ring-primary/30">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Status de Validação</h2>
                  <p className="text-sm text-muted-foreground">Progresso da revisão humana dos léxicos</p>
                </div>
              </div>
              {!lexiconStats && (
                <Badge variant="outline" className="gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando...
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Gutenberg */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    📖 Gutenberg
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {lexiconStats?.gutenberg?.total > 0 
                      ? ((lexiconStats.gutenberg.validados / lexiconStats.gutenberg.total) * 100).toFixed(1)
                      : 0}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>✅ Validados: {lexiconStats?.gutenberg?.validados?.toLocaleString('pt-BR') || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>⏳ Pendentes: {((lexiconStats?.gutenberg?.total || 0) - (lexiconStats?.gutenberg?.validados || 0)).toLocaleString('pt-BR')}</span>
                  </div>
                  <Progress 
                    value={lexiconStats?.gutenberg?.total > 0 
                      ? (lexiconStats.gutenberg.validados / lexiconStats.gutenberg.total) * 100
                      : 0} 
                    className="h-2"
                  />
                </div>
              </div>

              {/* Gaúcho Unificado */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    🧉 Gaúcho
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {lexiconStats?.gaucho?.total > 0 
                      ? ((lexiconStats.gaucho.validados / lexiconStats.gaucho.total) * 100).toFixed(1)
                      : 0}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>✅ Validados: {lexiconStats?.gaucho?.validados?.toLocaleString('pt-BR') || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>⏳ Pendentes: {((lexiconStats?.gaucho?.total || 0) - (lexiconStats?.gaucho?.validados || 0)).toLocaleString('pt-BR')}</span>
                  </div>
                  <Progress 
                    value={lexiconStats?.gaucho?.total > 0 
                      ? (lexiconStats.gaucho.validados / lexiconStats.gaucho.total) * 100
                      : 0} 
                    className="h-2"
                  />
                </div>
              </div>

              {/* Geral */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    🌍 Geral
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {lexiconStats?.overall?.validation_rate 
                      ? (lexiconStats.overall.validation_rate * 100).toFixed(1)
                      : 0}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>✅ Validados: {((lexiconStats?.gaucho?.validados || 0) + (lexiconStats?.gutenberg?.validados || 0)).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>⏳ Pendentes: {(((lexiconStats?.gaucho?.total || 0) - (lexiconStats?.gaucho?.validados || 0)) + ((lexiconStats?.gutenberg?.total || 0) - (lexiconStats?.gutenberg?.validados || 0))).toLocaleString('pt-BR')}</span>
                  </div>
                  <Progress 
                    value={lexiconStats?.overall?.validation_rate 
                      ? lexiconStats.overall.validation_rate * 100
                      : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 🧪 Card de Teste - Gaúcho Refatorado */}
        <Card className="mb-6 border-2 border-green-500/30 bg-green-50 dark:bg-green-950/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🐴</span>
                <div>
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                    🧪 Dicionário Gaúcho V2 (Teste)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Versão refatorada com correção de jobId - Em teste
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-green-500 text-green-600">
                TESTING
              </Badge>
            </div>

            {(() => {
              const testJob = activeJobs.find(j => j.tipo_dicionario === 'gaucho_unificado_v2');
              const isImportingTest = importingDict === 'gaucho_refatorado';
              
              return (
                <div className="space-y-3">
                  {testJob && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progresso</span>
                        {getStatusBadge(testJob.status)}
                      </div>
                      <Progress value={testJob.progresso || 0} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{testJob.verbetes_processados?.toLocaleString('pt-BR') || 0} processados</span>
                        <span>{testJob.progresso?.toFixed(1) || 0}%</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {!testJob ? (
                      <>
                        <Button
                          size="default"
                          onClick={async () => {
                            setImportingDict('gaucho_refatorado');
                            try {
                              const { data, error } = await supabase.functions.invoke(
                                'import-dialectal-backend',
                                {
                                  body: { 
                                    tipoDicionario: 'gaucho_unificado_v2' 
                                  }
                                }
                              );
                              
                              if (error) throw error;
                              
                              notifications.success(
                                'Teste iniciado',
                                'Dicionário Gaúcho V2 em processamento'
                              );
                              await refetch();
                            } catch (error: any) {
                              notifications.error('Erro no teste', error.message);
                            } finally {
                              setImportingDict(null);
                            }
                          }}
                          disabled={isImportingTest}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {isImportingTest ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <PlayCircle className="h-4 w-4 mr-2" />
                          )}
                          🧪 Testar Importação V2
                        </Button>
                        <BatchValidationDialog
                          batchSize={1000}
                          dictionaryType="gaucho"
                          onSuccess={() => refetch()}
                        />
                      </>
                    ) : (
                      <>
                        <CancelJobDialog
                          jobId={testJob.id}
                          jobType="Gaúcho V2 (Teste)"
                          onCancelled={() => refetch()}
                        />
                        <BatchValidationDialog
                          batchSize={1000}
                          dictionaryType="gaucho"
                          onSuccess={() => refetch()}
                        />
                      </>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    ℹ️ Este card usa a lógica corrigida com jobId. Se funcionar, substituirá o card antigo.
                  </p>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Quick Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {DICTIONARY_LIST.map((dict) => {
            const activeJob = activeJobs.find(j => j.tipo_dicionario === dict.id);
            const isImporting = importingDict === dict.id;
            const isClearing = clearingDict === dict.id;

            return (
              <Card key={dict.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{dict.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{dict.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        ~{dict.estimatedEntries.toLocaleString('pt-BR')} verbetes
                      </p>
                    </div>
                  </div>
                  {activeJob && getStatusBadge(activeJob.status)}
                </div>

                {activeJob && (
                  <div className="space-y-2">
                    <Progress value={activeJob.progresso || 0} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{activeJob.verbetes_processados?.toLocaleString('pt-BR') || 0} processados</span>
                      <span>{activeJob.progresso?.toFixed(1) || 0}%</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {!activeJob && (
                    <>
                      {dict.id === 'gutenberg' ? (
                        <label className="flex-1">
                          <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => handleFileUpload(dict.id, e)}
                            disabled={isImporting || isClearing}
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={isImporting || isClearing}
                            asChild
                          >
                            <span>
                              {isImporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <><PlayCircle className="h-4 w-4 mr-1" /> Upload CSV</>
                              )}
                            </span>
                          </Button>
                        </label>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleImport(dict.id)}
                          disabled={isImporting || isClearing}
                          className="flex-1"
                        >
                          {isImporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <><PlayCircle className="h-4 w-4 mr-1" /> Importar</>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClear(dict.id)}
                        disabled={isImporting || isClearing}
                      >
                        {isClearing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                  {activeJob && (
                    <CancelJobDialog
                      jobId={activeJob.id}
                      jobType={dict.name}
                      onCancelled={() => refetch()}
                    />
                  )}
                </div>

                {dict.validationRoute && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(dict.validationRoute!)}
                    className="w-full text-xs"
                  >
                    <Database className="h-3 w-3 mr-1" />
                    Validar Dados
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {/* Active Jobs Monitor */}
        {activeJobs.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Jobs Ativos ({activeJobs.length})
            </h2>
            <div className="space-y-4">
              {activeJobs.map((job) => {
                const config = getDictionaryConfig(job.tipo_dicionario);
                if (!config) {
                  console.error(`Config não encontrado para: ${job.tipo_dicionario}`);
                  return null;
                }
                return (
                  <div key={job.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config?.icon || '📚'}</span>
                        <div>
                          <h3 className="font-semibold">{config?.name || job.tipo_dicionario}</h3>
                          <p className="text-sm text-muted-foreground">
                            Iniciado {formatDistanceToNow(new Date(job.tempo_inicio || ''), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(job.status)}
                        <CancelJobDialog
                          jobId={job.id}
                          jobType={config?.name || job.tipo_dicionario}
                          onCancelled={() => refetch()}
                        />
                      </div>
                    </div>
                    
                    <Progress value={job.progresso || 0} className="h-2" />
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Processados</p>
                        <p className="font-semibold">
                          {job.verbetes_processados?.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Inseridos</p>
                        <p className="font-semibold">
                          {job.verbetes_inseridos?.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Progresso</p>
                        <p className="font-semibold">{job.progresso?.toFixed(1) || 0}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Recent Jobs History */}
        {recentJobs.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico Recente
            </h2>
            <div className="space-y-3">
              {recentJobs.map((job) => {
                const config = getDictionaryConfig(job.tipo_dicionario);
                if (!config) {
                  console.error(`Config não encontrado para: ${job.tipo_dicionario}`);
                  return null;
                }
                return (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{config?.icon || '📚'}</span>
                      <div>
                        <h3 className="font-medium text-sm">{config?.name || job.tipo_dicionario}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(job.atualizado_em || ''), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="font-semibold">
                          {job.verbetes_inseridos?.toLocaleString('pt-BR') || 0} verbetes
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.progresso?.toFixed(1) || 0}% completo
                        </p>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <MVPFooter />
    </div>
  );
}
