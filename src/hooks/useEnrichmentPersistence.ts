import { useCallback, useEffect, useRef } from 'react';
import LZString from 'lz-string';
import { EnrichmentSession, validateEnrichmentSession } from '@/lib/enrichmentSchemas';
import { debounce } from '@/lib/performanceUtils';
import { notifications } from '@/lib/notifications';

const STORAGE_KEY = 'enrichment_session';
const STORAGE_PREFIX = 'enrichment_backup_';
const MAX_BACKUP_AGE_DAYS = 7;

/**
 * Hook para persistência local com compressão LZ-String
 * Salvamento incremental com debounce de 2s
 */
export function useEnrichmentPersistence() {
  const lastSaveRef = useRef<string | null>(null);

  /**
   * Comprime e salva dados no localStorage
   * Reduz tamanho em ~70% com LZ-String
   */
  const compressAndSave = useCallback((key: string, data: EnrichmentSession) => {
    try {
      const json = JSON.stringify(data);
      const compressed = LZString.compress(json);
      
      localStorage.setItem(key, compressed);
      lastSaveRef.current = new Date().toISOString();
      
      console.log(`💾 Session saved (original: ${json.length} bytes, compressed: ${compressed.length} bytes)`);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('❌ localStorage quota exceeded');
        notifications.error('Erro ao salvar', 'Espaço de armazenamento insuficiente');
        
        // Tentar limpar sessões antigas
        cleanupOldSessions();
        
        // Tentar salvar novamente
        try {
          const json = JSON.stringify(data);
          const compressed = LZString.compress(json);
          localStorage.setItem(key, compressed);
          return true;
        } catch {
          return false;
        }
      }
      
      console.error('❌ Failed to save session:', error);
      return false;
    }
  }, []);

  /**
   * Carrega e descomprime dados do localStorage
   * Valida com Zod antes de retornar
   */
  const loadAndDecompress = useCallback((key: string): EnrichmentSession | null => {
    try {
      const compressed = localStorage.getItem(key);
      if (!compressed) return null;
      
      const json = LZString.decompress(compressed);
      if (!json) {
        console.warn('⚠️ Failed to decompress session data');
        return null;
      }
      
      const data = JSON.parse(json);
      
      // Validar com Zod
      const validated = validateEnrichmentSession(data);
      
      console.log(`✅ Session loaded (${json.length} bytes after decompression)`);
      return validated;
    } catch (error) {
      console.error('❌ Failed to load session:', error);
      
      // Se dados corrompidos, remover
      localStorage.removeItem(key);
      return null;
    }
  }, []);

  /**
   * Salva sessão atual (debounced 2s)
   */
  const saveSession = useCallback(
    debounce((data: EnrichmentSession) => {
      compressAndSave(STORAGE_KEY, data);
      
      // Criar backup timestamped
      const backupKey = `${STORAGE_PREFIX}${Date.now()}`;
      compressAndSave(backupKey, data);
    }, 2000),
    [compressAndSave]
  );

  /**
   * Carrega sessão salva
   */
  const loadSession = useCallback((): EnrichmentSession | null => {
    return loadAndDecompress(STORAGE_KEY);
  }, [loadAndDecompress]);

  /**
   * Limpa sessão atual
   */
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    lastSaveRef.current = null;
    console.log('🗑️ Session cleared');
  }, []);

  /**
   * Lista backups disponíveis
   */
  const listBackups = useCallback((): Array<{ key: string; timestamp: number }> => {
    const backups: Array<{ key: string; timestamp: number }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const timestamp = parseInt(key.replace(STORAGE_PREFIX, ''), 10);
        if (!isNaN(timestamp)) {
          backups.push({ key, timestamp });
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }, []);

  /**
   * Restaura backup específico
   */
  const restoreBackup = useCallback((backupKey: string): EnrichmentSession | null => {
    const session = loadAndDecompress(backupKey);
    if (session) {
      compressAndSave(STORAGE_KEY, session);
      console.log(`♻️ Backup restored: ${backupKey}`);
    }
    return session;
  }, [loadAndDecompress, compressAndSave]);

  /**
   * Remove backups antigos (>7 dias)
   */
  const cleanupOldSessions = useCallback(() => {
    const backups = listBackups();
    const cutoffTime = Date.now() - (MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000);
    
    let removed = 0;
    backups.forEach(({ key, timestamp }) => {
      if (timestamp < cutoffTime) {
        localStorage.removeItem(key);
        removed++;
      }
    });
    
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old backup(s)`);
    }
  }, [listBackups]);

  // Cleanup automático ao montar
  useEffect(() => {
    cleanupOldSessions();
  }, [cleanupOldSessions]);

  return {
    saveSession,
    loadSession,
    clearSession,
    listBackups,
    restoreBackup,
    cleanupOldSessions,
    lastSaveTime: lastSaveRef.current,
  };
}
