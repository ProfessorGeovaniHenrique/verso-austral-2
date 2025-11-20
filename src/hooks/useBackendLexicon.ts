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
  table?: 'semantic_lexicon' | 'gutenberg_lexicon';
  pos?: string;
  validationStatus?: 'all' | 'validated' | 'pending';
  searchTerm?: string;
}

export function useBackendLexicon(filters?: Filters) {
  const { toast } = useToast();
  const tableName = filters?.table || 'semantic_lexicon';

  const queryResult = useQuery({
    queryKey: ['backend-lexicon', filters],
    queryFn: async () => {
      let query = (supabase
        .from(tableName) as any)
        .select('*')
        .order('criado_em', { ascending: false });

      if (tableName === 'gutenberg_lexicon') {
        // Lógica para gutenberg_lexicon
        if (filters?.pos && filters.pos !== 'all') {
          query = query.eq('classe_gramatical', filters.pos);
        }

        if (filters?.validationStatus === 'validated') {
          query = query.or('validado.eq.true,validado_humanamente.eq.true');
        } else if (filters?.validationStatus === 'pending') {
          query = query.eq('validado', false).eq('validado_humanamente', false);
        }

        if (filters?.searchTerm) {
          query = query.ilike('verbete_normalizado', `%${filters.searchTerm}%`);
        }
      } else {
        // Lógica para semantic_lexicon (padrão)
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

      // Mapear dados para formato unificado
      if (tableName === 'gutenberg_lexicon') {
        const rawData = data as any[];
        return (rawData || []).map((entry) => ({
          id: entry.id,
          palavra: entry.verbete,
          lema: entry.verbete_normalizado,
          pos: entry.classe_gramatical,
          tagset_codigo: entry.classe_gramatical || 'unknown',
          prosody: 0,
          confianca: entry.confianca_extracao || 0,
          validado: entry.validado || entry.validado_humanamente || false,
          fonte: 'gutenberg',
          contexto_exemplo: entry.definicoes?.[0]?.texto || null,
          criado_em: entry.criado_em,
          atualizado_em: entry.atualizado_em
        })) as LexiconEntry[];
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
