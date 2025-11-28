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
  { id: 'loading', label: 'Carregando Música de Estudo', icon: Download, status: 'pending', progress: 0 },
  { id: 'annotation', label: 'Anotação Semântica (CE)', icon: Target, status: 'pending', progress: 0 },
  { id: 'frequencies', label: 'Cálculo de Frequências', icon: BarChart3, status: 'pending', progress: 0 },
];

const CR_INITIAL_STEPS: PipelineStep[] = [
  { id: 'loading', label: 'Carregando 25 Músicas Nordestinas', icon: Download, status: 'pending', progress: 0 },
  { id: 'annotation', label: 'Anotação Semântica (CR)', icon: Target, status: 'pending', progress: 0 },
  { id: 'comparison', label: 'Cálculo de Log-Likelihood', icon: GitCompare, status: 'pending', progress: 0 },
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
      // Progresso CE - Loading
      setCeSteps(prev => updateStepStatus(prev, 'loading', 'processing', 0));
      setCrSteps(prev => updateStepStatus(prev, 'loading', 'processing', 0));
      
      // Chamar edge function real com parâmetros corretos
      const { data, error: functionError } = await supabase.functions.invoke('process-corpus-analysis', {
        body: {
          songId: studySongId,           // ✅ Passar o ID da música selecionada
          referenceCorpusType,            // ✅ Passar o tipo do corpus de referência
          corpusType: 'gaucho'
        }
      });

      if (functionError) throw functionError;
      
      setCeSteps(prev => updateStepStatus(prev, 'loading', 'completed', 100));
      setCrSteps(prev => updateStepStatus(prev, 'loading', 'completed', 100));
      
      // Anotação semântica
      setCeSteps(prev => updateStepStatus(prev, 'annotation', 'processing', 50));
      setCrSteps(prev => updateStepStatus(prev, 'annotation', 'processing', 50));
      
      setCeSteps(prev => updateStepStatus(prev, 'annotation', 'completed', 100));
      setCrSteps(prev => updateStepStatus(prev, 'annotation', 'completed', 100));
      
      // Cálculo de frequências e comparação
      setCeSteps(prev => updateStepStatus(prev, 'frequencies', 'processing', 50));
      setCrSteps(prev => updateStepStatus(prev, 'comparison', 'processing', 50));
      
      setCeSteps(prev => updateStepStatus(prev, 'frequencies', 'completed', 100));
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