import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NCWordValidationData {
  palavra: string;
  tagset_codigo_novo: string;
  tagset_nome: string;
  justificativa?: string;
  aplicar_a_todas: boolean;
  contexto_hash?: string;
  song_id?: string;
  // Campos de validação linguística expandida
  pos?: string;
  lema?: string;
  is_mwe?: boolean;
  mwe_text?: string;
  is_spelling_deviation?: boolean;
  forma_padrao?: string;
}

export function useNCWordValidation() {
  const queryClient = useQueryClient();

  const submitValidation = useMutation({
    mutationFn: async (data: NCWordValidationData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Atualizar semantic_disambiguation_cache
      let updateQuery = supabase
        .from('semantic_disambiguation_cache')
        .update({
          tagset_codigo: data.tagset_codigo_novo,
          fonte: 'human_validation',
          confianca: 1.0,
          justificativa: data.justificativa || null,
          // Campos de validação linguística expandida
          pos: data.pos || null,
          lema: data.lema || null,
          is_mwe: data.is_mwe || false,
          mwe_text: data.mwe_text || null,
          is_spelling_deviation: data.is_spelling_deviation || false,
          forma_padrao: data.forma_padrao || null
        });

      if (data.aplicar_a_todas) {
        // Aplicar a todas as ocorrências da palavra com tagset NC
        updateQuery = updateQuery.eq('palavra', data.palavra).eq('tagset_codigo', 'NC');
      } else {
        // Aplicar apenas à ocorrência específica (mesma palavra + mesmo contexto)
        updateQuery = updateQuery
          .eq('palavra', data.palavra)
          .eq('contexto_hash', data.contexto_hash || '')
          .eq('tagset_codigo', 'NC');
      }

      const { error: updateError, count } = await updateQuery;
      if (updateError) throw updateError;

      // 2. Registrar em human_validations para auditoria
      const { error: validationError } = await supabase
        .from('human_validations')
        .insert({
          palavra: data.palavra,
          tagset_original: 'NC',
          tagset_corrigido: data.tagset_codigo_novo,
          justificativa: data.justificativa,
          user_id: user.id,
          contexto: data.aplicar_a_todas ? 'Aplicado a todas as ocorrências' : 'Ocorrência específica',
          // Auditoria de validação linguística
          pos_corrigido: data.pos || null,
          lema_corrigido: data.lema || null,
          is_mwe: data.is_mwe || false,
          mwe_text: data.mwe_text || null,
          is_spelling_deviation: data.is_spelling_deviation || false,
          forma_padrao: data.forma_padrao || null
        });

      if (validationError) {
        console.error('Erro ao registrar validação humana:', validationError);
        // Não bloqueia o fluxo, apenas loga
      }

      return { count };
    },
    onSuccess: (result, variables) => {
      toast.success(
        `✅ Classificação salva: "${variables.palavra}" → ${variables.tagset_nome}`,
        {
          description: variables.aplicar_a_todas 
            ? `Aplicado a ${result.count || 0} ocorrências`
            : 'Aplicado a esta ocorrência'
        }
      );

      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['semantic-pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['nc-words'] });
    },
    onError: (error) => {
      console.error('Erro ao validar palavra NC:', error);
      toast.error('Erro ao salvar classificação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  return {
    submitValidation: submitValidation.mutate,
    isSubmitting: submitValidation.isPending
  };
}
