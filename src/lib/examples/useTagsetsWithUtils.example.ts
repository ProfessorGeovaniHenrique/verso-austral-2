/**
 * EXEMPLO DE USO: useTagsets com Retry + Notifications
 * 
 * Este arquivo demonstra como usar os utilitários notifications.ts e retryUtils.ts
 * em um hook real. Copie este padrão para outros hooks da aplicação.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

interface Tagset {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: string;
}

export function useTagsetsExample() {
  const queryClient = useQueryClient();

  // ✅ Query com retry automático
  const query = useQuery({
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
          // Feedback visual durante retry
          notifications.info(
            `Reconectando... (${attempt}/5)`,
            'Tentando carregar tagsets novamente'
          );
        }
      });
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // ✅ Mutation com retry e notificações
  const createTagset = useMutation({
    mutationFn: async (newTagset: Omit<Tagset, 'id'>) => {
      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('semantic_tagset')
          .insert(newTagset)
          .select()
          .single();

        if (error) throw error;
        return data as Tagset;
      });
    },
    onSuccess: (data) => {
      notifications.success(
        'Tagset criado com sucesso!',
        `O tagset "${data.nome}" foi adicionado ao sistema.`
      );
      queryClient.invalidateQueries({ queryKey: ['semantic-tagsets'] });
    },
    onError: (error) => {
      notifications.error('Falha ao criar tagset', error as Error);
    }
  });

  // ✅ Mutation com loading via promise
  const createTagsetWithPromise = async (newTagset: Omit<Tagset, 'id'>) => {
    return notifications.promise(
      retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('semantic_tagset')
          .insert(newTagset)
          .select()
          .single();

        if (error) throw error;

        await queryClient.invalidateQueries({ queryKey: ['semantic-tagsets'] });
        return data as Tagset;
      }),
      {
        loading: 'Criando tagset...',
        success: 'Tagset criado com sucesso!',
        error: 'Falha ao criar tagset'
      }
    );
  };

  // ✅ Delete com confirmação
  const deleteTagset = useMutation({
    mutationFn: async (tagsetId: string) => {
      return retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('semantic_tagset')
          .delete()
          .eq('id', tagsetId);

        if (error) throw error;
      });
    },
    onSuccess: () => {
      notifications.success('Tagset excluído');
      queryClient.invalidateQueries({ queryKey: ['semantic-tagsets'] });
    },
    onError: (error) => {
      notifications.error('Erro ao excluir tagset', error as Error);
    }
  });

  return {
    tagsets: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createTagset: createTagset.mutate,
    createTagsetWithPromise,
    deleteTagset: deleteTagset.mutate,
  };
}

/**
 * EXEMPLO DE USO NO COMPONENTE:
 * 
 * ```tsx
 * function TagsetManager() {
 *   const { tagsets, isLoading, createTagsetWithPromise } = useTagsetsExample();
 * 
 *   const handleCreate = async () => {
 *     try {
 *       await createTagsetWithPromise({
 *         codigo: 'CULT.MUS',
 *         nome: 'Cultura Musical',
 *         descricao: 'Termos relacionados à música gaúcha',
 *         status: 'ativo'
 *       });
 *     } catch (error) {
 *       // Erro já foi notificado automaticamente
 *       console.error(error);
 *     }
 *   };
 * 
 *   if (isLoading) return <Skeleton />;
 * 
 *   return (
 *     <div>
 *       <Button onClick={handleCreate}>Criar Tagset</Button>
 *       {tagsets.map(t => <TagsetCard key={t.id} tagset={t} />)}
 *     </div>
 *   );
 * }
 * ```
 */
