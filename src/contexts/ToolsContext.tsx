import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { KeywordEntry, CorpusType } from '@/data/types/corpus-tools.types';
import { DispersionAnalysis, NGramAnalysis, KWICContext, SongMetadata } from '@/data/types/full-text-corpus.types';
import { Collocation } from '@/services/collocationService';
import { debounce } from '@/lib/performanceUtils';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('ToolsContext');

// ==================== SCHEMA VERSIONING ====================

const CURRENT_SCHEMA_VERSION = {
  keywords: 2, // v2: Added analysisConfig
  wordlist: 1,
  kwic: 1,
  dispersion: 1,
  ngrams: 1
};

interface StorageWithVersion<T> {
  version: number;
  data: T;
}

/**
 * Migra dados antigos do localStorage para o schema atual
 */
function migrateKeywordsSchema(data: any, fromVersion: number): KeywordsState {
  log.debug(`Migrando schema de Keywords: v${fromVersion} → v${CURRENT_SCHEMA_VERSION.keywords}`);
  
  let migrated = { ...data };
  
  // Migração v1 → v2: Adicionar analysisConfig
  if (fromVersion < 2) {
    log.debug('Adicionando analysisConfig ao schema...');
    migrated.analysisConfig = {
      generateKeywordsList: true,
      generateScatterPlot: false,
      generateComparisonChart: false,
      generateDispersion: false,
    };
  }
  
  log.debug('Dados migrados', { migrated });
  
  return migrated as KeywordsState;
}

/**
 * Salva dados com versionamento
 */
function saveWithVersion<T>(key: string, data: T, version: number): void {
  const wrapped: StorageWithVersion<T> = {
    version,
    data
  };
  localStorage.setItem(key, JSON.stringify(wrapped));
}

/**
 * Carrega dados com migração automática
 */
function loadWithMigration<T>(
  key: string, 
  defaultValue: T, 
  currentVersion: number,
  migrator?: (data: any, fromVersion: number) => T
): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      log.debug(`Nenhum dado encontrado para "${key}". Usando valores padrão.`);
      return defaultValue;
    }
    
    const parsed = JSON.parse(stored);
    
    // Verificar se é formato novo (com versão)
    if (parsed.version !== undefined) {
      const storedVersion = parsed.version;
      
      if (storedVersion === currentVersion) {
        log.debug(`Schema de "${key}" está atualizado (v${currentVersion})`);
        return { ...defaultValue, ...parsed.data } as T;
      }
      
      // Necessário migrar
      if (storedVersion < currentVersion && migrator) {
        log.warn(`Schema antigo detectado para "${key}": v${storedVersion} (atual: v${currentVersion})`);
        const migrated = migrator(parsed.data, storedVersion);
        
        // Salvar versão migrada
        saveWithVersion(key, migrated, currentVersion);
        log.info(`Migração concluída e salva para "${key}"`);
        
        return migrated;
      }
    } else {
      // Formato antigo (sem versionamento) - tratar como v1
      log.warn(`Dados legados detectados para "${key}" (sem versão). Migrando...`);
      
      if (migrator) {
        const migrated = migrator(parsed, 1);
        saveWithVersion(key, migrated, currentVersion);
        log.info(`Dados legados migrados para v${currentVersion}`);
        return migrated;
      }
      
      // Fallback: merge com default
      return { ...defaultValue, ...parsed } as T;
    }
    
    return defaultValue;
  } catch (error) {
    console.error(`❌ Erro ao carregar/migrar "${key}":`, error);
    return defaultValue;
  }
}

// ==================== TYPE DEFINITIONS ====================

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
  hasInitialized?: boolean;
  analysisConfig: {
    generateKeywordsList: boolean;
    generateScatterPlot: boolean;
    generateComparisonChart: boolean;
    generateDispersion: boolean;
  };
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
  
  selectedWord: string;
  setSelectedWord: (word: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToKWIC: (
    word: string, 
    sourceTab: string,
    corpusContext?: {
      corpusBase: CorpusType;
      mode: 'complete' | 'artist';
      artist: string | null;
    }
  ) => void;
  
  saveStatus: {
    isSaving: boolean;
    lastSaved: Date | null;
    error: string | null;
  };
  
  clearAllCache: () => void;
}

// ==================== INITIAL STATES ====================

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
  isProcessed: false,
  analysisConfig: {
    generateKeywordsList: true,
    generateScatterPlot: false,
    generateComparisonChart: false,
    generateDispersion: false,
  }
};

