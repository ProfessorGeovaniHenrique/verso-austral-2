import { useState } from 'react';
import { useEdgeFunctionMetrics } from '@/hooks/useEdgeFunctionMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, Clock, Shield } from 'lucide-react';

export default function AdminEdgeFunctions() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const { data, isLoading, error } = useEdgeFunctionMetrics(timeRange);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando métricas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-destructive">Erro ao carregar métricas: {error.message}</p>
      </div>
    );
  }

  const { logs, metrics, summary } = data;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Edge Functions - Monitoramento</h1>
          <p className="text-muted-foreground">
            Dashboard de segurança e performance das Edge Functions
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Última hora</SelectItem>
            <SelectItem value="24h">Últimas 24 horas</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalFunctions} funções monitoradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalRequests > 0 
                ? ((summary.totalErrors / summary.totalRequests) * 100).toFixed(1) 
                : 0}% taxa de erro
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limited</CardTitle>
            <Shield className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRateLimited}</div>
            <p className="text-xs text-muted-foreground">
              Requisições bloqueadas por rate limiting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.length > 0 
                ? (metrics.reduce((sum, m) => sum + m.avg_response_time_ms, 0) / metrics.length).toFixed(0)
                : 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo médio de resposta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Requisições por Função */}
        <Card>
          <CardHeader>
            <CardTitle>Requisições por Função</CardTitle>
            <CardDescription>Volume de chamadas por edge function</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="function_name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful_requests" fill="hsl(var(--chart-1))" name="Sucesso" />
                <Bar dataKey="failed_requests" fill="hsl(var(--destructive))" name="Erro" />
                <Bar dataKey="rate_limited_requests" fill="hsl(var(--chart-3))" name="Rate Limited" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Codes Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status Codes</CardTitle>
            <CardDescription>Por função</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="function_name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="status_2xx" fill="hsl(var(--chart-1))" name="2xx (Sucesso)" stackId="a" />
                <Bar dataKey="status_4xx" fill="hsl(var(--chart-3))" name="4xx (Cliente)" stackId="a" />
                <Bar dataKey="status_5xx" fill="hsl(var(--destructive))" name="5xx (Servidor)" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Métricas */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Detalhadas por Função</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Função</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Sucesso</th>
                  <th className="text-right p-2">Erro</th>
                  <th className="text-right p-2">Rate Limited</th>
                  <th className="text-right p-2">Tempo Médio</th>
                  <th className="text-right p-2">Usuários</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(metric => (
                  <tr key={metric.function_name} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono text-sm">{metric.function_name}</td>
                    <td className="text-right p-2">{metric.total_requests}</td>
                    <td className="text-right p-2 text-green-600">{metric.successful_requests}</td>
                    <td className="text-right p-2 text-red-600">{metric.failed_requests}</td>
                    <td className="text-right p-2 text-yellow-600">{metric.rate_limited_requests}</td>
                    <td className="text-right p-2">{metric.avg_response_time_ms.toFixed(0)}ms</td>
                    <td className="text-right p-2">{metric.unique_users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Logs Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Logs Recentes</CardTitle>
          <CardDescription>Últimas 50 requisições</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.slice(0, 50).map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={log.status_code < 300 ? 'default' : log.status_code < 500 ? 'secondary' : 'destructive'}>
                    {log.status_code}
                  </Badge>
                  <span className="font-mono text-sm">{log.function_name}</span>
                  <span className="text-xs text-muted-foreground">{log.request_method}</span>
                  {log.rate_limited && <Badge variant="outline" className="text-yellow-600">Rate Limited</Badge>}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {log.response_time_ms && <span>{log.response_time_ms}ms</span>}
                  <span>{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
