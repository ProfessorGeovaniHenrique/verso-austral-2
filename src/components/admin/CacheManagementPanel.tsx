/**
 * Painel de gerenciamento de cache persistente
 * Exibe estatísticas consolidadas e ações de limpeza
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { HardDrive, Trash, X, AlertTriangle, Database, Zap, CloudOff, RefreshCw } from 'lucide-react';
import { 
  getConsolidatedCacheStats, 
  cleanAllExpiredCaches, 
  clearAllCaches,
  formatBytes,
  type ConsolidatedCacheStats 
} from '@/lib/cacheUtils';
import { cacheMetrics } from '@/lib/cacheMetrics';
import { useToast } from '@/hooks/use-toast';

export function CacheManagementPanel() {
  const [stats, setStats] = useState<ConsolidatedCacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const loadStats = async () => {
    setIsLoading(true);
    try {
      const consolidatedStats = await getConsolidatedCacheStats();
      setStats(consolidatedStats);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadStats();
  }, []);
  
  const handleCleanExpired = async () => {
    setIsLoading(true);
    try {
      const removed = await cleanAllExpiredCaches();
      toast({
        title: 'Cache limpo',
        description: `${removed} ${removed === 1 ? 'entrada expirada removida' : 'entradas expiradas removidas'}`,
      });
      loadStats();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao limpar cache expirado',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearAll = async () => {
    if (!confirm('Tem certeza que deseja limpar todo o cache? Isso irá recarregar os dados na próxima visualização.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await clearAllCaches();
      toast({
        title: 'Cache limpo',
        description: 'Todo o cache foi removido com sucesso',
      });
      loadStats();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao limpar cache',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const metrics = cacheMetrics.getMetrics();
  const hitRate = cacheMetrics.getCacheHitRate();
  
  // Calcular tamanho total
  const totalSize = stats 
    ? stats.localStorage.totalSizeBytes + stats.sessionStorage.totalSizeBytes + stats.indexedDB.totalSizeBytes
    : 0;
  
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="w-5 h-5 text-primary" />
          Cache Persistente
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={loadStats}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alerta de quota baixa */}
        {stats && stats.quotaUsagePercent > 80 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Espaço de armazenamento baixo</AlertTitle>
            <AlertDescription>
              {stats.quotaUsagePercent.toFixed(1)}% do espaço usado. Considere limpar caches antigos.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Estatísticas principais */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">IndexedDB</p>
              <p className="text-xl font-bold text-foreground">
                {stats.indexedDB.entries} <span className="text-sm font-normal">entradas</span>
              </p>
              <p className="text-xs text-muted-foreground">{formatBytes(stats.indexedDB.totalSizeBytes)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">LocalStorage</p>
              <p className="text-xl font-bold text-foreground">
                {stats.localStorage.totalKeys} <span className="text-sm font-normal">chaves</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(stats.localStorage.totalSizeBytes)}
                {stats.localStorage.expiredEntries > 0 && (
                  <span className="text-warning ml-1">({stats.localStorage.expiredEntries} expiradas)</span>
                )}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tamanho Total</p>
              <p className="text-xl font-bold text-foreground">{formatBytes(totalSize)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {hitRate.toFixed(0)}%
              </p>
            </div>
          </div>
        )}
        
        {/* Métricas de performance */}
        <div className="border-t border-border/50 pt-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Performance</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Hits:</span>
              <span className="ml-2 font-medium text-foreground">{metrics.operations.hits}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Misses:</span>
              <span className="ml-2 font-medium text-foreground">{metrics.operations.misses}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Load:</span>
              <span className="ml-2 font-medium text-foreground">
                {metrics.performance.avgLoadTime.toFixed(0)}ms
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Quota:</span>
              <span className="ml-2 font-medium text-foreground">
                {stats?.quotaUsagePercent.toFixed(1) ?? 0}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Indicadores de fonte de cache */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="gap-1">
            <Zap className="w-3 h-3" />
            Memória ({stats?.memory.entries ?? 0})
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Database className="w-3 h-3" />
            IndexedDB
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CloudOff className="w-3 h-3" />
            Session ({stats?.sessionStorage.totalKeys ?? 0})
          </Badge>
        </div>
        
        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleCleanExpired} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <Trash className="w-4 h-4 mr-2" />
            Limpar Expirados
          </Button>
          <Button 
            onClick={handleClearAll} 
            variant="destructive" 
            size="sm"
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}