import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchValidationResult {
  entriesValidated: number;
  skippedAlreadyValidated: number;
  dictionaryType: string;
  timestamp: string;
}

export function useBatchValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<BatchValidationResult | null>(null);
  const { toast } = useToast();

  const validateBatch = async (dictionaryType: string, batchSize: number) => {
    setIsValidating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-lexicon-batch', {
        body: { dictionaryType, batchSize }
      });

      if (error) throw error;

      setResult(data);
      
      toast({
        title: "✅ Validação Concluída",
        description: `${data.entriesValidated} entradas validadas automaticamente`,
      });

      return data;
    } catch (error: any) {
      console.error('Erro na validação em lote:', error);
      toast({
        variant: "destructive",
        title: "❌ Erro na Validação",
        description: error.message || 'Não foi possível validar as entradas',
      });
      throw error;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    isValidating,
    result,
    validateBatch
  };
}
