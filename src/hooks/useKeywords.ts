import { useState } from "react";
import { KeywordEntry, CorpusType } from "@/data/types/corpus-tools.types";
import { parseTSVCorpus } from "@/lib/corpusParser";
import { generateKeywords } from "@/services/keywordService";

export function useKeywords() {
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  
  const processKeywords = async (
    corpusEstudo: CorpusType,
    corpusReferencia: CorpusType
  ) => {
    // Validação: corpus diferentes
    if (corpusEstudo === corpusReferencia) {
      setError('Os corpus de estudo e referência devem ser diferentes');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setKeywords([]);
    setIsProcessed(false);
    
    try {
      // Função helper para mapear corpus para caminho
      const getCorpusPath = (corpus: CorpusType): string => {
        switch(corpus) {
          case 'gaucho':
            return '/src/data/corpus/corpus-estudo-gaucho.txt';
          case 'nordestino':
            return '/src/data/corpus/corpus-referencia-nordestino.txt';
          case 'marenco-verso':
            return '/src/data/corpus/corpus-luiz-marenco-verso.txt';
          default:
            return '/src/data/corpus/corpus-estudo-gaucho.txt';
        }
      };
      
      const estudoPath = getCorpusPath(corpusEstudo);
      const referenciaPath = getCorpusPath(corpusReferencia);
      
      const [estudoResponse, referenciaResponse] = await Promise.all([
        fetch(estudoPath),
        fetch(referenciaPath)
      ]);
      
      const [estudoText, referenciaText] = await Promise.all([
        estudoResponse.text(),
        referenciaResponse.text()
      ]);
      
      const estudoData = parseTSVCorpus(estudoText);
      const referenciaData = parseTSVCorpus(referenciaText);
      
      console.log(`📄 Corpus Estudo: ${estudoData.length} palavras únicas`);
      console.log(`📄 Corpus Referência: ${referenciaData.length} palavras únicas`);
      console.log(`📊 Sample Estudo:`, estudoData.slice(0, 3));
      console.log(`📊 Sample Referência:`, referenciaData.slice(0, 3));
      
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
      setError('Erro ao processar corpus. Verifique os arquivos.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return { keywords, isLoading, error, isProcessed, processKeywords };
}
