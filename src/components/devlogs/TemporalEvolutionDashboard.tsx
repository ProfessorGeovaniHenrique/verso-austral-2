import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCodeScanHistory } from '@/hooks/useCodeScanHistory';
import { TrendingUp, TrendingDown, AlertCircle, FileCode, Calendar } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export function TemporalEvolutionDashboard() {
  const { scans, stats } = useCodeScanHistory();

  // Preparar dados para gráfico de tendência temporal
  const temporalData = scans?.slice(0, 10).reverse().map(scan => ({
    date: format(new Date(scan.created_at), 'dd/MM HH:mm', { locale: ptBR }),
    total: scan.total_issues,
    resolved: scan.resolved_issues,
    new: scan.new_issues,
    pending: scan.pending_issues,
    improvement: scan.improvement_percentage || 0
  })) || [];

  // Dados para gráfico de barras comparativo
  const comparisonData = scans?.slice(0, 5).reverse().map(scan => ({
    scan: `Scan ${format(new Date(scan.created_at), 'dd/MM', { locale: ptBR })}`,
    resolved: scan.resolved_issues,
    new: scan.new_issues,
    pending: scan.pending_issues
  })) || [];

  // Top 5 arquivos mais problemáticos (mock - seria calculado do scan_data)
  const topProblematicFiles = [
    { file: 'process-houaiss-dictionary/index.ts', issues: 3, severity: 'crítica' },
    { file: 'process-unesp-dictionary/index.ts', issues: 2, severity: 'alta' },
    { file: 'useAnnotationJobs.ts', issues: 1, severity: 'alta' },
  ];

  const averageImprovement = stats?.averageImprovement || 0;
  const totalScans = stats?.totalScans || 0;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScans}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scans realizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Melhoria Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{averageImprovement.toFixed(1)}%</div>
              {averageImprovement > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de melhoria geral
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Último Scan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.lastScanDate ? format(new Date(stats.lastScanDate), 'dd/MM', { locale: ptBR }) : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Data do último scan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Issues Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scans?.[0]?.pending_issues || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No último scan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendência Temporal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução Temporal de Issues
          </CardTitle>
          <CardDescription>
            Acompanhe a evolução dos problemas ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={temporalData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorTotal)" name="Total Issues" />
              <Area type="monotone" dataKey="resolved" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorResolved)" name="Resolvidos" />
              <Area type="monotone" dataKey="new" stroke="hsl(var(--chart-3))" fillOpacity={1} fill="url(#colorNew)" name="Novos" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Comparação entre Scans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Comparação entre Scans
          </CardTitle>
          <CardDescription>
            Issues resolvidos vs novos vs pendentes por scan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="scan" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Bar dataKey="resolved" fill="hsl(var(--chart-2))" name="Resolvidos" />
              <Bar dataKey="new" fill="hsl(var(--chart-3))" name="Novos" />
              <Bar dataKey="pending" fill="hsl(var(--chart-4))" name="Pendentes" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Taxa de Melhoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Taxa de Melhoria ao Longo do Tempo
          </CardTitle>
          <CardDescription>
            Percentual de melhoria em cada scan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={temporalData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" label={{ value: '%', position: 'insideLeft' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Line 
                type="monotone" 
                dataKey="improvement" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                name="Melhoria (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Arquivos Problemáticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Top Arquivos Problemáticos
          </CardTitle>
          <CardDescription>
            Arquivos com maior número de issues detectados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topProblematicFiles.map((file, index) => (
              <div key={file.file} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{file.file}</p>
                    <p className="text-xs text-muted-foreground">{file.issues} issues encontrados</p>
                  </div>
                </div>
                <Badge variant={file.severity === 'crítica' ? 'destructive' : 'secondary'}>
                  {file.severity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
