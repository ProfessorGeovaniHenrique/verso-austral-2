/**
 * Sistema de cache persistente com IndexedDB
 * Inclui: locks, retry logic, compressão assíncrona, validações
 */
import { openDB, IDBPDatabase } from 'idb';
import CryptoJS from 'crypto-js';
import { CorpusCompleto } from '@/data/types/full-text-corpus.types';
import { CorpusType } from '@/data/types/corpus-tools.types';
import { retryWithBackoff, shouldRetryNetworkError } from './retryUtils';
import { cacheMetrics } from './cacheMetrics';
import { broadcastCacheUpdate } from './cacheSync';

const DB_NAME = 'corpus-cache-db';
const DB_VERSION = 1;
const STORE_NAME = 'corpus-entries';

// TTLs
const FULL_CORPUS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias
const FILTERED_CORPUS_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Limites
const MAX_CACHE_ENTRY_SIZE = 50 * 1024 * 1024; // 50MB
const MIN_COMPRESSION_SIZE = 50 * 1024; // 50KB

export interface CorpusFilters {
  artistas?: string[];
  albuns?: string[];
  anoInicio?: number;
  anoFim?: number;
}

interface CorpusCacheEntry {
  version: string;
  compressedData: string;
  isCompressed: boolean;
  metadata: {
    tipo: CorpusType;
    filters?: CorpusFilters;
    cachedAt: number;
    expiresAt: number;
    sizeBytes: number;
    originalSizeBytes: number;
    compressionRatio: number;
  };
}

// Lock mechanism
const activeLocks = new Set<string>();

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let attempts = 0;
  while (activeLocks.has(key)) {
    await sleep(50);
    attempts++;
    if (attempts > 100) { // 5 segundos max
      throw new Error(`Lock timeout for key: ${key}`);
    }
  }
  
  activeLocks.add(key);
  try {
    return await fn();
  } finally {
    activeLocks.delete(key);
  }
}

// IndexedDB setup
let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('tipo', 'metadata.tipo');
        store.createIndex('expiresAt', 'metadata.expiresAt');
      }
    }
  });
  
  return dbInstance;
}

// Compressão assíncrona com Web Worker
let compressionWorker: Worker | null = null;

function getCompressionWorker(): Worker {
  if (!compressionWorker) {
    compressionWorker = new Worker(
      new URL('../workers/compressionWorker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return compressionWorker;
}

async function compressAsync(data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = getCompressionWorker();
    const id = `compress-${Date.now()}-${Math.random()}`;
    
    const timeout = setTimeout(() => {
      reject(new Error('Compression timeout'));
    }, 120000); // 120s timeout (aumentado de 30s para evitar timeouts em corpus grandes)
    
    const handler = (e: MessageEvent) => {
      if (e.data.id === id) {
        clearTimeout(timeout);
        worker.removeEventListener('message', handler);
        
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
      }
    };
    
    worker.addEventListener('message', handler);
    worker.postMessage({ action: 'compress', data, id });
  });
}

async function decompressAsync(data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = getCompressionWorker();
    const id = `decompress-${Date.now()}-${Math.random()}`;
    
    const timeout = setTimeout(() => {
      reject(new Error('Decompression timeout'));
    }, 120000); // 120s timeout (aumentado de 30s para evitar timeouts em corpus grandes)
    
    const handler = (e: MessageEvent) => {
      if (e.data.id === id) {
        clearTimeout(timeout);
        worker.removeEventListener('message', handler);
        
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
      }
    };
    
    worker.addEventListener('message', handler);
    worker.postMessage({ action: 'decompress', data, id });
  });
}

// Hash criptográfico
export function generateCorpusVersion(corpus: CorpusCompleto): string {
  const contentString = corpus.musicas
    .slice(0, 10)
    .map(m => `${m.metadata.artista}:${m.metadata.musica}:${m.palavras.length}`)
    .join('|');
  
  const hash = CryptoJS.SHA256(contentString).toString();
  return `v${hash.substring(0, 12)}`;
}

// Chave de cache segura
export function generateSafeFilterKey(filters?: CorpusFilters): string {
  if (!filters) return 'none';
  
  const sorted = {
    artistas: filters.artistas?.sort() || [],
    albuns: filters.albuns?.sort() || [],
    anoInicio: filters.anoInicio || null,
    anoFim: filters.anoFim || null
  };
  
  return CryptoJS.MD5(JSON.stringify(sorted)).toString().substring(0, 8);
}

export function generateCacheKey(tipo: CorpusType, filters?: CorpusFilters): string {
  const filterKey = generateSafeFilterKey(filters);
  return `${tipo}-${filterKey}`;
}

