import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FunctionHealth {
  function_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_check: string;
  response_time_ms: number;
  error_message?: string;
}

export interface AggregatedHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  last_updated: string;
  functions: FunctionHealth[];
  summary: {
    total_functions: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export function useHealthAggregator() {
  return useQuery({
    queryKey: ['health-aggregator'],
    queryFn: async (): Promise<AggregatedHealth> => {
      try {
        const { data, error } = await supabase.functions.invoke('health-aggregator', {
          method: 'GET',
        });

        // Even if there's an error, try to return the data (503 returns data with unhealthy status)
        if (data) {
          return data as AggregatedHealth;
        }

        if (error) {
          console.warn('[useHealthAggregator] Error fetching health:', error.message);
        }

        // Return default unhealthy state on error
        return {
          overall_status: 'unhealthy',
          last_updated: new Date().toISOString(),
          functions: [],
          summary: { total_functions: 0, healthy: 0, degraded: 0, unhealthy: 0 }
        };
      } catch (err) {
        console.warn('[useHealthAggregator] Exception:', err);
        return {
          overall_status: 'unhealthy',
          last_updated: new Date().toISOString(),
          functions: [],
          summary: { total_functions: 0, healthy: 0, degraded: 0, unhealthy: 0 }
        };
      }
    },
    refetchInterval: 60000, // Reduzido para 60 segundos (menos agressivo)
    retry: 1, // Reduzido de 3 para 1
    staleTime: 30000, // Cache por 30 segundos
  });
}
