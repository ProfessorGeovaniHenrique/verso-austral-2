import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Play, Database, Activity, XCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { useBatchSeedingJob } from '@/hooks/useBatchSeedingJob';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { PIPELINE_METRIC_DEFINITIONS } from '@/lib/pipelineMetricDefinitions';

interface BatchSeedingControlProps {
  semanticLexiconCount: number;
  status: 'empty' | 'partial' | 'complete';
}

// Componente de métrica com tooltip
function MetricBox({ 
  label, 
  value, 
  tooltip, 
  colorClass 
}: { 
  label: string; 
  value: number | string; 
  tooltip: string; 
  colorClass?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`p-2 rounded text-center cursor-help ${colorClass || 'bg-muted/50'}`}>
            <div className="flex items-center justify-center gap-1">
              <p className="font-medium text-sm">{label}</p>
              <HelpCircle className="h-3 w-3 text-muted-foreground opacity-60" aria-hidden="true" />
            </div>
            <p className="text-lg font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BatchSeedingControl({ semanticLexiconCount, status }: BatchSeedingControlProps) {
  const { activeJob, isLoading, progress, startJob, cancelJob, isProcessing, isJobAbandoned } = useBatchSeedingJob();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const defs = PIPELINE_METRIC_DEFINITIONS.batchSeeding;
  
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

  // Calcular taxa de sucesso
  const calculateSuccessRate = () => {
    if (!activeJob) return '0.0';
    const aiProcessed = activeJob.processed_words - activeJob.morfologico_count - activeJob.heranca_count;
    if (aiProcessed <= 0) return '100.0';
    const aiSuccess = activeJob.gemini_count + (activeJob.gpt5_count || 0);
    return ((aiSuccess / aiProcessed) * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isJobAbandoned && (
            <Badge variant="destructive">⏰ Travado</Badge>
          )}
        </div>
        {isProcessing && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Atualizado: {lastUpdate.toLocaleTimeString()}
            </p>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLastUpdate(new Date())}
              aria-label="Atualizar dados do job"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
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
            <Activity className="h-4 w-4 animate-pulse text-primary" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium">Processamento em andamento</p>
              <p className="text-xs text-muted-foreground">
                {activeJob.processed_words} palavras processadas
              </p>
            </div>
          </div>
          
          {/* Metrics Grid with Tooltips */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MetricBox
              label="Morfológico"
              value={activeJob.morfologico_count}
              tooltip={defs.morfologico.tooltip}
              colorClass="bg-primary/10"
            />
            <MetricBox
              label="Herança"
              value={activeJob.heranca_count}
              tooltip={defs.heranca.tooltip}
              colorClass="bg-green-500/10"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <MetricBox
              label="Gemini"
              value={activeJob.gemini_count}
              tooltip={defs.gemini.tooltip}
              colorClass="bg-purple-500/10"
            />
            <MetricBox
              label="GPT-5"
              value={activeJob.gpt5_count || 0}
              tooltip={defs.gpt5.tooltip}
              colorClass="bg-amber-500/10"
            />
            <MetricBox
              label="Falhas"
              value={activeJob.failed_count}
              tooltip="Palavras que falharam no processamento por timeout, erro de API ou resposta inválida."
              colorClass="bg-red-500/10"
            />
          </div>
          
          {(activeJob.gemini_count > 0 || activeJob.gpt5_count > 0) && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-2 p-2 bg-muted/50 rounded text-center cursor-help">
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs text-muted-foreground">Taxa de Sucesso:</p>
                      <HelpCircle className="h-3 w-3 text-muted-foreground opacity-60" aria-hidden="true" />
                    </div>
                    <span className="font-bold text-foreground">
                      {calculateSuccessRate()}%
                    </span>
                    {activeJob.gpt5_count > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        GPT-5 recuperou {activeJob.gpt5_count} palavra{activeJob.gpt5_count !== 1 ? 's' : ''} após falha do Gemini
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px]">
                  <p>{defs.successRate.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <Button variant="destructive" className="w-full" aria-label={isJobAbandoned ? 'Cancelar job travado' : 'Cancelar job atual'}>
              <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
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
            aria-label="Executar batch seeding do léxico semântico"
          >
            <Play className="h-4 w-4 mr-2" aria-hidden="true" />
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
    </div>
  );
}
