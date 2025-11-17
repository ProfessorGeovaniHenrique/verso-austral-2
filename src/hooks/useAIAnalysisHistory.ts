import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

export interface AIAnalysis {
  id: string;
  created_at: string;
  logs_type: string;
  total_issues: number;
  suggestions: any[];
  metadata: any;
  applied_fixes: string[];
  resolved_at: string | null;
  estimated_credits_saved: number;
  actual_credits_saved: number;
  analyzed_by: string | null;
}

export interface SuggestionStatus {
  id: string;
  analysis_id: string;
  suggestion_id: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  resolved_at: string | null;
  resolved_by: string | null;
  category: string;
  severity: 'Crítico' | 'Alto' | 'Médio' | 'Baixo';
  title: string;
  estimated_effort: 'low' | 'medium' | 'high';
  estimated_credits_saved: number;
  implementation_notes: string | null;
  actual_time_spent: number | null;
  actual_credits_saved: number | null;
  created_at: string;
  updated_at: string;
  confidence_score: number | null;
  verification_status: 'pending' | 'auto-verified' | 'false-positive' | 'human-verified' | null;
}

/**
 * Hook para gerenciar histórico de análises da IA
 */
export function useAIAnalysisHistory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ai-analysis-history'],
    queryFn: async () => {
      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('ai_analysis_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return data as AIAnalysis[];
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const stats = {
    totalAnalyses: query.data?.length || 0,
    totalIssuesFound: query.data?.reduce((sum, a) => sum + a.total_issues, 0) || 0,
    totalEstimatedSavings: query.data?.reduce((sum, a) => sum + a.estimated_credits_saved, 0) || 0,
    totalActualSavings: query.data?.reduce((sum, a) => sum + a.actual_credits_saved, 0) || 0,
    resolvedAnalyses: query.data?.filter(a => a.resolved_at !== null).length || 0,
  };

  return {
    analyses: query.data || [],
    stats,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch
  };
}

/**
 * Hook para gerenciar status individual de sugestões
 */
export function useSuggestionStatus(analysisId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['suggestion-status', analysisId],
    queryFn: async () => {
      if (!analysisId) return [];

      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('ai_suggestion_status')
          .select('*')
          .eq('analysis_id', analysisId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as SuggestionStatus[];
      });
    },
    enabled: !!analysisId,
    staleTime: 2 * 60 * 1000,
  });

  const markAsResolved = useMutation({
    mutationFn: async ({
      suggestionId,
      implementationNotes,
      actualTimeSpent,
      actualCreditsSaved
    }: {
      suggestionId: string;
      implementationNotes?: string;
      actualTimeSpent?: number;
      actualCreditsSaved?: number;
    }) => {
      return retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('ai_suggestion_status')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            implementation_notes: implementationNotes,
            actual_time_spent: actualTimeSpent,
            actual_credits_saved: actualCreditsSaved,
          })
          .eq('suggestion_id', suggestionId)
          .eq('analysis_id', analysisId!);

        if (error) throw error;
      });
    },
    onSuccess: () => {
      notifications.success('Correção marcada como resolvida!');
      queryClient.invalidateQueries({ queryKey: ['suggestion-status', analysisId] });
      queryClient.invalidateQueries({ queryKey: ['ai-analysis-history'] });
    },
    onError: (error) => {
      notifications.error('Erro ao marcar correção', error as Error);
    }
  });

  const markAsDismissed = useMutation({
    mutationFn: async ({
      suggestionId,
      reason
    }: {
      suggestionId: string;
      reason?: string;
    }) => {
      return retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('ai_suggestion_status')
          .update({
            status: 'dismissed',
            implementation_notes: reason,
          })
          .eq('suggestion_id', suggestionId)
          .eq('analysis_id', analysisId!);

        if (error) throw error;
      });
    },
    onSuccess: () => {
      notifications.info('Correção descartada');
      queryClient.invalidateQueries({ queryKey: ['suggestion-status', analysisId] });
    },
    onError: (error) => {
      notifications.error('Erro ao descartar correção', error as Error);
    }
  });

  const stats = {
    total: query.data?.length || 0,
    pending: query.data?.filter(s => s.status === 'pending').length || 0,
    resolved: query.data?.filter(s => s.status === 'resolved').length || 0,
    dismissed: query.data?.filter(s => s.status === 'dismissed').length || 0,
    estimatedSavings: query.data?.reduce((sum, s) => sum + s.estimated_credits_saved, 0) || 0,
    actualSavings: query.data?.reduce((sum, s) => sum + (s.actual_credits_saved || 0), 0) || 0,
  };

  return {
    suggestions: query.data || [],
    stats,
    isLoading: query.isLoading,
    markAsResolved: markAsResolved.mutate,
    markAsDismissed: markAsDismissed.mutate,
    isUpdating: markAsResolved.isPending || markAsDismissed.isPending,
  };
}