// Validação de integridade
export function validateCorpusIntegrity(corpus: any): corpus is CorpusCompleto {
  try {
    return (
      corpus &&
      typeof corpus === 'object' &&
      Array.isArray(corpus.musicas) &&
      corpus.musicas.length > 0 &&
      typeof corpus.totalMusicas === 'number' &&
      typeof corpus.totalPalavras === 'number' &&
      corpus.totalMusicas === corpus.musicas.length &&
      corpus.musicas.every(m => 
        m.metadata && 
        typeof m.metadata.artista === 'string' &&
        typeof m.metadata.musica === 'string' &&
        typeof m.letra === 'string' &&
        Array.isArray(m.palavras) &&
        m.palavras.length > 0
      )
    );
  } catch {
    return false;
  }
}

// Quota management
async function ensureQuotaAvailable(requiredBytes: number): Promise<void> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return;
  }
  
  try {
    const estimate = await navigator.storage.estimate();
    const available = (estimate.quota || 0) - (estimate.usage || 0);
    
    if (available < requiredBytes * 1.5) {
      console.warn(`⚠️ Quota baixa: ${(available / 1024 / 1024).toFixed(1)}MB disponível`);
      
      const cleaned = await cleanExpiredCache();
      console.log(`🗑️ Limpeza liberou ${cleaned} entradas`);
      
      // Se ainda insuficiente, remover mais antigos
      const estimateAfter = await navigator.storage.estimate();
      const availableAfter = (estimateAfter.quota || 0) - (estimateAfter.usage || 0);
      
      if (availableAfter < requiredBytes * 1.5) {
        await removeOldestCache();
      }
    }
  } catch (error) {
    console.warn('⚠️ Falha ao verificar quota:', error);
  }
}

// Salvar no cache
export async function saveCorpusToCache(
  tipo: CorpusType,
  corpus: CorpusCompleto,
  filters?: CorpusFilters
): Promise<void> {
  const key = generateCacheKey(tipo, filters);
  
  return withLock(key, async () => {
    const startTime = performance.now();
    
    try {
      const jsonStr = JSON.stringify(corpus);
      const originalSize = new Blob([jsonStr]).size;
      
      // Verificar limite de tamanho
      if (originalSize > MAX_CACHE_ENTRY_SIZE) {
        throw new Error(`Corpus muito grande: ${(originalSize / 1024 / 1024).toFixed(1)}MB`);
      }
      
      // Garantir quota disponível
      await ensureQuotaAvailable(originalSize);
      
      // Comprimir se > 50KB
      let dataToStore = jsonStr;
      let isCompressed = false;
      let compressionTime = 0;
      
      if (originalSize > MIN_COMPRESSION_SIZE) {
        const compStart = performance.now();
        dataToStore = await compressAsync(jsonStr);
        compressionTime = performance.now() - compStart;
        isCompressed = true;
        cacheMetrics.recordCompressionTime(compressionTime);
      }
      
      const compressedSize = new Blob([dataToStore]).size;
      const compressionRatio = compressedSize / originalSize;
      
      const ttl = filters ? FILTERED_CORPUS_TTL : FULL_CORPUS_TTL;
      
      const entry: CorpusCacheEntry = {
        version: generateCorpusVersion(corpus),
        compressedData: dataToStore,
        isCompressed,
        metadata: {
          tipo,
          filters,
          cachedAt: Date.now(),
          expiresAt: Date.now() + ttl,
          sizeBytes: compressedSize,
          originalSizeBytes: originalSize,
          compressionRatio
        }
      };
      
      // Salvar com retry
      await retryWithBackoff(async () => {
        const db = await getDB();
        await db.put(STORE_NAME, { key, ...entry });
      }, {
        maxRetries: 3,
        shouldRetry: (error) => {
          if (error.name === 'QuotaExceededError') {
            return false; // Não retry em quota exceeded
          }
          return shouldRetryNetworkError(error);
        }
      });
      
      const totalTime = performance.now() - startTime;
      
      console.log(
        `💾 Cache salvo: ${tipo} ` +
        `(${(originalSize/1024).toFixed(1)}KB → ${(compressedSize/1024).toFixed(1)}KB, ` +
        `${(compressionRatio*100).toFixed(1)}% redução, ${totalTime.toFixed(0)}ms)`
      );
      
      cacheMetrics.recordSave();
      cacheMetrics.updateStorage(compressedSize, compressionRatio);
      
      // Notificar outras tabs
      broadcastCacheUpdate(key, 'saved');
      
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error);
      cacheMetrics.recordError();
      throw error;
    }
  });
}

