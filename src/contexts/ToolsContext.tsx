import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { KeywordEntry, CorpusType } from '@/data/types/corpus-tools.types';
import { DispersionAnalysis, NGramAnalysis, KWICContext, SongMetadata } from '@/data/types/full-text-corpus.types';
import { Collocation } from '@/services/collocationService';

// ==================== INTERFACES DE ESTADO ====================

interface KeywordsState {
  estudoCorpusBase: CorpusType;
  estudoMode: 'complete' | 'artist';
  estudoArtist: string | null;
  refCorpusBase: CorpusType;
  refMode: 'complete' | 'artist';
  refArtist: string | null;
  keywords: KeywordEntry[];
  searchTerm: string;
  significanceFilter: 'all' | 'positive' | 'negative';
  effectFilter: 'all' | 'small' | 'medium' | 'large';
  llFilter: number;
  sortColumn: 'palavra' | 'keyword' | 'll' | 'freqEstudo' | 'freqReferencia' | 'freqRef' | 'effect' | 'efeito';
  sortDirection: 'asc' | 'desc';
  isProcessed: boolean;
}

interface WordlistState {
  wordlist: Array<{ palavra: string; frequencia: number; frequenciaNormalizada: number }>;
  searchTerm: string;
  sortColumn: 'frequencia' | 'palavra';
  sortDirection: 'asc' | 'desc';
}

interface KWICState {
  palavra: string;
  contextoEsquerdo: number;
  contextoDireito: number;
  results: KWICContext[];
  selectedArtists: string[];
  selectedMusicas: SongMetadata[];
  anoInicio: number | null;
  anoFim: number | null;
  janelaColocacional: number;
  minFreqColocacao: number;
  colocacoes: Collocation[];
  dispersionAnalysis: DispersionAnalysis | null;
}

interface DispersionState {
  palavra: string;
  analysis: DispersionAnalysis | null;
}

interface NgramsState {
  ngramSize: 2 | 3 | 4 | 5;
  minFrequencia: string;
  maxResults: string;
  analysis: NGramAnalysis | null;
}

interface ToolsContextType {
  selectedWord: string;
  setSelectedWord: (word: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToKWIC: (word: string) => void;
  
  // Estados das ferramentas
  keywordsState: KeywordsState;
  setKeywordsState: (state: Partial<KeywordsState>) => void;
  clearKeywordsState: () => void;
  
  wordlistState: WordlistState;
  setWordlistState: (state: Partial<WordlistState>) => void;
  clearWordlistState: () => void;
  
  kwicState: KWICState;
  setKwicState: (state: Partial<KWICState>) => void;
  clearKwicState: () => void;
  
  dispersionState: DispersionState;
  setDispersionState: (state: Partial<DispersionState>) => void;
  clearDispersionState: () => void;
  
  ngramsState: NgramsState;
  setNgramsState: (state: Partial<NgramsState>) => void;
  clearNgramsState: () => void;
}

// ==================== ESTADOS INICIAIS ====================

const INITIAL_KEYWORDS_STATE: KeywordsState = {
  estudoCorpusBase: 'gaucho',
  estudoMode: 'complete',
  estudoArtist: null,
  refCorpusBase: 'nordestino',
  refMode: 'complete',
  refArtist: null,
  keywords: [],
  searchTerm: '',
  significanceFilter: 'all',
  effectFilter: 'all',
  llFilter: 0,
  sortColumn: 'll',
  sortDirection: 'desc',
  isProcessed: false
};

const INITIAL_WORDLIST_STATE: WordlistState = {
  wordlist: [],
  searchTerm: '',
  sortColumn: 'frequencia',
  sortDirection: 'desc'
};

const INITIAL_KWIC_STATE: KWICState = {
  palavra: '',
  contextoEsquerdo: 5,
  contextoDireito: 5,
  results: [],
  selectedArtists: [],
  selectedMusicas: [],
  anoInicio: null,
  anoFim: null,
  janelaColocacional: 3,
  minFreqColocacao: 3,
  colocacoes: [],
  dispersionAnalysis: null
};

const INITIAL_DISPERSION_STATE: DispersionState = {
  palavra: '',
  analysis: null
};

const INITIAL_NGRAMS_STATE: NgramsState = {
  ngramSize: 2,
  minFrequencia: '2',
  maxResults: '100',
  analysis: null
};

// ==================== STORAGE HELPERS ====================

const STORAGE_KEYS = {
  keywords: 'tools_keywords_state',
  wordlist: 'tools_wordlist_state',
  kwic: 'tools_kwic_state',
  dispersion: 'tools_dispersion_state',
  ngrams: 'tools_ngrams_state'
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load ${key} from storage:`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to storage:`, error);
  }
}

