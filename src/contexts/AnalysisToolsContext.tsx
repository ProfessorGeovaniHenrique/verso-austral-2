/**
 * 🔬 ANALYSIS TOOLS CONTEXT
 * 
 * Estado compartilhado para todas as ferramentas de análise da Página 3
 * Gerencia seleção de corpus, corpus do usuário, cache de resultados e configurações
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { CorpusType } from '@/data/types/corpus-tools.types';
import { LexicalProfile, SyntacticProfile, RhetoricalProfile, CohesionProfile } from '@/data/types/stylistic-analysis.types';
import { SpeechThoughtProfile } from '@/services/speechThoughtAnalysisService';
import { MindStyleProfile } from '@/services/mindStyleAnalysisService';
import { ForegroundingProfile } from '@/services/foregroundingAnalysisService';

// Tipos para corpus do usuário
export type TextType = 'poetry' | 'prose';

export interface UserCorpusFile {
  id: string;
  name: string;
  content: string;
  wordCount: number;
  uploadedAt: Date;
  textType: TextType; // Tipo do texto: poesia/música ou prosa
}

export interface CorpusSelection {
  type: 'platform' | 'user';
  platformCorpus?: CorpusType;
  platformArtist?: string;
  userCorpus?: UserCorpusFile;
}

export interface CorpusBalancing {
  enabled: boolean;
  ratio: number;
  method: 'random' | 'proportional';
}

// ============================================
// SISTEMA DE CACHE DE FERRAMENTAS
// ============================================

export interface ToolCacheEntry<T = unknown> {
  data: T;
  corpusHash: string;
  timestamp: number;
  isStale: boolean;
}

// Ferramentas Estilísticas (7)
export type StyleToolKey = 
  | 'lexical' 
  | 'syntactic' 
  | 'rhetorical' 
  | 'cohesion' 
  | 'speech' 
  | 'mind' 
  | 'foregrounding';

// Ferramentas Básicas (5)
export type BasicToolKey =
  | 'wordlist'
  | 'keywords'
  | 'kwic'
  | 'dispersion'
  | 'ngrams';

// União de todas as ferramentas
export type ToolKey = StyleToolKey | BasicToolKey;

// Tipos de dados das ferramentas básicas
export interface WordlistEntry {
  palavra: string;
  frequencia: number;
  frequenciaNormalizada: number;
}

export interface KeywordEntry {
  palavra: string;
  freqEstudo: number;
  freqReferencia: number;
  ll: number;
  efeito: 'super-representado' | 'sub-representado';
  significancia: 'Alta' | 'Média' | 'Baixa';
}

export interface DispersionEntry {
  palavra: string;
  totalOcorrencias: number;
  coeficienteDispersao: number;
  densidade: 'Alta' | 'Média' | 'Baixa';
}

export interface NGramEntry {
  ngram: string;
  frequencia: number;
  n: number;
}

export interface ToolsCache {
  // Ferramentas Estilísticas
  lexical: ToolCacheEntry<LexicalProfile> | null;
  syntactic: ToolCacheEntry<SyntacticProfile> | null;
  rhetorical: ToolCacheEntry<RhetoricalProfile> | null;
  cohesion: ToolCacheEntry<CohesionProfile> | null;
  speech: ToolCacheEntry<SpeechThoughtProfile> | null;
  mind: ToolCacheEntry<MindStyleProfile> | null;
  foregrounding: ToolCacheEntry<ForegroundingProfile> | null;
  // Ferramentas Básicas
  wordlist: ToolCacheEntry<WordlistEntry[]> | null;
  keywords: ToolCacheEntry<KeywordEntry[]> | null;
  kwic: ToolCacheEntry<{ palavra: string; results: unknown[] }> | null;
  dispersion: ToolCacheEntry<DispersionEntry> | null;
  ngrams: ToolCacheEntry<NGramEntry[]> | null;
}

const INITIAL_TOOLS_CACHE: ToolsCache = {
  // Estilísticas
  lexical: null,
  syntactic: null,
  rhetorical: null,
  cohesion: null,
  speech: null,
  mind: null,
  foregrounding: null,
  // Básicas
  wordlist: null,
  keywords: null,
  kwic: null,
  dispersion: null,
  ngrams: null,
};

const CACHE_STORAGE_KEY = 'verso-austral-tools-cache';
const CACHE_VERSION = '1.0';

// ============================================
// CONTEXT TYPE
// ============================================

interface AnalysisToolsContextType {
  // Corpus de Estudo
  studyCorpus: CorpusSelection | null;
  setStudyCorpus: (corpus: CorpusSelection | null) => void;
  
  // Corpus de Referência
  referenceCorpus: CorpusSelection | null;
  setReferenceCorpus: (corpus: CorpusSelection | null) => void;
  
  // Corpora do usuário (armazenados em memória)
  userCorpora: UserCorpusFile[];
  addUserCorpus: (file: UserCorpusFile) => void;
  removeUserCorpus: (id: string) => void;
  
  // Balanceamento
  balancing: CorpusBalancing;
  setBalancing: (balancing: CorpusBalancing) => void;
  
  // Aba ativa
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Estado de loading global
  isProcessing: boolean;
  setIsProcessing: (loading: boolean) => void;
  
  // Limpar seleções
  clearSelections: () => void;
  
  // ============================================
  // CACHE DE FERRAMENTAS
  // ============================================
  toolsCache: ToolsCache;
  setToolCache: <K extends ToolKey>(tool: K, entry: ToolCacheEntry<ToolsCache[K] extends ToolCacheEntry<infer T> | null ? T : unknown> | null) => void;
  invalidateToolCache: (tool?: ToolKey) => void;
  clearAllToolsCache: () => void;
  currentCorpusHash: string;
}

const AnalysisToolsContext = createContext<AnalysisToolsContextType | null>(null);

// ============================================
// HELPER: Gerar hash do corpus para detectar mudanças
// ============================================
function generateCorpusHash(study: CorpusSelection | null, reference: CorpusSelection | null): string {
  const studyKey = study 
    ? `${study.type}-${study.platformCorpus || ''}-${study.platformArtist || ''}-${study.userCorpus?.id || ''}`
    : 'null';
  const refKey = reference
    ? `${reference.type}-${reference.platformCorpus || ''}-${reference.platformArtist || ''}-${reference.userCorpus?.id || ''}`
    : 'null';
  return `${studyKey}|${refKey}`;
}

// ============================================
// PROVIDER
// ============================================

export function AnalysisToolsProvider({ children }: { children: ReactNode }) {
  // Corpus selections
  const [studyCorpus, setStudyCorpusState] = useState<CorpusSelection | null>(null);
  const [referenceCorpus, setReferenceCorpusState] = useState<CorpusSelection | null>(null);
  
  // User uploaded corpora
  const [userCorpora, setUserCorpora] = useState<UserCorpusFile[]>([]);
  
  // Balancing settings
  const [balancing, setBalancing] = useState<CorpusBalancing>({
    enabled: false,
    ratio: 1,
    method: 'random'
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Tools cache
  const [toolsCache, setToolsCache] = useState<ToolsCache>(INITIAL_TOOLS_CACHE);
  
  // Hash atual do corpus para validação de cache
  const currentCorpusHash = useMemo(
    () => generateCorpusHash(studyCorpus, referenceCorpus),
    [studyCorpus, referenceCorpus]
  );
  
  // ============================================
  // CARREGAR CACHE DO LOCALSTORAGE
  // ============================================
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CACHE_STORAGE_KEY);
      if (saved) {
        const { version, data, corpusHash } = JSON.parse(saved);
        if (version === CACHE_VERSION && corpusHash === currentCorpusHash) {
          setToolsCache(data);
        }
      }
    } catch {
      // Ignorar erros de parsing
    }
  }, []);
  
  // ============================================
  // SALVAR CACHE NO LOCALSTORAGE
  // ============================================
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify({
        version: CACHE_VERSION,
        data: toolsCache,
        corpusHash: currentCorpusHash
      }));
    } catch {
      // Ignorar erros de storage
    }
  }, [toolsCache, currentCorpusHash]);
  
  // ============================================
  // FUNÇÕES DE CACHE
  // ============================================
  
  const setToolCache = useCallback(<K extends ToolKey>(
    tool: K, 
    entry: ToolCacheEntry<ToolsCache[K] extends ToolCacheEntry<infer T> | null ? T : unknown> | null
  ) => {
    setToolsCache(prev => ({
      ...prev,
      [tool]: entry
    }));
  }, []);
  
  const invalidateToolCache = useCallback((tool?: ToolKey) => {
    if (tool) {
      // Invalida apenas uma ferramenta
      setToolsCache(prev => {
        const entry = prev[tool];
        if (!entry) return prev;
        return {
          ...prev,
          [tool]: { ...entry, isStale: true }
        };
      });
    } else {
      // Invalida todas as ferramentas
      setToolsCache(prev => {
        const newCache = { ...prev } as ToolsCache;
        (Object.keys(newCache) as ToolKey[]).forEach(key => {
          const entry = newCache[key];
          if (entry) {
            (newCache[key] as ToolCacheEntry<unknown>) = { ...entry, isStale: true };
          }
        });
        return newCache;
      });
    }
  }, []);
  
  const clearAllToolsCache = useCallback(() => {
    setToolsCache(INITIAL_TOOLS_CACHE);
    localStorage.removeItem(CACHE_STORAGE_KEY);
  }, []);
  
  // ============================================
  // CORPUS SETTERS COM INVALIDAÇÃO AUTOMÁTICA
  // ============================================
  
  const setStudyCorpus = useCallback((corpus: CorpusSelection | null) => {
    setStudyCorpusState(corpus);
    // Invalidar cache quando corpus muda
    invalidateToolCache();
  }, [invalidateToolCache]);
  
  const setReferenceCorpus = useCallback((corpus: CorpusSelection | null) => {
    setReferenceCorpusState(corpus);
    // Invalidar cache quando referência muda
    invalidateToolCache();
  }, [invalidateToolCache]);
  
  // ============================================
  // USER CORPUS MANAGEMENT
  // ============================================
  
  const addUserCorpus = useCallback((file: UserCorpusFile) => {
    setUserCorpora(prev => [...prev, file]);
  }, []);
  
  const removeUserCorpus = useCallback((id: string) => {
    setUserCorpora(prev => prev.filter(f => f.id !== id));
    // Limpar seleções que usavam este corpus
    setStudyCorpusState(prev => 
      prev?.type === 'user' && prev.userCorpus?.id === id ? null : prev
    );
    setReferenceCorpusState(prev => 
      prev?.type === 'user' && prev.userCorpus?.id === id ? null : prev
    );
    invalidateToolCache();
  }, [invalidateToolCache]);
  
  const clearSelections = useCallback(() => {
    setStudyCorpusState(null);
    setReferenceCorpusState(null);
    setBalancing({ enabled: false, ratio: 1, method: 'random' });
    clearAllToolsCache();
  }, [clearAllToolsCache]);
  
  return (
    <AnalysisToolsContext.Provider value={{
      studyCorpus,
      setStudyCorpus,
      referenceCorpus,
      setReferenceCorpus,
      userCorpora,
      addUserCorpus,
      removeUserCorpus,
      balancing,
      setBalancing,
      activeTab,
      setActiveTab,
      isProcessing,
      setIsProcessing,
      clearSelections,
      // Cache
      toolsCache,
      setToolCache,
      invalidateToolCache,
      clearAllToolsCache,
      currentCorpusHash
    }}>
      {children}
    </AnalysisToolsContext.Provider>
  );
}

export function useAnalysisTools() {
  const context = useContext(AnalysisToolsContext);
  if (!context) {
    throw new Error('useAnalysisTools must be used within AnalysisToolsProvider');
  }
  return context;
}
