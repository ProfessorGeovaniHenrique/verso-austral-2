import { useLexiconStats } from '@/hooks/useLexiconStats';
import { DictionaryStatusCard } from './DictionaryStatusCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, TrendingUp, Database, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

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
        <h3 className="text-lg font-semibold">Status por Dicionário</h3>
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
          nome="Rocha Pombo (ABL)"
          status="healthy"
          metricas={{
            total: stats.rochaPombo.total,
            validados: stats.rochaPombo.total,
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
      </div>

      {/* ✅ Card Especial: Validação Navarro 2014 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Validação Humana: Navarro 2014
          </CardTitle>
          <CardDescription>
            Valide manualmente os verbetes do dicionário Nordestino para aumentar a precisão
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Taxa atual de validação: <strong>0.17%</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              1.717 verbetes disponíveis para validação
            </p>
          </div>
          <Link to="/admin/navarro-validation">
            <Button className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Validar Verbetes
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
