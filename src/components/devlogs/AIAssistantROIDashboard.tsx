/**
 * Dashboard de ROI do AI Assistant
 * Sprint 2 - Métricas de ROI Reais
 */

import { useAIAssistantROI } from '@/hooks/useAIAssistantROI';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SectionLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, DollarSign, CheckCircle, 
  XCircle, Clock, BarChart3, RefreshCw, AlertTriangle,
  Zap, Bug, Shield
} from 'lucide-react';

export function AIAssistantROIDashboard() {
  const { data: metrics, isLoading, refetch, isRefetching } = useAIAssistantROI();

  if (isLoading) {
    return <SectionLoading text="Carregando métricas de ROI..." />;
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhuma métrica disponível</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const netSavings = metrics.totalActualSavings - metrics.totalEstimatedSavings;
  const isPositiveROI = netSavings >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">ROI do Assistente de Análise</h2>
          <p className="text-muted-foreground">Métricas reais de economia e eficiência</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Main ROI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={isPositiveROI ? 'border-green-500/50' : 'border-red-500/50'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isPositiveROI ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              ROI Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isPositiveROI ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.roi.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {isPositiveROI ? 'Economia positiva' : 'Investimento em progresso'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Créditos Economizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalActualSavings}</div>
            <p className="text-xs text-muted-foreground">
              Estimado: {metrics.totalEstimatedSavings}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Taxa de Resolução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.resolutionRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalIssuesResolved}/{metrics.totalIssuesFound} resolvidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Total de Análises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalIssuesFound} problemas encontrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Status de Resolução
          </CardTitle>
          <CardDescription>Distribuição de issues por status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold text-green-600">{metrics.totalIssuesResolved}</div>
              <p className="text-sm text-muted-foreground">Resolvidos</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <XCircle className="h-6 w-6 mx-auto text-red-500 mb-2" />
              <div className="text-2xl font-bold text-red-600">{metrics.totalIssuesDismissed}</div>
              <p className="text-sm text-muted-foreground">Descartados</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Clock className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
              <div className="text-2xl font-bold text-yellow-600">
                {metrics.totalIssuesFound - metrics.totalIssuesResolved - metrics.totalIssuesDismissed}
              </div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* By Category */}
      {metrics.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Por Categoria</CardTitle>
            <CardDescription>Distribuição de issues por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.byCategory.map(cat => {
                const Icon = getCategoryIcon(cat.category);
                const resolvedPercent = cat.count > 0 ? (cat.resolved / cat.count) * 100 : 0;
                
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground w-8" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{cat.category}</span>
                        <span className="text-muted-foreground">
                          {cat.resolved}/{cat.count} resolvidos
                        </span>
                      </div>
                      <Progress value={resolvedPercent} className="h-2" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {cat.avgConfidence.toFixed(0)}% conf.
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Severity */}
      {metrics.bySeverity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Por Severidade</CardTitle>
            <CardDescription>Issues por nível de criticidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {['critical', 'high', 'medium', 'low'].map(severity => {
                const data = metrics.bySeverity.find(s => s.severity === severity) || { count: 0, resolved: 0 };
                const color = getSeverityColor(severity);
                
                return (
                  <div key={severity} className={`p-3 rounded-lg border ${color.border} ${color.bg}`}>
                    <div className="text-sm font-medium capitalize mb-1">{severity}</div>
                    <div className={`text-xl font-bold ${color.text}`}>{data.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {data.resolved} resolvidos
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Trend */}
      {metrics.weeklyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendência Semanal</CardTitle>
            <CardDescription>Atividade dos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {metrics.weeklyTrend.map((day, idx) => {
                const maxAnalyses = Math.max(...metrics.weeklyTrend.map(d => d.analyses), 1);
                const height = (day.analyses / maxAnalyses) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-primary/20 rounded-t relative group cursor-pointer"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.analyses} análises, ${day.resolved} resolvidos, ${day.savings} créditos`}
                    >
                      {day.resolved > 0 && (
                        <div 
                          className="absolute bottom-0 w-full bg-green-500 rounded-t"
                          style={{ height: `${(day.resolved / Math.max(day.analyses, 1)) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary/20" />
                <span>Análises</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Resolvidos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Analyses */}
      {metrics.recentAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análises Recentes</CardTitle>
            <CardDescription>Últimas 5 análises realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.recentAnalyses.map(analysis => (
                <div 
                  key={analysis.id} 
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getLogsTypeIcon(analysis.logsType)}
                    <div>
                      <p className="font-medium capitalize">{analysis.logsType}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(analysis.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="outline">{analysis.totalIssues} issues</Badge>
                    {analysis.bugsResolved > 0 && (
                      <Badge variant="default" className="bg-green-500">
                        {analysis.bugsResolved} resolvidos
                      </Badge>
                    )}
                    {analysis.actualSavings > 0 && (
                      <span className="text-green-600 font-medium">
                        +{analysis.actualSavings} créditos
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper functions
function getCategoryIcon(category: string) {
  switch (category) {
    case 'security': return Shield;
    case 'performance': return Zap;
    case 'bugfix': return Bug;
    default: return AlertTriangle;
  }
}

function getLogsTypeIcon(logsType: string) {
  switch (logsType) {
    case 'audit': return <Shield className="h-4 w-4 text-blue-500" />;
    case 'performance': return <Zap className="h-4 w-4 text-yellow-500" />;
    case 'errors': return <Bug className="h-4 w-4 text-red-500" />;
    default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-600' };
    case 'high': return { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-600' };
    case 'medium': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-600' };
    default: return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600' };
  }
}
