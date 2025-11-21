import { Play, Pause, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProcessingControlProps {
  isProcessing: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ProcessingControl({
  isProcessing,
  isPaused,
  onStart,
  onPause,
  onResume,
  onCancel,
  disabled = false,
}: ProcessingControlProps) {
  return (
    <div className="flex items-center gap-2">
      {!isProcessing && !isPaused && (
        <Button onClick={onStart} disabled={disabled}>
          <Play className="mr-2 h-4 w-4" />
          Iniciar Processamento
        </Button>
      )}

      {isProcessing && !isPaused && (
        <>
          <Button variant="secondary" onClick={onPause} disabled={disabled}>
            <Pause className="mr-2 h-4 w-4" />
            Pausar
          </Button>
          <Button variant="destructive" onClick={onCancel} disabled={disabled}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </>
      )}

      {isPaused && (
        <>
          <Button onClick={onResume} disabled={disabled}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retomar
          </Button>
          <Button variant="destructive" onClick={onCancel} disabled={disabled}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </>
      )}
    </div>
  );
}
