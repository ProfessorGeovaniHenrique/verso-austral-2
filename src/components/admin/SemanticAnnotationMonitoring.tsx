import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp, Database, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const logger = createLogger('SemanticAnnotationMonitoring');

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  hitRate: number;
  bySource: Record<string, number>;
}

export function SemanticAnnotationMonitoring() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCacheStats();
    
    // Refresh a cada 30s
    const interval = setInterval(fetchCacheStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCacheStats = async () => {
    try {
      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .select('fonte, hits_count');

      if (error) throw error;

      const totalEntries = data?.length || 0;
      const totalHits = data?.reduce((sum, entry) => sum + (entry.hits_count || 0), 0) || 0;
      const bySource = data?.reduce((acc, entry) => {
        acc[entry.fonte] = (acc[entry.fonte] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setCacheStats({
        totalEntries,
        totalHits,
        hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
        bySource,
      });

      logger.info('Cache stats atualizados', { totalEntries, totalHits });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Erro ao buscar cache stats', errorObj);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-background/50 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Carregando Monitoramento...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!cacheStats) return null;

  const hitRatePercent = Math.round(cacheStats.hitRate * 100);

  return (
    <Card className="bg-background/50 backdrop-blur border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Monitoramento: Anotação Semântica
        </CardTitle>
        <CardDescription>
          Cache inteligente dual-layer (Domínios Semânticos + Insígnias Culturais)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cache Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Database className="w-4 h-4" />
                Entradas no Cache
              </span>
              <span className="text-2xl font-bold">{cacheStats.totalEntries.toLocaleString()}</span>
            </div>
            <Progress value={Math.min((cacheStats.totalEntries / 1000) * 100, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Capacidade: {Math.round((cacheStats.totalEntries / 10000) * 100)}% (máx: 10k)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total de Hits
              </span>
              <span className="text-2xl font-bold">{cacheStats.totalHits.toLocaleString()}</span>
            </div>
            <Progress value={hitRatePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Hit Rate: {hitRatePercent}% (economia de ~70% em API calls)
            </p>
          </div>
        </div>

        {/* Fonte Distribution */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Distribuição por Fonte
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(cacheStats.bySource).map(([fonte, count]) => {
              const percentage = Math.round((count / cacheStats.totalEntries) * 100);
              const sourceLabels: Record<string, { label: string; color: string }> = {
                'cache': { label: '💾 Cache', color: 'bg-green-500' },
                'gemini_flash': { label: '🤖 Gemini Flash', color: 'bg-blue-500' },
                'rule_based': { label: '📏 Regras', color: 'bg-purple-500' },
                'manual': { label: '✏️ Manual', color: 'bg-orange-500' },
              };

              const { label, color } = sourceLabels[fonte] || { label: fonte, color: 'bg-gray-500' };

              return (
                <div key={fonte} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="text-sm">{label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">{percentage}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cache Performance Indicator */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div>
            <p className="text-sm font-semibold">Performance do Cache</p>
            <p className="text-xs text-muted-foreground">
              {hitRatePercent >= 70 ? '🟢 Excelente' : hitRatePercent >= 50 ? '🟡 Bom' : '🔴 Baixo'}
            </p>
          </div>
          <Badge variant={hitRatePercent >= 70 ? 'default' : 'secondary'} className="text-lg">
            {hitRatePercent}%
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={fetchCacheStats}
            className="flex-1 px-4 py-2 text-sm bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            🔄 Atualizar Stats
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
