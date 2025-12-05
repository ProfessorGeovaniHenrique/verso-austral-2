/**
 * 🌉 CONTEXT BRIDGE (Sprint R-1: Simplificado)
 * 
 * Sincroniza AnalysisToolsContext com os contextos legados (SubcorpusContext, ToolsContext)
 * Permite que as ferramentas existentes funcionem na nova página sem refatoração
 * 
 * ARQUITETURA UNIFICADA:
 * - Usa APENAS SubcorpusContext (Sistema B) para carregamento de corpus
 * - Evita CorpusContext (Sistema A) que causa timeouts de compressão
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
 * Hook para sincronização unidirecional de contextos
 * 
 * FLUXO SIMPLIFICADO (Sprint R-1):
 * 1. studyCorpus muda → setSelection()
 * 2. selection muda no SubcorpusContext → getFilteredCorpus()
 * 3. loadedCorpus disponível para ferramentas
 */
export function useCorpusSyncEffect() {
  const { studyCorpus, referenceCorpus } = useAnalysisTools();
  const { selection, setSelection, setStylisticSelection, getFilteredCorpus, loadedCorpus } = useSubcorpus();
  const { setKeywordsState } = useTools();
  const [isLoadingCorpus, setIsLoadingCorpus] = useState(false);
  
  // Ref para evitar loop infinito - getFilteredCorpus muda de referência
  const getFilteredCorpusRef = useRef(getFilteredCorpus);
  getFilteredCorpusRef.current = getFilteredCorpus;

  // Refs para verificar igualdade e evitar re-renders desnecessários
  const prevStudyCorpusRef = useRef<string | null>(null);
  const prevStylisticRef = useRef<string | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);

  // PASSO 1: Sincroniza studyCorpus → SubcorpusContext.selection
  useEffect(() => {
    if (!studyCorpus || studyCorpus.type !== 'platform') return;
    
    const legacy = corpusSelectionToLegacy(studyCorpus);
    const studyKey = JSON.stringify(legacy);
    
    // Só atualiza se valores diferentes
    if (prevStudyCorpusRef.current === studyKey) return;
    prevStudyCorpusRef.current = studyKey;
    
    console.log('[ContextBridge] Sincronizando selection:', legacy);
    setSelection({
      corpusBase: legacy.corpusBase,
      mode: legacy.mode,
      artistaA: legacy.artistaA,
      artistaB: legacy.artistaB
    });
  }, [studyCorpus, setSelection]);

  // PASSO 2: Carrega corpus quando selection muda E é válido
  useEffect(() => {
    // Só carrega se há seleção válida
    if (!selection.corpusBase) return;
    
    // Gerar chave única para esta seleção
    const loadKey = JSON.stringify({
      corpusBase: selection.corpusBase,
      mode: selection.mode,
      artistaA: selection.artistaA
    });
    
    // Evita recarregamento se já carregou esta seleção
    if (lastLoadedKeyRef.current === loadKey) return;
    
    // Evita carregar se loadedCorpus já existe e corresponde à seleção
    if (loadedCorpus && loadedCorpus.musicas.length > 0) {
      // Verificar se o corpus carregado corresponde à seleção atual
      const isCorrectCorpus = selection.mode === 'complete' || 
        (selection.mode === 'single' && selection.artistaA && 
         loadedCorpus.musicas.some(m => m.metadata.artista === selection.artistaA));
      
      if (isCorrectCorpus) {
        lastLoadedKeyRef.current = loadKey;
        return;
      }
    }
    
    let cancelled = false;
    
    const loadCorpus = async () => {
      setIsLoadingCorpus(true);
      console.log('[ContextBridge] Carregando corpus:', loadKey);
      
      try {
        await getFilteredCorpusRef.current();
        if (!cancelled) {
          lastLoadedKeyRef.current = loadKey;
          console.log('[ContextBridge] Corpus carregado com sucesso');
        }
      } catch (error) {
        console.error('[ContextBridge] Erro ao carregar corpus:', error);
        if (!cancelled) {
          toast.error('Erro ao carregar corpus. Tentando novamente...');
          // Fallback: tentar carregar corpus completo
          try {
            setSelection({ ...selection, mode: 'complete', artistaA: null });
          } catch {
            // Ignora erro do fallback
          }
        }
      } finally {
        if (!cancelled) setIsLoadingCorpus(false);
      }
    };
    
    loadCorpus();
    
    return () => { cancelled = true; };
  }, [selection.corpusBase, selection.mode, selection.artistaA, loadedCorpus, setSelection]);

  // PASSO 3: Sincroniza studyCorpus + referenceCorpus → stylisticSelection
  useEffect(() => {
    const stylistic = corpusSelectionToStylistic(studyCorpus, referenceCorpus);
    if (stylistic) {
      const newValue = JSON.stringify(stylistic);
      
      if (prevStylisticRef.current !== newValue) {
        prevStylisticRef.current = newValue;
        setStylisticSelection(stylistic);
      }
    }
  }, [studyCorpus, referenceCorpus, setStylisticSelection]);

  // PASSO 4: Sincroniza referenceCorpus → ToolsContext.keywordsState
  useEffect(() => {
    if (referenceCorpus && referenceCorpus.type === 'platform') {
      setKeywordsState({
        refCorpusBase: referenceCorpus.platformCorpus || 'nordestino',
        refMode: (referenceCorpus.platformArtist ? 'artist' : 'complete') as 'artist' | 'complete',
        refArtist: referenceCorpus.platformArtist || null
      });
    }
  }, [referenceCorpus, setKeywordsState]);

  // PASSO 5: Sincroniza studyCorpus → ToolsContext.keywordsState
  useEffect(() => {
    if (studyCorpus && studyCorpus.type === 'platform') {
      setKeywordsState({
        estudoCorpusBase: studyCorpus.platformCorpus || 'gaucho',
        estudoMode: (studyCorpus.platformArtist ? 'artist' : 'complete') as 'artist' | 'complete',
        estudoArtist: studyCorpus.platformArtist || null
      });
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
