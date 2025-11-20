/**
 * FASE 1 - Sistema de Limpeza Profunda de Caches
 * Limpa todos os caches do sistema para garantir fresh start
 */

import { cacheManager } from './devops/cacheManager';

export interface CacheCleanupResult {
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  memoryCache: boolean;
  reactQuery: boolean;
  serviceWorker: boolean;
  errors: string[];
}

/**
 * Limpa todos os bancos IndexedDB relacionados ao corpus
 */
async function clearIndexedDB(): Promise<boolean> {
  try {
    const databases = await indexedDB.databases();
    
    for (const db of databases) {
      if (db.name?.includes('corpus') || db.name?.includes('cache')) {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error(`Failed to delete ${db.name}`));
          request.onblocked = () => {
            console.warn(`Database ${db.name} deletion blocked`);
            resolve(); // Continue anyway
          };
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('IndexedDB cleanup error:', error);
    return false;
  }
}

/**
 * Limpa localStorage mantendo apenas dados essenciais
 */
function clearLocalStorage(): boolean {
  try {
    const keysToKeep = [
      'theme',
      'supabase.auth.token',
      'sb-kywmhuubbsvclkorxrse-auth-token'
    ];
    
    const allKeys = Object.keys(localStorage);
    
    for (const key of allKeys) {
      if (!keysToKeep.some(keep => key.includes(keep))) {
        localStorage.removeItem(key);
      }
    }
    
    return true;
  } catch (error) {
    console.error('LocalStorage cleanup error:', error);
    return false;
  }
}

/**
 * Limpa sessionStorage completamente
 */
function clearSessionStorage(): boolean {
  try {
    sessionStorage.clear();
    return true;
  } catch (error) {
    console.error('SessionStorage cleanup error:', error);
    return false;
  }
}

/**
 * Limpa cache de memória do DevOps
 */
function clearMemoryCache(): boolean {
  try {
    cacheManager.clear();
    return true;
  } catch (error) {
    console.error('Memory cache cleanup error:', error);
    return false;
  }
}

/**
 * Limpa cache do Service Worker
 */
async function clearServiceWorkerCache(): Promise<boolean> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }
    return true;
  } catch (error) {
    console.error('Service Worker cache cleanup error:', error);
    return false;
  }
}

/**
 * Limpa TODOS os caches do sistema
 * Retorna resultado detalhado da limpeza
 */
export async function deepCleanAllCaches(): Promise<CacheCleanupResult> {
  const result: CacheCleanupResult = {
    indexedDB: false,
    localStorage: false,
    sessionStorage: false,
    memoryCache: false,
    reactQuery: true, // Será limpo pela aplicação via queryClient.clear()
    serviceWorker: false,
    errors: []
  };
  
  try {
    // Executar limpezas em paralelo onde possível
    const [idbResult, swResult] = await Promise.all([
      clearIndexedDB().catch(err => {
        result.errors.push(`IndexedDB: ${err.message}`);
        return false;
      }),
      clearServiceWorkerCache().catch(err => {
        result.errors.push(`Service Worker: ${err.message}`);
        return false;
      })
    ]);
    
    result.indexedDB = idbResult;
    result.serviceWorker = swResult;
    
    // Limpezas síncronas
    result.localStorage = clearLocalStorage();
    result.sessionStorage = clearSessionStorage();
    result.memoryCache = clearMemoryCache();
    
  } catch (error: any) {
    result.errors.push(`Erro geral: ${error.message}`);
  }
  
  return result;
}

/**
 * Retorna estatísticas de uso de cache
 */
export async function getCacheStats() {
  const stats = {
    indexedDBs: 0,
    localStorageKeys: 0,
    sessionStorageKeys: 0,
    serviceWorkerCaches: 0
  };
  
  try {
    const databases = await indexedDB.databases();
    stats.indexedDBs = databases.length;
    
    stats.localStorageKeys = Object.keys(localStorage).length;
    stats.sessionStorageKeys = Object.keys(sessionStorage).length;
    
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      stats.serviceWorkerCaches = cacheNames.length;
    }
  } catch (error) {
    console.error('Error getting cache stats:', error);
  }
  
  return stats;
}
