import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DomainData {
  dominio: string;
  descricao: string;
  cor: string;
  palavras: string[];
  ocorrencias: number;
  avgLL: number;
  avgMI: number;
  riquezaLexical: number;
  percentual: number;
}

interface KeywordData {
  palavra: string;
  frequencia: number;
  ll: number;
  mi: number;
  significancia: string;
  dominio: string;
  cor: string;
  prosody: string;
}

interface CloudData {
  codigo: string;
  nome: string;
  size: number;
  color: string;
  wordCount: number;
  avgScore: number;
}

interface AnalysisResults {
  dominios: DomainData[];
  keywords: KeywordData[];
  cloudData: CloudData[];
  estatisticas: {
    totalPalavras: number;
    palavrasUnicas: number;
    dominiosIdentificados: number;
    palavrasChaveSignificativas: number;
    prosodiaDistribution: {
      positivas: number;
      negativas: number;
      neutras: number;
      percentualPositivo: number;
      percentualNegativo: number;
      percentualNeutro: number;
    };
  };
}

interface ProcessamentoData {
  studyMode: 'complete' | 'artist' | 'song';
  studyArtist: string;
  studySong: string;
  referenceCorpus: string;
  isProcessed: boolean;
  processedAt?: string;
  analysisResults?: AnalysisResults;
}

interface DashboardAnaliseContextValue {
  processamentoData: ProcessamentoData;
  updateProcessamentoData: (data: Partial<ProcessamentoData>) => void;
  clearProcessamentoData: () => void;
}

const STORAGE_KEY = 'dashboard_analise_processamento';

const initialData: ProcessamentoData = {
  studyMode: 'artist',
  studyArtist: '',
  studySong: '',
  referenceCorpus: 'mini-nordestino',
  isProcessed: false,
};

const DashboardAnaliseContext = createContext<DashboardAnaliseContextValue | null>(null);

export function DashboardAnaliseProvider({ children }: { children: ReactNode }) {
  const [processamentoData, setProcessamentoData] = useState<ProcessamentoData>(() => {
    // Carregar dados do localStorage na inicialização
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialData;
    } catch (error) {
      console.error('Error loading processamento data from localStorage:', error);
      return initialData;
    }
  });

  // Persistir dados no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processamentoData));
    } catch (error) {
      console.error('Error saving processamento data to localStorage:', error);
    }
  }, [processamentoData]);

  const updateProcessamentoData = (data: Partial<ProcessamentoData>) => {
    setProcessamentoData(prev => ({
      ...prev,
      ...data,
    }));
  };

  const clearProcessamentoData = () => {
    setProcessamentoData(initialData);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <DashboardAnaliseContext.Provider
      value={{
        processamentoData,
        updateProcessamentoData,
        clearProcessamentoData,
      }}
    >
      {children}
    </DashboardAnaliseContext.Provider>
  );
}

export function useDashboardAnaliseContext() {
  const context = useContext(DashboardAnaliseContext);
  if (!context) {
    throw new Error('useDashboardAnaliseContext must be used within DashboardAnaliseProvider');
  }
  return context;
}
