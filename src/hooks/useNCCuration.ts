import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NCWord {
  palavra: string;
  confianca: number;
  contexto_hash: string;
  song_id?: string;
  hits_count?: number;
  needs_correction?: boolean;
}

export interface NCSuggestion {
  palavra: string;
  tagset_sugerido: string;
  tagset_nome: string;
  confianca: number;
  justificativa: string;
  fonte: 'dialectal_lexicon' | 'ai_gemini' | 'pattern_match';
}

export interface NCStats {
  total: number;
  validated: number;
  suggested: number;
  high_confidence: number;
}

interface ValidationPayload {
  palavra: string;
  tagset_codigo: string;
  aplicar_a_todas?: boolean;
  justificativa?: string;
}

export function useNCCuration() {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<Map<string, NCSuggestion>>(new Map());
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Buscar palavras NC
  const { data: ncData, isLoading, refetch } = useQuery({
    queryKey: ['nc-words-curation'],
    queryFn: async () => {
      const { count } = await supabase
        .from('semantic_disambiguation_cache')
        .select('*', { count: 'exact', head: true })
        .eq('tagset_codigo', 'NC');

      const { data: validated } = await supabase
        .from('human_validations')
        .select('palavra', { count: 'exact', head: true })
        .eq('tagset_original', 'NC');

      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .select('palavra, confianca, contexto_hash, song_id, hits_count, needs_correction')
        .eq('tagset_codigo', 'NC')
        .order('hits_count', { ascending: false, nullsFirst: false })
        .limit(200);

      if (error) throw error;

      return {
        words: (data || []) as NCWord[],
        stats: {
          total: count || 0,
          validated: validated?.length || 0,
          suggested: 0,
          high_confidence: 0
        } as NCStats
      };
    },
    staleTime: 30000,
  });

  // Obter sugestões de IA
  const getSuggestions = useCallback(async (palavras?: string[]) => {
    setIsLoadingSuggestions(true);
    try {
      const body = palavras 
        ? { palavras: palavras.map(p => ({ palavra: p })), limit: palavras.length }
        : { limit: 50 };

      const { data, error } = await supabase.functions.invoke('suggest-nc-classification', {
        body
      });

      if (error) throw error;

      const newSuggestions = new Map(suggestions);
      (data.suggestions || []).forEach((s: NCSuggestion) => {
        newSuggestions.set(s.palavra, s);
      });
      setSuggestions(newSuggestions);

      toast.success(`${data.suggestions?.length || 0} sugestões geradas`);
      return data;
    } catch (err) {
      console.error('Error getting suggestions:', err);
      toast.error('Erro ao obter sugestões de classificação');
      return null;
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [suggestions]);

  // Validar palavra individual
  const validateMutation = useMutation({
    mutationFn: async (payload: ValidationPayload) => {
      // Atualizar cache semântico
      const updateQuery = supabase
        .from('semantic_disambiguation_cache')
        .update({ 
          tagset_codigo: payload.tagset_codigo,
          confianca: 0.95 // Alta confiança para validação humana
        });

      if (payload.aplicar_a_todas) {
        await updateQuery.eq('palavra', payload.palavra);
      } else {
        await updateQuery
          .eq('palavra', payload.palavra)
          .limit(1);
      }

      // Registrar validação humana
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('human_validations').insert({
          palavra: payload.palavra,
          tagset_original: 'NC',
          tagset_corrigido: payload.tagset_codigo,
          justificativa: payload.justificativa,
          user_id: user.id,
          aplicado: true
        });
      }

      return payload.palavra;
    },
    onSuccess: (palavra) => {
      toast.success(`"${palavra}" classificada com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['nc-words-curation'] });
      queryClient.invalidateQueries({ queryKey: ['nc-words'] });
      
      // Remover da seleção
      setSelectedWords(prev => {
        const next = new Set(prev);
        next.delete(palavra);
        return next;
      });
    },
    onError: (err) => {
      toast.error('Erro ao validar palavra: ' + (err as Error).message);
    }
  });

  // Validar em lote
  const bulkValidateMutation = useMutation({
    mutationFn: async (validations: ValidationPayload[]) => {
      const results = await Promise.allSettled(
        validations.map(v => validateMutation.mutateAsync(v))
      );

      const success = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { success, failed };
    },
    onSuccess: ({ success, failed }) => {
      if (failed === 0) {
        toast.success(`${success} palavras classificadas com sucesso`);
      } else {
        toast.warning(`${success} classificadas, ${failed} falharam`);
      }
      queryClient.invalidateQueries({ queryKey: ['nc-words-curation'] });
      setSelectedWords(new Set());
    }
  });

  // Rejeitar sugestão
  const rejectSuggestion = useCallback((palavra: string) => {
    setSuggestions(prev => {
      const next = new Map(prev);
      next.delete(palavra);
      return next;
    });
    toast.info(`Sugestão para "${palavra}" rejeitada`);
  }, []);

  // Toggle seleção
  const toggleSelection = useCallback((palavra: string) => {
    setSelectedWords(prev => {
      const next = new Set(prev);
      if (next.has(palavra)) {
        next.delete(palavra);
      } else {
        next.add(palavra);
      }
      return next;
    });
  }, []);

  // Selecionar todos com alta confiança
  const selectHighConfidence = useCallback((minConfianca = 0.85) => {
    const highConfWords = Array.from(suggestions.entries())
      .filter(([_, s]) => s.confianca >= minConfianca)
      .map(([palavra]) => palavra);
    
    setSelectedWords(new Set(highConfWords));
    toast.info(`${highConfWords.length} palavras selecionadas`);
  }, [suggestions]);

  // Limpar seleção
  const clearSelection = useCallback(() => {
    setSelectedWords(new Set());
  }, []);

  // Validar selecionados com sugestões
  const validateSelected = useCallback(async () => {
    const validations: ValidationPayload[] = [];
    
    selectedWords.forEach(palavra => {
      const suggestion = suggestions.get(palavra);
      if (suggestion) {
        validations.push({
          palavra,
          tagset_codigo: suggestion.tagset_sugerido,
          justificativa: `[Auto] ${suggestion.fonte}: ${suggestion.justificativa}`,
          aplicar_a_todas: true
        });
      }
    });

    if (validations.length === 0) {
      toast.warning('Nenhuma palavra selecionada tem sugestão');
      return;
    }

    await bulkValidateMutation.mutateAsync(validations);
  }, [selectedWords, suggestions, bulkValidateMutation]);

  return {
    // Data
    ncWords: ncData?.words || [],
    stats: {
      ...ncData?.stats,
      suggested: suggestions.size,
      high_confidence: Array.from(suggestions.values()).filter(s => s.confianca >= 0.85).length
    } as NCStats,
    suggestions,
    selectedWords,
    
    // Loading states
    isLoading,
    isLoadingSuggestions,
    isValidating: validateMutation.isPending || bulkValidateMutation.isPending,
    
    // Actions
    refetch,
    getSuggestions,
    validateWord: validateMutation.mutate,
    rejectSuggestion,
    toggleSelection,
    selectHighConfidence,
    clearSelection,
    validateSelected,
  };
}