// ==================== CONTEXT ====================

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export function ToolsProvider({ children }: { children: ReactNode }) {
  const [selectedWord, setSelectedWord] = useState('');
  const [activeTab, setActiveTab] = useState('basicas');
  
  // Estados das ferramentas com persistência
  const [keywordsState, setKeywordsStateInternal] = useState<KeywordsState>(() =>
    loadFromStorage(STORAGE_KEYS.keywords, INITIAL_KEYWORDS_STATE)
  );
  
  const [wordlistState, setWordlistStateInternal] = useState<WordlistState>(() =>
    loadFromStorage(STORAGE_KEYS.wordlist, INITIAL_WORDLIST_STATE)
  );
  
  const [kwicState, setKwicStateInternal] = useState<KWICState>(() =>
    loadFromStorage(STORAGE_KEYS.kwic, INITIAL_KWIC_STATE)
  );
  
  const [dispersionState, setDispersionStateInternal] = useState<DispersionState>(() =>
    loadFromStorage(STORAGE_KEYS.dispersion, INITIAL_DISPERSION_STATE)
  );
  
  const [ngramsState, setNgramsStateInternal] = useState<NgramsState>(() =>
    loadFromStorage(STORAGE_KEYS.ngrams, INITIAL_NGRAMS_STATE)
  );
  
  // Sync com localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.keywords, keywordsState);
  }, [keywordsState]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.wordlist, wordlistState);
  }, [wordlistState]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.kwic, kwicState);
  }, [kwicState]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.dispersion, dispersionState);
  }, [dispersionState]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ngrams, ngramsState);
  }, [ngramsState]);
  
  // Setters com merge parcial
  const setKeywordsState = (partial: Partial<KeywordsState>) => {
    setKeywordsStateInternal(prev => ({ ...prev, ...partial }));
  };
  
  const setWordlistState = (partial: Partial<WordlistState>) => {
    setWordlistStateInternal(prev => ({ ...prev, ...partial }));
  };
  
  const setKwicState = (partial: Partial<KWICState>) => {
    setKwicStateInternal(prev => ({ ...prev, ...partial }));
  };
  
  const setDispersionState = (partial: Partial<DispersionState>) => {
    setDispersionStateInternal(prev => ({ ...prev, ...partial }));
  };
  
  const setNgramsState = (partial: Partial<NgramsState>) => {
    setNgramsStateInternal(prev => ({ ...prev, ...partial }));
  };
  
  // Clear functions
  const clearKeywordsState = () => {
    setKeywordsStateInternal(INITIAL_KEYWORDS_STATE);
    localStorage.removeItem(STORAGE_KEYS.keywords);
  };
  
  const clearWordlistState = () => {
    setWordlistStateInternal(INITIAL_WORDLIST_STATE);
    localStorage.removeItem(STORAGE_KEYS.wordlist);
  };
  
  const clearKwicState = () => {
    setKwicStateInternal(INITIAL_KWIC_STATE);
    localStorage.removeItem(STORAGE_KEYS.kwic);
  };
  
  const clearDispersionState = () => {
    setDispersionStateInternal(INITIAL_DISPERSION_STATE);
    localStorage.removeItem(STORAGE_KEYS.dispersion);
  };
  
  const clearNgramsState = () => {
    setNgramsStateInternal(INITIAL_NGRAMS_STATE);
    localStorage.removeItem(STORAGE_KEYS.ngrams);
  };

  const navigateToKWIC = (word: string) => {
    setSelectedWord(word);
    setActiveTab('basicas');
  };

  return (
    <ToolsContext.Provider value={{
      selectedWord,
      setSelectedWord,
      activeTab,
      setActiveTab,
      navigateToKWIC,
      keywordsState,
      setKeywordsState,
      clearKeywordsState,
      wordlistState,
      setWordlistState,
      clearWordlistState,
      kwicState,
      setKwicState,
      clearKwicState,
      dispersionState,
      setDispersionState,
      clearDispersionState,
      ngramsState,
      setNgramsState,
      clearNgramsState
    }}>
      {children}
    </ToolsContext.Provider>
  );
}

export function useTools() {
  const context = useContext(ToolsContext);
  if (!context) {
    throw new Error('useTools must be used within ToolsProvider');
  }
  return context;
}
