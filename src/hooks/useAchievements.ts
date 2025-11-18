import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ACHIEVEMENTS, Achievement } from '@/data/achievements';
import { toast } from 'sonner';

interface FeatureUsageStats {
  [featureName: string]: number;
}

interface AchievementProgress {
  achievement: Achievement;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
}

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUnlocked, setTotalUnlocked] = useState(0);

  useEffect(() => {
    if (!user) {
      setAchievements([]);
      setTotalUnlocked(0);
      setIsLoading(false);
      return;
    }

    loadAchievements();
  }, [user]);

  async function loadAchievements() {
    if (!user) return;

    try {
      setIsLoading(true);

      // Buscar estatísticas de uso de features
      const { data: usageData, error } = await supabase
        .from('analytics_feature_usage')
        .select('feature_name, usage_count')
        .eq('user_id', user.id);

      if (error) throw error;

      // Transformar dados em objeto chave-valor
      const stats: FeatureUsageStats = {};
      usageData?.forEach(item => {
        stats[item.feature_name] = item.usage_count || 0;
      });

      // Calcular progresso de cada conquista
      const progressList: AchievementProgress[] = ACHIEVEMENTS.map(achievement => {
        const progress = calculateProgress(achievement, stats);
        return progress;
      });

      setAchievements(progressList);

      // Contar desbloqueadas
      const unlocked = progressList.filter(p => p.isUnlocked).length;
      setTotalUnlocked(unlocked);

      // Notificar sobre novas conquistas desbloqueadas (raras+)
      notifyNewAchievements(progressList);

    } catch (error) {
      console.error('[useAchievements] Erro ao carregar conquistas:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function calculateProgress(
    achievement: Achievement,
    stats: FeatureUsageStats
  ): AchievementProgress {
    const { requirement } = achievement;

    if (requirement.type === 'feature_usage') {
      // Verificar uso de uma feature específica
      const featureName = requirement.features?.[0] || '';
      const currentCount = stats[featureName] || 0;
      const targetCount = requirement.count || 1;

      return {
        achievement,
        isUnlocked: currentCount >= targetCount,
        progress: Math.min(currentCount, targetCount),
        maxProgress: targetCount,
      };
    }

    if (requirement.type === 'combo') {
      // Verificar se usou todas as features
      const features = requirement.features || [];
      const minCount = requirement.count || 1;

      const allFeaturesUsed = features.every(
        featureName => (stats[featureName] || 0) >= minCount
      );

      const featuresCompleted = features.filter(
        featureName => (stats[featureName] || 0) >= minCount
      ).length;

      return {
        achievement,
        isUnlocked: allFeaturesUsed,
        progress: featuresCompleted,
        maxProgress: features.length,
      };
    }

    if (requirement.type === 'milestone') {
      // Somar total de todas as features
      const totalUsage = Object.values(stats).reduce((sum, count) => sum + count, 0);
      const targetCount = requirement.count || 1;

      return {
        achievement,
        isUnlocked: totalUsage >= targetCount,
        progress: Math.min(totalUsage, targetCount),
        maxProgress: targetCount,
      };
    }

    // Fallback
    return {
      achievement,
      isUnlocked: false,
      progress: 0,
      maxProgress: 1,
    };
  }

  function notifyNewAchievements(progressList: AchievementProgress[]) {
    if (!user) return;

    const storageKey = `achievements_notified_${user.id}`;
    const notifiedIds = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];

    progressList.forEach(({ achievement, isUnlocked }) => {
      // Apenas notificar conquistas raras+ que não foram notificadas ainda
      if (
        isUnlocked &&
        !notifiedIds.includes(achievement.id) &&
        ['rare', 'epic', 'legendary'].includes(achievement.rarity)
      ) {
        toast.success(`🏆 Conquista Desbloqueada!`, {
          description: `${achievement.emoji} ${achievement.name} - ${achievement.description}`,
          duration: 5000,
        });

        notifiedIds.push(achievement.id);
      }
    });

    // Salvar lista de notificações
    localStorage.setItem(storageKey, JSON.stringify(notifiedIds));
  }

  return {
    achievements,
    totalUnlocked,
    totalAchievements: ACHIEVEMENTS.length,
    isLoading,
    refreshAchievements: loadAchievements,
  };
}