const INITIAL_WORDLIST_STATE: WordlistState = {
  wordlist: [],
  searchTerm: '',
  sortColumn: 'frequencia',
  sortDirection: 'desc',
};

const INITIAL_KWIC_STATE: KWICState = {
  palavra: '',
  contextoEsquerdo: 3,
  contextoDireito: 3,
  results: [],
  selectedArtists: [],
  selectedMusicas: [],
  anoInicio: null,
  anoFim: null,
  janelaColocacional: 5,
  minFreqColocacao: 2,
  colocacoes: [],
  dispersionAnalysis: null,
};

const INITIAL_DISPERSION_STATE: DispersionState = {
  palavra: '',
  analysis: null,
};

const INITIAL_NGRAMS_STATE: NgramsState = {
  ngramSize: 2,
  minFrequencia: '2',
  maxResults: '50',
  analysis: null,
};

// ==================== STORAGE ====================

const STORAGE_KEYS = {
  keywords: 'tools_keywords_state',
  wordlist: 'tools_wordlist_state',
  kwic: 'tools_kwic_state',
  dispersion: 'tools_dispersion_state',
  ngrams: 'tools_ngrams_state',
};

function compressStateForStorage<T>(value: T, key: string): T {
  if (key === STORAGE_KEYS.keywords) {
    const state = value as unknown as KeywordsState;
    
    // Se a lista de keywords não foi gerada, remover array para economizar espaço
    if (!state.analysisConfig?.generateKeywordsList && !state.isProcessed) {
      return {
        ...state,
        keywords: []
      } as unknown as T;
    }
  }
  
  return value;
}

function saveToStorageIdle<T>(
  key: string, 
  value: T,
  version: number,
  setSaveStatus: (status: any) => void
): void {
  setSaveStatus((prev: any) => ({ ...prev, isSaving: true }));
  
  try {
    const compressed = compressStateForStorage(value, key);
    
    // Salvar com versionamento
    const wrapped: StorageWithVersion<T> = {
      version,
      data: compressed
    };
    const serialized = JSON.stringify(wrapped);
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        try {
          localStorage.setItem(key, serialized);
          setSaveStatus({
            isSaving: false,
            lastSaved: new Date(),
            error: null
          });
        } catch (error) {
          console.error('Error saving to localStorage:', error);
          setSaveStatus((prev: any) => ({
            ...prev,
            isSaving: false,
            error: 'Erro ao salvar dados'
          }));
        }
      });
    } else {
      localStorage.setItem(key, serialized);
      setSaveStatus({
        isSaving: false,
        lastSaved: new Date(),
        error: null
      });
    }
  } catch (error) {
    console.error('Error preparing localStorage save:', error);
    setSaveStatus((prev: any) => ({
      ...prev,
      isSaving: false,
      error: 'Erro ao preparar salvamento'
    }));
  }
}

