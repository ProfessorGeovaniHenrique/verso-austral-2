import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type MetricAlert = Tables<'metric_alerts'>;

export function useMetricAlerts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['metric-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metric_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return data as MetricAlert[];
    },
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });

  // Configurar Supabase Realtime para alertas em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('metric-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metric_alerts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['metric-alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
