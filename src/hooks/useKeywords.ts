import { useState } from "react";
import { KeywordEntry, CorpusType, CorpusWord } from "@/data/types/corpus-tools.types";
import { parseTSVCorpus } from "@/lib/corpusParser";
import { generateKeywords } from "@/services/keywordService";
import { loadCorpusFromCatalog } from "@/services/catalogCorpusService";

export function useKeywords() {
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  
  const processKeywords = async (
    estudoId: string,  // Pode ser 'gaucho', 'nordestino', ou 'gaucho-Luiz Marenco'
    referenciaId: string
  ) => {
    setIsLoading(true);
    setError(null);
    setKeywords([]);
    setIsProcessed(false);
    
    try {
      // Helper para carregar e processar corpus ou subcorpus
      const loadCorpusData = async (id: string): Promise<CorpusWord[]> => {
        // Detectar se é subcorpus (formato: 'corpus-artista')
        if (id.includes('-')) {
          const [corpusBase, artist] = id.split('-');
          
          // Carregar DIRETAMENTE do catálogo com filtro de artista
          const fullCorpus = await loadCorpusFromCatalog(corpusBase as CorpusType, {
            artistNames: [artist]
          });
          
          if (fullCorpus.musicas.length === 0) {
            throw new Error(`Nenhuma música encontrada para o artista ${artist}`);
          }
          
          // Converter para CorpusWord[] contando frequências
          const wordFreqMap = new Map<string, number>();
          fullCorpus.musicas.forEach(song => {
            song.palavras.forEach(word => {
              const cleaned = word.toLowerCase();
              if (cleaned) {
                wordFreqMap.set(cleaned, (wordFreqMap.get(cleaned) || 0) + 1);
              }
            });
          });
          
          const totalWords = Array.from(wordFreqMap.values()).reduce((a, b) => a + b, 0);
          
          return Array.from(wordFreqMap.entries())
            .map(([word, freq], index) => ({
              headword: word,
              freq,
              rank: index + 1,
              range: 0,
              normFreq: (freq / totalWords) * 1000000,
              normRange: 0
            }))
            .sort((a, b) => b.freq - a.freq);
        } else {
          // Corpus completo - usar caminho TSV
          const path = getCorpusPath(id as CorpusType);
          const response = await fetch(path);
          const text = await response.text();
          return parseTSVCorpus(text);
        }
      };
      
      const [estudoData, referenciaData] = await Promise.all([
        loadCorpusData(estudoId),
        loadCorpusData(referenciaId)
      ]);
      
      if (estudoData.length === 0) {
        throw new Error('Corpus de estudo vazio ou mal formatado');
      }
      
      if (referenciaData.length === 0) {
        throw new Error('Corpus de referência vazio ou mal formatado');
      }
      
      // Gerar keywords
      const kws = generateKeywords(estudoData, referenciaData);
      
      setKeywords(kws);
      setIsProcessed(true);
    } catch (err) {
      console.error('Error processing keywords:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar corpus. Verifique os arquivos.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return { keywords, isLoading, error, isProcessed, processKeywords };
}

// Helper function para mapear corpus para caminho
function getCorpusPath(corpus: CorpusType): string {
  switch(corpus) {
    case 'gaucho':
      return '/src/data/corpus/corpus-estudo-gaucho.txt';
    case 'nordestino':
      return '/src/data/corpus/corpus-referencia-nordestino.txt';
    default:
      return '/src/data/corpus/corpus-estudo-gaucho.txt';
  }
}
