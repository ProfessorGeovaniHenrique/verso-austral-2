import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { ConstructionPhase } from "@/data/developer-logs/construction-log";

interface MetricsEvolutionProps {
  phases: ConstructionPhase[];
}

export function MetricsEvolution({ phases }: MetricsEvolutionProps) {
  // Extrair evolução de métricas ao longo do tempo
  const metricsOverTime = phases
    .filter(p => p.status === 'completed' && Object.keys(p.metrics).length > 0)
    .map(phase => {
      const metrics: any = { phase: phase.phase.split(':')[0] };
      
      Object.entries(phase.metrics).forEach(([key, value]) => {
        if (value) {
          metrics[key] = (value.after * 100).toFixed(0);
        }
      });
      
      return metrics;
    });

  // Compilar tabela comparativa
  const comparisonData = phases
    .filter(p => p.status === 'completed' && Object.keys(p.metrics).length > 0)
    .flatMap(phase => 
      Object.entries(phase.metrics).map(([metricName, value]) => {
        if (!value) return null;
        const improvement = ((value.after - value.before) / value.before * 100);
        return {
          phase: phase.phase,
          metric: formatMetricName(metricName),
          before: (value.before * 100).toFixed(0) + '%',
          after: (value.after * 100).toFixed(0) + '%',
          improvement: improvement,
          improvementDisplay: improvement > 0 ? `+${improvement.toFixed(0)}%` : `${improvement.toFixed(0)}%`
        };
      })
    )
    .filter(Boolean);

  function formatMetricName(key: string): string {
    const map: Record<string, string> = {
      posTaggingAccuracy: 'POS Tagging',
      lemmatizationAccuracy: 'Lematização',
      verbCoverage: 'Cobertura de Verbos',
      semanticAnnotationAccuracy: 'Anotação Semântica',
      processingSpeed: 'Velocidade (tokens/s)'
    };
    return map[key] || key;
  }

  function getImprovementIcon(improvement: number) {
    if (improvement > 15) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (improvement > 0) return <TrendingUp className="w-4 h-4 text-blue-600" />;
    if (improvement === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
    return <TrendingDown className="w-4 h-4 text-orange-600" />;
  }

  function getImprovementColor(improvement: number): string {
    if (improvement > 15) return 'text-green-600 dark:text-green-400';
    if (improvement > 0) return 'text-blue-600 dark:text-blue-400';
    if (improvement === 0) return 'text-muted-foreground';
    return 'text-orange-600 dark:text-orange-400';
  }

  // Estatísticas gerais
  const overallStats = {
    avgImprovement: (comparisonData.reduce((sum, d) => sum + (d?.improvement || 0), 0) / comparisonData.length).toFixed(0),
    maxImprovement: Math.max(...comparisonData.map(d => d?.improvement || 0)).toFixed(0),
    totalMetrics: comparisonData.length
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Melhoria Média</CardDescription>
            <CardTitle className="text-3xl text-green-600">+{overallStats.avgImprovement}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Maior Melhoria</CardDescription>
            <CardTitle className="text-3xl text-primary">+{overallStats.maxImprovement}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Métricas Acompanhadas</CardDescription>
            <CardTitle className="text-3xl">{overallStats.totalMetrics}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Métricas ao Longo das Fases</CardTitle>
          <CardDescription>
            Precisão (%) das principais métricas de qualidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={metricsOverTime}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="phase" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Precisão (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="posTaggingAccuracy" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="POS Tagging"
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line 
                type="monotone" 
                dataKey="lemmatizationAccuracy" 
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                name="Lematização"
                dot={{ fill: 'hsl(142, 76%, 36%)' }}
              />
              <Line 
                type="monotone" 
                dataKey="semanticAnnotationAccuracy" 
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2}
                name="Anotação Semântica"
                dot={{ fill: 'hsl(221, 83%, 53%)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela Comparativa Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Tabela Comparativa de Métricas</CardTitle>
          <CardDescription>
            Comparação antes/depois por fase de implementação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fase</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead>Antes</TableHead>
                <TableHead>Depois</TableHead>
                <TableHead>Melhoria</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.map((row, index) => {
                if (!row) return null;
                return (
                  <TableRow key={index}>
                    <TableCell className="text-xs">
                      {row.phase.split(':')[0]}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {row.metric}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.before}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {row.after}
                    </TableCell>
                    <TableCell className={`text-sm font-bold ${getImprovementColor(row.improvement)}`}>
                      {row.improvementDisplay}
                    </TableCell>
                    <TableCell>
                      {getImprovementIcon(row.improvement)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Metas Futuras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Metas Futuras de Qualidade
          </CardTitle>
          <CardDescription>
            Objetivos de precisão para as próximas implementações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">POS Tagging</span>
                <Badge variant="outline">Atual: 87%</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta v1.5:</span>
                  <span className="font-semibold text-blue-600">90%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta v2.0:</span>
                  <span className="font-semibold text-green-600">93%</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Anotação Semântica (IA)</span>
                <Badge variant="outline">Atual: 70%</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta com Gemini 2.0:</span>
                  <span className="font-semibold text-blue-600">80%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta com validação humana:</span>
                  <span className="font-semibold text-green-600">90%</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Concordância Inter-Anotadores (Kappa)</span>
                <Badge variant="outline">Atual: N/A</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta mínima (aceitável):</span>
                  <span className="font-semibold text-orange-600">≥ 0.70</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta ideal:</span>
                  <span className="font-semibold text-green-600">≥ 0.80</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
