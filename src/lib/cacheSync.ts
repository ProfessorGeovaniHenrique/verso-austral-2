/**
 * Sincronização de cache entre tabs usando BroadcastChannel
 */

import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('cacheSync');

interface CacheUpdateMessage {
  cacheKey: string;
  action: 'saved' | 'deleted' | 'cleared';
  timestamp: number;
}

let cacheChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel {
  if (!cacheChannel) {
    cacheChannel = new BroadcastChannel('corpus-cache-updates');
  }
  return cacheChannel;
}

/**
 * Notifica outras tabs sobre mudanças no cache
 */
export function broadcastCacheUpdate(cacheKey: string, action: 'saved' | 'deleted' | 'cleared') {
  try {
    const channel = getChannel();
    const message: CacheUpdateMessage = {
      cacheKey,
      action,
      timestamp: Date.now()
    };
    channel.postMessage(message);
    log.debug('Broadcast cache update', { cacheKey: message.cacheKey, action: message.action });
  } catch (error) {
    log.warn('Failed to broadcast cache update');
  }
}

/**
 * Escuta mudanças de cache de outras tabs
 */
export function listenToCacheUpdates(
  onUpdate: (cacheKey: string, action: 'saved' | 'deleted' | 'cleared') => void
): () => void {
  try {
    const channel = getChannel();
    
    const handler = (event: MessageEvent<CacheUpdateMessage>) => {
      log.debug('Received cache update from another tab', { cacheKey: event.data.cacheKey, action: event.data.action });
      onUpdate(event.data.cacheKey, event.data.action);
    };
    
    channel.addEventListener('message', handler);
    
    // Retornar função de cleanup
    return () => {
      channel.removeEventListener('message', handler);
    };
  } catch (error) {
    log.warn('Failed to setup cache sync listener', { error });
    return () => {}; // Noop cleanup
  }
}

/**
 * Fechar canal ao encerrar
 */
export function closeCacheSync() {
  if (cacheChannel) {
    cacheChannel.close();
    cacheChannel = null;
  }
}
