import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('DashboardAnaliseContext');

export interface DomainData {
  dominio: string;
  codigo: string; // Código completo do domínio (ex: "NA", "NA.01", "NA.01.02")
  descricao: string;
  cor: string;
  palavras: string[];
  ocorrencias: number;
  avgLL: number;
  avgMI: number;
  riquezaLexical: number;
  percentual: number;
}

export interface KeywordData {
  palavra: string;
  frequencia: number;
  ll: number;
  mi: number;
  significancia: string;
  dominio: string;
  dominioCodigo: string; // Código do domínio semântico (ex: "NA", "AP.01")
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
  descricao?: string;
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
  ignorarMarcadoresGramaticais?: boolean;
  selectedLevel?: 1 | 2 | 3 | 4; // Nível hierárquico selecionado
}

interface DashboardAnaliseContextValue {
  processamentoData: ProcessamentoData;
  updateProcessamentoData: (data: Partial<ProcessamentoData>) => void;
  clearProcessamentoData: () => void;
}

const CACHE_VERSION = '2.2'; // Incrementar após mudanças no formato de dados
const STORAGE_KEY = 'dashboard_analise_processamento';
const VERSION_KEY = 'dashboard_analise_version';

const initialData: ProcessamentoData = {
  studyMode: 'artist',
  studyArtist: '',
  studySong: '',
  referenceCorpus: 'mini-nordestino',
  isProcessed: false,
  ignorarMarcadoresGramaticais: true, // Filtrar MG por padrão
  selectedLevel: 1, // Nível N1 por padrão
};

const DashboardAnaliseContext = createContext<DashboardAnaliseContextValue | null>(null);

export function DashboardAnaliseProvider({ children }: { children: ReactNode }) {
  const [processamentoData, setProcessamentoData] = useState<ProcessamentoData>(() => {
    // Carregar dados do localStorage na inicialização com verificação de versão
    try {
      const savedVersion = localStorage.getItem(VERSION_KEY);
      const saved = localStorage.getItem(STORAGE_KEY);
      
      // Se versão diferente, invalidar cache antigo
      if (savedVersion !== CACHE_VERSION) {
        log.info('Cache version mismatch, clearing old data');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(VERSION_KEY, CACHE_VERSION);
        return initialData;
      }
      
      return saved ? JSON.parse(saved) : initialData;
    } catch (error) {
      log.error('Error loading processamento data from localStorage', error instanceof Error ? error : new Error(String(error)));
      return initialData;
    }
  });

  // Persistir dados no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processamentoData));
    } catch (error) {
      log.error('Error saving processamento data to localStorage', error instanceof Error ? error : new Error(String(error)));
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
