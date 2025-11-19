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
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('health-aggregator', {
        method: 'GET',
      });

      if (error) throw error;
      return data as AggregatedHealth;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    retry: 3,
  });
}
