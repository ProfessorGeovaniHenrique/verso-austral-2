import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Activity
} from 'lucide-react';

interface LexiconMetrics {
  fonte: string;
  total: number;
  validados: number;
  confianca_media: number;
  campeiros?: number;
  platinismos?: number;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

export function LexiconStatusDashboard() {
  const [metrics, setMetrics] = useState<LexiconMetrics[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Dialectal metrics
      const { data: dialectalData, error: dialectalError } = await supabase
        .from('dialectal_lexicon')
        .select('*');

      if (dialectalError) throw dialectalError;

      const dialectalMetrics: LexiconMetrics = {
        fonte: 'dialectal',
        total: dialectalData?.length || 0,
        validados: dialectalData?.filter(d => d.validado_humanamente).length || 0,
        confianca_media: dialectalData?.reduce((acc, d) => acc + (d.confianca_extracao || 0), 0) / (dialectalData?.length || 1),
        campeiros: dialectalData?.filter(d => d.origem_regionalista?.includes('campeiro')).length || 0,
        platinismos: dialectalData?.filter(d => d.influencia_platina).length || 0,
      };

      // Gutenberg metrics
      const { data: gutenbergData, error: gutenbergError } = await supabase
        .from('gutenberg_lexicon')
        .select('*');

      if (gutenbergError) throw gutenbergError;

      const gutenbergMetrics: LexiconMetrics = {
        fonte: 'gutenberg',
        total: gutenbergData?.length || 0,
        validados: gutenbergData?.filter(g => g.validado).length || 0,
        confianca_media: gutenbergData?.reduce((acc, g) => acc + (g.confianca_extracao || 0), 0) / (gutenbergData?.length || 1),
      };

      const allMetrics = [dialectalMetrics, gutenbergMetrics];
      setMetrics(allMetrics);

      // Health checks
      const health: HealthStatus[] = [];

      // Check Dialectal Volume II
      const volumeII = dialectalData?.filter(d => d.volume_fonte === 'II') || [];
      if (volumeII.length === 0) {
        health.push({
          status: 'critical',
          message: 'Volume II do Dicionário Dialectal não tem verbetes. Importação falhou completamente.'
        });
      }

      // Check Gutenberg completion
      if ((gutenbergMetrics.total || 0) < 10000) {
        health.push({
          status: 'critical',
          message: `Gutenberg tem apenas ${gutenbergMetrics.total} verbetes. Esperado: ~700.000. Importação completa nunca foi executada.`
        });
      } else if ((gutenbergMetrics.total || 0) < 500000) {
        health.push({
          status: 'warning',
          message: `Gutenberg tem ${gutenbergMetrics.total} verbetes. Ainda faltam ~${700000 - (gutenbergMetrics.total || 0)} verbetes.`
        });
      }

      // Check average confidence
      if (dialectalMetrics.confianca_media < 0.70) {
        health.push({
          status: 'warning',
          message: `Confiança média do Dialectal está baixa: ${(dialectalMetrics.confianca_media * 100).toFixed(1)}%`
        });
      }

      if (health.length === 0) {
        health.push({
          status: 'healthy',
          message: 'Todos os sistemas lexicográficos estão operacionais.'
        });
      }

      setHealthStatus(health);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'warning': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/50';
      default: return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Activity className="h-6 w-6 animate-pulse text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando métricas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dialectal = metrics.find(m => m.fonte === 'dialectal');
  const gutenberg = metrics.find(m => m.fonte === 'gutenberg');

  return (
    <div className="space-y-6">
      {/* Health Status */}
      <div className="space-y-3">
        {healthStatus.map((health, idx) => (
          <Alert key={idx} className={getHealthColor(health.status)}>
            {health.status === 'healthy' && <CheckCircle2 className="h-4 w-4" />}
            {health.status === 'warning' && <AlertCircle className="h-4 w-4" />}
            {health.status === 'critical' && <AlertCircle className="h-4 w-4" />}
            <AlertTitle>
              {health.status === 'healthy' && 'Sistema Saudável'}
              {health.status === 'warning' && 'Atenção Necessária'}
              {health.status === 'critical' && 'Problema Crítico'}
            </AlertTitle>
            <AlertDescription>{health.message}</AlertDescription>
          </Alert>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Dialectal Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Dicionário Dialectal
              </CardTitle>
              <Badge variant="outline">{dialectal?.total || 0} verbetes</Badge>
            </div>
            <CardDescription>Volumes I e II - Regionalismo Gaúcho</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Validados Humanamente</span>
                <span className="text-sm font-medium">{dialectal?.validados || 0}</span>
              </div>
              <Progress value={((dialectal?.validados || 0) / (dialectal?.total || 1)) * 100} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Confiança Média</span>
                <Badge variant="secondary">
                  {((dialectal?.confianca_media || 0) * 100).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={(dialectal?.confianca_media || 0) * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Campeiros</p>
                <p className="text-2xl font-bold">{dialectal?.campeiros || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Platinismos</p>
                <p className="text-2xl font-bold">{dialectal?.platinismos || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gutenberg Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Dicionário Gutenberg
              </CardTitle>
              <Badge variant="outline">{gutenberg?.total.toLocaleString() || 0} verbetes</Badge>
            </div>
            <CardDescription>Português Brasileiro Completo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progresso de Importação</span>
                <span className="text-sm font-medium">
                  {((gutenberg?.total || 0) / 700000 * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={((gutenberg?.total || 0) / 700000) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Meta: 700.000 verbetes
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Confiança Média</span>
                <Badge variant="secondary">
                  {((gutenberg?.confianca_media || 0) * 100).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={(gutenberg?.confianca_media || 0) * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Validados</p>
                <p className="text-2xl font-bold">{gutenberg?.validados || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">
                  {(gutenberg?.total || 0) - (gutenberg?.validados || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Estatísticas Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Verbetes</p>
              <p className="text-3xl font-bold">
                {((dialectal?.total || 0) + (gutenberg?.total || 0)).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Taxa de Validação</p>
              <p className="text-3xl font-bold">
                {(((dialectal?.validados || 0) + (gutenberg?.validados || 0)) / 
                  ((dialectal?.total || 1) + (gutenberg?.total || 1)) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Confiança Média Geral</p>
              <p className="text-3xl font-bold">
                {(((dialectal?.confianca_media || 0) + (gutenberg?.confianca_media || 0)) / 2 * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
