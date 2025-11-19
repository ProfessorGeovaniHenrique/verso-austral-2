import { useEffect, useRef } from 'react';
import { useMetricAlerts } from '@/hooks/useMetricAlerts';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, XCircle } from 'lucide-react';

export function MetricsAlertToast() {
  const { data: alerts } = useMetricAlerts();
  const notifiedAlerts = useRef(new Set<string>());

  useEffect(() => {
    if (!alerts) return;

    alerts.forEach((alert) => {
      // Notificar apenas alertas que ainda não foram notificados
      if (!notifiedAlerts.current.has(alert.id)) {
        notifiedAlerts.current.add(alert.id);

        const isError = alert.severity === 'error' || alert.severity === 'critical';
        const Icon = isError ? XCircle : AlertTriangle;

        toast({
          title: `Alerta: ${alert.alert_type}`,
          description: `${alert.function_name ? `Função: ${alert.function_name} - ` : ''}Valor atual: ${alert.current_value} (Limite: ${alert.threshold})`,
          variant: isError ? 'destructive' : 'default',
          duration: isError ? Infinity : 10000,
          action: Icon ? (
            <Icon className="h-5 w-5" />
          ) : undefined,
        });
      }
    });
  }, [alerts]);

  return null;
}
