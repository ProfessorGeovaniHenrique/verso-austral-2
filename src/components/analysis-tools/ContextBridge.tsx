/**
 * 🌉 CONTEXT BRIDGE
 * 
 * Sincroniza AnalysisToolsContext com os contextos legados (SubcorpusContext, ToolsContext)
 * Permite que as ferramentas existentes funcionem na nova página sem refatoração
 */

import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { useAnalysisTools, CorpusSelection } from '@/contexts/AnalysisToolsContext';
import { useSubcorpus } from '@/contexts/SubcorpusContext';
import { useTools } from '@/contexts/ToolsContext';
import { CorpusType } from '@/data/types/corpus-tools.types';
import { toast } from 'sonner';

interface ContextBridgeProps {
  children: ReactNode;
}

/**
 * Converte CorpusSelection (novo formato) para formato legado do SubcorpusContext
 */
function corpusSelectionToLegacy(selection: CorpusSelection | null): {
  corpusBase: CorpusType;
  mode: 'complete' | 'single';
  artistaA: string | null;
  artistaB: string | null;
} {
  if (!selection || selection.type === 'user') {
    return {
      corpusBase: 'gaucho',
      mode: 'complete',
      artistaA: null,
      artistaB: null
    };
  }
  
  return {
    corpusBase: selection.platformCorpus || 'gaucho',
    mode: selection.platformArtist ? 'single' : 'complete',
    artistaA: selection.platformArtist || null,
    artistaB: null
  };
}

/**
 * Converte CorpusSelection para formato stylisticSelection do SubcorpusContext
 */
function corpusSelectionToStylistic(
  studySelection: CorpusSelection | null,
  referenceSelection: CorpusSelection | null
) {
  if (!studySelection || studySelection.type === 'user') {
    return null;
  }
  
  return {
    study: {
      corpusType: studySelection.platformCorpus || 'gaucho',
      mode: studySelection.platformArtist ? 'artist' : 'complete' as const,
      artist: studySelection.platformArtist || undefined,
      estimatedSize: 0
    },
    reference: referenceSelection && referenceSelection.type === 'platform' ? {
      corpusType: referenceSelection.platformCorpus || 'nordestino',
      mode: referenceSelection.platformArtist ? 'artist' : 'complete' as const,
      artist: referenceSelection.platformArtist || undefined,
      targetSize: 0,
      sizeRatio: 1
    } : {
      corpusType: 'nordestino' as CorpusType,
      mode: 'complete' as const,
      targetSize: 0,
      sizeRatio: 1
    },
    isComparative: !!referenceSelection
  };
}

/**
 * Hook para sincronização bidirecional de contextos
 */
