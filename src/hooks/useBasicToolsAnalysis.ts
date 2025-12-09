/**
 * useBasicToolsAnalysis
 * Sprint BASIC-PERSIST: Hook para processar ferramentas básicas de análise
 */

import { useState, useCallback, useRef } from 'react';
import { useSubcorpus } from '@/contexts/SubcorpusContext';
import { useAnalysisTools, BasicToolKey } from '@/contexts/AnalysisToolsContext';
import { toast } from 'sonner';

// Services
import { generateNGrams } from '@/services/ngramsService';
import { generateDispersion } from '@/services/dispersionService';

export interface BasicToolStatus {
  key: BasicToolKey;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped';
  error?: string;
}

export interface BasicAnalysisState {
  isProcessing: boolean;
  currentToolIndex: number;
  tools: BasicToolStatus[];
  startedAt?: Date;
  completedAt?: Date;
}

const BASIC_TOOL_CONFIGS: { key: BasicToolKey; label: string }[] = [
  { key: 'wordlist', label: 'Lista de Palavras' },
  { key: 'ngrams', label: 'N-grams (2-5)' },
  { key: 'dispersion', label: 'Dispersão (top 10)' },
];

// Keywords e KWIC são excluídos pois requerem interação manual
// (Keywords precisa de corpus de referência, KWIC precisa de palavra específica)

const createInitialBasicToolsState = (): BasicToolStatus[] => 
  BASIC_TOOL_CONFIGS.map(config => ({
    ...config,
    status: 'pending' as const,
  }));

export function useBasicToolsAnalysis() {
  const { loadedCorpus, getFilteredCorpus } = useSubcorpus();
  const { setToolCache, currentCorpusHash } = useAnalysisTools();
  
  const [state, setState] = useState<BasicAnalysisState>({
    isProcessing: false,
    currentToolIndex: -1,
    tools: createInitialBasicToolsState(),
  });
  
  const isCancelledRef = useRef(false);

  const updateToolStatus = useCallback((index: number, status: BasicToolStatus['status'], error?: string) => {
    setState(prev => ({
      ...prev,
      tools: prev.tools.map((tool, i) => 
        i === index ? { ...tool, status, error } : tool
      ),
    }));
  }, []);

  const processBasicAnalysis = useCallback(async () => {
    // Carregar corpus
    let corpus = loadedCorpus;
    if (!corpus) {
      try {
        corpus = await getFilteredCorpus();
      } catch {
        toast.error('Erro ao carregar corpus');
        return;
      }
    }

    if (!corpus) {
      toast.error('Nenhum corpus disponível');
      return;
    }

    isCancelledRef.current = false;
    setState({
      isProcessing: true,
      currentToolIndex: 0,
      tools: createInitialBasicToolsState(),
      startedAt: new Date(),
    });

    let completedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < BASIC_TOOL_CONFIGS.length; i++) {
      if (isCancelledRef.current) {
        toast.info(`Análise cancelada após ${completedCount} ferramentas`);
        break;
      }
      
      const tool = BASIC_TOOL_CONFIGS[i];
      setState(prev => ({ ...prev, currentToolIndex: i }));
      updateToolStatus(i, 'processing');

      try {
        let result: unknown;

        switch (tool.key) {
          case 'wordlist': {
            // Gerar wordlist
            const frequencyMap = new Map<string, number>();
            corpus.musicas.forEach(musica => {
              musica.palavras.forEach(palavra => {
                const palavraLower = palavra.toLowerCase();
                frequencyMap.set(palavraLower, (frequencyMap.get(palavraLower) || 0) + 1);
              });
            });
            
            const totalTokens = corpus.totalPalavras;
            const words = Array.from(frequencyMap.entries()).map(([text, frequency]) => ({
              palavra: text,
              frequencia: frequency,
              frequenciaNormalizada: (frequency / totalTokens) * 10000
            }));
            
            result = words.sort((a, b) => b.frequencia - a.frequencia);
            break;
          }
            
          case 'ngrams': {
            // Gerar 2-grams (mais comum)
            const ngramsResult = generateNGrams(corpus, 2, 2, 500);
            result = ngramsResult.ngrams.map(ng => ({
              ngram: ng.ngram,
              frequencia: ng.frequencia,
              n: 2
            }));
            break;
          }
            
          case 'dispersion': {
            // Dispersão das top 10 palavras mais frequentes
            const frequencyMap = new Map<string, number>();
            corpus.musicas.forEach(musica => {
              musica.palavras.forEach(palavra => {
                const palavraLower = palavra.toLowerCase();
                frequencyMap.set(palavraLower, (frequencyMap.get(palavraLower) || 0) + 1);
              });
            });
            
            const topWords = Array.from(frequencyMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 1)
              .map(([word]) => word);
            
            if (topWords.length > 0) {
              const dispResult = generateDispersion(corpus, topWords[0]);
              result = {
                palavra: dispResult.palavra,
                totalOcorrencias: dispResult.totalOcorrencias,
                coeficienteDispersao: dispResult.coeficienteDispersao,
                densidade: dispResult.densidade
              };
            } else {
              result = null;
            }
            break;
          }
        }

        if (isCancelledRef.current) break;

        if (result) {
          // Usar type assertion para o tipo correto do cache
          const cacheEntry = {
            data: result as any,
            corpusHash: currentCorpusHash,
            timestamp: Date.now(),
            isStale: false,
          };
          setToolCache(tool.key, cacheEntry);
          completedCount++;
        }

        updateToolStatus(i, 'completed');
      } catch (error) {
        console.error(`Erro ao processar ${tool.label}:`, error);
        updateToolStatus(i, 'error', error instanceof Error ? error.message : 'Erro desconhecido');
        errorCount++;
      }
    }

    setState(prev => ({
      ...prev,
      isProcessing: false,
      completedAt: new Date(),
    }));

    if (!isCancelledRef.current) {
      if (errorCount > 0) {
        toast.warning(`Análise concluída com ${errorCount} erros. ${completedCount}/${BASIC_TOOL_CONFIGS.length} ferramentas processadas.`);
      } else {
        toast.success(`Análise básica completa! ${completedCount} ferramentas processadas.`);
      }
    }
  }, [loadedCorpus, getFilteredCorpus, setToolCache, currentCorpusHash, updateToolStatus]);

  const cancelAnalysis = useCallback(() => {
    isCancelledRef.current = true;
    setState(prev => ({ ...prev, isProcessing: false }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isProcessing: false,
      currentToolIndex: -1,
      tools: createInitialBasicToolsState(),
    });
    isCancelledRef.current = false;
  }, []);

  const completedTools = state.tools.filter(t => t.status === 'completed').length;
  const progress = state.isProcessing 
    ? Math.round((state.currentToolIndex / BASIC_TOOL_CONFIGS.length) * 100)
    : completedTools === BASIC_TOOL_CONFIGS.length 
      ? 100 
      : Math.round((completedTools / BASIC_TOOL_CONFIGS.length) * 100);

  return {
    state,
    progress,
    processBasicAnalysis,
    cancelAnalysis,
    resetState,
    canProcess: !state.isProcessing,
    hasResults: state.tools.some(t => t.status === 'completed'),
  };
}
