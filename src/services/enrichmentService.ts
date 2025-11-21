/**
 * Serviço centralizado de enriquecimento de músicas
 * FASE 1: Arquitetura limpa - um único ponto de controle
 */

import { supabase } from '@/integrations/supabase/client';
import type { EnrichmentResult } from '@/types/music';

export const enrichmentService = {
  /**
   * Enriquece uma música individual
   */
  async enrichSong(songId: string): Promise<EnrichmentResult> {
    console.log(`[enrichmentService] Starting enrichment for song ${songId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-music-data', {
        body: { songId }
      });
      
      if (error) {
        console.error(`[enrichmentService] Edge function error:`, error);
        throw error;
      }
      
      if (!data || !data.success) {
        console.error(`[enrichmentService] Enrichment failed:`, data);
        return {
          success: false,
          songId,
          error: data?.error || 'Enrichment failed'
        };
      }
      
      console.log(`[enrichmentService] Success for song ${songId}:`, data);
      return {
        success: true,
        songId,
        data: data.data
      };
    } catch (error) {
      console.error(`[enrichmentService] Error enriching song ${songId}:`, error);
      return { 
        success: false,
        songId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Enriquece múltiplas músicas em lote com rate limiting
   */
  async enrichBatch(
    songIds: string[],
    onProgress?: (current: number, total: number, currentSongId: string) => void
  ): Promise<EnrichmentResult[]> {
    console.log(`[enrichmentService] Starting batch enrichment for ${songIds.length} songs`);
    
    const results: EnrichmentResult[] = [];
    
    for (let i = 0; i < songIds.length; i++) {
      const songId = songIds[i];
      
      // Rate limiting: 1 requisição por segundo (exceto a primeira)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await this.enrichSong(songId);
      results.push(result);
      
      onProgress?.(i + 1, songIds.length, songId);
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[enrichmentService] Batch complete: ${successCount}/${songIds.length} successful`);
    
    return results;
  },

  /**
   * Enriquece automaticamente músicas pendentes após importação
   */
  async autoEnrichNewSongs(corpusId?: string | null, limit: number = 10): Promise<void> {
    console.log(`[enrichmentService] Auto-enriching up to ${limit} pending songs`);
    
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
        console.log('[enrichmentService] No pending songs to enrich');
        return;
      }
      
      console.log(`[enrichmentService] Found ${data.length} pending songs, starting enrichment`);
      
      await this.enrichBatch(
        data.map(s => s.id),
        (current, total) => {
          console.log(`[enrichmentService] Auto-enrichment progress: ${current}/${total}`);
        }
      );
      
      console.log('[enrichmentService] Auto-enrichment complete');
    } catch (error) {
      console.error('[enrichmentService] Error in auto-enrichment:', error);
      throw error;
    }
  }
};
