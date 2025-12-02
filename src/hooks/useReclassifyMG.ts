import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SemanticLexiconEntry } from './useSemanticLexiconData';

interface ReclassifyOptions {
  model?: 'gemini' | 'gpt5';
  onSuccess?: () => void;
}

interface ReclassificationResult {
  palavra: string;
  tagset_codigo: string;
  tagset_n1: string;
  tagset_n2: string | null;
  tagset_n3: string | null;
  tagset_n4: string | null;
  confianca: number;
  justificativa: string;
}

interface ReclassifyResponse {
  success: boolean;
  processed: number;
  updated: number;
  errors?: string[];
  model: string;
  source: string;
  duration: number;
  results: ReclassificationResult[];
}

export function useReclassifyMG() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const reclassifySingle = async (
    entry: SemanticLexiconEntry, 
    options: ReclassifyOptions = {}
  ): Promise<ReclassificationResult | null> => {
    const { model = 'gemini', onSuccess } = options;
    
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('reclassify-mg-words', {
        body: {
          words: [{
            id: entry.id,
            palavra: entry.palavra,
            lema: entry.lema,
            pos: entry.pos,
            contexto_hash: entry.contexto_hash,
            song_id: entry.song_id,
            tagset_codigo: entry.tagset_codigo, // Current domain for context
          }],
          model,
        },
      });

      if (error) throw error;

      const response = data as ReclassifyResponse;
      
      if (response.success && response.updated > 0) {
        const result = response.results[0];
        toast.success(`"${entry.palavra}" reclassificado para ${result.tagset_codigo}`, {
          description: result.justificativa,
        });
        onSuccess?.();
        return result;
      } else {
        toast.error('Falha na reclassificação', {
          description: response.errors?.[0] || 'Erro desconhecido',
        });
        return null;
      }
    } catch (err) {
      console.error('[useReclassifyMG] Error:', err);
      toast.error('Erro ao reclassificar', {
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const reclassifyBatch = async (
    entries: SemanticLexiconEntry[],
    options: ReclassifyOptions = {}
  ): Promise<{ success: number; failed: number }> => {
    const { model = 'gemini', onSuccess } = options;
    const BATCH_SIZE = 15;
    
    setIsProcessing(true);
    setProgress({ current: 0, total: entries.length });

    let successCount = 0;
    let failedCount = 0;

    try {
      // Process in batches
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        
        const words = batch.map(entry => ({
          id: entry.id,
          palavra: entry.palavra,
          lema: entry.lema,
          pos: entry.pos,
          contexto_hash: entry.contexto_hash,
          song_id: entry.song_id,
          tagset_codigo: entry.tagset_codigo, // Current domain for context
        }));

        try {
          const { data, error } = await supabase.functions.invoke('reclassify-mg-words', {
            body: { words, model },
          });

          if (error) throw error;

          const response = data as ReclassifyResponse;
          successCount += response.updated;
          failedCount += batch.length - response.updated;
        } catch (batchError) {
          console.error(`[useReclassifyMG] Batch ${i}/${entries.length} failed:`, batchError);
          failedCount += batch.length;
        }

        setProgress({ current: Math.min(i + BATCH_SIZE, entries.length), total: entries.length });
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < entries.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} palavras reclassificadas com sucesso`, {
          description: failedCount > 0 ? `${failedCount} falharam` : undefined,
        });
        onSuccess?.();
      } else {
        toast.error('Nenhuma palavra foi reclassificada');
      }

      return { success: successCount, failed: failedCount };
    } catch (err) {
      console.error('[useReclassifyMG] Batch error:', err);
      toast.error('Erro no processamento em lote');
      return { success: successCount, failed: entries.length - successCount };
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return {
    reclassifySingle,
    reclassifyBatch,
    isProcessing,
    progress,
  };
}
