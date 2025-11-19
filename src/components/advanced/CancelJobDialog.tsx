import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CancelJobDialogProps {
  jobId: string;
  jobType: string;
  onCancelled?: () => void;
}

export function CancelJobDialog({ jobId, jobType, onCancelled }: CancelJobDialogProps) {
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCancel = async () => {
    if (reason.trim().length < 5) {
      toast.error('Por favor, forneça um motivo com pelo menos 5 caracteres');
      return;
    }

    setIsCancelling(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-dictionary-job', {
        body: { jobId, reason: reason.trim() }
      });

      if (error) throw error;

      toast.success('Job cancelado com sucesso usando transação atômica!');

      setIsOpen(false);
      setReason('');
      onCancelled?.();
    } catch (error: any) {
      toast.error(`Erro ao cancelar job: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          size="sm" 
          variant="destructive"
          className="flex items-center gap-1"
        >
          <XCircle className="h-3 w-3" />
          Cancelar Job
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Cancelar Importação</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a cancelar a importação do <strong>{jobType}</strong>.
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do cancelamento *</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Arquivo incorreto, erro nos dados, teste, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 5 caracteres
            </p>
            <p className="text-xs text-primary/70 mt-2">
              🔒 Cancelamento usa advisory locks para prevenir race conditions
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isCancelling || reason.trim().length < 5}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              'Confirmar Cancelamento'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
