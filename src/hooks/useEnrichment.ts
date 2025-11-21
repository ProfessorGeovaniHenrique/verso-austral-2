/**
 * Hook para gerenciar enriquecimento de músicas
 * FASE 1: Separação de responsabilidades
 */

import { useState } from 'react';
import { enrichmentService } from '@/services/enrichmentService';
import { toast } from 'sonner';

export function useEnrichment() {
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentSongId: string | null;
  } | null>(null);

  const enrichSong = async (songId: string) => {
    console.log(`[useEnrichment] Enriching song ${songId}`);
    
    setEnrichingIds(prev => new Set(prev).add(songId));
    
    try {
      const result = await enrichmentService.enrichSong(songId);
      
      if (result.success) {
        toast.success('Música enriquecida com sucesso!');
      } else {
        toast.error(`Erro ao enriquecer: ${result.error}`);
      }
      
      return result;
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const enrichBatch = async (songIds: string[]) => {
    console.log(`[useEnrichment] Starting batch enrichment of ${songIds.length} songs`);
    
    setBatchProgress({ current: 0, total: songIds.length, currentSongId: null });
    
    try {
      const results = await enrichmentService.enrichBatch(
        songIds,
        (current, total, currentSongId) => {
          setBatchProgress({ current, total, currentSongId });
        }
      );
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === songIds.length) {
        toast.success(`${successCount} músicas enriquecidas com sucesso!`);
      } else {
        toast.warning(`${successCount}/${songIds.length} músicas enriquecidas. Algumas falharam.`);
      }
      
      return results;
    } finally {
      setBatchProgress(null);
    }
  };

  const isEnriching = (songId: string) => enrichingIds.has(songId);

  return { 
    enrichSong, 
    enrichBatch, 
    isEnriching, 
    enrichingIds,
    batchProgress
  };
}
