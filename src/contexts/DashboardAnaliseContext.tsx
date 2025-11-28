import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProcessamentoData {
  studyMode: 'complete' | 'artist' | 'song';
  studyArtist: string;
  studySong: string;
  isProcessed: boolean;
  processedAt?: string;
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
