/**
 * Tab de Métricas do MusicCatalog
 * Sprint F2.1 - Refatoração
 * Sprint F4 - Loading States Padronizados
 */

import { Button } from '@/components/ui/button';
import { SectionLoading } from '@/components/ui/loading-spinner';
import { EnrichmentMetricsDashboard } from '@/components/music/EnrichmentMetricsDashboard';
import { RefreshCw } from 'lucide-react';

interface TabMetricsProps {
  metrics: any;
  loading: boolean;
  onRefresh: () => void;
  onExportReport: () => void;
}

export function TabMetrics({ metrics, loading, onRefresh, onExportReport }: TabMetricsProps) {
  if (loading) {
    return <SectionLoading text="Carregando métricas de qualidade..." />;
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma métrica disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Qualidade do Enriquecimento</h2>
          <p className="text-muted-foreground">Monitore a qualidade e eficácia do pipeline</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Métricas
        </Button>
      </div>
      <EnrichmentMetricsDashboard 
        metrics={metrics}
        onExportReport={onExportReport}
      />
    </div>
  );
}
