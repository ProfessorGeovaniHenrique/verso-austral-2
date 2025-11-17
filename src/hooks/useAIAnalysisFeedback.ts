import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

export interface AIAnalysisFeedback {
  id: string;
  suggestion_id: string;
  analysis_id: string;
  human_verdict: 'valid' | 'false_positive' | 'already_fixed';
  validator_notes: string | null;
  validated_by: string | null;
  validated_at: string;
  created_at: string;
}

/**
 * Hook para gerenciar feedback humano nas análises da IA
 */
export function useAIAnalysisFeedback(analysisId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ai-analysis-feedback', analysisId],
    queryFn: async () => {
      if (!analysisId) return [];

      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('ai_analysis_feedback')
          .select('*')
          .eq('analysis_id', analysisId)
          .order('validated_at', { ascending: false });

        if (error) throw error;
        return data as AIAnalysisFeedback[];
      });
    },
    enabled: !!analysisId,
    staleTime: 2 * 60 * 1000,
  });

  const submitFeedback = useMutation({
    mutationFn: async ({
      suggestionId,
      verdict,
      notes
    }: {
      suggestionId: string;
      verdict: 'valid' | 'false_positive' | 'already_fixed';
      notes?: string;
    }) => {
      if (!analysisId) throw new Error('Analysis ID is required');

      return retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('ai_analysis_feedback')
          .insert({
            analysis_id: analysisId,
            suggestion_id: suggestionId,
            human_verdict: verdict,
            validator_notes: notes,
            validated_by: 'developer', // TODO: usar user ID real quando auth for implementado
          });

        if (error) throw error;

        // Atualizar status da sugestão
        await supabase
          .from('ai_suggestion_status')
          .update({
            verification_status: verdict === 'valid' ? 'human-verified' : 'false-positive',
            status: verdict === 'valid' ? 'pending' : 'dismissed',
          })
          .eq('suggestion_id', suggestionId)
          .eq('analysis_id', analysisId);
      });
    },
    onSuccess: (_, variables) => {
      const verdictLabels = {
        valid: 'válida',
        false_positive: 'falso positivo',
        already_fixed: 'já corrigida'
      };
      notifications.success(`Sugestão marcada como ${verdictLabels[variables.verdict]}`);
      queryClient.invalidateQueries({ queryKey: ['ai-analysis-feedback', analysisId] });
      queryClient.invalidateQueries({ queryKey: ['suggestion-status', analysisId] });
      queryClient.invalidateQueries({ queryKey: ['ai-analysis-history'] });
    },
    onError: (error) => {
      notifications.error('Erro ao enviar feedback', error as Error);
    }
  });

  const stats = {
    total: query.data?.length || 0,
    valid: query.data?.filter(f => f.human_verdict === 'valid').length || 0,
    falsePositives: query.data?.filter(f => f.human_verdict === 'false_positive').length || 0,
    alreadyFixed: query.data?.filter(f => f.human_verdict === 'already_fixed').length || 0,
  };

  return {
    feedback: query.data || [],
    stats,
    isLoading: query.isLoading,
    submitFeedback: submitFeedback.mutate,
    isSubmitting: submitFeedback.isPending,
  };
}
