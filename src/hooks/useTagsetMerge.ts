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

interface IncorporateIntoPendingParams {
  activeId: string;
  pendingId: string;
  newExamples: string[];
  enhancedDescription: string;
}

interface RejectAsDuplicateParams {
  pendingId: string;
  reason: string;
}

interface ReorganizeTagsetsParams {
  tagsetAId: string;
  tagsetBId: string;
  tagsetA_newParent: string | null;
  tagsetB_newParent: string | null;
}

interface EnhanceTagsetParams {
  activeId: string;
  pendingId: string;
  enhancedDescription: string;
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

  const incorporateIntoPending = useMutation({
    mutationFn: async ({ activeId, pendingId, newExamples, enhancedDescription }: IncorporateIntoPendingParams) => {
      // 1. Obter tagset ativo atual
      const { data: activeData, error: fetchError } = await supabase
        .from('semantic_tagset')
        .select('exemplos, descricao')
        .eq('id', activeId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Combinar exemplos (sem duplicatas)
      const currentExamples = activeData.exemplos || [];
      const uniqueNewExamples = newExamples.filter(ex => !currentExamples.includes(ex));
      const combinedExamples = [...currentExamples, ...uniqueNewExamples];

      // 3. Atualizar tagset ativo
      const { error: updateError } = await supabase
        .from('semantic_tagset')
        .update({
          exemplos: combinedExamples,
          descricao: enhancedDescription
        })
        .eq('id', activeId);

      if (updateError) throw updateError;

      // 4. Rejeitar pendente
      const { error: rejectError } = await supabase
        .from('semantic_tagset')
        .update({ 
          status: 'rejeitado',
          rejection_reason: `Incorporado em domínio validado existente`
        })
        .eq('id', pendingId);

      if (rejectError) throw rejectError;

      return { activeId, pendingId, addedExamples: uniqueNewExamples.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['semantic_tagset'] });
      toast.success(`${data.addedExamples} novos exemplos incorporados ao domínio validado!`);
    },
    onError: (error) => {
      console.error('Erro ao incorporar:', error);
      toast.error('Erro ao incorporar exemplos');
    },
  });

  const rejectAsDuplicate = useMutation({
    mutationFn: async ({ pendingId, reason }: RejectAsDuplicateParams) => {
      const { error } = await supabase
        .from('semantic_tagset')
        .update({ 
          status: 'rejeitado',
          rejection_reason: reason
        })
        .eq('id', pendingId);

      if (error) throw error;

      return { pendingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semantic_tagset'] });
      toast.success('Domínio pendente rejeitado como duplicado');
    },
    onError: (error) => {
      console.error('Erro ao rejeitar:', error);
      toast.error('Erro ao rejeitar domínio');
    },
  });

  const reorganizeTagsets = useMutation({
    mutationFn: async ({ tagsetAId, tagsetBId, tagsetA_newParent, tagsetB_newParent }: ReorganizeTagsetsParams) => {
      // Helper: buscar nível do pai e calcular nível do filho
      const getChildLevel = async (parentCode: string | null): Promise<number> => {
        if (!parentCode) return 1; // Sem pai = N1
        
        const { data: parent, error } = await supabase
          .from('semantic_tagset')
          .select('nivel_profundidade')
          .eq('codigo', parentCode)
          .single();
        
        if (error || !parent) {
          console.warn(`Parent tagset not found: ${parentCode}`);
          return 2; // Fallback seguro para N2 se pai não encontrado
        }
        
        const childLevel = (parent.nivel_profundidade || 1) + 1;
        if (childLevel > 4) {
          throw new Error(`Hierarquia máxima é 4 níveis. Pai "${parentCode}" está no nível ${parent.nivel_profundidade}`);
        }
        
        return childLevel;
      };

      // Atualizar ambos tagsets com novos pais E nivel_profundidade
      const updates = [];
      
      if (tagsetA_newParent !== undefined) {
        const nivelA = await getChildLevel(tagsetA_newParent);
        updates.push(
          supabase
            .from('semantic_tagset')
            .update({ 
              categoria_pai: tagsetA_newParent,
              tagset_pai: tagsetA_newParent,
              nivel_profundidade: nivelA
            })
            .eq('id', tagsetAId)
        );
      }
      
      if (tagsetB_newParent !== undefined) {
        const nivelB = await getChildLevel(tagsetB_newParent);
        updates.push(
          supabase
            .from('semantic_tagset')
            .update({ 
              categoria_pai: tagsetB_newParent,
              tagset_pai: tagsetB_newParent,
              nivel_profundidade: nivelB
            })
            .eq('id', tagsetBId)
        );
      }

      const results = await Promise.all(updates);
      
      for (const result of results) {
        if (result.error) throw result.error;
      }

      // Recalcular hierarquia completa (códigos N1-N4, hierarquia_completa, etc.)
      await supabase.rpc('calculate_tagset_hierarchy');

      return { tagsetAId, tagsetBId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semantic_tagset'] });
      toast.success('Hierarquia reorganizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao reorganizar:', error);
      toast.error('Erro ao reorganizar hierarquia');
    },
  });

  const enhanceTagset = useMutation({
    mutationFn: async ({ activeId, pendingId, enhancedDescription }: EnhanceTagsetParams) => {
      // 1. Atualizar apenas a descrição do tagset ativo
      const { error: updateError } = await supabase
        .from('semantic_tagset')
        .update({ descricao: enhancedDescription })
        .eq('id', activeId);

      if (updateError) throw updateError;

      // 2. Rejeitar pendente
      const { error: rejectError } = await supabase
        .from('semantic_tagset')
        .update({ 
          status: 'rejeitado',
          rejection_reason: `Descrição incorporada em domínio validado`
        })
        .eq('id', pendingId);

      if (rejectError) throw rejectError;

      return { activeId, pendingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semantic_tagset'] });
      toast.success('Descrição do domínio validado aprimorada!');
    },
    onError: (error) => {
      console.error('Erro ao aprimorar:', error);
      toast.error('Erro ao aprimorar descrição');
    },
  });

  return {
    mergeTagsets: mergeTagsets.mutateAsync,
    splitTagset: splitTagset.mutateAsync,
    incorporateIntoPending: incorporateIntoPending.mutateAsync,
    rejectAsDuplicate: rejectAsDuplicate.mutateAsync,
    reorganizeTagsets: reorganizeTagsets.mutateAsync,
    enhanceTagset: enhanceTagset.mutateAsync,
    isMerging: mergeTagsets.isPending,
    isSplitting: splitTagset.isPending,
    isIncorporating: incorporateIntoPending.isPending,
    isRejecting: rejectAsDuplicate.isPending,
    isReorganizing: reorganizeTagsets.isPending,
    isEnhancing: enhanceTagset.isPending,
  };
};
