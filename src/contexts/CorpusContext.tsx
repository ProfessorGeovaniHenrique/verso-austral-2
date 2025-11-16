import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CorpusType } from '@/data/types/corpus-tools.types';
import { parseTSVCorpus, calculateTotalTokens } from '@/lib/corpusParser';
import { loadFullTextCorpus } from '@/lib/fullTextParser';
import { CorpusCompleto } from '@/data/types/full-text-corpus.types';

interface WordlistCache {
  words: Array<{ headword: string; freq: number }>;
  totalTokens: number;
  loadedAt: number;
}

interface FullTextCache {
  corpus: CorpusCompleto;
  loadedAt: number;
}

interface CorpusFilters {
  artistas?: string[];
  albuns?: string[];
  anoInicio?: number;
  anoFim?: number;
}

interface CorpusContextType {
  // Wordlist cache
  getWordlistCache: (tipo: CorpusType, path: string) => Promise<WordlistCache>;
  
  // Full text cache
  getFullTextCache: (tipo: CorpusType, filters?: CorpusFilters) => Promise<FullTextCache>;
  
  // Cache management
  clearCache: () => void;
  isLoading: boolean;
}

const CorpusContext = createContext<CorpusContextType | undefined>(undefined);

// Cache com TTL de 30 minutos
const CACHE_TTL = 30 * 60 * 1000;

export function CorpusProvider({ children }: { children: ReactNode }) {
  const [wordlistCache, setWordlistCache] = useState<Map<string, WordlistCache>>(new Map());
  const [fullTextCache, setFullTextCache] = useState<Map<string, FullTextCache>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const getWordlistCache = useCallback(async (tipo: CorpusType, path: string): Promise<WordlistCache> => {
    const cacheKey = `${tipo}-${path}`;
    const cached = wordlistCache.get(cacheKey);
    
    // Verificar se cache é válido
    if (cached && (Date.now() - cached.loadedAt) < CACHE_TTL) {
      console.log(`✅ Cache hit: wordlist ${tipo}`);
      return cached;
    }

    console.log(`📂 Cache miss: carregando wordlist ${tipo}...`);
    setIsLoading(true);
    
    try {
      const response = await fetch(path);
      const text = await response.text();
      const parsedCorpus = parseTSVCorpus(text);
      const totalTokens = calculateTotalTokens(parsedCorpus);

      const cache: WordlistCache = {
        words: parsedCorpus,
        totalTokens,
        loadedAt: Date.now()
      };

      setWordlistCache(prev => new Map(prev).set(cacheKey, cache));
      console.log(`✅ Wordlist ${tipo} carregada e cacheada: ${parsedCorpus.length} palavras`);
      
      return cache;
    } finally {
      setIsLoading(false);
    }
  }, [wordlistCache]);

  const getFullTextCache = useCallback(async (tipo: CorpusType, filters?: CorpusFilters): Promise<FullTextCache> => {
    // Apenas gaucho e nordestino suportam full text
    if (tipo !== 'gaucho' && tipo !== 'nordestino') {
      throw new Error(`Full text corpus não disponível para tipo: ${tipo}`);
    }
    
    const filterKey = filters ? JSON.stringify(filters) : 'none';
    const cacheKey = `${tipo}-fulltext-${filterKey}`;
    const cached = fullTextCache.get(cacheKey);
    
    // Verificar se cache é válido
    if (cached && (Date.now() - cached.loadedAt) < CACHE_TTL) {
      console.log(`✅ Cache hit: corpus completo ${tipo}`);
      return cached;
    }

    console.log(`📂 Cache miss: carregando corpus completo ${tipo}...`);
    setIsLoading(true);
    
    try {
      const corpus = await loadFullTextCorpus(tipo as 'gaucho' | 'nordestino', filters);

      const cache: FullTextCache = {
        corpus,
        loadedAt: Date.now()
      };

      setFullTextCache(prev => new Map(prev).set(cacheKey, cache));
      console.log(`✅ Corpus completo ${tipo} carregado e cacheado: ${corpus.musicas.length} músicas`);
      
      return cache;
    } finally {
      setIsLoading(false);
    }
  }, [fullTextCache]);

  const clearCache = useCallback(() => {
    setWordlistCache(new Map());
    setFullTextCache(new Map());
    console.log('🗑️ Cache limpo');
  }, []);

  return (
    <CorpusContext.Provider value={{
      getWordlistCache,
      getFullTextCache,
      clearCache,
      isLoading
    }}>
      {children}
    </CorpusContext.Provider>
  );
}

export function useCorpusCache() {
  const context = useContext(CorpusContext);
  if (!context) {
    throw new Error('useCorpusCache must be used within CorpusProvider');
  }
  return context;
}
