/**
 * Hook para métricas de ROI real do AI Assistant
 * Sprint 2 - Integração Backend Completa
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AIAssistantROIMetrics {
  // Totais
  totalAnalyses: number;
  totalIssuesFound: number;
  totalIssuesResolved: number;
  totalIssuesDismissed: number;
  totalEstimatedSavings: number;
  totalActualSavings: number;
  
  // Taxas
  resolutionRate: number;
  accuracyRate: number;
  roi: number;
  
  // Por categoria
  byCategory: {
    category: string;
    count: number;
    resolved: number;
    dismissed: number;
    avgConfidence: number;
  }[];
  
  // Por severidade
  bySeverity: {
    severity: string;
    count: number;
    resolved: number;
  }[];
  
  // Tendência semanal
  weeklyTrend: {
    date: string;
    analyses: number;
    resolved: number;
    savings: number;
  }[];
  
  // Últimas análises
  recentAnalyses: {
    id: string;
    timestamp: string;
    logsType: string;
    totalIssues: number;
    estimatedSavings: number;
    actualSavings: number;
    bugsResolved: number;
  }[];
}

export function useAIAssistantROI() {
  return useQuery({
    queryKey: ['ai-assistant-roi'],
    queryFn: async (): Promise<AIAssistantROIMetrics> => {
      // Fetch all analysis history
      const { data: historyData, error: historyError } = await supabase
        .from('ai_analysis_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (historyError) throw historyError;

      // Fetch suggestion statuses
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from('ai_suggestion_status')
        .select('*');
      
      if (suggestionsError) throw suggestionsError;

      const analyses = historyData || [];
      const suggestions = suggestionsData || [];

      // Calculate totals
      const totalAnalyses = analyses.length;
      const totalIssuesFound = analyses.reduce((acc, a) => acc + (a.total_issues || 0), 0);
      const totalEstimatedSavings = analyses.reduce((acc, a) => acc + (a.estimated_credits_saved || 0), 0);
      const totalActualSavings = analyses.reduce((acc, a) => acc + (a.actual_credits_saved || 0), 0);
      
      const resolvedSuggestions = suggestions.filter(s => s.status === 'resolved');
      const dismissedSuggestions = suggestions.filter(s => s.status === 'dismissed');
      
      const totalIssuesResolved = resolvedSuggestions.length;
      const totalIssuesDismissed = dismissedSuggestions.length;

      // Calculate rates
      const resolutionRate = suggestions.length > 0 
        ? (totalIssuesResolved / suggestions.length) * 100 
        : 0;
      
      const accuracyRate = suggestions.length > 0
        ? ((totalIssuesResolved + totalIssuesDismissed) / suggestions.length) * 100
        : 0;
      
      const roi = totalEstimatedSavings > 0 
        ? ((totalActualSavings - totalEstimatedSavings) / totalEstimatedSavings + 1) * 100
        : 0;

      // Group by category
      const categoryMap = new Map<string, { count: number; resolved: number; dismissed: number; confidenceSum: number }>();
      suggestions.forEach(s => {
        const cat = s.category || 'other';
        const existing = categoryMap.get(cat) || { count: 0, resolved: 0, dismissed: 0, confidenceSum: 0 };
        existing.count++;
        if (s.status === 'resolved') existing.resolved++;
        if (s.status === 'dismissed') existing.dismissed++;
        existing.confidenceSum += s.confidence_score || 0;
        categoryMap.set(cat, existing);
      });
      
      const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        resolved: data.resolved,
        dismissed: data.dismissed,
        avgConfidence: data.count > 0 ? data.confidenceSum / data.count : 0
      }));

      // Group by severity
      const severityMap = new Map<string, { count: number; resolved: number }>();
      suggestions.forEach(s => {
        const sev = s.severity || 'medium';
        const existing = severityMap.get(sev) || { count: 0, resolved: 0 };
        existing.count++;
        if (s.status === 'resolved') existing.resolved++;
        severityMap.set(sev, existing);
      });
      
      const bySeverity = Array.from(severityMap.entries()).map(([severity, data]) => ({
        severity,
        count: data.count,
        resolved: data.resolved
      }));

      // Weekly trend
      const today = new Date();
      const weeklyTrend: { date: string; analyses: number; resolved: number; savings: number }[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayAnalyses = analyses.filter(a => {
          const analysisDate = new Date(a.created_at).toISOString().split('T')[0];
          return analysisDate === dateStr;
        });
        
        const daySuggestions = suggestions.filter(s => {
          if (!s.resolved_at) return false;
          const resolvedDate = new Date(s.resolved_at).toISOString().split('T')[0];
          return resolvedDate === dateStr;
        });
        
        weeklyTrend.push({
          date: dateStr,
          analyses: dayAnalyses.length,
          resolved: daySuggestions.length,
          savings: dayAnalyses.reduce((acc, a) => acc + (a.actual_credits_saved || 0), 0)
        });
      }

      // Recent analyses (top 5)
      const recentAnalyses = analyses.slice(0, 5).map(a => ({
        id: a.id,
        timestamp: a.created_at,
        logsType: a.logs_type,
        totalIssues: a.total_issues || 0,
        estimatedSavings: a.estimated_credits_saved || 0,
        actualSavings: a.actual_credits_saved || 0,
        bugsResolved: a.bugs_auto_resolved || 0
      }));

      return {
        totalAnalyses,
        totalIssuesFound,
        totalIssuesResolved,
        totalIssuesDismissed,
        totalEstimatedSavings,
        totalActualSavings,
        resolutionRate,
        accuracyRate,
        roi,
        byCategory,
        bySeverity,
        weeklyTrend,
        recentAnalyses
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });
}
