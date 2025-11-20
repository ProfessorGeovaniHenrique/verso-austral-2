import { supabase } from '@/integrations/supabase/client';

export interface HealthCheckResult {
  check_type: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details: any;
  metrics: any;
  checked_at: string;
  expires_at: string;
}

export interface SystemHealth {
  results: HealthCheckResult[];
  cached: boolean;
  overall_status: 'healthy' | 'warning' | 'critical';
  critical_count: number;
  warning_count: number;
}

/**
 * Serviço para gerenciar health checks do sistema
 * Usa cache server-side para evitar queries pesadas
 */
export class HealthCheckService {
  /**
   * Executa health check (usa cache se disponível)
   */
  async runHealthCheck(forceRefresh: boolean = false): Promise<SystemHealth> {
    const { data, error } = await supabase.functions.invoke('health-check-lexicon', {
      body: { forceRefresh }
    });

    if (error) {
      console.error('Error running health check:', error);
      throw new Error(`Health check failed: ${error.message}`);
    }

    const results = data.results as HealthCheckResult[];
    const criticalCount = results.filter(r => r.status === 'critical').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    return {
      results,
      cached: data.cached,
      overall_status: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy',
      critical_count: criticalCount,
      warning_count: warningCount
    };
  }

  /**
   * Busca status cacheado do banco (mais rápido)
   */
  async getCachedStatus(): Promise<HealthCheckResult[]> {
    const { data, error } = await supabase
      .from('lexicon_health_status')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('checked_at', { ascending: false });

    if (error) {
      console.error('Error fetching cached health status:', error);
      return [];
    }

    return data as HealthCheckResult[];
  }

  /**
   * Verifica se o cache está válido
   */
  async isCacheValid(): Promise<boolean> {
    const { data } = await supabase
      .from('lexicon_health_status')
      .select('expires_at')
      .single();

    if (!data) return false;

    return new Date(data.expires_at) > new Date();
  }
}

export const healthCheckService = new HealthCheckService();
