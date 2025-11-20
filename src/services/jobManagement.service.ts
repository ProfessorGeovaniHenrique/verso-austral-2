import { supabase } from '@/integrations/supabase/client';

export interface RecoveryResult {
  job_id: string;
  tipo: string;
  success: boolean;
  strategy?: string;
  attempt?: number;
  reason?: string;
}

/**
 * Serviço para gerenciar jobs de importação
 */
export class JobManagementService {
  /**
   * Tenta recuperar jobs travados automaticamente
   */
  async recoverStalledJobs(): Promise<{ results: RecoveryResult[]; recovered: number }> {
    const { data, error } = await supabase.functions.invoke('recover-stalled-jobs');

    if (error) {
      console.error('Error recovering stalled jobs:', error);
      throw new Error(`Recovery failed: ${error.message}`);
    }

    return {
      results: data.results,
      recovered: data.recovered
    };
  }

  /**
   * Busca histórico de recuperações de um job
   */
  async getRecoveryHistory(jobId: string) {
    const { data, error } = await supabase
      .from('dictionary_job_recovery_log')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recovery history:', error);
      throw error;
    }

    return data;
  }

  /**
   * Busca métricas de qualidade de importação
   */
  async getImportQualityMetrics(jobId: string) {
    const { data, error } = await supabase
      .from('dictionary_import_quality')
      .select('*')
      .eq('job_id', jobId)
      .order('batch_number', { ascending: false });

    if (error) {
      console.error('Error fetching quality metrics:', error);
      throw error;
    }

    return data;
  }

  /**
   * Calcula estatísticas gerais de qualidade
   */
  calculateQualityStats(metrics: any[]) {
    if (!metrics || metrics.length === 0) {
      return {
        overall_success_rate: 0,
        total_processed: 0,
        total_failed: 0,
        best_strategy: null
      };
    }

    const totalProcessed = metrics.reduce((acc, m) => acc + m.lines_processed, 0);
    const totalSuccess = metrics.reduce((acc, m) => acc + m.lines_success, 0);
    const totalFailed = metrics.reduce((acc, m) => acc + m.lines_failed, 0);

    // Encontrar melhor estratégia
    const strategyCounts = metrics.reduce((acc, m) => {
      if (!acc[m.parsing_strategy]) {
        acc[m.parsing_strategy] = { success: 0, total: 0 };
      }
      acc[m.parsing_strategy].success += m.lines_success;
      acc[m.parsing_strategy].total += m.lines_processed;
      return acc;
    }, {} as Record<string, { success: number; total: number }>);

    const bestStrategy = Object.entries(strategyCounts).reduce<{ strategy: string; rate: number; success: number; total: number } | null>((best, [strategy, stats]) => {
      const typedStats = stats as { success: number; total: number };
      const rate = typedStats.success / typedStats.total;
      if (!best || rate > best.rate) {
        return { strategy, rate, success: typedStats.success, total: typedStats.total };
      }
      return best;
    }, null);

    return {
      overall_success_rate: totalProcessed > 0 ? (totalSuccess / totalProcessed) * 100 : 0,
      total_processed: totalProcessed,
      total_failed: totalFailed,
      best_strategy: bestStrategy
    };
  }
}

export const jobManagementService = new JobManagementService();
