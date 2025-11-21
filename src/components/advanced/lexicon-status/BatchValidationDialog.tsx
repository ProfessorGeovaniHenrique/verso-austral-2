import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface BatchValidationDialogProps {
  batchSize: number;
  dictionaryType: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function BatchValidationDialog({ batchSize, dictionaryType, onSuccess, trigger }: BatchValidationDialogProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleValidate = async () => {
    setIsValidating(true);
    
    try {
      toast.info(`Iniciando validação de ${batchSize} entradas...`);
      
      const { data, error } = await supabase.functions.invoke('validate-lexicon-batch', {
        body: {
          dictionaryType,
          batchSize,
        }
      });

      if (error) throw error;

      // Invalidar todas as queries relacionadas para forçar atualização
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['backend-lexicon'] }),
        queryClient.invalidateQueries({ queryKey: ['lexicon-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['dialectal-lexicon'] }),
      ]);

      // Buscar stats atualizadas para o toast
      const newStats = queryClient.getQueryData(['lexicon-stats']) as any;
      
      const dictionaryLabel = getDictionaryLabel();
      const statsInfo = newStats ? 
        `📊 ${dictionaryLabel}: ${newStats[dictionaryType === 'dialectal' ? 'gaucho' : 'gutenberg']?.validados?.toLocaleString('pt-BR') || 0} validados | ${((newStats[dictionaryType === 'dialectal' ? 'gaucho' : 'gutenberg']?.total || 0) - (newStats[dictionaryType === 'dialectal' ? 'gaucho' : 'gutenberg']?.validados || 0)).toLocaleString('pt-BR')} pendentes` 
        : '';

      toast.success(
        `✅ ${data.validated} entradas validadas com sucesso!`,
        {
          description: statsInfo || (data.skipped > 0 ? `${data.skipped} já estavam validadas` : undefined),
          duration: 5000,
        }
      );
      
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro na validação em lote:', error);
      toast.error(`Erro ao validar: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const getDictionaryLabel = () => {
    const labels: Record<string, string> = {
      'dialectal': 'Gaúcho Unificado',
      'gutenberg': 'Gutenberg',
      'rochaPombo': 'Rocha Pombo',
      'unesp': 'UNESP',
      'navarro': 'Navarro 2014'
    };
    return labels[dictionaryType] || dictionaryType;
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Validar {batchSize}
          </Button>
        )}
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Validação em Lote
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <div className="flex items-start gap-2 text-yellow-600 dark:text-yellow-500">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                Esta ação vai marcar <strong>{batchSize} entradas não validadas</strong> do dicionário{' '}
                <Badge variant="outline" className="mx-1">{getDictionaryLabel()}</Badge>
                como validadas automaticamente.
              </div>
            </div>

            <div className="text-sm space-y-2 text-foreground">
              <div><strong>Critérios de validação:</strong></div>
              <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                <li>Confiança de extração ≥ 90%</li>
                <li>Campos obrigatórios preenchidos</li>
                <li>Sem erros de parsing</li>
                <li>Formato de dados correto</li>
              </ul>
            </div>

            <div className="text-sm text-muted-foreground">
              Apenas entradas que atendem aos critérios serão validadas.
              As demais serão mantidas para revisão manual.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isValidating}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleValidate}
            disabled={isValidating}
            className="gap-2"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                Validar {batchSize} Entradas
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
