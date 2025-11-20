import { useLexiconStats } from '@/hooks/useLexiconStats';
import { DictionaryStatusCard } from './DictionaryStatusCard';
import { ClearDictionariesCard } from './ClearDictionariesCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, TrendingUp, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export function LexiconStatusDashboardRefactored() {
  const { data: stats, isLoading, refetch, isRefetching } = useLexiconStats();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats || !stats.gaucho || !stats.navarro || !stats.gutenberg || !stats.rochaPombo || !stats.overall) {
    return (
      <Alert>
        <AlertDescription>Nenhuma estatística disponível ou estrutura de dados incompleta</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Status dos Léxicos</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento em tempo real dos dicionários importados</p>
        </div>
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

      {/* ⚠️ CARD DE LIMPEZA - OPERAÇÃO CRÍTICA */}
      <ClearDictionariesCard stats={stats} onSuccess={refetch} />

      {/* ✅ FASE 5: Métricas Gerais Destacadas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Entradas</p>
                <p className="text-3xl font-bold">{stats.overall.total_entries.toLocaleString()}</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Validação</p>
                <p className="text-3xl font-bold">{(stats.overall.validation_rate * 100).toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última Importação</p>
                <p className="text-lg font-bold">
                  {stats.overall.last_import 
                    ? new Date(stats.overall.last_import).toLocaleDateString('pt-BR')
                    : 'N/A'
                  }
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Status por Dicionário (4 Dicionários)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <DictionaryStatusCard
            nome="Gaúcho Unificado"
            status={stats.gaucho.total === 0 ? 'empty' : stats.gaucho.confianca_media < 0.7 ? 'warning' : 'healthy'}
            metricas={{
              total: stats.gaucho.total,
              validados: stats.gaucho.validados,
              confianca: stats.gaucho.confianca_media,
            }}
            acoes={[
              {
                label: 'Validar',
                onClick: () => navigate('/admin/dictionary-validation/gaucho_unificado'),
                variant: 'default'
              }
            ]}
          />

          <DictionaryStatusCard
            nome="Navarro 2014"
            status={stats.navarro.total === 0 ? 'empty' : stats.navarro.confianca_media < 0.4 ? 'warning' : 'healthy'}
            metricas={{
              total: stats.navarro.total,
              validados: stats.navarro.validados,
              confianca: stats.navarro.confianca_media,
            }}
            acoes={[
              {
                label: 'Validar',
                onClick: () => navigate('/admin/navarro-validation'),
                variant: 'default'
              }
            ]}
          />

          <DictionaryStatusCard
            nome="Rocha Pombo (ABL)"
            status={stats.rochaPombo.total === 0 ? 'empty' : 'healthy'}
            metricas={{
              total: stats.rochaPombo.total,
              validados: stats.rochaPombo.total,
              confianca: 1.0,
            }}
            acoes={[
              {
                label: 'Validar',
                onClick: () => navigate('/admin/dictionary-validation/rocha_pombo'),
                variant: 'default'
              }
            ]}
          />

          <DictionaryStatusCard
            nome="Gutenberg"
            status={stats.gutenberg.total === 0 ? 'empty' : stats.gutenberg.total < 10000 ? 'critical' : stats.gutenberg.total < 500000 ? 'warning' : 'healthy'}
            metricas={{
              total: stats.gutenberg.total,
              validados: stats.gutenberg.validados,
              confianca: stats.gutenberg.confianca_media,
            }}
            acoes={[
              {
                label: 'Validar',
                onClick: () => navigate('/admin/dictionary-validation/gutenberg'),
                variant: 'default'
              }
            ]}
          />
          
        </div>
      </div>
    </div>
  );
}
