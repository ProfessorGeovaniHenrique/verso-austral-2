/**
 * Serviço centralizado de enriquecimento de músicas
 * FASE 1: Arquitetura limpa - um único ponto de controle
 */

import { supabase } from '@/integrations/supabase/client';
import type { EnrichmentResult } from '@/types/music';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('enrichmentService');

export const enrichmentService = {
  /**
   * Enriquece uma música individual com modo específico
   */
  async enrichSong(songId: string, mode: 'full' | 'metadata-only' | 'youtube-only' = 'full', forceReenrich: boolean = false): Promise<EnrichmentResult> {
    log.info(`Starting enrichment for song ${songId}`, { mode, forceReenrich });
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-music-data', {
        body: { songId, mode, forceReenrich }
      });
      
      if (error) {
        log.error(`Edge function error for song ${songId}`, error as Error);
        throw error;
      }
      
      if (!data || !data.success) {
        log.warn(`Enrichment failed for song ${songId}`, { data });
        return {
          success: false,
          songId,
          error: data?.error || 'Enrichment failed'
        };
      }
      
      // BUG-3 FIX: Verificar persistência no banco ANTES de reportar sucesso
      const { data: verifyData, error: verifyError } = await supabase
        .from('songs')
        .select('status, youtube_url, composer, updated_at')
        .eq('id', songId)
        .single();
      
      if (verifyError) {
        log.warn(`Could not verify persistence for song ${songId}`, { verifyError });
        // Continuar mesmo sem verificação - edge function reportou sucesso
      } else {
        const wasUpdated = verifyData?.status === 'enriched' || 
                           verifyData?.youtube_url || 
                           verifyData?.composer;
        
        if (!wasUpdated) {
          log.warn(`Enrichment reported success but no changes detected for song ${songId}`);
          return {
            success: false,
            songId,
            error: 'Enrichment reported success but no data was persisted'
          };
        }
        
        log.info(`Verified persistence for song ${songId}`, { 
          status: verifyData?.status,
          hasYoutube: !!verifyData?.youtube_url,
          hasComposer: !!verifyData?.composer
        });
      }
      
      return {
        success: true,
        songId,
        data: data.data
      };
    } catch (error) {
      log.error(`Error enriching song ${songId}`, error as Error);
      return { 
        success: false,
        songId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Enriquece múltiplas músicas em lote com rate limiting e modo específico
   */
  async enrichBatch(
    songIds: string[],
    onProgress?: (current: number, total: number, currentSongId: string) => void,
    mode: 'full' | 'metadata-only' | 'youtube-only' = 'metadata-only',
    forceReenrich: boolean = false
  ): Promise<EnrichmentResult[]> {
    log.info(`Starting batch enrichment for ${songIds.length} songs`, { mode, forceReenrich });
    
    const results: EnrichmentResult[] = [];
    
    for (let i = 0; i < songIds.length; i++) {
      const songId = songIds[i];
      
      // Rate limiting: 1 requisição por segundo (exceto a primeira)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await this.enrichSong(songId, mode, forceReenrich);
      results.push(result);
      
      onProgress?.(i + 1, songIds.length, songId);
    }
    
    const successCount = results.filter(r => r.success).length;
    log.info(`Batch complete: ${successCount}/${songIds.length} successful`);
    
    return results;
  },

  /**
   * Enriquece automaticamente músicas pendentes após importação
   */
  async autoEnrichNewSongs(corpusId?: string | null, limit: number = 10): Promise<void> {
    log.info(`Auto-enriching up to ${limit} pending songs`);
    
    try {
      let query = supabase
        .from('songs')
        .select('id')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (corpusId) {
        query = query.eq('corpus_id', corpusId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        log.info('No pending songs to enrich');
        return;
      }
      
      log.info(`Found ${data.length} pending songs, starting enrichment`);
      
      await this.enrichBatch(
        data.map(s => s.id),
        (current, total) => {
          log.debug(`Auto-enrichment progress: ${current}/${total}`);
        }
      );
      
      log.info('Auto-enrichment complete');
    } catch (error) {
      log.error('Error in auto-enrichment', error as Error);
      throw error;
    }
  }
};
