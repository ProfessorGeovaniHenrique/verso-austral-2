import { useQuery } from '@tanstack/react-query';
import { lexiconStatsService, type LexiconStats } from '@/services/lexiconStats.service';

/**
 * Hook otimizado para buscar estatísticas do léxico
 * Cache reduzido para permitir atualização após validações
 */
export function useLexiconStats() {
  return useQuery({
    queryKey: ['lexicon-stats'],
    queryFn: () => lexiconStatsService.fetchStats(),
    staleTime: 30 * 1000, // 30 segundos - permite atualizações rápidas após validações
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });
}

/**
 * Hook para validar completude do léxico
 */
export function useLexiconValidation() {
  return useQuery({
    queryKey: ['lexicon-validation'],
    queryFn: () => lexiconStatsService.validateCompleteness(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para calcular progresso de importação
 */
export function useLexiconProgress() {
  const { data: stats } = useLexiconStats();

  if (!stats) return null;

  return lexiconStatsService.calculateProgress(stats);
}
