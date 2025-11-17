/**
 * 🚪 ANNOTATION GATE HOOK
 * 
 * Controla o acesso às ferramentas avançadas baseado no status
 * de processamento do corpus (anotação semântica concluída)
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CorpusType } from '@/data/types/corpus-tools.types';

interface AnnotationGateStatus {
  hasProcessedCorpus: boolean;
  isLoading: boolean;
  lastJobId: string | null;
  lastCorpusType: CorpusType | null;
  completedAt: string | null;
  wordsAnnotated: number;
}

export function useAnnotationGate(corpusType?: CorpusType) {
  const [status, setStatus] = useState<AnnotationGateStatus>({
    hasProcessedCorpus: false,
    isLoading: true,
    lastJobId: null,
    lastCorpusType: null,
    completedAt: null,
    wordsAnnotated: 0
  });

  useEffect(() => {
    checkAnnotationStatus();
  }, [corpusType]);

  const checkAnnotationStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));

      // Query para buscar jobs concluídos
      let query = supabase
        .from('annotation_jobs')
        .select('id, corpus_type, palavras_anotadas, tempo_fim')
        .eq('status', 'concluido')
        .order('tempo_fim', { ascending: false });

      // Se corpus específico foi informado, filtrar por ele
      if (corpusType) {
        query = query.eq('corpus_type', corpusType);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        console.error('Erro ao verificar status de anotação:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (data) {
        setStatus({
          hasProcessedCorpus: true,
          isLoading: false,
          lastJobId: data.id,
          lastCorpusType: data.corpus_type as CorpusType,
          completedAt: data.tempo_fim,
          wordsAnnotated: data.palavras_anotadas || 0
        });
      } else {
        setStatus({
          hasProcessedCorpus: false,
          isLoading: false,
          lastJobId: null,
          lastCorpusType: null,
          completedAt: null,
          wordsAnnotated: 0
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status de anotação:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const refresh = () => {
    checkAnnotationStatus();
  };

  return {
    ...status,
    refresh
  };
}
