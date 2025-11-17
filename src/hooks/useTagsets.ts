import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

export interface Tagset {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria_pai: string | null;
  status: string;
  exemplos: string[] | null;
  validacoes_humanas: number;
  criado_por: string | null;
  criado_em: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  nivel_profundidade: number | null;
  hierarquia_completa: string | null;
  tagset_pai: string | null;
  codigo_nivel_1: string | null;
  codigo_nivel_2: string | null;
  codigo_nivel_3: string | null;
  codigo_nivel_4: string | null;
}

export function useTagsets() {
  const queryClient = useQueryClient();

  const queryResult = useQuery({
    queryKey: ['semantic-tagsets'],
    queryFn: async () => {
      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('semantic_tagset')
          .select('*')
          .order('nome', { ascending: true });

        if (error) throw error;
        return data as Tagset[];
      }, {
        maxRetries: 5,
        baseDelay: 500,
        onRetry: (error, attempt) => {
          notifications.info(
            `Reconectando... (${attempt}/5)`,
            'Tentando carregar tagsets'
          );
        }
      });
    },
    // ✅ CORREÇÃO #11: Cache estratégico para dados estáticos
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const proposeTagset = async (tagset: Omit<Tagset, 'id' | 'criado_em' | 'aprovado_por' | 'aprovado_em' | 'validacoes_humanas'>) => {
    try {
      await retrySupabaseOperation(async () => {
        const { error: insertError } = await supabase
          .from('semantic_tagset')
          .insert({
            codigo: tagset.codigo,
            nome: tagset.nome,
            descricao: tagset.descricao,
            categoria_pai: tagset.categoria_pai,
            status: tagset.status,
            exemplos: tagset.exemplos,
            criado_por: tagset.criado_por
          });

        if (insertError) throw insertError;
      });

      notifications.success('Tagset proposto com sucesso', `O tagset "${tagset.nome}" foi adicionado para revisão.`);

      // Invalidar cache após mutação
      await queryClient.invalidateQueries({ queryKey: ['semantic-tagsets'] });
    } catch (err) {
      notifications.error('Erro ao propor tagset', err as Error);
      throw err;
    }
  };

  const approveTagsets = async (tagsetIds: string[]) => {
    try {
      await retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('semantic_tagset')
          .update({
            status: 'ativo',
            aprovado_em: new Date().toISOString(),
            aprovado_por: '00000000-0000-0000-0000-000000000000' // System user
          })
          .in('id', tagsetIds);

        if (error) throw error;
      });

      notifications.success(
        'Tagsets aprovados com sucesso',
        `${tagsetIds.length} tagset(s) foram aprovados.`
      );

      await queryClient.invalidateQueries({ queryKey: ['semantic-tagsets'] });
    } catch (err) {
      notifications.error('Erro ao aprovar tagsets', err as Error);
      throw err;
    }
  };

  const rejectTagsets = async (tagsetIds: string[]) => {
    try {
      await retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('semantic_tagset')
          .update({ status: 'rejeitado' })
          .in('id', tagsetIds);

        if (error) throw error;
      });

      notifications.success(
        'Tagsets rejeitados',
        `${tagsetIds.length} tagset(s) foram rejeitados.`
      );

      await queryClient.invalidateQueries({ queryKey: ['semantic-tagsets'] });
    } catch (err) {
      notifications.error('Erro ao rejeitar tagsets', err as Error);
      throw err;
    }
  };

  const updateTagset = async (tagsetId: string, updates: Partial<Tagset>) => {
    try {
      await retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('semantic_tagset')
          .update(updates)
          .eq('id', tagsetId);

        if (error) throw error;
      });

      notifications.success(
        'Tagset atualizado com sucesso',
        'As alterações foram salvas.'
      );

      // Recalcular hierarquia após atualização
      await retrySupabaseOperation(async () => {
        const { error } = await supabase.rpc('calculate_tagset_hierarchy');
        if (error) throw error;
      });

      await queryClient.invalidateQueries({ queryKey: ['semantic-tagsets'] });
    } catch (err) {
      notifications.error('Erro ao atualizar tagset', err as Error);
      throw err;
    }
  };

  const stats = {
    totalTagsets: queryResult.data?.length || 0,
    activeTagsets: queryResult.data?.filter(t => t.status === 'ativo').length || 0,
    approvedTagsets: queryResult.data?.filter(t => t.aprovado_por !== null).length || 0
  };

  return {
    tagsets: queryResult.data || [],
    stats,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
    proposeTagset,
    approveTagsets,
    rejectTagsets,
    updateTagset
  };
}
