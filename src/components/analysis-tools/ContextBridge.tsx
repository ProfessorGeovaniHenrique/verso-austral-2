/**
 * 🌉 CONTEXT BRIDGE
 * 
 * Sincroniza AnalysisToolsContext com os contextos legados (SubcorpusContext, ToolsContext)
 * Permite que as ferramentas existentes funcionem na nova página sem refatoração
 */

import React, { useEffect, ReactNode } from 'react';
import { useAnalysisTools, CorpusSelection } from '@/contexts/AnalysisToolsContext';
import { useSubcorpus } from '@/contexts/SubcorpusContext';
import { useTools } from '@/contexts/ToolsContext';
import { CorpusType } from '@/data/types/corpus-tools.types';

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
 * Hook para sincronização bidirecional de contextos
 */
export function useCorpusSyncEffect() {
  const { studyCorpus, referenceCorpus } = useAnalysisTools();
  const { setSelection } = useSubcorpus();
  const { setKeywordsState } = useTools();

  // Sincroniza studyCorpus → SubcorpusContext
  useEffect(() => {
    if (studyCorpus && studyCorpus.type === 'platform') {
      const legacy = corpusSelectionToLegacy(studyCorpus);
      setSelection({
        corpusBase: legacy.corpusBase,
        mode: legacy.mode,
        artistaA: legacy.artistaA,
        artistaB: legacy.artistaB
      });
    }
  }, [studyCorpus, setSelection]);

  // Sincroniza referenceCorpus → ToolsContext.keywordsState
  useEffect(() => {
    if (referenceCorpus && referenceCorpus.type === 'platform') {
      setKeywordsState({
        refCorpusBase: referenceCorpus.platformCorpus || 'nordestino',
        refMode: referenceCorpus.platformArtist ? 'artist' : 'complete',
        refArtist: referenceCorpus.platformArtist || null
      });
    }
  }, [referenceCorpus, setKeywordsState]);

  // Sincroniza studyCorpus → ToolsContext.keywordsState (para estudoCorpus)
  useEffect(() => {
    if (studyCorpus && studyCorpus.type === 'platform') {
      setKeywordsState({
        estudoCorpusBase: studyCorpus.platformCorpus || 'gaucho',
        estudoMode: studyCorpus.platformArtist ? 'artist' : 'complete',
        estudoArtist: studyCorpus.platformArtist || null
      });
    }
  }, [studyCorpus, setKeywordsState]);
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

/**
 * Provider wrapper que automaticamente sincroniza contextos
 */
export function AnalysisToolsBridge({ children }: ContextBridgeProps) {
  // Executa a sincronização automaticamente
  useCorpusSyncEffect();
  
  return <>{children}</>;
}

export { corpusSelectionToLegacy };
