/**
 * Hook para enriquecimento específico de YouTube
 * Permite controle de quantidade e tracking de quota
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchProgress {
  current: number;
  total: number;
  limit: number;
  currentSongId?: string;
}

export function useYouTubeEnrichment() {
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const { toast } = useToast();

  const enrichYouTube = async (songId: string) => {
    console.log(`[useYouTubeEnrichment] Enriching YouTube link for song: ${songId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-music-data', {
        body: { 
          songId, 
          mode: 'youtube-only'
        }
      });

      if (error) throw error;

      if (data?.success) {
        console.log(`[useYouTubeEnrichment] Success:`, data);
        return {
          success: true,
          message: data.enrichedData?.youtubeVideoId ? 'Link encontrado!' : 'Link não encontrado'
        };
      } else {
        throw new Error(data?.error || 'Erro ao buscar link do YouTube');
      }
    } catch (error: any) {
      console.error('[useYouTubeEnrichment] Error:', error);
      return {
        success: false,
        error: error.message || 'Falha ao buscar link do YouTube'
      };
    }
  };

  const enrichYouTubeBatch = async (
    songIds: string[], 
    limit?: number,
    cancelRef?: React.MutableRefObject<boolean>,
    onProgress?: (progress: BatchProgress) => void
  ) => {
    const idsToProcess = limit ? songIds.slice(0, limit) : songIds;
    console.log(`[useYouTubeEnrichment] Starting batch: ${idsToProcess.length} songs`);
    
    setBatchProgress({
      current: 0,
      total: idsToProcess.length,
      limit: limit || idsToProcess.length
    });

    const results = {
      success: 0,
      notFound: 0,
      error: 0
    };

    for (let i = 0; i < idsToProcess.length; i++) {
      // Check for cancellation
      if (cancelRef?.current) {
        console.log(`[useYouTubeEnrichment] Batch cancelled at ${i}/${idsToProcess.length}`);
        setBatchProgress(null);
        return results;
      }

      const songId = idsToProcess[i];
      
      const progress = {
        current: i + 1,
        total: idsToProcess.length,
        limit: limit || idsToProcess.length,
        currentSongId: songId
      };
      
      setBatchProgress(progress);
      onProgress?.(progress);

      // Rate limiting: 1 requisição por segundo
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const result = await enrichYouTube(songId);
      
      if (result.success) {
        if (result.message?.includes('encontrado')) {
          results.success++;
        } else {
          results.notFound++;
        }
      } else {
        results.error++;
      }
    }

    setBatchProgress(null);

    console.log(`[useYouTubeEnrichment] Batch complete:`, results);
    return results;
  };

  const enrichYouTubeUI = async (songId: string) => {
    if (enrichingIds.has(songId)) return;
    
    setEnrichingIds(prev => new Set(prev).add(songId));
    
    try {
      const result = await enrichYouTube(songId);
      
      if (result.success) {
        toast({
          title: "🎥 YouTube atualizado!",
          description: result.message
        });
      } else {
        toast({
          title: "Erro ao buscar YouTube",
          description: result.error,
          variant: "destructive"
        });
      }
      
      return result.success;
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const isEnriching = (songId: string) => enrichingIds.has(songId);

  return {
    enrichYouTube,
    enrichYouTubeBatch,
    enrichYouTubeUI,
    isEnriching,
    batchProgress,
    enrichingIds
  };
}
