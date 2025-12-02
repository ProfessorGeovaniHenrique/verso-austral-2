import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Download, TrendingUp, Clock, CheckCircle2, 
  AlertCircle, Database, Activity 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FieldCoverageCard } from './FieldCoverageCard';
import { LayerPerformanceTable } from './LayerPerformanceTable';
import { DataQualityAlerts } from './DataQualityAlerts';
import type { EnrichmentQualityMetrics } from '@/hooks/useEnrichmentQualityMetrics';

interface EnrichmentMetricsDashboardProps {
  metrics: EnrichmentQualityMetrics;
  onExportReport: () => void;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function EnrichmentMetricsDashboard({ 
  metrics, 
  onExportReport 
}: EnrichmentMetricsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Data Quality Alerts - Prioridade máxima */}
      <DataQualityAlerts 
        dataQuality={metrics.dataQuality}
        totalSongs={metrics.totalSongs}
      />

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
            <Progress value={metrics.successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.enrichedCount} de {metrics.totalSongs} músicas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiança Média</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgConfidence.toFixed(1)}%</div>
            <Progress value={metrics.avgConfidence} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Baseado em {metrics.enrichedCount} músicas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingCount}</div>
            <Progress 
              value={(metrics.pendingCount / metrics.totalSongs) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {((metrics.pendingCount / metrics.totalSongs) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorCount}</div>
            <Progress 
              value={(metrics.errorCount / metrics.totalSongs) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {((metrics.errorCount / metrics.totalSongs) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Field Coverage - Nova seção */}
      <FieldCoverageCard 
        fieldCoverage={metrics.fieldCoverage}
        totalSongs={metrics.totalSongs}
      />

      {/* Layer Performance - Nova seção */}
      <LayerPerformanceTable layerStats={metrics.layerStats} />

      {/* Tabs with Charts */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="sources">Fontes de Dados</TabsTrigger>
          <TabsTrigger value="confidence">Confiança</TabsTrigger>
          <TabsTrigger value="recent">Recentes</TabsTrigger>
        </TabsList>

        {/* Enrichment History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Enriquecimento</CardTitle>
              <CardDescription>
                Sucessos e falhas ao longo do tempo (últimos 30 dias)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.enrichmentHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum dado de histórico disponível ainda
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.enrichmentHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="success" 
                      stroke="hsl(var(--primary))" 
                      name="Sucessos"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="failure" 
                      stroke="hsl(var(--destructive))" 
                      name="Falhas"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Sources */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Fonte</CardTitle>
                <CardDescription>
                  Origem dos dados enriquecidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.sourceDistribution.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma fonte de dados disponível ainda
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metrics.sourceDistribution}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {metrics.sourceDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confiança por Fonte</CardTitle>
                <CardDescription>
                  Qualidade média dos dados por origem
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.sourceDistribution.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma fonte de dados disponível ainda
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.sourceDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="source" 
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))'
                        }}
                      />
                      <Bar 
                        dataKey="avgConfidence" 
                        fill="hsl(var(--primary))" 
                        name="Confiança Média (%)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Source Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes por Fonte</CardTitle>
              <CardDescription>
                Percentual de uso e qualidade por fonte de enriquecimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.sourceDistribution.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma fonte de dados disponível ainda
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.sourceDistribution.map((source) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{source.source}</p>
                          <p className="text-sm text-muted-foreground">
                            {source.count} músicas • {source.percentage.toFixed(1)}% do total
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{source.avgConfidence.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">confiança média</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confidence Distribution */}
        <TabsContent value="confidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Confiança</CardTitle>
              <CardDescription>
                Quantidade de músicas por faixa de confiança
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.confidenceDistribution.every(d => d.count === 0) ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma música com score de confiança ainda
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.confidenceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      name="Quantidade"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Enrichments */}
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enriquecimentos Recentes</CardTitle>
              <CardDescription>
                Últimas 20 músicas processadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.recentEnrichments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum enriquecimento recente
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.recentEnrichments.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.artist} • {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.confidence}%</p>
                          <p className="text-xs text-muted-foreground">{item.source}</p>
                        </div>
                        {item.status === 'enriched' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
