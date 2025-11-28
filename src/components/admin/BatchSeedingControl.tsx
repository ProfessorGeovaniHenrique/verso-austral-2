import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, Database, Activity } from 'lucide-react';
import { useBatchSeedingJob } from '@/hooks/useBatchSeedingJob';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface BatchSeedingControlProps {
  semanticLexiconCount: number;
  status: 'empty' | 'partial' | 'complete';
}

export function BatchSeedingControl({ semanticLexiconCount, status }: BatchSeedingControlProps) {
  const { activeJob, isLoading, progress, startJob, isProcessing } = useBatchSeedingJob();
  
  const handleExecute = async () => {
    const { error } = await startJob('all');
    if (error) {
      console.error('Error starting batch seeding:', error);
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
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Batch Seeding - Léxico Semântico
          </CardTitle>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
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
            
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-blue-500/10 rounded text-center">
                <p className="font-medium text-blue-600">Morfológico</p>
                <p className="text-lg font-bold">{activeJob.morfologico_count}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded text-center">
                <p className="font-medium text-green-600">Herança</p>
                <p className="text-lg font-bold">{activeJob.heranca_count}</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded text-center">
                <p className="font-medium text-purple-600">Gemini</p>
                <p className="text-lg font-bold">{activeJob.gemini_count}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded text-center">
                <p className="font-medium text-red-600">Falhas</p>
                <p className="text-lg font-bold">{activeJob.failed_count}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="w-full" 
              disabled={isLoading || isProcessing}
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
