import { useState, useEffect } from "react";
import { CorpusCompleto } from "@/data/types/full-text-corpus.types";
import { loadFullTextCorpus } from "@/lib/fullTextParser";

/**
 * Hook to load and manage full-text corpus
 * Implements lazy loading and caching
 */
export function useFullTextCorpus(
  tipo: 'gaucho' | 'nordestino',
  filters?: {
    artistas?: string[];
    albuns?: string[];
    anoInicio?: number;
    anoFim?: number;
  }
) {
  const [corpus, setCorpus] = useState<CorpusCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadCorpus = async () => {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      
      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 200);
        
        const parsed = await loadFullTextCorpus(tipo, filters);
        
        clearInterval(progressInterval);
        
        if (isMounted) {
          setCorpus(parsed);
          setProgress(100);
        }
      } catch (err) {
        console.error('Erro ao carregar corpus:', err);
        if (isMounted) {
          setError('Erro ao carregar corpus. Tente novamente.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadCorpus();
    
    return () => {
      isMounted = false;
    };
  }, [tipo, JSON.stringify(filters)]);
  
  return { 
    corpus, 
    isLoading, 
    error,
    progress,
    isReady: corpus !== null && !isLoading
  };
}
