import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scissors, Loader2, Check } from 'lucide-react';

interface DivideCorpusButtonProps {
  corpusType: 'gaucho' | 'nordestino';
}

export function DivideCorpusButton({ corpusType }: DivideCorpusButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Poll logs para atualizar progresso
  useEffect(() => {
    if (!isProcessing) return;

    const pollInterval = setInterval(async () => {
      try {
        // Buscar logs recentes da edge function
        const { data: logs } = await supabase.functions.invoke('supabase-edge-function-logs', {
          body: { 
            functionName: 'divide-and-upload-corpus',
            limit: 20
          }
        }).catch(() => ({ data: null }));

        if (logs && Array.isArray(logs)) {
          // Procurar por logs de progresso estruturados
          for (const log of logs) {
            const message = log.event_message || log.message || '';
            const match = message.match(/PROGRESS:(\d+):(.*)/);
            if (match) {
              const progressValue = parseInt(match[1]);
              const statusText = match[2];
              
              setProgress(progressValue);
              setStatusMessage(statusText);
              
              if (progressValue >= 100) {
                setIsComplete(true);
                setIsProcessing(false);
                clearInterval(pollInterval);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Erro ao buscar logs:', error);
      }
    }, 2000); // Poll a cada 2 segundos

    return () => clearInterval(pollInterval);
  }, [isProcessing]);

  const handleDivideAndUpload = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setStatusMessage('Iniciando divisão...');
      setIsComplete(false);

      toast.info('Iniciando divisão e upload do corpus. Isso pode levar 1-2 minutos...');

      const { data, error } = await supabase.functions.invoke('divide-and-upload-corpus', {
        body: { 
          corpusType,
          projectBaseUrl: window.location.origin 
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          `✅ Corpus dividido e enviado com sucesso!\n` +
          `📊 ${data.uploads?.length || 3} arquivos (${data.totalSizeMB || '?'} MB)\n` +
          `📝 ${data.totalLines?.toLocaleString() || '?'} linhas`
        );
        setProgress(100);
        setIsComplete(true);
      } else {
        throw new Error(data?.error || 'Erro desconhecido ao dividir corpus');
      }

    } catch (error: any) {
      console.error('Erro ao dividir corpus:', error);
      toast.error(`Erro: ${error.message || 'Falha ao dividir corpus'}`);
      setIsProcessing(false);
      setProgress(0);
      setStatusMessage('');
    }
  };

  if (corpusType !== 'gaucho') {
    return null; // Atualmente apenas gaúcho é suportado
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleDivideAndUpload}
        disabled={isProcessing || isComplete}
        variant={isComplete ? 'outline' : 'default'}
        className="w-full sm:w-auto"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : isComplete ? (
          <>
            <Check className="h-4 w-4 mr-2 text-green-600" />
            Corpus Preparado
          </>
        ) : (
          <>
            <Scissors className="h-4 w-4 mr-2" />
            Dividir e Preparar Corpus
          </>
        )}
      </Button>

      {isProcessing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {progress}% - {statusMessage}
          </p>
        </div>
      )}
    </div>
  );
}
