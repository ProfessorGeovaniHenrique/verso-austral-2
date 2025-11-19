import { useEffect, useCallback, useRef } from 'react';
import { EnrichmentSession } from '@/lib/enrichmentSchemas';

const CHANNEL_NAME = 'enrichment_sync';

type SyncMessage = {
  type: 'session_updated' | 'session_cleared' | 'request_sync';
  data?: EnrichmentSession;
  timestamp: number;
  tabId: string;
};

/**
 * Hook para sincronização entre múltiplas abas usando Broadcast Channel API
 * Previne conflitos quando usuário abre sistema em várias abas
 */
export function useMultiTabSync(
  onSessionUpdate: (session: EnrichmentSession) => void,
  onSessionClear: () => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(generateTabId());
  const lastUpdateRef = useRef<number>(0);

  /**
   * Broadcast atualização de sessão para outras abas
   */
  const broadcastSessionUpdate = useCallback((session: EnrichmentSession) => {
    if (!channelRef.current) return;
    
    const message: SyncMessage = {
      type: 'session_updated',
      data: session,
      timestamp: Date.now(),
      tabId: tabIdRef.current,
    };
    
    channelRef.current.postMessage(message);
    lastUpdateRef.current = message.timestamp;
    
    console.log('📡 Broadcast session update to other tabs');
  }, []);

  /**
   * Broadcast limpeza de sessão para outras abas
   */
  const broadcastSessionClear = useCallback(() => {
    if (!channelRef.current) return;
    
    const message: SyncMessage = {
      type: 'session_cleared',
      timestamp: Date.now(),
      tabId: tabIdRef.current,
    };
    
    channelRef.current.postMessage(message);
    console.log('📡 Broadcast session clear to other tabs');
  }, []);

  /**
   * Solicita sincronização (quando nova aba abre)
   */
  const requestSync = useCallback(() => {
    if (!channelRef.current) return;
    
    const message: SyncMessage = {
      type: 'request_sync',
      timestamp: Date.now(),
      tabId: tabIdRef.current,
    };
    
    channelRef.current.postMessage(message);
    console.log('📡 Requesting sync from other tabs');
  }, []);

  useEffect(() => {
    // Verificar se browser suporta Broadcast Channel
    if (!window.BroadcastChannel) {
      console.warn('⚠️ BroadcastChannel not supported, multi-tab sync disabled');
      return;
    }

    // Criar canal
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    // Listener para mensagens de outras abas
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const { type, data, timestamp, tabId } = event.data;
      
      // Ignorar mensagens da própria aba
      if (tabId === tabIdRef.current) return;
      
      // Ignorar mensagens antigas (evitar loops)
      if (timestamp <= lastUpdateRef.current) return;
      
      console.log(`📨 Received ${type} from tab ${tabId}`);
      
      switch (type) {
        case 'session_updated':
          if (data) {
            lastUpdateRef.current = timestamp;
            onSessionUpdate(data);
          }
          break;
          
        case 'session_cleared':
          onSessionClear();
          break;
          
        case 'request_sync':
          // Se temos dados, enviar para a aba que pediu
          // (isso será implementado no componente pai)
          console.log('📡 Sync request received from new tab');
          break;
      }
    };

    // Solicitar sincronização ao abrir
    setTimeout(() => requestSync(), 100);

    // Cleanup
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [onSessionUpdate, onSessionClear, requestSync]);

  return {
    broadcastSessionUpdate,
    broadcastSessionClear,
    requestSync,
    tabId: tabIdRef.current,
  };
}

/**
 * Gera ID único para a aba
 */
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
