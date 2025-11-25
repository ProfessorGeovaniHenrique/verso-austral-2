import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/loggerFactory';

const logger = createLogger('useSemanticAnnotation');

interface AnnotationResult {
  palavra: string;
  tagset_codigo: string;
  insignias: string[];
  confianca: number;
  fonte: string;
}

interface AnnotationStats {
  totalProcessed: number;
  cached: number;
  geminiCalls: number;
  ruleBased: number;
  avgConfidence: number;
}

export function useSemanticAnnotation() {
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<AnnotationStats>({
    totalProcessed: 0,
    cached: 0,
    geminiCalls: 0,
    ruleBased: 0,
    avgConfidence: 0,
  });
  const { toast } = useToast();

  /**
   * Anotar uma única palavra
   */
  const annotateWord = async (
    palavra: string,
    lema?: string,
    pos?: string,
    contextoEsquerdo?: string,
    contextoDireito?: string,
    corpusType: string = 'gaucho'
  ): Promise<AnnotationResult | null> => {
    try {
      // 1️⃣ Classificar domínio semântico
      const { data: domainData, error: domainError } = await supabase.functions.invoke(
        'annotate-semantic-domain',
        {
          body: {
            palavra,
            lema,
            pos,
            contexto_esquerdo: contextoEsquerdo,
            contexto_direito: contextoDireito,
          },
        }
      );

      if (domainError || !domainData?.success) {
        const errorObj = domainError instanceof Error ? domainError : new Error(String(domainError));
        logger.error('Erro ao classificar domínio', errorObj, { palavra });
        throw new Error('Falha na classificação de domínio');
      }

      // 2️⃣ Atribuir insígnias culturais
      const { data: insigniaData, error: insigniaError } = await supabase.functions.invoke(
        'assign-cultural-insignias',
        {
          body: {
            palavra,
            lema,
            corpus_type: corpusType,
          },
        }
      );

      if (insigniaError || !insigniaData?.success) {
        logger.warn('Erro ao atribuir insígnias (não-crítico)', { palavra, errorMsg: String(insigniaError) });
        // Não falhar - insígnias são opcionais
      }

      const result: AnnotationResult = {
        palavra,
        tagset_codigo: domainData.result.tagset_codigo,
        insignias: insigniaData?.result?.insignias || [],
        confianca: domainData.result.confianca,
        fonte: domainData.result.fonte,
      };

      logger.info('Palavra anotada com sucesso', { palavra, tagset: result.tagset_codigo });
      return result;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Erro na anotação semântica', errorObj, { palavra });
      return null;
    }
  };

  /**
   * Anotar corpus completo em batch
   */
  const annotateCorpus = async (
    words: Array<{ palavra: string; lema?: string; pos?: string; contexto_esquerdo?: string; contexto_direito?: string }>,
    corpusType: string = 'gaucho'
  ): Promise<AnnotationResult[]> => {
    setIsAnnotating(true);
    setProgress(0);
    
    const results: AnnotationResult[] = [];
    const statsAccumulator = {
      totalProcessed: 0,
      cached: 0,
      geminiCalls: 0,
      ruleBased: 0,
      confidenceSum: 0,
    };

    try {
      logger.info('Iniciando anotação de corpus', { totalWords: words.length, corpusType });

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        const result = await annotateWord(
          word.palavra,
          word.lema,
          word.pos,
          word.contexto_esquerdo,
          word.contexto_direito,
          corpusType
        );

        if (result) {
          results.push(result);
          statsAccumulator.totalProcessed++;
          statsAccumulator.confidenceSum += result.confianca;

          // Atualizar stats
          if (result.fonte === 'cache') statsAccumulator.cached++;
          else if (result.fonte === 'gemini_flash') statsAccumulator.geminiCalls++;
          else if (result.fonte === 'rule_based') statsAccumulator.ruleBased++;
        }

        // Atualizar progresso
        const newProgress = Math.round(((i + 1) / words.length) * 100);
        setProgress(newProgress);
      }

      // Calcular stats finais
      const finalStats: AnnotationStats = {
        totalProcessed: statsAccumulator.totalProcessed,
        cached: statsAccumulator.cached,
        geminiCalls: statsAccumulator.geminiCalls,
        ruleBased: statsAccumulator.ruleBased,
        avgConfidence: statsAccumulator.totalProcessed > 0
          ? statsAccumulator.confidenceSum / statsAccumulator.totalProcessed
          : 0,
      };

      setStats(finalStats);

      logger.info('Anotação de corpus concluída', {
        totalProcessed: finalStats.totalProcessed,
        cached: finalStats.cached,
        geminiCalls: finalStats.geminiCalls,
        ruleBased: finalStats.ruleBased,
        avgConfidence: finalStats.avgConfidence,
      });

      toast({
        title: '✅ Anotação Semântica Completa',
        description: `${results.length} palavras anotadas. Cache hit: ${finalStats.cached}/${finalStats.totalProcessed} (${Math.round((finalStats.cached / finalStats.totalProcessed) * 100)}%)`,
      });

      return results;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Erro ao anotar corpus', errorObj);
      
      toast({
        title: '❌ Erro na Anotação',
        description: errorObj.message,
        variant: 'destructive',
      });

      return results;
    } finally {
      setIsAnnotating(false);
    }
  };

  /**
   * Obter estatísticas do cache
   */
  const getCacheStats = async () => {
    try {
      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .select('fonte, hits_count')
        .order('hits_count', { ascending: false });

      if (error) throw error;

      const stats = {
        totalEntries: data?.length || 0,
        totalHits: data?.reduce((sum, entry) => sum + (entry.hits_count || 0), 0) || 0,
        bySource: data?.reduce((acc, entry) => {
          acc[entry.fonte] = (acc[entry.fonte] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
      };

      return stats;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Erro ao buscar stats do cache', err);
      return null;
    }
  };

  return {
    annotateWord,
    annotateCorpus,
    getCacheStats,
    isAnnotating,
    progress,
    stats,
  };
}
