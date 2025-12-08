/**
 * 📚 USE LEXICAL KWIC
 * Sprint LF-8: Hook para gerenciar KWIC no contexto do Perfil Léxico
 * 
 * Fornece corpus para componentes KWIC e callbacks para navegação.
 */

import { useState, useEffect, useCallback } from "react";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { useAnalysisTools } from "@/contexts/AnalysisToolsContext";
import { CorpusCompleto } from "@/data/types/full-text-corpus.types";
import { loadSpecificCorpus } from "@/contexts/CorpusContext";
import { CorpusType } from "@/data/types/corpus-tools.types";
import { useNavigate } from "react-router-dom";
import { useTools } from "@/contexts/ToolsContext";

export function useLexicalKWIC() {
  const navigate = useNavigate();
  const { setSelectedWord } = useTools();
  const { loadedCorpus, stylisticSelection, getFilteredCorpus } = useSubcorpus();
  const { studyCorpus } = useAnalysisTools();
  
  const [corpus, setCorpus] = useState<CorpusCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Carregar corpus apropriado
  useEffect(() => {
    const loadCorpus = async () => {
      // Se já tem corpus de usuário carregado, usar direto
      if (studyCorpus?.type === 'user' && loadedCorpus) {
        setCorpus(loadedCorpus);
        return;
      }
      
      // Para corpus de plataforma, carregar via SubcorpusContext
      if (stylisticSelection) {
        setIsLoading(true);
        try {
          // SPRINT AUD-A: Modo compare agora implementado no SubcorpusContext
          const filtered = await getFilteredCorpus();
          setCorpus(filtered);
        } catch (error) {
          console.error('Erro ao carregar corpus para KWIC:', error);
          // Fallback para loadedCorpus em caso de erro
          if (loadedCorpus) {
            setCorpus(loadedCorpus);
          }
        } finally {
          setIsLoading(false);
        }
      } else if (loadedCorpus) {
        setCorpus(loadedCorpus);
      }
    };
    
    loadCorpus();
  }, [loadedCorpus, stylisticSelection, studyCorpus, getFilteredCorpus]);
  
  // Navegar para ferramenta KWIC completa
  const openKWICTool = useCallback((word: string) => {
    // Armazenar contexto para a ferramenta KWIC
    if (stylisticSelection) {
      sessionStorage.setItem('kwic-temp-context', JSON.stringify({
        corpusBase: stylisticSelection.study.corpusType as CorpusType,
        mode: stylisticSelection.study.mode === 'artist' ? 'single' : 'complete',
        artistaA: stylisticSelection.study.artist || null,
        timestamp: Date.now()
      }));
    }
    
    // Definir palavra selecionada
    setSelectedWord(word);
    
    // Navegar para tab KWIC no dashboard MVP
    navigate('/dashboard-mvp-definitivo?tab=tools&tool=kwic');
  }, [stylisticSelection, setSelectedWord, navigate]);
  
  return {
    corpus,
    isLoading,
    openKWICTool
  };
}
