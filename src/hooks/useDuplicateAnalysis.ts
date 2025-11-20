import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@/lib/notifications';

export interface DuplicateAnalysis {
  dictionarySource: string;
  totalEntries: number;
  uniqueEntries: number;
  duplicateCount: number;
  duplicateRate: number;
  topDuplicates: Array<{
    verbete: string;
    occurrences: number;
    entries: Array<{ 
      id: string; 
      classe_gramatical: string | null; 
      definicoes: any;
      volume_fonte: string | null;
    }>;
  }>;
  analyzedAt: string;
}

export function useDuplicateAnalysis() {
  const [analysis, setAnalysis] = useState<DuplicateAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeDuplicates = async (source: string, table: string = 'dialectal_lexicon') => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-duplicates', {
        body: { source, table }
      });

      if (error) throw error;

      setAnalysis(data);
      notifications.success(
        'Análise concluída',
        `${data.duplicateCount} duplicatas encontradas (${data.duplicateRate}%)`
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

  const clearAnalysis = () => {
    setAnalysis(null);
  };

  return {
    analysis,
    isAnalyzing,
    analyzeDuplicates,
    clearAnalysis
  };
}
