import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHealthAggregator } from '@/hooks/useHealthAggregator';
import { useEdgeFunctionMetrics } from '@/hooks/useEdgeFunctionMetrics';
import { useMetricAlerts } from '@/hooks/useMetricAlerts';
import { MetricsAlertToast } from '@/components/admin/MetricsAlertToast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminMetricsRealtime() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const { data: health, isLoading: healthLoading } = useHealthAggregator();
  const { data: metricsData, isLoading: metricsLoading } = useEdgeFunctionMetrics(timeRange);
  const { data: alerts } = useMetricAlerts();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  if (healthLoading || metricsLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const metrics = metricsData?.metrics || [];
  const summary = metricsData?.summary || { totalRequests: 0, totalFunctions: 0, totalErrors: 0, totalRateLimited: 0 };

  // Calcular métricas agregadas
  const successRate = summary.totalRequests > 0
    ? ((summary.totalRequests - summary.totalErrors) / summary.totalRequests * 100).toFixed(1)
    : '100';

  const avgResponseTime = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + m.avg_response_time_ms, 0) / metrics.length).toFixed(0)
    : '0';

  // Preparar dados para gráficos
  const latencyData = metrics.map(m => ({
    name: m.function_name.split('-').slice(0, 2).join('-'),
    avg: Math.round(m.avg_response_time_ms),
  }));

  const requestsData = metrics.map(m => ({
    name: m.function_name.split('-').slice(0, 2).join('-'),
    total: m.total_requests,
    success: m.successful_requests,
    failed: m.failed_requests,
  }));

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <MetricsAlertToast />

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Métricas em Tempo Real</h1>
            <p className="text-muted-foreground">
              Monitoramento de saúde e performance das Edge Functions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Última atualização: {health?.last_updated 
                ? formatDistanceToNow(new Date(health.last_updated), { addSuffix: true, locale: ptBR })
                : 'Carregando...'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Alertas Ativos */}
      {alerts && alerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Alertas Ativos ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{alert.alert_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.function_name && `Função: ${alert.function_name} - `}
                      Valor: {alert.current_value} / Limite: {alert.threshold}
                    </p>
                  </div>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
            {health && getStatusIcon(health.overall_status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{health?.overall_status || 'Carregando...'}</div>
            <p className="text-xs text-muted-foreground">
              {health?.summary.healthy || 0}/{health?.summary.total_functions || 0} funções saudáveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalRequests} requisições totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Média geral</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalRateLimited} rate-limited
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Tabelas */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
        <TabsList>
          <TabsTrigger value="1h">1 hora</TabsTrigger>
          <TabsTrigger value="24h">24 horas</TabsTrigger>
          <TabsTrigger value="7d">7 dias</TabsTrigger>
          <TabsTrigger value="30d">30 dias</TabsTrigger>
        </TabsList>

        <TabsContent value={timeRange} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Latência por Função</CardTitle>
                <CardDescription>Tempo médio de resposta (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avg" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requisições por Função</CardTitle>
                <CardDescription>Sucesso vs. Falha</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={requestsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="success" fill="hsl(var(--primary))" name="Sucesso" stackId="a" />
                    <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Falha" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Status das Funções */}
          <Card>
            <CardHeader>
              <CardTitle>Status das Edge Functions</CardTitle>
              <CardDescription>Saúde individual de cada função</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {health?.functions.map((fn) => (
                  <div key={fn.function_name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(fn.status)}
                      <div>
                        <p className="font-medium">{fn.function_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Latência: {fn.response_time_ms}ms
                          {fn.error_message && ` - ${fn.error_message}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={fn.status === 'healthy' ? 'default' : fn.status === 'degraded' ? 'secondary' : 'destructive'}>
                      {fn.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabela Detalhada de Métricas */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas Detalhadas</CardTitle>
              <CardDescription>Estatísticas completas por função</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Função</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Sucesso</th>
                      <th className="text-right p-2">Falha</th>
                      <th className="text-right p-2">Latência (ms)</th>
                      <th className="text-right p-2">Usuários</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => (
                      <tr key={metric.function_name} className="border-b">
                        <td className="p-2 font-medium">{metric.function_name}</td>
                        <td className="text-right p-2">{metric.total_requests}</td>
                        <td className="text-right p-2 text-green-600">{metric.successful_requests}</td>
                        <td className="text-right p-2 text-red-600">{metric.failed_requests}</td>
                        <td className="text-right p-2">{Math.round(metric.avg_response_time_ms)}</td>
                        <td className="text-right p-2">{metric.unique_users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
