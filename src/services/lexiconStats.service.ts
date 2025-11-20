import { supabase } from '@/integrations/supabase/client';

export interface LexiconStats {
  gaucho: {
    total: number;
    validados: number;
    confianca_media: number;
    campeiros: number;
    platinismos: number;
  };
  navarro: {
    total: number;
    validados: number;
    confianca_media: number;
  };
  gutenberg: {
    total: number;
    validados: number;
    confianca_media: number;
  };
  rochaPombo: {
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
    if (stats.gaucho.total === 0) {
      issues.push('Dicionário Gaúcho não importado');
    }
    
    if (stats.navarro.total === 0) {
      issues.push('Dicionário Navarro 2014 não importado');
    }
    
    if (stats.gutenberg.total < 10000) {
      issues.push('Gutenberg não foi importado completamente');
    }
    
    if (stats.gaucho.confianca_media < 0.7) {
      issues.push(`Confiança média baixa no Gaúcho: ${(stats.gaucho.confianca_media * 100).toFixed(1)}%`);
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
    gauchoCompletion: number;
    navarroCompletion: number;
    gutenbergCompletion: number;
    overallCompletion: number;
  } {
    const gauchoExpected = 5000;
    const navarroExpected = 2000;
    const gutenbergExpected = 700000;
    const totalExpected = gauchoExpected + navarroExpected + gutenbergExpected;

    return {
      gauchoCompletion: Math.min(100, (stats.gaucho.total / gauchoExpected) * 100),
      navarroCompletion: Math.min(100, (stats.navarro.total / navarroExpected) * 100),
      gutenbergCompletion: Math.min(100, (stats.gutenberg.total / gutenbergExpected) * 100),
      overallCompletion: Math.min(100, (stats.overall.total_entries / totalExpected) * 100)
    };
  }
}

export const lexiconStatsService = new LexiconStatsService();
