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
  // Campos opcionais para Gutenberg e Dialectal
  definicoes?: Array<{ texto: string }>;
  classe_gramatical?: string;
  verbete?: string;
  volume_fonte?: string;
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

      // 🔍 DEBUG: Logging temporário para diagnóstico
      if (tableName === 'gutenberg_lexicon' && data && data.length > 0) {
        console.log('🔍 DADOS BRUTOS DO SUPABASE (Gutenberg):', data);
        console.log('📊 AMOSTRA (primeira entrada):', data[0]);
        console.log('🔑 Campos disponíveis:', Object.keys(data[0]));
        console.log('📝 classe_gramatical:', data[0].classe_gramatical);
        console.log('📚 definicoes:', data[0].definicoes);
      }

      // Mapear dados para formato unificado
      if (tableName === 'gutenberg_lexicon') {
        const rawData = data as any[];
        const mapped = (rawData || []).map((entry) => ({
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
          atualizado_em: entry.atualizado_em,
          // Campos específicos do Gutenberg
          definicoes: entry.definicoes || [],
          classe_gramatical: entry.classe_gramatical,
          verbete: entry.verbete,
        })) as LexiconEntry[];

        // 🗺️ DEBUG: Logging dos dados mapeados
        if (mapped.length > 0) {
          console.log('🗺️ DADOS MAPEADOS (Gutenberg):', mapped);
          console.log('📊 AMOSTRA MAPEADA (primeira entrada):', mapped[0]);
        }

        return mapped;
      }

      // Para semantic_lexicon e dialectal_lexicon
      return (data || []).map((entry: any) => ({
        ...entry,
        definicoes: entry.definicoes || [],
        classe_gramatical: entry.classe_gramatical,
        verbete: entry.verbete,
        volume_fonte: entry.volume_fonte,
      })) as LexiconEntry[];
    },
    // 🔧 CACHE TTL: Reduzido temporariamente para desenvolvimento
    staleTime: 5 * 60 * 1000, // 5 minutos (era 24h)
    gcTime: 10 * 60 * 1000, // 10 minutos (era 48h)
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
