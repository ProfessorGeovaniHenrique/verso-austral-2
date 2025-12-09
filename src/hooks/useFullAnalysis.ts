/**
 * useFullAnalysis
 * Sprint PERSIST-1: Hook para processar todas as 7 ferramentas de análise
 */

import { useState, useCallback } from 'react';
import { useSubcorpus } from '@/contexts/SubcorpusContext';
import { useAnalysisTools, ToolKey } from '@/contexts/AnalysisToolsContext';
import { toast } from 'sonner';

// Services
import { calculateLexicalProfile } from '@/services/lexicalAnalysisService';
import { calculateSyntacticProfile } from '@/services/syntacticAnalysisService';
import { detectRhetoricalFigures } from '@/services/rhetoricalAnalysisService';
import { analyzeCohesion } from '@/services/cohesionAnalysisService';
import { analyzeSpeechThoughtPresentation } from '@/services/speechThoughtAnalysisService';
import { analyzeMindStyle } from '@/services/mindStyleAnalysisService';
import { analyzeForegrounding } from '@/services/foregroundingAnalysisService';
import { annotatePOSForCorpus } from '@/services/posAnnotationService';

export interface ToolStatus {
  key: ToolKey;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface FullAnalysisState {
  isProcessing: boolean;
  currentToolIndex: number;
  tools: ToolStatus[];
  startedAt?: Date;
  completedAt?: Date;
}

const TOOL_CONFIGS: { key: ToolKey; label: string }[] = [
  { key: 'lexical', label: 'Perfil Léxico' },
  { key: 'syntactic', label: 'Perfil Sintático' },
  { key: 'rhetorical', label: 'Figuras Retóricas' },
  { key: 'cohesion', label: 'Análise de Coesão' },
  { key: 'speech', label: 'Fala e Pensamento' },
  { key: 'mind', label: 'Mind Style' },
  { key: 'foregrounding', label: 'Foregrounding' },
];

const initialToolsState: ToolStatus[] = TOOL_CONFIGS.map(config => ({
  ...config,
  status: 'pending' as const,
}));

export function useFullAnalysis() {
  const { loadedCorpus } = useSubcorpus();
  const { setToolCache, currentCorpusHash } = useAnalysisTools();
  
  const [state, setState] = useState<FullAnalysisState>({
    isProcessing: false,
    currentToolIndex: -1,
    tools: initialToolsState,
  });
  
  const [isCancelled, setIsCancelled] = useState(false);

  const updateToolStatus = useCallback((index: number, status: ToolStatus['status'], error?: string) => {
    setState(prev => ({
      ...prev,
      tools: prev.tools.map((tool, i) => 
        i === index ? { ...tool, status, error } : tool
      ),
    }));
  }, []);

  const processAnalysis = useCallback(async () => {
    if (!loadedCorpus) {
      toast.error('Nenhum corpus carregado');
      return;
    }

    setIsCancelled(false);
    setState({
      isProcessing: true,
      currentToolIndex: 0,
      tools: initialToolsState,
      startedAt: new Date(),
    });

    // Pre-process: POS annotation for syntactic analysis
    let annotatedCorpus: any = null;

    for (let i = 0; i < TOOL_CONFIGS.length; i++) {
      if (isCancelled) break;
      
      const tool = TOOL_CONFIGS[i];
      setState(prev => ({ ...prev, currentToolIndex: i }));
      updateToolStatus(i, 'processing');

      try {
        let result: any;

        switch (tool.key) {
          case 'lexical':
            result = calculateLexicalProfile(loadedCorpus, []);
            break;
            
          case 'syntactic':
            // POS annotation needed
            if (!annotatedCorpus) {
              annotatedCorpus = await annotatePOSForCorpus(loadedCorpus);
            }
            result = calculateSyntacticProfile(annotatedCorpus);
            break;
            
          case 'rhetorical':
            result = detectRhetoricalFigures(loadedCorpus);
            break;
            
          case 'cohesion':
            result = analyzeCohesion(loadedCorpus);
            break;
            
          case 'speech':
            result = analyzeSpeechThoughtPresentation(loadedCorpus);
            break;
            
          case 'mind':
            result = analyzeMindStyle(loadedCorpus);
            break;
            
          case 'foregrounding':
            result = analyzeForegrounding(loadedCorpus);
            break;
        }

        // Salvar no cache
        if (result) {
          setToolCache(tool.key, {
            data: result,
            corpusHash: currentCorpusHash,
            timestamp: Date.now(),
            isStale: false,
          });
        }

        updateToolStatus(i, 'completed');
      } catch (error) {
        console.error(`Erro ao processar ${tool.label}:`, error);
        updateToolStatus(i, 'error', error instanceof Error ? error.message : 'Erro desconhecido');
      }
    }

    setState(prev => ({
      ...prev,
      isProcessing: false,
      completedAt: new Date(),
    }));

    const completedCount = state.tools.filter(t => t.status === 'completed').length + 1;
    if (!isCancelled) {
      toast.success(`Análise completa! ${completedCount}/${TOOL_CONFIGS.length} ferramentas processadas.`);
    }
  }, [loadedCorpus, setToolCache, currentCorpusHash, updateToolStatus, isCancelled, state.tools]);

  const cancelAnalysis = useCallback(() => {
    setIsCancelled(true);
    setState(prev => ({ ...prev, isProcessing: false }));
    toast.info('Análise cancelada');
  }, []);

  const resetState = useCallback(() => {
    setState({
      isProcessing: false,
      currentToolIndex: -1,
      tools: initialToolsState,
    });
    setIsCancelled(false);
  }, []);

  const progress = state.isProcessing 
    ? Math.round(((state.currentToolIndex + 1) / TOOL_CONFIGS.length) * 100)
    : state.tools.filter(t => t.status === 'completed').length === TOOL_CONFIGS.length 
      ? 100 
      : 0;

  return {
    state,
    progress,
    processAnalysis,
    cancelAnalysis,
    resetState,
    canProcess: !!loadedCorpus && !state.isProcessing,
    hasResults: state.tools.some(t => t.status === 'completed'),
  };
}
