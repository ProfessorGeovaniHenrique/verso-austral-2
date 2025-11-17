import { useState, useCallback } from 'react';
import { useFullTextCorpus } from './useFullTextCorpus';
import { generateKWIC } from '@/services/kwicService';
import { toast } from 'sonner';

export interface KWICData {
  leftContext: string;
  keyword: string;
  rightContext: string;
  source: string;
}

// Format compatible with KWICModal component
export interface KWICModalData {
  leftContext: string;
  keyword: string;
  rightContext: string;
  source: string;
}

export function useKWICModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [kwicData, setKwicData] = useState<KWICData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { corpus, isReady } = useFullTextCorpus('gaucho');
  
  const openModal = useCallback(async (word: string) => {
    setSelectedWord(word);
    setIsOpen(true);
    setIsLoading(true);
    
    try {
      if (corpus && isReady) {
        const contexts = generateKWIC(corpus, word, 5);
        
        const formatted: KWICData[] = contexts.map(ctx => ({
          leftContext: ctx.contextoEsquerdo,
          keyword: ctx.palavra,
          rightContext: ctx.contextoDireito,
          source: `${ctx.metadata.artista} - ${ctx.metadata.musica}`
        }));
        
        setKwicData(formatted);
        
        if (formatted.length === 0) {
          toast.info(`Nenhuma ocorrência encontrada para "${word}"`);
        }
      }
    } catch (error) {
      console.error('Erro ao gerar KWIC:', error);
      toast.error('Erro ao buscar concordâncias');
    } finally {
      setIsLoading(false);
    }
  }, [corpus, isReady]);
  
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setSelectedWord('');
    setKwicData([]);
  }, []);
  
  return { 
    isOpen, 
    closeModal,
    selectedWord, 
    kwicData, 
    isLoading, 
    openModal 
  };
}
