import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthCheckService } from '@/services/healthCheck.service';
import { toast } from 'sonner';

/**
 * Hook para health check do sistema
 * Usa cache server-side de 5 minutos
 */
export function useSystemHealth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['system-health'],
    queryFn: () => healthCheckService.runHealthCheck(false),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const refreshMutation = useMutation({
    mutationFn: () => healthCheckService.runHealthCheck(true),
    onSuccess: (data) => {
      queryClient.setQueryData(['system-health'], data);
      toast.success('Health check atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro no health check: ${error.message}`);
    },
  });

  return {
    ...query,
    refresh: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
  };
}

/**
 * Hook para buscar apenas o status cacheado (mais leve)
 */
export function useCachedHealth() {
  return useQuery({
    queryKey: ['cached-health'],
    queryFn: () => healthCheckService.getCachedStatus(),
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh a cada 30s
  });
}
