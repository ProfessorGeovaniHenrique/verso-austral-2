import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@/lib/notifications';
import { useQueryClient } from '@tanstack/react-query';

interface SystemAlert {
  id: string;
  created_at: string;
  alert_type: 'critical_bugs' | 'low_improvement' | 'high_pending';
  message: string;
  scan_id: string | null;
  sent_to: string | null;
  acknowledged: boolean;
  metadata: any;
}

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Buscar alertas não reconhecidos ao montar
    const fetchUnacknowledgedAlerts = async () => {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setAlerts(data as SystemAlert[]);
      }
    };

    fetchUnacknowledgedAlerts();

    // Subscrever a novos alertas via Realtime
    const channel = supabase
      .channel('system-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_alerts'
        },
        (payload) => {
          const newAlert = payload.new as SystemAlert;
          
          setAlerts(prev => [newAlert, ...prev]);
          
          // Exibir notificação toast
          if (newAlert.alert_type === 'critical_bugs') {
            notifications.error('Problemas Críticos Detectados!', newAlert.message);
          } else if (newAlert.alert_type === 'low_improvement') {
            notifications.warning('Taxa de Melhoria Baixa', newAlert.message);
          } else {
            notifications.info('Alto Volume de Issues Pendentes', newAlert.message);
          }

          // Invalidar queries para atualizar UI
          queryClient.invalidateQueries({ queryKey: ['code-scan-history'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('system_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      notifications.success('Alerta reconhecido');
    }
  };

  const acknowledgeAll = async () => {
    const alertIds = alerts.map(a => a.id);
    
    const { error } = await supabase
      .from('system_alerts')
      .update({ acknowledged: true })
      .in('id', alertIds);

    if (!error) {
      setAlerts([]);
      notifications.success('Todos os alertas reconhecidos');
    }
  };

  return {
    alerts,
    unacknowledgedCount: alerts.filter(a => !a.acknowledged).length,
    acknowledgeAlert,
    acknowledgeAll
  };
}