export function useCorpusSyncEffect() {
  const { studyCorpus, referenceCorpus } = useAnalysisTools();
  const { selection, setSelection, setStylisticSelection, getFilteredCorpus } = useSubcorpus();
  const { setKeywordsState } = useTools();
  const [isLoadingCorpus, setIsLoadingCorpus] = useState(false);
  
  // Ref para evitar loop infinito - getFilteredCorpus muda de referência
  const getFilteredCorpusRef = useRef(getFilteredCorpus);
  getFilteredCorpusRef.current = getFilteredCorpus;

  // Refs para verificar igualdade e evitar re-renders desnecessários
  const prevSelectionRef = useRef<string | null>(null);
  const prevStylisticRef = useRef<string | null>(null);
  const prevKeywordsStudyRef = useRef<string | null>(null);
  const prevKeywordsRefRef = useRef<string | null>(null);

  // Sincroniza studyCorpus → SubcorpusContext.selection (COM VERIFICAÇÃO)
  useEffect(() => {
    if (studyCorpus && studyCorpus.type === 'platform') {
      const legacy = corpusSelectionToLegacy(studyCorpus);
      const newValue = JSON.stringify(legacy);
      
      // Só atualiza se valores diferentes
      if (prevSelectionRef.current !== newValue) {
        prevSelectionRef.current = newValue;
        setSelection({
          corpusBase: legacy.corpusBase,
          mode: legacy.mode,
          artistaA: legacy.artistaA,
          artistaB: legacy.artistaB
        });
      }
    }
  }, [studyCorpus, setSelection]);

  // Ref para evitar múltiplos carregamentos da mesma seleção
  const lastLoadedSelectionRef = useRef<string | null>(null);

  // Carrega corpus APÓS selection mudar no SubcorpusContext (não studyCorpus!)
  // Isso garante que getFilteredCorpus() usa valores atualizados
  useEffect(() => {
    // Só carrega se há seleção válida de corpus de plataforma
    if (!studyCorpus || studyCorpus.type !== 'platform') return;
    if (!selection.corpusBase) return;
    
    const selectionKey = JSON.stringify({
      corpusBase: selection.corpusBase,
      mode: selection.mode,
      artistaA: selection.artistaA
    });
    
    // Evita recarregamento se seleção não mudou
    if (lastLoadedSelectionRef.current === selectionKey) return;
    
    let cancelled = false;
    
    const loadCorpus = async () => {
      setIsLoadingCorpus(true);
      try {
        await getFilteredCorpusRef.current();
        if (!cancelled) {
          lastLoadedSelectionRef.current = selectionKey;
        }
      } catch (error) {
        console.error('Erro ao carregar corpus:', error);
        if (!cancelled) {
          toast.error('Erro ao carregar corpus');
        }
      } finally {
        if (!cancelled) setIsLoadingCorpus(false);
      }
    };
    
    loadCorpus();
    
    return () => { cancelled = true; };
  }, [selection, studyCorpus]); // Depende de SELECTION (após atualizado)

  // Sincroniza studyCorpus + referenceCorpus → SubcorpusContext.stylisticSelection (COM VERIFICAÇÃO)
  useEffect(() => {
    const stylistic = corpusSelectionToStylistic(studyCorpus, referenceCorpus);
    if (stylistic) {
      const newValue = JSON.stringify(stylistic);
      
      // Só atualiza se valores diferentes
      if (prevStylisticRef.current !== newValue) {
        prevStylisticRef.current = newValue;
        setStylisticSelection(stylistic);
      }
    }
  }, [studyCorpus, referenceCorpus, setStylisticSelection]);

  // Sincroniza referenceCorpus → ToolsContext.keywordsState (COM VERIFICAÇÃO)
  useEffect(() => {
    if (referenceCorpus && referenceCorpus.type === 'platform') {
      const newState = {
        refCorpusBase: referenceCorpus.platformCorpus || 'nordestino',
        refMode: (referenceCorpus.platformArtist ? 'artist' : 'complete') as 'artist' | 'complete',
        refArtist: referenceCorpus.platformArtist || null
      };
      const newValue = JSON.stringify(newState);
      
      // Só atualiza se valores diferentes
      if (prevKeywordsRefRef.current !== newValue) {
        prevKeywordsRefRef.current = newValue;
        setKeywordsState(newState);
      }
    }
  }, [referenceCorpus, setKeywordsState]);

  // Sincroniza studyCorpus → ToolsContext.keywordsState (COM VERIFICAÇÃO)
  useEffect(() => {
    if (studyCorpus && studyCorpus.type === 'platform') {
      const newState = {
        estudoCorpusBase: studyCorpus.platformCorpus || 'gaucho',
        estudoMode: (studyCorpus.platformArtist ? 'artist' : 'complete') as 'artist' | 'complete',
        estudoArtist: studyCorpus.platformArtist || null
      };
      const newValue = JSON.stringify(newState);
      
      // Só atualiza se valores diferentes
      if (prevKeywordsStudyRef.current !== newValue) {
        prevKeywordsStudyRef.current = newValue;
        setKeywordsState(newState);
      }
    }
  }, [studyCorpus, setKeywordsState]);

  return { isLoadingCorpus };
}

/**
 * Hook para obter status da sincronização
 */
export function useCorpusSyncStatus() {
  const { studyCorpus, referenceCorpus } = useAnalysisTools();
  
  return {
    hasStudyCorpus: !!studyCorpus,
    hasReferenceCorpus: !!referenceCorpus,
    studyType: studyCorpus?.type || null,
    referenceType: referenceCorpus?.type || null,
    isReady: !!studyCorpus
  };
}

interface AnalysisToolsBridgeRenderProps {
  isLoadingCorpus: boolean;
}

interface ContextBridgePropsWithRender {
  children: ReactNode | ((props: AnalysisToolsBridgeRenderProps) => ReactNode);
}

/**
 * Provider wrapper que automaticamente sincroniza contextos
 */
export function AnalysisToolsBridge({ children }: ContextBridgePropsWithRender) {
  const { isLoadingCorpus } = useCorpusSyncEffect();
  
  if (typeof children === 'function') {
    return <>{children({ isLoadingCorpus })}</>;
  }
  
  return <>{children}</>;
}

export { corpusSelectionToLegacy };