// Carregar do cache
export async function loadCorpusFromCache(
  tipo: CorpusType,
  filters?: CorpusFilters
): Promise<CorpusCompleto | null> {
  const key = generateCacheKey(tipo, filters);
  const startTime = performance.now();
  
  try {
    const db = await getDB();
    const entry = await db.get(STORE_NAME, key) as (CorpusCacheEntry & { key: string }) | undefined;
    
    if (!entry) {
      cacheMetrics.recordMiss();
      return null;
    }
    
    // Verificar expiração
    if (Date.now() > entry.metadata.expiresAt) {
      console.log(`⏰ Cache expirado: ${key}`);
      await db.delete(STORE_NAME, key);
      cacheMetrics.recordMiss();
      return null;
    }
    
    // Descomprimir se necessário
    let jsonStr = entry.compressedData;
    
    if (entry.isCompressed) {
      const decompStart = performance.now();
      jsonStr = await decompressAsync(entry.compressedData);
      const decompTime = performance.now() - decompStart;
      cacheMetrics.recordDecompressionTime(decompTime);
    }
    
    const corpus = JSON.parse(jsonStr) as CorpusCompleto;
    
    // Validar integridade
    if (!validateCorpusIntegrity(corpus)) {
      console.error('❌ Corpus corrompido no cache, removendo:', key);
      await db.delete(STORE_NAME, key);
      cacheMetrics.recordError();
      return null;
    }
    
    const loadTime = performance.now() - startTime;
    cacheMetrics.recordHit();
    cacheMetrics.recordLoadTime(loadTime);
    
    console.log(`✅ Cache hit (IndexedDB): ${tipo} (${loadTime.toFixed(0)}ms)`);
    
    return corpus;
    
  } catch (error) {
    console.error('❌ Erro ao carregar cache:', error);
    cacheMetrics.recordError();
    return null;
  }
}

// Invalidar cache
export async function invalidateCache(tipo?: CorpusType, filters?: CorpusFilters): Promise<number> {
  try {
    const db = await getDB();
    
    if (tipo && filters) {
      // Invalidar específico
      const key = generateCacheKey(tipo, filters);
      await db.delete(STORE_NAME, key);
      broadcastCacheUpdate(key, 'deleted');
      return 1;
    } else if (tipo) {
      // Invalidar todos de um tipo
      const index = db.transaction(STORE_NAME).store.index('tipo');
      const keys = await index.getAllKeys(tipo);
      
      for (const key of keys) {
        await db.delete(STORE_NAME, key);
        broadcastCacheUpdate(key as string, 'deleted');
      }
      
      return keys.length;
    } else {
      // Limpar tudo
      await db.clear(STORE_NAME);
      broadcastCacheUpdate('*', 'cleared');
      return -1; // Indica "tudo"
    }
  } catch (error) {
    console.error('❌ Erro ao invalidar cache:', error);
    return 0;
  }
}

// Limpar expirados
export async function cleanExpiredCache(): Promise<number> {
  try {
    const db = await getDB();
    const index = db.transaction(STORE_NAME, 'readwrite').store.index('expiresAt');
    const now = Date.now();
    
    const cursor = await index.openCursor(IDBKeyRange.upperBound(now));
    let cleaned = 0;
    
    if (cursor) {
      do {
        await cursor.delete();
        cleaned++;
      } while (await cursor.continue());
    }
    
    console.log(`🗑️ Limpou ${cleaned} caches expirados`);
    return cleaned;
    
  } catch (error) {
    console.error('❌ Erro ao limpar expirados:', error);
    return 0;
  }
}

// Remover mais antigos
async function removeOldestCache(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;
    const index = store.index('expiresAt');
    
    const cursor = await index.openCursor();
    
    if (cursor) {
      await cursor.delete();
      console.log('🗑️ Removeu cache mais antigo');
    }
    
    await tx.done;
  } catch (error) {
    console.error('❌ Erro ao remover cache mais antigo:', error);
  }
}

// Estatísticas
export async function getCacheStats(): Promise<{
  totalSize: number;
  entries: number;
  compressionRatio: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}> {
  try {
    const db = await getDB();
    const allEntries = await db.getAll(STORE_NAME) as (CorpusCacheEntry & { key: string })[];
    
    let totalSize = 0;
    let totalOriginalSize = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    
    for (const entry of allEntries) {
      totalSize += entry.metadata.sizeBytes;
      totalOriginalSize += entry.metadata.originalSizeBytes;
      
      if (entry.metadata.cachedAt < oldestTime) {
        oldestTime = entry.metadata.cachedAt;
      }
      if (entry.metadata.cachedAt > newestTime) {
        newestTime = entry.metadata.cachedAt;
      }
    }
    
    const compressionRatio = totalOriginalSize > 0 ? totalSize / totalOriginalSize : 0;
    
    return {
      totalSize,
      entries: allEntries.length,
      compressionRatio,
      oldestEntry: oldestTime < Infinity ? new Date(oldestTime) : null,
      newestEntry: newestTime > 0 ? new Date(newestTime) : null
    };
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    return {
      totalSize: 0,
      entries: 0,
      compressionRatio: 0,
      oldestEntry: null,
      newestEntry: null
    };
  }
}
