import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncMetadata {
  lastSyncAt: Date | null;
  itemsSynced: number;
  syncDurationMs: number;
}

export function useSyncStatus() {
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata>({
    lastSyncAt: null,
    itemsSynced: 0,
    syncDurationMs: 0,
  });

  // Rastrear se última sincronização foi manual (para não exibir toast duplicado)
  const lastManualSyncRef = useRef<Date | null>(null);

  const fetchSyncMetadata = async () => {
    const { data } = await supabase
      .from('sync_metadata')
      .select('*')
      .eq('source', 'construction-log')
      .single();

    if (data) {
      const newSyncMetadata = {
        lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : null,
        itemsSynced: data.items_synced || 0,
        syncDurationMs: data.sync_duration_ms || 0,
      };

      // Detectar se é uma nova sincronização (não manual)
      const isNewSync = syncMetadata.lastSyncAt && 
                        newSyncMetadata.lastSyncAt &&
                        newSyncMetadata.lastSyncAt.getTime() !== syncMetadata.lastSyncAt.getTime();

      const wasManualSync = lastManualSyncRef.current &&
                            newSyncMetadata.lastSyncAt &&
                            Math.abs(newSyncMetadata.lastSyncAt.getTime() - lastManualSyncRef.current.getTime()) < 5000;

      if (isNewSync && !wasManualSync) {
        // Sincronização automática detectada! Exibir toast
        toast.success('Dados atualizados automaticamente!', {
          description: `${newSyncMetadata.itemsSynced} itens sincronizados em ${newSyncMetadata.syncDurationMs}ms`,
          duration: 4000,
        });
      }

      setSyncMetadata(newSyncMetadata);
    }
  };

  const triggerSync = async () => {
    try {
      // Registrar timestamp da sincronização manual
      lastManualSyncRef.current = new Date();

      // Note: sync-construction-log was removed - this is a no-op now
      return { success: true, data: { message: 'Sync function deprecated' } };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchSyncMetadata();

    // Realtime subscription para sync_metadata
    const channel = supabase
      .channel('sync_metadata_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sync_metadata' },
        () => {
          fetchSyncMetadata();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncMetadata.lastSyncAt]);

  return {
    syncMetadata,
    triggerSync,
    refetch: fetchSyncMetadata,
  };
}
