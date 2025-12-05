/**
 * 🔬 ANALYSIS TOOLS CONTEXT
 * 
 * Estado compartilhado para todas as ferramentas de análise da Página 3
 * Gerencia seleção de corpus, corpus do usuário e configurações
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CorpusType } from '@/data/types/corpus-tools.types';

// Tipos para corpus do usuário
export interface UserCorpusFile {
  id: string;
  name: string;
  content: string;
  wordCount: number;
  uploadedAt: Date;
}

export interface CorpusSelection {
  type: 'platform' | 'user';
  platformCorpus?: CorpusType;
  platformArtist?: string;
  userCorpus?: UserCorpusFile;
}

export interface CorpusBalancing {
  enabled: boolean;
  ratio: number; // 1:1, 1:2, etc.
  method: 'random' | 'proportional';
}

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
}

const AnalysisToolsContext = createContext<AnalysisToolsContextType | null>(null);

export function AnalysisToolsProvider({ children }: { children: ReactNode }) {
  // Corpus selections
  const [studyCorpus, setStudyCorpus] = useState<CorpusSelection | null>(null);
  const [referenceCorpus, setReferenceCorpus] = useState<CorpusSelection | null>(null);
  
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
  
  const addUserCorpus = useCallback((file: UserCorpusFile) => {
    setUserCorpora(prev => [...prev, file]);
  }, []);
  
  const removeUserCorpus = useCallback((id: string) => {
    setUserCorpora(prev => prev.filter(f => f.id !== id));
    // Limpar seleções que usavam este corpus
    setStudyCorpus(prev => 
      prev?.type === 'user' && prev.userCorpus?.id === id ? null : prev
    );
    setReferenceCorpus(prev => 
      prev?.type === 'user' && prev.userCorpus?.id === id ? null : prev
    );
  }, []);
  
  const clearSelections = useCallback(() => {
    setStudyCorpus(null);
    setReferenceCorpus(null);
    setBalancing({ enabled: false, ratio: 1, method: 'random' });
  }, []);
  
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
      clearSelections
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
