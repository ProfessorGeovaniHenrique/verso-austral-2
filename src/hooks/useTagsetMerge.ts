/**
 * Hook para gerenciar mesclagem de tagsets
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tagset } from "./useTagsets";

interface MergeTagsetsParams {
  survivorId: string;
  absorbedId: string;
  mergedData: Partial<Tagset>;
}

interface SplitTagsetParams {
  originalId: string;
  newTagsets: Array<{
    codigo: string;
    nome: string;
    descricao?: string;
    exemplos?: string[];
    nivel_profundidade: number;
    categoria_pai?: string | null;
  }>;
  rejectionReason: string;
}

export const useTagsetMerge = () => {
  const queryClient = useQueryClient();

  const mergeTagsets = useMutation({
    mutationFn: async ({ survivorId, absorbedId, mergedData }: MergeTagsetsParams) => {
      // 1. Atualizar survivor com dados mesclados
      const { error: updateError } = await supabase
        .from('semantic_tagset')
        .update(mergedData)
        .eq('id', survivorId);

      if (updateError) throw updateError;

      // 2. Obter código do absorbed
      const absorbedDataResult = await supabase
        .from('semantic_tagset')
        .select('codigo')
        .eq('id', absorbedId)
        .single();

      // 3. Migrar referências (se existirem)
      if (absorbedDataResult.data?.codigo) {
        const { error: migrateError } = await supabase
          .from('annotated_corpus')
          .update({ tagset_codigo: mergedData.codigo })
          .eq('tagset_codigo', absorbedDataResult.data.codigo);

        if (migrateError) {
          console.warn('Erro ao migrar anotações:', migrateError);
        }
      }

      // 4. Rejeitar absorbed
      const { error: rejectError } = await supabase
        .from('semantic_tagset')
        .update({ 
          status: 'rejeitado',
          rejection_reason: `Mesclado em '${mergedData.nome}' (${mergedData.codigo})`
        })
        .eq('id', absorbedId);

      if (rejectError) throw rejectError;

      // 5. Recalcular hierarquia
      await supabase.rpc('calculate_tagset_hierarchy');

      return { survivorId, absorbedId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semantic_tagset'] });
      toast.success('Tagsets mesclados com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao mesclar tagsets:', error);
      toast.error('Erro ao mesclar tagsets');
    },
  });

  const splitTagset = useMutation({
    mutationFn: async ({ originalId, newTagsets, rejectionReason }: SplitTagsetParams) => {
      // 1. Obter user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // 2. Criar novos tagsets
      const { error: insertError } = await supabase
        .from('semantic_tagset')
        .insert(
          newTagsets.map(t => ({
            ...t,
            status: 'proposto',
            criado_por: userId
          }))
        );

      if (insertError) throw insertError;

      // 3. Rejeitar tagset original
      const { error: rejectError } = await supabase
        .from('semantic_tagset')
        .update({ 
          status: 'rejeitado',
          rejection_reason: rejectionReason
        })
        .eq('id', originalId);

      if (rejectError) throw rejectError;

      // 3. Recalcular hierarquia
      await supabase.rpc('calculate_tagset_hierarchy');

      return { originalId, newCount: newTagsets.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['semantic_tagset'] });
      toast.success(`Tagset dividido em ${data.newCount} novos domínios!`);
    },
    onError: (error) => {
      console.error('Erro ao dividir tagset:', error);
      toast.error('Erro ao dividir tagset');
    },
  });

  return {
    mergeTagsets: mergeTagsets.mutateAsync,
    splitTagset: splitTagset.mutateAsync,
    isMerging: mergeTagsets.isPending,
    isSplitting: splitTagset.isPending,
  };
};
