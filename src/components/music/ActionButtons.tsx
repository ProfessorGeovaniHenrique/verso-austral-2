import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, X, Download, RotateCcw } from 'lucide-react';
import { WorkflowStep } from './ProcessingPipeline';

interface ActionButtonsProps {
  currentStep: WorkflowStep;
  onNext?: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  onExport?: () => void;
  onReset?: () => void;
  isProcessing?: boolean;
}

export function ActionButtons({
  currentStep,
  onNext,
  onBack,
  onCancel,
  onExport,
  onReset,
  isProcessing = false,
}: ActionButtonsProps) {
  const showBack = currentStep !== 'upload';
  const showNext = ['upload', 'mapping', 'extraction'].includes(currentStep);
  const showCancel = ['processing', 'enrichment'].includes(currentStep) && isProcessing;
  const showExport = currentStep === 'results';
  const showReset = currentStep === 'results';

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-2">
        {showBack && onBack && (
          <Button variant="outline" onClick={onBack} disabled={isProcessing}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {showCancel && onCancel && (
          <Button variant="destructive" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar Processamento
          </Button>
        )}

        {showExport && onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Resultados
          </Button>
        )}

        {showReset && onReset && (
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Novo Processamento
          </Button>
        )}

        {showNext && onNext && (
          <Button onClick={onNext} disabled={isProcessing}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
