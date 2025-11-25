/**
 * 📊 GEMINI POS MONITORING DASHBOARD
 * 
 * Monitora uso da API Gemini Flash para anotação POS
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, TrendingUp, Database, DollarSign, Clock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface GeminiAPIUsage {
  id: string;
  tokens_annotated: number;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cached_hits: number;
  latency_ms: number;
  created_at: string;
}

interface CacheStats {
  totalEntries: number;
  avgHits: number;
  cacheHitRate: number;
}

export const GeminiPOSMonitoring = () => {
  const [apiUsage, setApiUsage] = useState<GeminiAPIUsage[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Buscar últimas 20 chamadas de API
      const { data: usage } = await supabase
        .from('gemini_pos_api_usage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (usage) setApiUsage(usage);

      // Buscar estatísticas do cache
      const { data: cache } = await supabase
        .from('gemini_pos_cache')
        .select('hits_count');

      if (cache) {
        const totalEntries = cache.length;
        const totalHits = cache.reduce((sum, c) => sum + (c.hits_count || 0), 0);
        const avgHits = totalEntries > 0 ? totalHits / totalEntries : 0;
        
        // Cache hit rate (hits / (hits + API calls))
        const totalAPICalls = usage?.reduce((sum, u) => sum + (u.tokens_annotated || 0), 0) || 0;
        const cacheHitRate = totalHits + totalAPICalls > 0 
          ? (totalHits / (totalHits + totalAPICalls)) * 100 
          : 0;

        setCacheStats({
          totalEntries,
          avgHits,
          cacheHitRate
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalTokensAnnotated = apiUsage.reduce((sum, u) => sum + (u.tokens_annotated || 0), 0);
    const totalCost = apiUsage.reduce((sum, u) => sum + (u.cost_usd || 0), 0);
    const totalCachedHits = apiUsage.reduce((sum, u) => sum + (u.cached_hits || 0), 0);
    const avgLatency = apiUsage.length > 0 
      ? apiUsage.reduce((sum, u) => sum + (u.latency_ms || 0), 0) / apiUsage.length 
      : 0;

    return { totalTokensAnnotated, totalCost, totalCachedHits, avgLatency };
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Carregando métricas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          Layer 3 (Gemini Flash) - Monitoramento
        </h2>
        <p className="text-muted-foreground">
          Estatísticas de uso da API Gemini para anotação POS
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tokens Anotados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalTokensAnnotated}</div>
            <p className="text-xs text-muted-foreground">
              Via Gemini Flash
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hits
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totals.totalCachedHits}</div>
            <p className="text-xs text-muted-foreground">
              Economia de API calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Custo Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Gemini Flash API
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Latência Média
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totals.avgLatency)}ms</div>
            <p className="text-xs text-muted-foreground">
              Layer 3 processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cache Performance */}
      {cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Performance do Cache
            </CardTitle>
            <CardDescription>
              Eficiência do sistema de cache inteligente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de Cache Hit:</span>
                <span className="font-bold text-green-600">
                  {cacheStats.cacheHitRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={cacheStats.cacheHitRate} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Entradas no Cache:</div>
                <div className="text-2xl font-bold">{cacheStats.totalEntries}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Média de Hits/Entrada:</div>
                <div className="text-2xl font-bold">{cacheStats.avgHits.toFixed(1)}</div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Cache hit rate &gt; 60% = economia significativa de custos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent API Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Chamadas (Últimas 20)</CardTitle>
          <CardDescription>
            Detalhamento das requisições à API Gemini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {apiUsage.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma chamada à API Gemini ainda
              </p>
            ) : (
              apiUsage.map((usage) => (
                <div 
                  key={usage.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="w-3 h-3" />
                        {usage.tokens_annotated} tokens
                      </Badge>
                      {usage.cached_hits > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Zap className="w-3 h-3 text-yellow-500" />
                          {usage.cached_hits} cache
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(usage.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-mono text-sm font-semibold">
                      ${usage.cost_usd.toFixed(6)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {usage.latency_ms}ms
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
