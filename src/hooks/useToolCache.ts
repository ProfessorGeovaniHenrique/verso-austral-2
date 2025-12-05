/**
 * 🔧 USE TOOL CACHE HOOK
 * 
 * Hook para gerenciar cache de ferramenta específica
 * Fornece acesso ao cache, validação e funções de salvamento
 */

import { useCallback, useMemo } from 'react';
import { useAnalysisTools, ToolKey, ToolCacheEntry, ToolsCache } from '@/contexts/AnalysisToolsContext';

interface UseToolCacheResult<T> {
  /** Dados em cache (null se não existir ou estiver stale) */
  cachedData: T | null;
  /** Se existe cache válido */
  hasCachedData: boolean;
  /** Se o cache está marcado como stale */
  isStale: boolean;
  /** Timestamp do cache */
  cacheTimestamp: number | null;
  /** Salvar dados no cache */
  saveToCache: (data: T) => void;
  /** Limpar cache desta ferramenta */
  clearCache: () => void;
  /** Marcar cache como stale */
  markAsStale: () => void;
}

export function useToolCache<T>(toolKey: ToolKey): UseToolCacheResult<T> {
  const { 
    toolsCache, 
    setToolCache, 
    invalidateToolCache,
    currentCorpusHash 
  } = useAnalysisTools();
  
  const cache = toolsCache[toolKey] as ToolCacheEntry<T> | null;
  
  // Cache é válido se existe, tem o mesmo hash de corpus, não está stale e tem dados não-vazios
  const isValid = useMemo(() => {
    if (!cache) return false;
    if (cache.isStale) return false;
    if (cache.corpusHash !== currentCorpusHash) return false;
    
    // R-1.3: Verificar se dados não são vazios (específico para SyntacticProfile)
    const data = cache.data as Record<string, unknown> | null;
    if (data && typeof data === 'object') {
      // Detecta SyntacticProfile com dados zerados
      if ('averageSentenceLength' in data && 'posDistribution' in data) {
        const avgLength = data.averageSentenceLength as number;
        const posDistribution = data.posDistribution as Record<string, number>;
        if (avgLength === 0 && Object.keys(posDistribution).length === 0) {
          console.warn('[useToolCache] Cache com dados vazios detectado, invalidando');
          return false;
        }
      }
    }
    
    return true;
  }, [cache, currentCorpusHash]);
  
  const saveToCache = useCallback((data: T) => {
    const entry: ToolCacheEntry<T> = {
      data,
      corpusHash: currentCorpusHash,
      timestamp: Date.now(),
      isStale: false
    };
    setToolCache(toolKey, entry as ToolCacheEntry<ToolsCache[typeof toolKey] extends ToolCacheEntry<infer U> | null ? U : unknown>);
  }, [toolKey, currentCorpusHash, setToolCache]);
  
  const clearCache = useCallback(() => {
    setToolCache(toolKey, null);
  }, [toolKey, setToolCache]);
  
  const markAsStale = useCallback(() => {
    invalidateToolCache(toolKey);
  }, [toolKey, invalidateToolCache]);
  
  return {
    cachedData: isValid ? cache!.data : null,
    hasCachedData: isValid,
    isStale: cache?.isStale ?? false,
    cacheTimestamp: cache?.timestamp ?? null,
    saveToCache,
    clearCache,
    markAsStale
  };
}
