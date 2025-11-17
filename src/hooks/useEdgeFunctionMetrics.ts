import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EdgeFunctionLog {
  id: string;
  function_name: string;
  request_method: string;
  status_code: number;
  response_time_ms: number;
  user_id: string | null;
  user_role: string | null;
  rate_limited: boolean;
  error_message: string | null;
  created_at: string;
}

interface EdgeFunctionMetrics {
  function_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  rate_limited_requests: number;
  avg_response_time_ms: number;
  unique_users: number;
  status_2xx: number;
  status_4xx: number;
  status_5xx: number;
}

export function useEdgeFunctionMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h') {
  return useQuery({
    queryKey: ['edge-function-metrics', timeRange],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date(now);

      switch (timeRange) {
        case '1h':
          startDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      // Buscar logs
      const { data: logs, error: logsError } = await supabase
        .from('edge_function_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Agregar métricas por função
      const metricsByFunction = new Map<string, EdgeFunctionMetrics>();

      (logs as EdgeFunctionLog[]).forEach(log => {
        if (!metricsByFunction.has(log.function_name)) {
          metricsByFunction.set(log.function_name, {
            function_name: log.function_name,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            rate_limited_requests: 0,
            avg_response_time_ms: 0,
            unique_users: 0,
            status_2xx: 0,
            status_4xx: 0,
            status_5xx: 0
          });
        }

        const metrics = metricsByFunction.get(log.function_name)!;
        metrics.total_requests++;

        if (log.status_code >= 200 && log.status_code < 300) {
          metrics.successful_requests++;
          metrics.status_2xx++;
        } else if (log.status_code >= 400 && log.status_code < 500) {
          metrics.status_4xx++;
          if (log.status_code !== 429) metrics.failed_requests++;
        } else if (log.status_code >= 500) {
          metrics.failed_requests++;
          metrics.status_5xx++;
        }

        if (log.rate_limited) {
          metrics.rate_limited_requests++;
        }

        // Calcular tempo médio de resposta
        if (log.response_time_ms) {
          metrics.avg_response_time_ms = 
            (metrics.avg_response_time_ms * (metrics.total_requests - 1) + log.response_time_ms) / 
            metrics.total_requests;
        }
      });

      // Contar usuários únicos
      for (const [functionName, metrics] of metricsByFunction) {
        const uniqueUserIds = new Set(
          (logs as EdgeFunctionLog[])
            .filter(log => log.function_name === functionName && log.user_id)
            .map(log => log.user_id)
        );
        metrics.unique_users = uniqueUserIds.size;
      }

      return {
        logs: logs as EdgeFunctionLog[],
        metrics: Array.from(metricsByFunction.values()),
        summary: {
          totalRequests: logs.length,
          totalFunctions: metricsByFunction.size,
          totalErrors: Array.from(metricsByFunction.values()).reduce((sum, m) => sum + m.failed_requests, 0),
          totalRateLimited: Array.from(metricsByFunction.values()).reduce((sum, m) => sum + m.rate_limited_requests, 0)
        }
      };
    },
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });
}
