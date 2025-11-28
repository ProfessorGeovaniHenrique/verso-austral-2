import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@/lib/notifications';

export interface DeduplicationResult {
  dryRun: boolean;
  processed: number;
  consolidated: number;
  duplicatesRemoved: number;
  releasesPreserved: number;
  topConsolidated: Array<{
    title: string;
    releasesCount: number;
    yearsSpan: string;
  }>;
}

export function useDeduplication() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<DeduplicationResult | null>(null);

  const analyze = async (corpusIds: string[] = []) => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('deduplicate-songs', {
        body: { dryRun: true, corpusIds }
      });

      if (error) throw error;

      setResult(data);
      notifications.success(
        'Análise concluída',
        `${data.duplicatesRemoved} duplicatas encontradas em ${data.processed} grupos`
      );

      return data;
    } catch (error: any) {
      console.error('Erro ao analisar duplicatas:', error);
      notifications.error(
        'Erro na análise',
        error.message || 'Não foi possível analisar duplicatas'
      );
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const execute = async (corpusIds: string[] = []) => {
    setIsExecuting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('deduplicate-songs', {
        body: { dryRun: false, corpusIds }
      });

      if (error) throw error;

      setResult(data);
      notifications.success(
        'Deduplicação concluída',
        `${data.duplicatesRemoved} duplicatas removidas, ${data.releasesPreserved} releases preservados`
      );

      return data;
    } catch (error: any) {
      console.error('Erro ao executar deduplicação:', error);
      notifications.error(
        'Erro na execução',
        error.message || 'Não foi possível executar deduplicação'
      );
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  const clearResult = () => {
    setResult(null);
  };

  return {
    analyze,
    execute,
    isAnalyzing,
    isExecuting,
    result,
    clearResult
  };
}
