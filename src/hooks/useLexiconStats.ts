import { useQuery } from '@tanstack/react-query';
import { lexiconStatsService, type LexiconStats } from '@/services/lexiconStats.service';

/**
 * Hook otimizado para buscar estatísticas do léxico
 * Usa cache de 24h pois os dados mudam raramente
 */
export function useLexiconStats() {
  return useQuery({
    queryKey: ['lexicon-stats'],
    queryFn: () => lexiconStatsService.fetchStats(),
    staleTime: 24 * 60 * 60 * 1000, // 24 horas
    gcTime: 48 * 60 * 60 * 1000, // 48 horas
    refetchOnWindowFocus: false,
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
