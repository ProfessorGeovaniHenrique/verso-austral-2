/**
 * FullAnalysisModal
 * Sprint PERSIST-1: Modal de progresso para processamento completo
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Loader2, 
  Clock, 
  AlertCircle,
  Microscope,
  X
} from 'lucide-react';
import { useFullAnalysis, ToolStatus } from '@/hooks/useFullAnalysis';
import { useProgressWithETA } from '@/hooks/useProgressWithETA';

interface FullAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ToolStatusRow({ tool, isCurrent }: { tool: ToolStatus; isCurrent: boolean }) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
      isCurrent ? 'bg-accent/50' : ''
    }`}>
      <div className="flex items-center gap-2">
        {tool.status === 'completed' && (
          <Check className="h-4 w-4 text-green-500" />
        )}
        {tool.status === 'processing' && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {tool.status === 'pending' && (
          <Clock className="h-4 w-4 text-muted-foreground" />
        )}
        {tool.status === 'error' && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
        <span className={`text-sm ${
          tool.status === 'completed' ? 'text-green-600 dark:text-green-400' :
          tool.status === 'processing' ? 'font-medium' :
          tool.status === 'error' ? 'text-destructive' :
          'text-muted-foreground'
        }`}>
          {tool.label}
        </span>
      </div>
      <Badge variant={
        tool.status === 'completed' ? 'default' :
        tool.status === 'processing' ? 'secondary' :
        tool.status === 'error' ? 'destructive' :
        'outline'
      } className="text-xs">
        {tool.status === 'completed' && 'Concluído'}
        {tool.status === 'processing' && 'Processando...'}
        {tool.status === 'pending' && 'Pendente'}
        {tool.status === 'error' && 'Erro'}
      </Badge>
    </div>
  );
}

export function FullAnalysisModal({ open, onOpenChange }: FullAnalysisModalProps) {
  const { 
    state, 
    progress, 
    processAnalysis, 
    cancelAnalysis, 
    canProcess,
    hasResults 
  } = useFullAnalysis();
  
  const progressETA = useProgressWithETA(progress, state.startedAt);
  const formattedETA = progressETA?.remainingFormatted;

  const handleStart = () => {
    processAnalysis();
  };

  const handleClose = () => {
    if (state.isProcessing) {
      cancelAnalysis();
    }
    onOpenChange(false);
  };

  const completedCount = state.tools.filter(t => t.status === 'completed').length;
  const totalCount = state.tools.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5" />
            {state.isProcessing ? 'Processando Análise Completa' : 'Análise Completa'}
          </DialogTitle>
          <DialogDescription>
            {state.isProcessing 
              ? 'Processando todas as 7 ferramentas de análise estilística...'
              : hasResults 
                ? 'Análise concluída. Você pode navegar entre as abas sem perder dados.'
                : 'Execute todas as análises de uma vez e navegue livremente entre as abas.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lista de ferramentas */}
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            {state.tools.map((tool, index) => (
              <ToolStatusRow 
                key={tool.key} 
                tool={tool} 
                isCurrent={state.currentToolIndex === index}
              />
            ))}
          </div>

          {/* Barra de progresso geral */}
          {(state.isProcessing || hasResults) && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedCount}/{totalCount} ferramentas</span>
                {state.isProcessing && formattedETA && (
                  <span>ETA: {formattedETA}</span>
                )}
                {!state.isProcessing && hasResults && (
                  <span className="text-green-600">Completo</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2">
          {state.isProcessing ? (
            <Button variant="destructive" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={handleStart} disabled={!canProcess}>
                <Microscope className="h-4 w-4 mr-2" />
                {hasResults ? 'Reprocessar' : 'Iniciar Análise'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