// ==================== CONTEXT ====================

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export function ToolsProvider({ children }: { children: ReactNode }) {
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState({
    isSaving: false,
    lastSaved: null as Date | null,
    error: null as string | null
  });

  const [keywordsState, setKeywordsStateInternal] = useState<KeywordsState>(() =>
    loadWithMigration(
      STORAGE_KEYS.keywords, 
      INITIAL_KEYWORDS_STATE,
      CURRENT_SCHEMA_VERSION.keywords,
      migrateKeywordsSchema
    )
  );
  const [wordlistState, setWordlistStateInternal] = useState<WordlistState>(() =>
    loadWithMigration(
      STORAGE_KEYS.wordlist, 
      INITIAL_WORDLIST_STATE,
      CURRENT_SCHEMA_VERSION.wordlist
    )
  );
  const [kwicState, setKwicStateInternal] = useState<KWICState>(() =>
    loadWithMigration(
      STORAGE_KEYS.kwic, 
      INITIAL_KWIC_STATE,
      CURRENT_SCHEMA_VERSION.kwic
    )
  );
  const [dispersionState, setDispersionStateInternal] = useState<DispersionState>(() =>
    loadWithMigration(
      STORAGE_KEYS.dispersion, 
      INITIAL_DISPERSION_STATE,
      CURRENT_SCHEMA_VERSION.dispersion
    )
  );
  const [ngramsState, setNgramsStateInternal] = useState<NgramsState>(() =>
    loadWithMigration(
      STORAGE_KEYS.ngrams, 
      INITIAL_NGRAMS_STATE,
      CURRENT_SCHEMA_VERSION.ngrams
    )
  );

  // Debounced save functions
  const debouncedSaveKeywords = useMemo(
    () => debounce((state: KeywordsState) => {
      saveToStorageIdle(STORAGE_KEYS.keywords, state, CURRENT_SCHEMA_VERSION.keywords, setSaveStatus);
    }, 500),
    []
  );

  const debouncedSaveWordlist = useMemo(
    () => debounce((state: WordlistState) => {
      saveToStorageIdle(STORAGE_KEYS.wordlist, state, CURRENT_SCHEMA_VERSION.wordlist, setSaveStatus);
    }, 500),
    []
  );

  const debouncedSaveKwic = useMemo(
    () => debounce((state: KWICState) => {
      saveToStorageIdle(STORAGE_KEYS.kwic, state, CURRENT_SCHEMA_VERSION.kwic, setSaveStatus);
    }, 500),
    []
  );

  const debouncedSaveDispersion = useMemo(
    () => debounce((state: DispersionState) => {
      saveToStorageIdle(STORAGE_KEYS.dispersion, state, CURRENT_SCHEMA_VERSION.dispersion, setSaveStatus);
    }, 500),
    []
  );

  const debouncedSaveNgrams = useMemo(
    () => debounce((state: NgramsState) => {
      saveToStorageIdle(STORAGE_KEYS.ngrams, state, CURRENT_SCHEMA_VERSION.ngrams, setSaveStatus);
    }, 500),
    []
  );

  // Auto-save effects
  useEffect(() => {
    debouncedSaveKeywords(keywordsState);
  }, [keywordsState, debouncedSaveKeywords]);

  useEffect(() => {
    debouncedSaveWordlist(wordlistState);
  }, [wordlistState, debouncedSaveWordlist]);

  useEffect(() => {
    debouncedSaveKwic(kwicState);
  }, [kwicState, debouncedSaveKwic]);

  useEffect(() => {
    debouncedSaveDispersion(dispersionState);
  }, [dispersionState, debouncedSaveDispersion]);

  useEffect(() => {
    debouncedSaveNgrams(ngramsState);
  }, [ngramsState, debouncedSaveNgrams]);

  // Setters
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
  const clearKeywordsState = () => setKeywordsStateInternal(INITIAL_KEYWORDS_STATE);
  const clearWordlistState = () => setWordlistStateInternal(INITIAL_WORDLIST_STATE);
  const clearKwicState = () => setKwicStateInternal(INITIAL_KWIC_STATE);
  const clearDispersionState = () => setDispersionStateInternal(INITIAL_DISPERSION_STATE);
  const clearNgramsState = () => setNgramsStateInternal(INITIAL_NGRAMS_STATE);

  const navigateToKWIC = (
    word: string, 
    sourceTab: string,
    corpusContext?: {
      corpusBase: CorpusType;
      mode: 'complete' | 'artist';
      artist: string | null;
    }
  ) => {
    log.debug(`Navegando para KWIC: "${word}"`, { sourceTab });
    
    // Salvar contexto temporário para busca contextual
    if (corpusContext) {
      const kwicContext = {
        corpusBase: corpusContext.corpusBase,
        mode: corpusContext.mode === 'artist' ? 'single' : 'complete',
        artistaA: corpusContext.artist,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('kwic-temp-context', JSON.stringify(kwicContext));
      log.debug('Contexto temporário salvo', kwicContext);
    }
    
    setSelectedWord(word);
    setActiveTab('kwic');
  };

  const clearAllCache = useCallback(() => {
    log.info('Limpando cache completo do localStorage');
    
    // Remover todos os dados das ferramentas
    Object.values(STORAGE_KEYS).forEach(key => {
      log.debug(`Removendo: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Resetar todos os estados para valores iniciais
    setKeywordsStateInternal(INITIAL_KEYWORDS_STATE);
    setWordlistStateInternal(INITIAL_WORDLIST_STATE);
    setKwicStateInternal(INITIAL_KWIC_STATE);
    setDispersionStateInternal(INITIAL_DISPERSION_STATE);
    setNgramsStateInternal(INITIAL_NGRAMS_STATE);
    
    log.info('Cache limpo com sucesso!');
    
    // Recarregar página para garantir estado limpo
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  const value = {
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
    clearNgramsState,
    
    selectedWord,
    setSelectedWord,
    activeTab,
    setActiveTab,
    navigateToKWIC,
    saveStatus,
    clearAllCache,
  };

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}

export function useTools() {
  const context = useContext(ToolsContext);
  if (context === undefined) {
    throw new Error('useTools must be used within a ToolsProvider');
  }
  return context;
}
