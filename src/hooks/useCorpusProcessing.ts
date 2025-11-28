import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Target, BarChart3, Layers, Download, Cog, GitCompare } from 'lucide-react';

interface PipelineStep {
  id: string;
  label: string;
  icon: typeof FileText;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

const CE_INITIAL_STEPS: PipelineStep[] = [
  { id: 'tokenization', label: 'Tokenização', icon: FileText, status: 'pending', progress: 0 },
  { id: 'classification', label: 'Classificação Semântica', icon: Target, status: 'pending', progress: 0 },
  { id: 'frequencies', label: 'Cálculo de Frequências', icon: BarChart3, status: 'pending', progress: 0 },
  { id: 'aggregation', label: 'Agregação por Domínio', icon: Layers, status: 'pending', progress: 0 },
];

const CR_INITIAL_STEPS: PipelineStep[] = [
  { id: 'loading', label: 'Carregamento', icon: Download, status: 'pending', progress: 0 },
  { id: 'processing', label: 'Processamento', icon: Cog, status: 'pending', progress: 0 },
  { id: 'comparison', label: 'Estatísticas Comparativas', icon: GitCompare, status: 'pending', progress: 0 },
];

export function useCorpusProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ceSteps, setCeSteps] = useState<PipelineStep[]>(CE_INITIAL_STEPS);
  const [crSteps, setCrSteps] = useState<PipelineStep[]>(CR_INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);

  const updateStepStatus = (
    steps: PipelineStep[],
    stepId: string,
    status: PipelineStep['status'],
    progress: number
  ) => {
    return steps.map(step =>
      step.id === stepId ? { ...step, status, progress } : step
    );
  };

  const processCorpus = async (studySongId: string, referenceCorpusType: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Simular progresso do CE
      setCeSteps(prev => updateStepStatus(prev, 'tokenization', 'processing', 0));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCeSteps(prev => updateStepStatus(prev, 'tokenization', 'completed', 100));
      setCeSteps(prev => updateStepStatus(prev, 'classification', 'processing', 0));
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setCeSteps(prev => updateStepStatus(prev, 'classification', 'completed', 100));
      setCeSteps(prev => updateStepStatus(prev, 'frequencies', 'processing', 0));
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setCeSteps(prev => updateStepStatus(prev, 'frequencies', 'completed', 100));
      setCeSteps(prev => updateStepStatus(prev, 'aggregation', 'processing', 0));

      // Iniciar processamento do CR em paralelo
      setCrSteps(prev => updateStepStatus(prev, 'loading', 'processing', 0));
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setCrSteps(prev => updateStepStatus(prev, 'loading', 'completed', 100));
      setCrSteps(prev => updateStepStatus(prev, 'processing', 'processing', 0));
      
      // Chamar edge function real
      const { data, error: functionError } = await supabase.functions.invoke('process-corpus-analysis', {
        body: {
          corpusType: 'gaucho',
          limit: 100,
          enrichedOnly: true
        }
      });

      if (functionError) throw functionError;
      
      setCeSteps(prev => updateStepStatus(prev, 'aggregation', 'completed', 100));
      setCrSteps(prev => updateStepStatus(prev, 'processing', 'completed', 100));
      setCrSteps(prev => updateStepStatus(prev, 'comparison', 'processing', 0));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCrSteps(prev => updateStepStatus(prev, 'comparison', 'completed', 100));

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Marcar step atual como erro
      setCeSteps(prev => prev.map(s => 
        s.status === 'processing' ? { ...s, status: 'error' as const } : s
      ));
      setCrSteps(prev => prev.map(s => 
        s.status === 'processing' ? { ...s, status: 'error' as const } : s
      ));
      
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCeSteps(CE_INITIAL_STEPS);
    setCrSteps(CR_INITIAL_STEPS);
    setError(null);
    setIsProcessing(false);
  };

  return {
    isProcessing,
    ceSteps,
    crSteps,
    error,
    processCorpus,
    reset
  };
}