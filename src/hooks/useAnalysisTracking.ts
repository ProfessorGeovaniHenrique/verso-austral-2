import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type AnalysisFeature = 
  | 'cloud_explored' 
  | 'network_explored' 
  | 'kwic_used' 
  | 'statistics_explored' 
  | 'all_levels_viewed'
  | 'quiz_completed';

/**
 * Hook para rastrear uso de funcionalidades de análise científica
 * e desbloquear conquistas relacionadas
 */
export function useAnalysisTracking() {
  const { user } = useAuthContext();

  const trackFeatureUsage = useCallback(async (feature: AnalysisFeature) => {
    if (!user) return;

    try {
      await supabase.rpc('increment_feature_usage', {
        _user_id: user.id,
        _feature_name: feature,
      });
      
      console.log(`[Analysis Tracking] Feature tracked: ${feature}`);
    } catch (error) {
      console.error(`[Analysis Tracking] Error tracking ${feature}:`, error);
    }
  }, [user]);

  return { trackFeatureUsage };
}

/**
 * Hook para rastrear visualização de níveis hierárquicos (N1-N4)
 * e desbloquear conquista "Cientista Sênior" ao visualizar todos
 */
export function useLevelTracking() {
  const { trackFeatureUsage } = useAnalysisTracking();
  
  useEffect(() => {
    // Verificar se já visualizou todos os níveis
    const viewedLevels = JSON.parse(localStorage.getItem('viewed_hierarchy_levels') || '[]');
    if (viewedLevels.length >= 4) {
      trackFeatureUsage('all_levels_viewed');
    }
  }, [trackFeatureUsage]);

  const trackLevelView = useCallback((level: number) => {
    const viewedLevels = JSON.parse(localStorage.getItem('viewed_hierarchy_levels') || '[]') as number[];
    
    if (!viewedLevels.includes(level)) {
      const updatedLevels = [...viewedLevels, level];
      localStorage.setItem('viewed_hierarchy_levels', JSON.stringify(updatedLevels));
      
      // Se visualizou todos os 4 níveis, trackear conquista
      if (updatedLevels.length >= 4) {
        trackFeatureUsage('all_levels_viewed');
      }
    }
  }, [trackFeatureUsage]);

  return { trackLevelView };
}
