import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDictionaryImportJobs } from '@/hooks/useDictionaryImportJobs';
import { Database, FileText, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function DictionaryImportTester() {
  const [isImportingHouaiss, setIsImportingHouaiss] = useState(false);
  const [isImportingUnesp, setIsImportingUnesp] = useState(false);
  const { data: jobs, isLoading: jobsLoading } = useDictionaryImportJobs(2000);

  const mockHouaissData = `alegre « adj. » 1 feliz, contente: festivo, jovial > triste, melancólico
triste « adj. » 1 que demonstra tristeza: melancólico, pesaroso > alegre, feliz
bonito « adj. » 1 que tem beleza: belo, formoso > feio, horrível`;

  const mockUnespData = `alegre adj. que expressa ou demonstra alegria [Os convidados estavam alegres; A música alegre contagiava todos] (Popular)

bonito adj. que tem beleza física ou estética [O jardim estava bonito na primavera; Que bonito esse quadro!] (Informal)`;

  const testHouaissImport = async () => {
    setIsImportingHouaiss(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-houaiss-dictionary', {
        body: { fileContent: mockHouaissData }
      });

      if (error) throw error;

      if (data.jobId) {
        toast.success(`✅ JobId retornado: ${data.jobId}`, {
          description: data.message,
          duration: 5000
        });
      } else {
        toast.error('❌ JobId NÃO retornado no response!', {
          description: 'Esperado: { jobId, message }',
          duration: 5000
        });
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsImportingHouaiss(false);
    }
  };

  const testUnespImport = async () => {
    setIsImportingUnesp(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-unesp-dictionary', {
        body: { fileContent: mockUnespData }
      });

      if (error) throw error;

      if (data.jobId) {
        toast.success(`✅ JobId retornado: ${data.jobId}`, {
          description: data.message,
          duration: 5000
        });
      } else {
        toast.error('❌ JobId NÃO retornado no response!', {
          description: 'Esperado: { jobId, message }',
          duration: 5000
        });
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsImportingUnesp(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processando':
      case 'iniciado':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'concluido': 'default',
      'erro': 'destructive',
      'processando': 'secondary',
      'iniciado': 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Teste de Importação de Dicionários (Fase 1)
          </CardTitle>
          <CardDescription>
            Valida que o jobId é retornado corretamente e que o processamento ocorre em background
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              onClick={testHouaissImport} 
              disabled={isImportingHouaiss}
              className="w-full"
            >
              {isImportingHouaiss ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Testar Houaiss (3 verbetes)
                </>
              )}
            </Button>

            <Button 
              onClick={testUnespImport} 
              disabled={isImportingUnesp}
              className="w-full"
              variant="secondary"
            >
              {isImportingUnesp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Testar UNESP (2 verbetes)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs de Importação (Tempo Real)</CardTitle>
          <CardDescription>
            Acompanhe o progresso dos jobs criados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="font-medium">
                        {job.tipo_dicionario.toUpperCase()}
                      </span>
                      {getStatusBadge(job.status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.criado_em).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>

                  {job.status === 'processando' || job.status === 'iniciado' ? (
                    <div className="space-y-2">
                      <Progress value={job.progresso || 0} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {job.verbetes_processados || 0} / {job.total_verbetes || 0} verbetes
                        </span>
                        <span>{Math.round(job.progresso || 0)}%</span>
                      </div>
                    </div>
                  ) : job.status === 'concluido' ? (
                    <div className="text-sm text-muted-foreground">
                      ✅ {job.verbetes_inseridos} verbetes inseridos
                      {job.erros > 0 && ` • ${job.erros} erros`}
                    </div>
                  ) : job.status === 'erro' ? (
                    <div className="text-sm text-destructive">
                      ❌ {job.erro_mensagem}
                    </div>
                  ) : null}

                  <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2">
                    Job ID: {job.id}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum job encontrado. Clique nos botões acima para testar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
