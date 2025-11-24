import { useState } from "react";
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('DevOpsMetrics');
import { WorkflowStatusCard } from "@/components/devops/WorkflowStatusCard";
import { TestHistoryChart } from "@/components/devops/TestHistoryChart";
import { CoverageChart } from "@/components/devops/CoverageChart";
import { CorpusMetricsCard } from "@/components/devops/CorpusMetricsCard";
import { ReleasesTimeline } from "@/components/devops/ReleasesTimeline";
import { AlertsPanel } from "@/components/devops/AlertsPanel";
import { RefreshButton } from "@/components/devops/RefreshButton";
import { ExportMenu } from "@/components/devops/ExportMenu";
import { DashboardSettings } from "@/components/devops/DashboardSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDevOpsMetrics } from "@/hooks/useDevOpsMetrics";
import { DashboardConfig } from "@/types/devops.types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_CONFIG: DashboardConfig = {
  autoRefreshInterval: 30000,
  thresholds: {
    minCoverage: 80,
    maxCITime: 300,
  },
  visibleSections: {
    workflows: true,
    testHistory: true,
    coverage: true,
    corpus: true,
    releases: true,
  },
  chartColors: 'default',
};

export default function DevOpsMetrics() {
  const [config, setConfig] = useState<DashboardConfig>(() => {
    const saved = localStorage.getItem('devops_dashboard_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const { metrics, isLoading, error, lastUpdate, refresh } = useDevOpsMetrics(
    undefined,
    config.autoRefreshInterval
  );

  const handleDismissAlert = (alertId: string) => {
    log.info('Dismiss alert', { alertId });
  };

  const handleMarkAsRead = (alertId: string) => {
    log.info('Mark alert as read', { alertId });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao Carregar Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <RefreshButton onRefresh={refresh} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !metrics) {
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

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">DevOps Metrics</h1>
            <p className="text-muted-foreground">
              Dashboard de métricas de CI/CD, testes e qualidade
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Última atualização: {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
            </Badge>
            <RefreshButton onRefresh={refresh} isLoading={isLoading} />
            <ExportMenu metrics={metrics} />
            <DashboardSettings config={config} onChange={setConfig} />
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      {metrics.alerts.length > 0 && (
        <AlertsPanel
          alerts={metrics.alerts}
          onDismiss={handleDismissAlert}
          onMarkAsRead={handleMarkAsRead}
        />
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Taxa de Sucesso</CardDescription>
            <CardTitle className={`text-3xl ${metrics.summary.successRate === 100 ? 'text-green-500' : 'text-yellow-500'}`}>
              {metrics.summary.successRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {metrics.summary.successRate === 100 ? 'Todos os workflows passaram' : 'Alguns workflows falharam'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cobertura de Testes</CardDescription>
            <CardTitle className="text-3xl text-primary">{metrics.summary.totalCoverage}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {metrics.testHistory[metrics.testHistory.length - 1]?.passed} de{' '}
              {metrics.testHistory[metrics.testHistory.length - 1]?.total} testes passando
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tempo Médio CI</CardDescription>
            <CardTitle className="text-3xl">{metrics.summary.averageCITime}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Tempo médio de execução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Última Release</CardDescription>
            <CardTitle className="text-3xl">{metrics.summary.latestVersion}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {metrics.releases[0]?.date}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workflow Status */}
        {config.visibleSections.workflows && (
          <WorkflowStatusCard workflows={metrics.workflows} />
        )}

        {/* Corpus Metrics */}
        {config.visibleSections.corpus && (
          <CorpusMetricsCard metrics={metrics.corpusMetrics} />
        )}

        {/* Test History Chart */}
        {config.visibleSections.testHistory && (
          <div className="lg:col-span-2">
            <TestHistoryChart data={metrics.testHistory} />
          </div>
        )}

        {/* Coverage Chart */}
        {config.visibleSections.coverage && (
          <CoverageChart data={metrics.coverageData} totalCoverage={metrics.summary.totalCoverage} />
        )}

        {/* Releases Timeline */}
        {config.visibleSections.releases && (
          <ReleasesTimeline releases={metrics.releases} />
        )}
      </div>
    </div>
  );
}
