import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LexiconEntry {
  id: string;
  palavra: string;
  lema: string | null;
  pos: string | null;
  tagset_codigo: string;
  prosody: number;
  confianca: number;
  validado: boolean;
  fonte: string | null;
  contexto_exemplo: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface Filters {
  pos?: string;
  validationStatus?: 'all' | 'validated' | 'pending';
  searchTerm?: string;
}

export function useBackendLexicon(filters?: Filters) {
  const { toast } = useToast();

  const queryResult = useQuery({
    queryKey: ['backend-lexicon', filters],
    queryFn: async () => {
      let query = supabase
        .from('semantic_lexicon')
        .select('*')
        .order('criado_em', { ascending: false });

      if (filters?.pos && filters.pos !== 'all') {
        query = query.eq('pos', filters.pos);
      }

      if (filters?.validationStatus === 'validated') {
        query = query.eq('validado', true);
      } else if (filters?.validationStatus === 'pending') {
        query = query.eq('validado', false);
      }

      if (filters?.searchTerm) {
        query = query.ilike('palavra', `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar léxico',
          description: error.message
        });
        throw error;
      }

      return (data || []) as LexiconEntry[];
    },
    // ✅ CACHE TTL: Dados de léxico mudam raramente
    staleTime: 24 * 60 * 60 * 1000, // 24 horas
    gcTime: 48 * 60 * 60 * 1000, // 48 horas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const stats = {
    totalWords: queryResult.data?.length || 0,
    validatedWords: queryResult.data?.filter(w => w.validado).length || 0,
    pendingWords: queryResult.data?.filter(w => !w.validado).length || 0,
    avgConfidence: queryResult.data && queryResult.data.length > 0
      ? queryResult.data.reduce((sum, w) => sum + w.confianca, 0) / queryResult.data.length
      : 0
  };

  return {
    lexicon: queryResult.data || [],
    stats,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch
  };
}
