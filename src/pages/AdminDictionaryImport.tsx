import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MVPHeader } from '@/components/mvp/MVPHeader';
import { MVPFooter } from '@/components/mvp/MVPFooter';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@/lib/notifications';
import { useDictionaryImportJobs } from '@/hooks/useDictionaryImportJobs';
import { DICTIONARY_CONFIG, DICTIONARY_LIST } from '@/config/dictionaries';
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
  const [cancellingJob, setCancellingJob] = useState<string | null>(null);
  const [clearingDict, setClearingDict] = useState<string | null>(null);

  // Separar jobs ativos e recentes
  const activeJobs = jobs?.filter(j => 
    ['iniciado', 'processando', 'pendente'].includes(j.status)
  ) || [];
  
  const recentJobs = jobs?.filter(j => 
    ['concluido', 'erro', 'cancelado'].includes(j.status)
  ).slice(0, 5) || [];

  const handleImport = async (dictId: string) => {
    setImportingDict(dictId);
    
    try {
      const config = DICTIONARY_CONFIG[dictId];
      const { data, error } = await supabase.functions.invoke(config.importEndpoint);

      if (error) throw error;

      notifications.success(
        'Importação iniciada',
        `${config.name}: ${data.message || 'Processando em background'}`
      );
      
      await refetch();
    } catch (error: any) {
      notifications.error('Erro ao iniciar importação', error.message);
    } finally {
      setImportingDict(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    setCancellingJob(jobId);
    
    try {
      const { data, error } = await supabase.rpc('cancel_job_atomic', {
        p_job_id: jobId,
        p_user_id: (await supabase.auth.getUser()).data.user?.id || '',
        p_reason: 'Cancelamento manual pelo usuário',
      });

      if (error) throw error;
      if (!data?.[0]?.success) throw new Error(data?.[0]?.message || 'Falha ao cancelar');

      notifications.success('Job cancelado', data[0].message);
      await refetch();
    } catch (error: any) {
      notifications.error('Erro ao cancelar job', error.message);
    } finally {
      setCancellingJob(null);
    }
  };

  const handleClear = async (dictId: string) => {
    if (!confirm(`⚠️ Confirma limpeza de TODOS os dados do dicionário ${DICTIONARY_CONFIG[dictId].name}?`)) {
      return;
    }

    setClearingDict(dictId);
    
    try {
      const config = DICTIONARY_CONFIG[dictId];
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
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <AdminBreadcrumb currentPage="Importação de Dicionários" />
        
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
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(activeJob.id)}
                      disabled={cancellingJob === activeJob.id}
                      className="flex-1"
                    >
                      {cancellingJob === activeJob.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><XCircle className="h-4 w-4 mr-1" /> Cancelar</>
                      )}
                    </Button>
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
                const config = DICTIONARY_CONFIG[job.tipo_dicionario.replace(/_/g, '')];
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
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancel(job.id)}
                          disabled={cancellingJob === job.id}
                        >
                          {cancellingJob === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </Button>
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
                const config = DICTIONARY_CONFIG[job.tipo_dicionario.replace(/_/g, '')];
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
