import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InsigniaCurationFilters } from './useInsigniaCuration';

export interface GroupedInsigniaEntry {
  palavra: string;
  ocorrencias: number;
  ids: string[];
  insignias_atuais: string[];
  consenso: 'total' | 'parcial' | 'nenhum';
  confianca_media: number;
  validados_count: number;
  pendentes_count: number;
  tagset_codigo: string | null;
}

interface GroupedQueryResult {
  entries: GroupedInsigniaEntry[];
  totalCount: number;
  uniqueWords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useGroupedInsigniaCuration(
  filters: InsigniaCurationFilters, 
  page: number = 0, 
  pageSize: number = 50
) {
  return useQuery({
    queryKey: ['grouped-insignia-curation', filters, page, pageSize],
    queryFn: async (): Promise<GroupedQueryResult> => {
      // Build base query with filters
      let query = supabase
        .from('semantic_disambiguation_cache')
        .select('id, palavra, insignias_culturais, tagset_codigo, confianca, fonte');

      // Apply filters
      if (filters.withoutInsignia) {
        query = query.or('insignias_culturais.is.null,insignias_culturais.eq.{}');
      } else if (filters.insignia) {
        query = query.contains('insignias_culturais', [filters.insignia]);
      }

      if (filters.search) {
        query = query.ilike('palavra', `%${filters.search}%`);
      }

      if (filters.validated === true) {
        query = query.eq('fonte', 'manual');
      } else if (filters.validated === false) {
        query = query.neq('fonte', 'manual');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by palavra in JavaScript
      const groupedMap = new Map<string, {
        ids: string[];
        insignias: string[][];
        confiancas: number[];
        fontes: string[];
        tagset: string | null;
      }>();

      for (const row of data || []) {
        const existing = groupedMap.get(row.palavra);
        if (existing) {
          existing.ids.push(row.id);
          existing.insignias.push(row.insignias_culturais || []);
          existing.confiancas.push(row.confianca || 0);
          existing.fontes.push(row.fonte || '');
        } else {
          groupedMap.set(row.palavra, {
            ids: [row.id],
            insignias: [row.insignias_culturais || []],
            confiancas: [row.confianca || 0],
            fontes: [row.fonte || ''],
            tagset: row.tagset_codigo
          });
        }
      }

      // Convert to grouped entries
      const groupedEntries: GroupedInsigniaEntry[] = [];
      
      for (const [palavra, group] of groupedMap) {
        // Calculate consensus
        const insigniaStrings = group.insignias.map(arr => JSON.stringify(arr.sort()));
        const uniqueInsignias = new Set(insigniaStrings);
        
        let consenso: 'total' | 'parcial' | 'nenhum';
        if (uniqueInsignias.size === 1) {
          consenso = 'total';
        } else if (uniqueInsignias.size <= group.ids.length / 2) {
          consenso = 'parcial';
        } else {
          consenso = 'nenhum';
        }

        // Get most common insignias
        const insigniaCounts = new Map<string, number>();
        for (const insigniaArr of group.insignias) {
          const key = JSON.stringify(insigniaArr.sort());
          insigniaCounts.set(key, (insigniaCounts.get(key) || 0) + 1);
        }
        
        let mostCommon: string[] = [];
        let maxCount = 0;
        for (const [key, count] of insigniaCounts) {
          if (count > maxCount) {
            maxCount = count;
            mostCommon = JSON.parse(key);
          }
        }

        // Calculate stats
        const validadosCount = group.fontes.filter(f => f === 'manual').length;
        const avgConfianca = group.confiancas.reduce((a, b) => a + b, 0) / group.confiancas.length;

        groupedEntries.push({
          palavra,
          ocorrencias: group.ids.length,
          ids: group.ids,
          insignias_atuais: mostCommon,
          consenso,
          confianca_media: avgConfianca,
          validados_count: validadosCount,
          pendentes_count: group.ids.length - validadosCount,
          tagset_codigo: group.tagset
        });
      }

      // Sort by occurrences descending
      groupedEntries.sort((a, b) => b.ocorrencias - a.ocorrencias);

      // Paginate
      const totalCount = data?.length || 0;
      const uniqueWords = groupedEntries.length;
      const paginatedEntries = groupedEntries.slice(page * pageSize, (page + 1) * pageSize);

      return {
        entries: paginatedEntries,
        totalCount,
        uniqueWords,
        page,
        pageSize,
        totalPages: Math.ceil(uniqueWords / pageSize)
      };
    },
  });
}

// Validate all entries for a word
export function useValidateByWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (palavra: string) => {
      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .update({
          fonte: 'manual',
          confianca: 1.0,
        })
        .eq('palavra', palavra)
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (count, palavra) => {
      queryClient.invalidateQueries({ queryKey: ['grouped-insignia-curation'] });
      queryClient.invalidateQueries({ queryKey: ['insignia-curation'] });
      queryClient.invalidateQueries({ queryKey: ['insignia-stats'] });
      toast.success(`"${palavra}": ${count} entradas validadas`);
    },
    onError: (error) => {
      toast.error(`Erro ao validar: ${error.message}`);
    },
  });
}

// Update insignias for all entries of a word
export function useUpdateInsigniasByWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ palavra, insignias }: { palavra: string; insignias: string[] }) => {
      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .update({
          insignias_culturais: insignias,
          fonte: 'manual',
          confianca: 1.0,
        })
        .eq('palavra', palavra)
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (count, { palavra }) => {
      queryClient.invalidateQueries({ queryKey: ['grouped-insignia-curation'] });
      queryClient.invalidateQueries({ queryKey: ['insignia-curation'] });
      queryClient.invalidateQueries({ queryKey: ['insignia-stats'] });
      toast.success(`"${palavra}": ${count} entradas atualizadas`);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

// Remove insignias for all entries of a word
export function useRemoveInsigniasByWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (palavra: string) => {
      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .update({
          insignias_culturais: [],
          fonte: 'manual',
        })
        .eq('palavra', palavra)
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (count, palavra) => {
      queryClient.invalidateQueries({ queryKey: ['grouped-insignia-curation'] });
      queryClient.invalidateQueries({ queryKey: ['insignia-curation'] });
      queryClient.invalidateQueries({ queryKey: ['insignia-stats'] });
      toast.success(`"${palavra}": insígnias removidas de ${count} entradas`);
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });
}
