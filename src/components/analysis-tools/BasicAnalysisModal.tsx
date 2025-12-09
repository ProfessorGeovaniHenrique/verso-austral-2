/**
 * BasicAnalysisModal
 * Sprint BASIC-PERSIST: Modal para processamento de ferramentas básicas
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useBasicToolsAnalysis, BasicToolStatus } from '@/hooks/useBasicToolsAnalysis';
import { useProgressWithETA } from '@/hooks/useProgressWithETA';
import { 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';

interface BasicAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusIcon = (status: BasicToolStatus['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'skipped':
      return <Clock className="h-4 w-4 text-muted-foreground/50" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: BasicToolStatus['status']) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    processing: 'default',
    completed: 'secondary',
    error: 'destructive',
    skipped: 'outline',
  };
  
  const labels: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    completed: 'Concluído',
    error: 'Erro',
    skipped: 'Ignorado',
  };
  
  return (
    <Badge variant={variants[status] || 'outline'} className="text-xs">
      {labels[status] || status}
    </Badge>
  );
};

export function BasicAnalysisModal({ open, onOpenChange }: BasicAnalysisModalProps) {
  const { 
    state, 
    progress, 
    processBasicAnalysis, 
    cancelAnalysis, 
    resetState,
    canProcess,
    hasResults 
  } = useBasicToolsAnalysis();
  
  const { clearAllToolsCache } = useAnalysisTools();
  
  const etaResult = useProgressWithETA(progress, state.startedAt);
  
  const completedCount = state.tools.filter(t => t.status === 'completed').length;
  const errorCount = state.tools.filter(t => t.status === 'error').length;
  const totalTools = state.tools.length;
  
  const handleClearCache = () => {
    clearAllToolsCache();
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Processamento Básico
            {hasResults && !state.isProcessing && (
              <Badge variant="secondary" className="ml-2">
                {completedCount}/{totalTools}
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {errorCount} erro{errorCount > 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Processa Wordlist, N-grams e Dispersão automaticamente.
            Keywords e KWIC requerem configuração manual.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        {state.isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processando...</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {etaResult && (
              <p className="text-xs text-muted-foreground text-right">
                {etaResult.remainingFormatted}
              </p>
            )}
          </div>
        )}

        {/* Tool List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {state.tools.map((tool) => (
            <div 
              key={tool.key}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                tool.status === 'processing' && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
                tool.status === 'completed' && "border-green-500/30 bg-green-500/5",
                tool.status === 'error' && "border-destructive/30 bg-destructive/5",
                tool.status === 'pending' && "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(tool.status)}
                <span className={cn(
                  "font-medium",
                  tool.status === 'completed' && "text-green-600 dark:text-green-400",
                  tool.status === 'error' && "text-destructive"
                )}>
                  {tool.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(tool.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Error Details */}
        {state.tools.some(t => t.error) && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {state.tools.filter(t => t.error).map(t => (
              <p key={t.key}>• {t.label}: {t.error}</p>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!state.isProcessing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetState}
                disabled={!hasResults}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Resetar
              </Button>
              <Button
                onClick={processBasicAnalysis}
                disabled={!canProcess}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {hasResults ? 'Reprocessar' : 'Iniciar'}
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={cancelAnalysis}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
