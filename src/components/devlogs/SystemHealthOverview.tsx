/**
 * SystemHealthOverview - Dashboard unificado de saúde do sistema
 * Sprint 4 - Real-time and Performance
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, Database, Zap, AlertTriangle, CheckCircle, 
  XCircle, RefreshCw, Clock, Wifi, WifiOff 
} from 'lucide-react';
import { useRealtimeDevOps, useRealtimeAlerts, useRealtimeAnnotationJobs } from '@/hooks/useRealtimeDevOps';
import { useDevOpsMetrics } from '@/hooks/useDevOpsMetrics';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface SystemComponent {
  name: string;
  status: HealthStatus;
  metric?: string;
  lastCheck: Date;
}

export function SystemHealthOverview() {
  const [components, setComponents] = useState<SystemComponent[]>([]);
  
  const { metrics, isLoading, refresh, lastUpdate } = useDevOpsMetrics(undefined, 0); // Disable auto-refresh
  
  const { alerts } = useRealtimeAlerts((alert) => {
    toast.warning(`Novo alerta: ${alert.alert_type}`, {
      description: `Valor: ${alert.current_value} (threshold: ${alert.threshold})`
    });
  });
  
  const { activeJobs } = useRealtimeAnnotationJobs();
  
  const { isConnected } = useRealtimeDevOps({
    tables: ['annotation_jobs', 'code_scan_history', 'metric_alerts'],
    onUpdate: refresh,
    debounceMs: 5000
  });

  // Calculate system components status
  useEffect(() => {
    if (!metrics) return;

    const newComponents: SystemComponent[] = [
      {
        name: 'Banco de Dados',
        status: 'healthy',
        metric: `${metrics.corpusMetrics[0]?.value?.toLocaleString() || 0} registros`,
        lastCheck: new Date()
      },
      {
        name: 'Cache Semântico',
        status: metrics.summary.totalCoverage > 50 ? 'healthy' : metrics.summary.totalCoverage > 20 ? 'warning' : 'critical',
        metric: `${metrics.summary.totalCoverage}% cobertura`,
        lastCheck: new Date()
      },
      {
        name: 'Jobs de Anotação',
        status: metrics.summary.successRate > 80 ? 'healthy' : metrics.summary.successRate > 50 ? 'warning' : 'critical',
        metric: `${metrics.summary.successRate}% sucesso`,
        lastCheck: new Date()
      },
      {
        name: 'Edge Functions',
        status: 'healthy',
        metric: metrics.summary.averageCITime,
        lastCheck: new Date()
      }
    ];

    setComponents(newComponents);
  }, [metrics]);

  const overallStatus: HealthStatus = components.some(c => c.status === 'critical') 
    ? 'critical' 
    : components.some(c => c.status === 'warning') 
      ? 'warning' 
      : 'healthy';

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com status geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${getStatusColor(overallStatus)}/10`}>
                <Activity className={`h-6 w-6 ${
                  overallStatus === 'healthy' ? 'text-green-500' : 
                  overallStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'
                }`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  System Health Overview
                  {isConnected ? (
                    <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                      <Wifi className="h-3 w-3" /> Real-time
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                      <WifiOff className="h-3 w-3" /> Offline
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Última atualização: {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overall Status Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Status Geral</span>
                <span className="font-medium capitalize">{overallStatus}</span>
              </div>
              <Progress 
                value={overallStatus === 'healthy' ? 100 : overallStatus === 'warning' ? 60 : 30} 
                className={`h-2 [&>div]:${getStatusColor(overallStatus)}`}
              />
            </div>
          </div>

          {/* Components Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {components.map(component => (
              <div 
                key={component.name}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{component.name}</span>
                  {getStatusIcon(component.status)}
                </div>
                <p className="text-lg font-bold">{component.metric}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(component.lastCheck, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Jobs Ativos ({activeJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeJobs.slice(0, 5).map(job => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant={job.status === 'processando' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
                    <span className="text-sm">{job.corpus_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={job.progresso || 0} className="w-20 h-2" />
                    <span className="text-xs text-muted-foreground">{job.progresso?.toFixed(0) || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Alertas Ativos ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => (
                <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{alert.alert_type}</AlertTitle>
                  <AlertDescription>
                    Valor atual: {alert.current_value} (threshold: {alert.threshold})
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
