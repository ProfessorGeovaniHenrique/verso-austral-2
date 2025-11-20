import { useSystemHealth } from '@/hooks/useSystemHealth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function SystemHealthDashboard() {
  const { data: health, isLoading, refresh, isRefreshing } = useSystemHealth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!health) return null;

  const statusConfig = {
    healthy: { color: 'text-green-500', icon: CheckCircle2, bg: 'bg-green-500/10' },
    warning: { color: 'text-yellow-500', icon: AlertTriangle, bg: 'bg-yellow-500/10' },
    critical: { color: 'text-red-500', icon: AlertTriangle, bg: 'bg-red-500/10' },
  };

  const config = statusConfig[health.overall_status];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Health</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Verificar Agora
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
            Status Geral: <Badge variant={health.overall_status === 'healthy' ? 'default' : 'destructive'}>{health.overall_status.toUpperCase()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-red-500">{health.critical_count}</p>
              <p className="text-sm text-muted-foreground">Críticos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{health.warning_count}</p>
              <p className="text-sm text-muted-foreground">Avisos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{health.results.length - health.critical_count - health.warning_count}</p>
              <p className="text-sm text-muted-foreground">Saudáveis</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {health.results.map((result) => {
          const resultConfig = statusConfig[result.status];
          const ResultIcon = resultConfig.icon;
          
          return (
            <Alert key={result.check_type} className={resultConfig.bg}>
              <ResultIcon className={`h-4 w-4 ${resultConfig.color}`} />
              <AlertTitle className={resultConfig.color}>{result.check_type}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          );
        })}
      </div>

      {health.cached && (
        <p className="text-xs text-muted-foreground text-center">
          Dados em cache (última verificação: {new Date(health.results[0]?.checked_at).toLocaleTimeString()})
        </p>
      )}
    </div>
  );
}
