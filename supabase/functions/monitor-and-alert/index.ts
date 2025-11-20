import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertCheck {
  name: string;
  check: () => Promise<{ shouldAlert: boolean; severity: 'info' | 'warning' | 'critical'; message: string; metadata?: any }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔔 Running monitoring and alert checks...');

    const alerts: any[] = [];

    // Define all monitoring checks
    const checks: AlertCheck[] = [
      {
        name: 'stalled-jobs',
        check: async () => {
          const { data: stalledJobs } = await supabase
            .from('dictionary_import_jobs')
            .select('*')
            .in('status', ['processando', 'iniciado'])
            .lt('atualizado_em', new Date(Date.now() - 15 * 60 * 1000).toISOString());

          if (stalledJobs && stalledJobs.length > 0) {
            return {
              shouldAlert: true,
              severity: 'warning' as const,
              message: `${stalledJobs.length} job(s) travado(s) detectado(s)`,
              metadata: { job_ids: stalledJobs.map(j => j.id), count: stalledJobs.length }
            };
          }
          return { shouldAlert: false, severity: 'info' as const, message: '' };
        }
      },
      {
        name: 'high-error-rate',
        check: async () => {
          const { data: recentJobs } = await supabase
            .from('dictionary_import_jobs')
            .select('status, erro_mensagem')
            .gte('criado_em', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

          if (recentJobs && recentJobs.length > 0) {
            const errorCount = recentJobs.filter(j => j.status === 'erro').length;
            const errorRate = errorCount / recentJobs.length;

            if (errorRate > 0.5) {
              return {
                shouldAlert: true,
                severity: 'critical' as const,
                message: `Taxa de erro alta: ${(errorRate * 100).toFixed(1)}% (${errorCount}/${recentJobs.length})`,
                metadata: { error_rate: errorRate, error_count: errorCount, total: recentJobs.length }
              };
            }
          }
          return { shouldAlert: false, severity: 'info' as const, message: '' };
        }
      },
      {
        name: 'job-no-progress',
        check: async () => {
          const { data: activeJobs } = await supabase
            .from('dictionary_import_jobs')
            .select('*')
            .in('status', ['processando'])
            .lt('atualizado_em', new Date(Date.now() - 10 * 60 * 1000).toISOString());

          const stuckJobs = activeJobs?.filter(job => {
            if (!job.verbetes_processados || !job.total_verbetes) return false;
            const progress = job.verbetes_processados / job.total_verbetes;
            return progress < 0.1 && new Date(job.tempo_inicio).getTime() < Date.now() - 30 * 60 * 1000;
          }) || [];

          if (stuckJobs.length > 0) {
            return {
              shouldAlert: true,
              severity: 'warning' as const,
              message: `${stuckJobs.length} job(s) sem progresso há mais de 10 minutos`,
              metadata: { job_ids: stuckJobs.map(j => j.id) }
            };
          }
          return { shouldAlert: false, severity: 'info' as const, message: '' };
        }
      },
      {
        name: 'low-confidence',
        check: async () => {
          const { data: dialectalData } = await supabase
            .from('dialectal_lexicon')
            .select('confianca_extracao')
            .lt('confianca_extracao', 0.6);

          if (dialectalData && dialectalData.length > 100) {
            return {
              shouldAlert: true,
              severity: 'warning' as const,
              message: `${dialectalData.length} verbetes com confiança < 60%`,
              metadata: { low_confidence_count: dialectalData.length }
            };
          }
          return { shouldAlert: false, severity: 'info' as const, message: '' };
        }
      },
      {
        name: 'database-size',
        check: async () => {
          // Check total database size (approximate)
          const { count: dialectalCount } = await supabase
            .from('dialectal_lexicon')
            .select('*', { count: 'exact', head: true });
          
          const { count: gutenbergCount } = await supabase
            .from('gutenberg_lexicon')
            .select('*', { count: 'exact', head: true });

          const totalEntries = (dialectalCount || 0) + (gutenbergCount || 0);

          // Alert if > 1M entries (might need cleanup)
          if (totalEntries > 1000000) {
            return {
              shouldAlert: true,
              severity: 'info' as const,
              message: `Banco de dados com ${totalEntries.toLocaleString()} entradas. Considere limpeza.`,
              metadata: { total_entries: totalEntries }
            };
          }
          return { shouldAlert: false, severity: 'info' as const, message: '' };
        }
      }
    ];

    // Run all checks
    for (const check of checks) {
      try {
        const result = await check.check();
        if (result.shouldAlert) {
          alerts.push({
            check_name: check.name,
            severity: result.severity,
            message: result.message,
            metadata: result.metadata,
            triggered_at: new Date().toISOString()
          });

          // Log to system_logs
          await supabase
            .from('system_logs')
            .insert({
              level: result.severity === 'critical' ? 'error' : result.severity === 'warning' ? 'warn' : 'info',
              category: 'monitoring',
              message: `[${check.name}] ${result.message}`,
              metadata: result.metadata,
              source: 'edge-function',
              trace_id: `monitor-${Date.now()}`
            });
        }
      } catch (error) {
        console.error(`❌ Error running check ${check.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Log error
        await supabase
          .from('system_logs')
          .insert({
            level: 'error',
            category: 'monitoring',
            message: `Failed to run check: ${check.name}`,
            metadata: { error: errorMessage },
            source: 'edge-function'
          });
      }
    }

    console.log(`✅ Monitoring complete. ${alerts.length} alert(s) triggered.`);

    return new Response(JSON.stringify({ 
      alerts,
      total_checks: checks.length,
      alerts_count: alerts.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in monitor-and-alert:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
