import { supabase } from '@/integrations/supabase/client';

export interface LexiconStats {
  dialectal: {
    total: number;
    volumeI: number;
    volumeII: number;
    validados: number;
    confianca_media: number;
    campeiros: number;
    platinismos: number;
  };
  gutenberg: {
    total: number;
    validados: number;
    confianca_media: number;
  };
  houaiss: {
    total: number;
  };
  unesp: {
    total: number;
  };
  overall: {
    total_entries: number;
    validation_rate: number;
    last_import: string | null;
  };
}

/**
 * Serviço para gerenciar estatísticas do léxico
 * Usa edge function para queries otimizadas
 */
export class LexiconStatsService {
  /**
   * Busca estatísticas agregadas do léxico (via edge function otimizada)
   */
  async fetchStats(): Promise<LexiconStats> {
    const { data, error } = await supabase.functions.invoke('get-lexicon-stats');
    
    if (error) {
      console.error('Error fetching lexicon stats:', error);
      throw new Error(`Failed to fetch lexicon stats: ${error.message}`);
    }
    
    return data as LexiconStats;
  }

  /**
   * Valida se o léxico tem dados suficientes
   */
  async validateCompleteness(): Promise<{ isComplete: boolean; issues: string[] }> {
    const stats = await this.fetchStats();
    const issues: string[] = [];

    // Validações
    if (stats.dialectal.volumeII === 0) {
      issues.push('Volume II do Dialectal não importado');
    }
    
    if (stats.gutenberg.total < 10000) {
      issues.push('Gutenberg nunca foi importado completamente');
    }
    
    if (stats.dialectal.confianca_media < 0.7) {
      issues.push(`Confiança média baixa no Dialectal: ${(stats.dialectal.confianca_media * 100).toFixed(1)}%`);
    }

    return {
      isComplete: issues.length === 0,
      issues
    };
  }

  /**
   * Calcula métricas de progresso
   */
  calculateProgress(stats: LexiconStats): {
    dialectalCompletion: number;
    gutenbergCompletion: number;
    overallCompletion: number;
  } {
    const dialectalExpected = 10000; // Estimativa
    const gutenbergExpected = 700000;

    return {
      dialectalCompletion: Math.min(100, (stats.dialectal.total / dialectalExpected) * 100),
      gutenbergCompletion: Math.min(100, (stats.gutenberg.total / gutenbergExpected) * 100),
      overallCompletion: Math.min(100, (stats.overall.total_entries / (dialectalExpected + gutenbergExpected)) * 100)
    };
  }
}

export const lexiconStatsService = new LexiconStatsService();
