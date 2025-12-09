/**
 * Utilitários centralizados de gerenciamento de cache
 * Consolida localStorage, sessionStorage, e IndexedDB
 */

import { getCacheStats as getIndexedDBStats, cleanExpiredCache as cleanIndexedDBExpired, invalidateCache as clearIndexedDB } from './corpusIndexedDBCache';
import { cacheManager } from '@/utils/devops/cacheManager';
import { cacheMetrics } from './cacheMetrics';

// TTL padrão para entradas localStorage (24 horas)
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface LocalStorageStats {
  totalKeys: number;
  totalSizeBytes: number;
  cacheEntries: number;
  expiredEntries: number;
}

export interface ConsolidatedCacheStats {
  localStorage: LocalStorageStats;
  sessionStorage: {
    totalKeys: number;
    totalSizeBytes: number;
  };
  indexedDB: {
    entries: number;
    totalSizeBytes: number;
    compressionRatio: number;
  };
  memory: {
    entries: number;
  };
  quotaUsagePercent: number;
}

/**
 * Salva dados no localStorage com TTL
 */
export function saveToLocalStorageWithTTL<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  };
  localStorage.setItem(key, JSON.stringify(entry));
}

/**
 * Carrega dados do localStorage, retorna null se expirado
 */
export function loadFromLocalStorageWithTTL<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const entry = JSON.parse(raw) as CacheEntry<T>;
    
    // Verificar se tem estrutura de cache com TTL
    if (entry.timestamp && entry.ttl) {
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(key);
        return null;
      }
      return entry.data;
    }
    
    // Dados sem TTL, retornar diretamente
    return entry as unknown as T;
  } catch {
    return null;
  }
}

/**
 * Limpa entradas expiradas do localStorage
 * Retorna número de entradas removidas
 */
export function cleanExpiredLocalStorage(): number {
  const keys = Object.keys(localStorage);
  let cleaned = 0;
  
  // Keys que nunca devem ser removidas
  const protectedPrefixes = [
    'theme',
    'supabase',
    'sb-'
  ];
  
  keys.forEach(key => {
    // Pular keys protegidas
    if (protectedPrefixes.some(prefix => key.startsWith(prefix))) {
      return;
    }
    
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      
      const entry = JSON.parse(raw);
      
      // Verificar se é uma entrada de cache com TTL
      if (entry && typeof entry === 'object' && entry.timestamp && entry.ttl) {
        if (Date.now() - entry.timestamp > entry.ttl) {
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    } catch {
      // Não é JSON válido, provavelmente não é cache
    }
  });
  
  return cleaned;
}

/**
 * Obtém estatísticas do localStorage
 */
export function getLocalStorageStats(): LocalStorageStats {
  const keys = Object.keys(localStorage);
  let totalSize = 0;
  let cacheEntries = 0;
  let expiredEntries = 0;
  
  keys.forEach(key => {
    const value = localStorage.getItem(key) || '';
    totalSize += key.length + value.length;
    
    try {
      const entry = JSON.parse(value);
      if (entry && typeof entry === 'object' && entry.timestamp && entry.ttl) {
        cacheEntries++;
        if (Date.now() - entry.timestamp > entry.ttl) {
          expiredEntries++;
        }
      }
    } catch {
      // Não é entrada de cache
    }
  });
  
  return {
    totalKeys: keys.length,
    totalSizeBytes: totalSize * 2, // UTF-16 = 2 bytes per char
    cacheEntries,
    expiredEntries
  };
}

/**
 * Obtém estatísticas do sessionStorage
 */
export function getSessionStorageStats(): { totalKeys: number; totalSizeBytes: number } {
  const keys = Object.keys(sessionStorage);
  let totalSize = 0;
  
  keys.forEach(key => {
    const value = sessionStorage.getItem(key) || '';
    totalSize += key.length + value.length;
  });
  
  return {
    totalKeys: keys.length,
    totalSizeBytes: totalSize * 2
  };
}

/**
 * Obtém estatísticas consolidadas de todos os caches
 */
export async function getConsolidatedCacheStats(): Promise<ConsolidatedCacheStats> {
  // Buscar stats do IndexedDB
  const idbStats = await getIndexedDBStats();
  
  // Stats do localStorage
  const lsStats = getLocalStorageStats();
  
  // Stats do sessionStorage
  const ssStats = getSessionStorageStats();
  
  // Quota do navegador
  let quotaPercent = 0;
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    if (estimate.usage && estimate.quota) {
      quotaPercent = (estimate.usage / estimate.quota) * 100;
    }
  }
  
  // Memory cache entries
  const memoryEntries = cacheManager.size();
  
  return {
    localStorage: lsStats,
    sessionStorage: ssStats,
    indexedDB: {
      entries: idbStats.entries,
      totalSizeBytes: idbStats.totalSize,
      compressionRatio: idbStats.compressionRatio
    },
    memory: {
      entries: memoryEntries
    },
    quotaUsagePercent: quotaPercent
  };
}

/**
 * Limpa todos os caches expirados
 * Retorna total de entradas removidas
 */
export async function cleanAllExpiredCaches(): Promise<number> {
  let total = 0;
  
  // Limpar localStorage expirado
  total += cleanExpiredLocalStorage();
  
  // Limpar IndexedDB expirado
  total += await cleanIndexedDBExpired();
  
  return total;
}

/**
 * Limpa TODOS os caches (exceto auth)
 */
export async function clearAllCaches(): Promise<void> {
  // Limpar IndexedDB corpus cache
  await clearIndexedDB();
  
  // Limpar localStorage (mantendo auth)
  const protectedPrefixes = ['theme', 'supabase', 'sb-'];
  const keys = Object.keys(localStorage);
  
  keys.forEach(key => {
    if (!protectedPrefixes.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });
  
  // Limpar sessionStorage
  sessionStorage.clear();
  
  // Limpar memory cache
  cacheManager.clear();
  
  // Reset metrics
  cacheMetrics.reset();
}

/**
 * Formata bytes para exibição legível
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
