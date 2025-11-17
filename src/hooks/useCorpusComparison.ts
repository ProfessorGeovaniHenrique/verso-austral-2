import { useState, useEffect } from 'react';
import { getDemoAnalysisResults, DemoAnalysisResult } from '@/services/demoCorpusService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCorpusComparison() {
  const [gauchoData, setGauchoData] = useState<DemoAnalysisResult | null>(null);
  const [nordestinoData, setNordestinoData] = useState<DemoAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const loadCorpora = async () => {
      setIsLoading(true);
      try {
        // Corpus Gaúcho
        const gaucho = await getDemoAnalysisResults();
        setGauchoData(gaucho);
        
        // Corpus Nordestino - chamar edge function
        const { data: nordestino, error } = await supabase.functions.invoke('process-nordestino-corpus');
        
        if (error) {
          console.error('Erro ao carregar corpus nordestino:', error);
          toast.error('Erro ao carregar corpus nordestino');
        } else {
          setNordestinoData(nordestino as DemoAnalysisResult);
        }
        
        toast.success('Corpora carregados com sucesso');
      } catch (error) {
        console.error('Erro ao carregar corpora:', error);
        toast.error('Erro ao carregar corpora para comparação');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCorpora();
  }, []);
  
  return {
    gauchoData,
    nordestinoData,
    isLoading
  };
}
