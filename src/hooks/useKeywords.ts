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
      // Carregar corpus de estudo
      const estudoPath = corpusEstudo === 'gaucho' 
        ? '/src/data/corpus/corpus-estudo-gaucho.txt'
        : '/src/data/corpus/corpus-referencia-nordestino.txt';
      
      // Carregar corpus de referência
      const referenciaPath = corpusReferencia === 'gaucho'
        ? '/src/data/corpus/corpus-estudo-gaucho.txt'
        : '/src/data/corpus/corpus-referencia-nordestino.txt';
      
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
