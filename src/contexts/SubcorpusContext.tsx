import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { CorpusType } from '@/data/types/corpus-tools.types';
import { CorpusCompleto } from '@/data/types/full-text-corpus.types';
import { SubcorpusMetadata } from '@/data/types/subcorpus.types';
import { useCorpusCache } from './CorpusContext';
import { extractSubcorpora } from '@/utils/subcorpusAnalysis';

export type SubcorpusMode = 'complete' | 'single' | 'compare';

export interface SubcorpusSelection {
  mode: SubcorpusMode;
  corpusBase: CorpusType;
  artistaA: string | null;
  artistaB: string | null;
}

interface SubcorpusContextType {
  selection: SubcorpusSelection;
  setSelection: (selection: SubcorpusSelection) => void;
  
  // Corpus filtrado pronto para uso
  getFilteredCorpus: () => Promise<CorpusCompleto>;
  
  // Metadados do subcorpus atual
  currentMetadata: SubcorpusMetadata | null;
  
  // Lista de artistas disponíveis
  availableArtists: string[];
  
  // Lista de metadados de todos os subcorpora
  subcorpora: SubcorpusMetadata[];
  
  isLoading: boolean;
}

const SubcorpusContext = createContext<SubcorpusContextType | undefined>(undefined);

// Carregar seleção salva do localStorage
const loadSavedSelection = (): SubcorpusSelection | null => {
  try {
    const saved = localStorage.getItem('subcorpus-selection');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Erro ao carregar seleção salva:', error);
  }
  return null;
};

export function SubcorpusProvider({ children }: { children: ReactNode }) {
  const { getFullTextCache, isLoading: isCacheLoading } = useCorpusCache();
  
  // Estado de seleção (com valor inicial do localStorage)
  const [selection, setSelectionState] = useState<SubcorpusSelection>(() => {
    const saved = loadSavedSelection();
    return saved || {
      mode: 'complete',
      corpusBase: 'gaucho',
      artistaA: null,
      artistaB: null
    };
  });
  
  // Cache de corpus e subcorpora
  const [fullCorpus, setFullCorpus] = useState<CorpusCompleto | null>(null);
  const [subcorpora, setSubcorpora] = useState<SubcorpusMetadata[]>([]);
  
  // Salvar seleção no localStorage quando mudar
  const setSelection = useCallback((newSelection: SubcorpusSelection) => {
    setSelectionState(newSelection);
    try {
      localStorage.setItem('subcorpus-selection', JSON.stringify(newSelection));
    } catch (error) {
      console.error('Erro ao salvar seleção:', error);
    }
  }, []);
  
  // Carregar corpus base quando mudar
  useEffect(() => {
    const loadCorpus = async () => {
      try {
        if (selection.corpusBase === 'gaucho' || selection.corpusBase === 'nordestino') {
          const cache = await getFullTextCache(selection.corpusBase);
          setFullCorpus(cache.corpus);
          
          // Extrair subcorpora
          const extracted = extractSubcorpora(cache.corpus);
          setSubcorpora(extracted);
          
          console.log(`✅ Corpus ${selection.corpusBase} carregado: ${extracted.length} artistas`);
        }
      } catch (error) {
        console.error('Erro ao carregar corpus:', error);
      }
    };
    
    loadCorpus();
  }, [selection.corpusBase, getFullTextCache]);
  
  // Lista de artistas disponíveis
  const availableArtists = useMemo(() => {
    return subcorpora.map(s => s.artista).sort();
  }, [subcorpora]);
  
  // Metadados do subcorpus atual
  const currentMetadata = useMemo(() => {
    if (selection.mode !== 'single' || !selection.artistaA) {
      return null;
    }
    return subcorpora.find(s => s.artista === selection.artistaA) || null;
  }, [selection, subcorpora]);
  
  // Função para obter corpus filtrado
  const getFilteredCorpus = useCallback(async (): Promise<CorpusCompleto> => {
    if (!fullCorpus) {
      throw new Error('Corpus ainda não carregado');
    }
    
    // Modo completo: retorna corpus inteiro
    if (selection.mode === 'complete') {
      return fullCorpus;
    }
    
    // Modo single: filtra por artistaA
    if (selection.mode === 'single' && selection.artistaA) {
      const filteredMusicas = fullCorpus.musicas.filter(
        m => m.metadata.artista === selection.artistaA
      );
      
      const totalPalavras = filteredMusicas.reduce(
        (sum, m) => sum + m.palavras.length, 
        0
      );
      
      return {
        ...fullCorpus,
        totalMusicas: filteredMusicas.length,
        totalPalavras,
        musicas: filteredMusicas
      };
    }
    
    // Modo compare: usa filtros do CorpusContext
    // Por enquanto retorna corpus completo, será implementado na Fase de Keywords
    return fullCorpus;
  }, [fullCorpus, selection]);
  
  const value: SubcorpusContextType = {
    selection,
    setSelection,
    getFilteredCorpus,
    currentMetadata,
    availableArtists,
    subcorpora,
    isLoading: isCacheLoading
  };
  
  return (
    <SubcorpusContext.Provider value={value}>
      {children}
    </SubcorpusContext.Provider>
  );
}

export function useSubcorpus() {
  const context = useContext(SubcorpusContext);
  if (!context) {
    throw new Error('useSubcorpus must be used within SubcorpusProvider');
  }
  return context;
}
