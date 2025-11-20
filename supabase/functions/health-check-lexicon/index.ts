import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  check_type: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details: any;
  metrics: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { forceRefresh } = await req.json().catch(() => ({ forceRefresh: false }));

    console.log(`🏥 Running health check (forceRefresh: ${forceRefresh})...`);

    // Check if we have cached results (< 5 minutes old)
    if (!forceRefresh) {
      const { data: cachedResults } = await supabase
        .from('lexicon_health_status')
        .select('*')
        .gt('expires_at', new Date().toISOString());

      if (cachedResults && cachedResults.length > 0) {
        console.log('✅ Returning cached health check results');
        return new Response(JSON.stringify({ results: cachedResults, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const results: HealthCheckResult[] = [];

    // 1. Check Dialectal
    const { data: dialectalData, count: dialectalCount } = await supabase
      .from('dialectal_lexicon')
      .select('volume_fonte, validado_humanamente, confianca_extracao', { count: 'exact' });

    const volumeII = dialectalData?.filter(d => d.volume_fonte === 'II') || [];
    const avgConfidence = dialectalData && dialectalData.length > 0 
      ? dialectalData.reduce((acc, d) => acc + (d.confianca_extracao || 0), 0) / dialectalData.length
      : 0;

    if (volumeII.length === 0) {
      results.push({
        check_type: 'dialectal',
        status: 'critical',
        message: 'Volume II não importado',
        details: { volume_ii_count: 0, total_count: dialectalCount },
        metrics: { volumeII: 0, total: dialectalCount }
      });
    } else if (avgConfidence < 0.70) {
      results.push({
        check_type: 'dialectal',
        status: 'warning',
        message: `Confiança média baixa (${(avgConfidence * 100).toFixed(1)}%)`,
        details: { avgConfidence },
        metrics: { avgConfidence, total: dialectalCount }
      });
    } else {
      results.push({
        check_type: 'dialectal',
        status: 'healthy',
        message: 'Dicionário Dialectal saudável',
        details: {},
        metrics: { total: dialectalCount, avgConfidence }
      });
    }

    // 2. Check Gutenberg
    const { count: gutenbergCount } = await supabase
      .from('gutenberg_lexicon')
      .select('*', { count: 'exact', head: true });

    if ((gutenbergCount || 0) < 10000) {
      results.push({
        check_type: 'gutenberg',
        status: 'critical',
        message: 'Gutenberg nunca importado completamente',
        details: { current_count: gutenbergCount, expected: 700000 },
        metrics: { total: gutenbergCount, completion: ((gutenbergCount || 0) / 700000) * 100 }
      });
    } else if ((gutenbergCount || 0) < 500000) {
      results.push({
        check_type: 'gutenberg',
        status: 'warning',
        message: 'Importação incompleta',
        details: { current_count: gutenbergCount, missing: 700000 - (gutenbergCount || 0) },
        metrics: { total: gutenbergCount, completion: ((gutenbergCount || 0) / 700000) * 100 }
      });
    } else {
      results.push({
        check_type: 'gutenberg',
        status: 'healthy',
        message: 'Gutenberg completo',
        details: {},
        metrics: { total: gutenbergCount }
      });
    }

    // 3. Check for stalled jobs
    const { data: stalledJobs } = await supabase
      .from('dictionary_import_jobs')
      .select('*')
      .in('status', ['processando', 'iniciado'])
      .lt('atualizado_em', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (stalledJobs && stalledJobs.length > 0) {
      results.push({
        check_type: 'system-jobs',
        status: 'warning',
        message: `${stalledJobs.length} job(s) travado(s)`,
        details: { stalled_jobs: stalledJobs.map(j => ({ id: j.id, tipo: j.tipo_dicionario })) },
        metrics: { stalled_count: stalledJobs.length }
      });
    } else {
      results.push({
        check_type: 'system-jobs',
        status: 'healthy',
        message: 'Nenhum job travado',
        details: {},
        metrics: { stalled_count: 0 }
      });
    }

    // 4. Overall system status
    const criticalCount = results.filter(r => r.status === 'critical').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    results.push({
      check_type: 'system-overall',
      status: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy',
      message: criticalCount > 0 
        ? `${criticalCount} problema(s) crítico(s)` 
        : warningCount > 0 
        ? `${warningCount} aviso(s)` 
        : 'Sistema saudável',
      details: { critical: criticalCount, warnings: warningCount },
      metrics: { critical: criticalCount, warnings: warningCount, healthy: results.length - criticalCount - warningCount }
    });

    // Save results to cache
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    for (const result of results) {
      await supabase
        .from('lexicon_health_status')
        .upsert({
          check_type: result.check_type,
          status: result.status,
          message: result.message,
          details: result.details,
          metrics: result.metrics,
          checked_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          checked_by: 'system'
        }, { onConflict: 'check_type' });
    }

    console.log('✅ Health check completed and cached');

    return new Response(JSON.stringify({ results, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in health check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
