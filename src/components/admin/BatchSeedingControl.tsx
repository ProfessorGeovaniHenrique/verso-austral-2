import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, Database, Activity, XCircle, RefreshCw } from 'lucide-react';
import { useBatchSeedingJob } from '@/hooks/useBatchSeedingJob';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface BatchSeedingControlProps {
  semanticLexiconCount: number;
  status: 'empty' | 'partial' | 'complete';
}

export function BatchSeedingControl({ semanticLexiconCount, status }: BatchSeedingControlProps) {
  const { activeJob, isLoading, progress, startJob, cancelJob, isProcessing, isJobAbandoned } = useBatchSeedingJob();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Auto-refresh quando há job ativo
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
      }, 30000); // 30 segundos
      
      return () => clearInterval(interval);
    }
  }, [isProcessing]);
  
  const handleExecute = async () => {
    const { error } = await startJob('all');
    if (error) {
      console.error('Error starting batch seeding:', error);
      toast.error('Erro ao iniciar batch seeding');
    } else {
      toast.success('Batch seeding iniciado com sucesso!');
    }
  };

  const handleCancelAbandoned = async () => {
    if (!activeJob) return;
    
    const { success } = await cancelJob(activeJob.id);
    if (success) {
      toast.success('Job travado cancelado com sucesso');
    } else {
      toast.error('Erro ao cancelar job');
    }
  };

  const handleCancelCurrent = async () => {
    if (!activeJob) return;
    
    const { success } = await cancelJob(activeJob.id);
    if (success) {
      toast.success('Job cancelado com sucesso');
    } else {
      toast.error('Erro ao cancelar job');
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'empty':
        return { 
          label: '⚠️ Vazio', 
          variant: 'destructive' as const,
          description: 'Léxico semântico não inicializado' 
        };
      case 'partial':
        return { 
          label: '🟡 Parcial', 
          variant: 'secondary' as const,
          description: 'Léxico parcialmente populado' 
        };
      case 'complete':
        return { 
          label: '✅ Completo', 
          variant: 'default' as const,
          description: 'Léxico completamente populado' 
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Batch Seeding - Léxico Semântico
            </CardTitle>
            {isProcessing && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLastUpdate(new Date())}
                title="Atualizar dados"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            {isJobAbandoned && (
              <Badge variant="destructive">⏰ Travado</Badge>
            )}
          </div>
        </div>
        {isProcessing && (
          <p className="text-xs text-muted-foreground mt-2">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Entradas no Léxico</p>
            <p className="text-2xl font-bold">{semanticLexiconCount.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Meta</p>
            <p className="text-2xl font-bold">2.000+</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Restantes</p>
            <p className="text-2xl font-bold text-muted-foreground">
              ~{Math.max(0, 2000 - semanticLexiconCount).toLocaleString()}
            </p>
          </div>
        </div>

        {activeJob && isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Activity className="h-4 w-4 animate-pulse text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Processamento em andamento</p>
                <p className="text-xs text-muted-foreground">
                  {activeJob.processed_words} palavras processadas
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="p-2 bg-blue-500/10 rounded text-center">
                <p className="font-medium text-blue-600">Morfológico</p>
                <p className="text-lg font-bold">{activeJob.morfologico_count}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded text-center">
                <p className="font-medium text-green-600">Herança</p>
                <p className="text-lg font-bold">{activeJob.heranca_count}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-purple-500/10 rounded text-center">
                <p className="font-medium text-purple-600">Gemini</p>
                <p className="text-lg font-bold">{activeJob.gemini_count}</p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded text-center">
                <p className="font-medium text-amber-600">GPT-5</p>
                <p className="text-lg font-bold">{activeJob.gpt5_count || 0}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded text-center">
                <p className="font-medium text-red-600">Falhas</p>
                <p className="text-lg font-bold">{activeJob.failed_count}</p>
              </div>
            </div>
            
            {(activeJob.gemini_count > 0 || activeJob.gpt5_count > 0) && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-center">
                <p className="text-xs text-muted-foreground">
                  Taxa de Sucesso: {' '}
                  <span className="font-bold text-foreground">
                    {((activeJob.gemini_count + (activeJob.gpt5_count || 0)) / 
                      Math.max(1, activeJob.processed_words - activeJob.morfologico_count - activeJob.heranca_count) * 100).toFixed(1)}%
                  </span>
                </p>
                {activeJob.gpt5_count > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    GPT-5 recuperou {activeJob.gpt5_count} palavra{activeJob.gpt5_count !== 1 ? 's' : ''} após falha do Gemini
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isProcessing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <XCircle className="h-4 w-4 mr-2" />
                {isJobAbandoned ? 'Cancelar Job Travado' : '⏹️ Cancelar Job Atual'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isJobAbandoned ? 'Cancelar Job Inativo' : 'Cancelar Job em Processamento'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isJobAbandoned 
                    ? 'Este job está sem atividade há mais de 10 minutos e será marcado como cancelado. Você poderá iniciar um novo batch seeding após cancelar.'
                    : 'Tem certeza que deseja cancelar este job? O progresso atual será perdido e você poderá iniciar um novo batch seeding.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={isJobAbandoned ? handleCancelAbandoned : handleCancelCurrent}>
                  Confirmar Cancelamento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="w-full" 
              disabled={isLoading || (isProcessing && !isJobAbandoned)}
            >
              <Play className="h-4 w-4 mr-2" />
              {isProcessing ? 'Executando Batch Seeding...' : 'Executar Batch Seeding'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Batch Seeding</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Esta operação irá processar ~2.000 palavras de alta frequência do léxico 
                  Gutenberg e Dialectal, aplicando regras morfológicas e Gemini batch.
                </p>
                <p className="font-medium">
                  Tempo estimado: 15-20 minutos
                </p>
                <p className="text-muted-foreground">
                  O processamento continua mesmo se você sair da página. 
                  Você receberá uma notificação quando concluir.
                </p>
                <p className="text-destructive">
                  ⚠️ Esta operação consome créditos de API do Gemini
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleExecute}>
                Confirmar Execução
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
