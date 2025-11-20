import { useLexiconStats } from '@/hooks/useLexiconStats';
import { DictionaryStatusCard } from './DictionaryStatusCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LexiconStatusDashboardRefactored() {
  const { data: stats, isLoading, refetch, isRefetching } = useLexiconStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>Nenhuma estatística disponível</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Status dos Léxicos</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DictionaryStatusCard
          nome="Dialectal"
          status={stats.dialectal.volumeII === 0 ? 'critical' : stats.dialectal.confianca_media < 0.7 ? 'warning' : 'healthy'}
          metricas={{
            total: stats.dialectal.total,
            validados: stats.dialectal.validados,
            confianca: stats.dialectal.confianca_media,
          }}
        />

        <DictionaryStatusCard
          nome="Gutenberg"
          status={stats.gutenberg.total < 10000 ? 'critical' : stats.gutenberg.total < 500000 ? 'warning' : 'healthy'}
          metricas={{
            total: stats.gutenberg.total,
            validados: stats.gutenberg.validados,
            confianca: stats.gutenberg.confianca_media,
          }}
        />

        <DictionaryStatusCard
          nome="Houaiss"
          status="healthy"
          metricas={{
            total: stats.houaiss.total,
            validados: stats.houaiss.total,
            confianca: 1.0,
          }}
        />

        <DictionaryStatusCard
          nome="UNESP"
          status="healthy"
          metricas={{
            total: stats.unesp.total,
            validados: stats.unesp.total,
            confianca: 1.0,
          }}
        />
      </div>

      <Alert>
        <AlertDescription>
          <strong>Total geral:</strong> {stats.overall.total_entries.toLocaleString()} entradas | 
          <strong className="ml-2">Taxa de validação:</strong> {(stats.overall.validation_rate * 100).toFixed(1)}%
        </AlertDescription>
      </Alert>
    </div>
  );
}
