/**
 * scan-code-quality Edge Function
 * Analisa qualidade de código e salva resultados no banco
 * Sprint 1 - Eliminação de dados mock
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CodeIssue {
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
}

interface ScanResult {
  scanType: string;
  filesAnalyzed: number;
  totalIssues: number;
  resolvedIssues: number;
  newIssues: number;
  pendingIssues: number;
  issues: CodeIssue[];
  improvementPercentage: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { scanType = 'full' } = await req.json().catch(() => ({}));

    console.log(`[scan-code-quality] Iniciando scan tipo: ${scanType}`);

    // Buscar baseline do último scan
    const { data: lastScan } = await supabase
      .from('code_scan_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const baselineIssues = lastScan?.pending_issues || 0;

    // Análise de métricas do sistema atual
    const issues: CodeIssue[] = [];

    // 1. Verificar edge functions sem tratamento de erro adequado
    const { data: edgeLogs } = await supabase
      .from('edge_function_logs')
      .select('function_name, status_code, error_message')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('status_code', 500)
      .limit(100);

    const errorsByFunction = new Map<string, number>();
    edgeLogs?.forEach(log => {
      const count = errorsByFunction.get(log.function_name) || 0;
      errorsByFunction.set(log.function_name, count + 1);
    });

    // Gerar issues para funções com muitos erros
    errorsByFunction.forEach((count, funcName) => {
      if (count >= 5) {
        issues.push({
          file: `supabase/functions/${funcName}/index.ts`,
          severity: count >= 20 ? 'critical' : count >= 10 ? 'high' : 'medium',
          type: 'error_rate',
          message: `${count} erros 500 nos últimos 7 dias`
        });
      }
    });

    // 2. Verificar jobs de anotação com falhas
    const { data: failedJobs } = await supabase
      .from('annotation_jobs')
      .select('id, corpus_type, erro_mensagem')
      .eq('status', 'erro')
      .gte('tempo_inicio', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50);

    if (failedJobs && failedJobs.length > 10) {
      issues.push({
        file: 'annotation_jobs',
        severity: 'high',
        type: 'job_failures',
        message: `${failedJobs.length} jobs de anotação falharam nos últimos 30 dias`
      });
    }

    // 3. Verificar palavras não classificadas (NC)
    const { count: ncCount } = await supabase
      .from('semantic_disambiguation_cache')
      .select('*', { count: 'exact', head: true })
      .eq('tagset_codigo', 'NC');

    if (ncCount && ncCount > 500) {
      issues.push({
        file: 'semantic_disambiguation_cache',
        severity: ncCount > 2000 ? 'high' : 'medium',
        type: 'unclassified_words',
        message: `${ncCount} palavras não classificadas (NC) no cache semântico`
      });
    }

    // 4. Verificar baixa confiança nas classificações
    const { count: lowConfCount } = await supabase
      .from('semantic_disambiguation_cache')
      .select('*', { count: 'exact', head: true })
      .lt('confianca', 0.7);

    if (lowConfCount && lowConfCount > 1000) {
      issues.push({
        file: 'semantic_disambiguation_cache',
        severity: 'medium',
        type: 'low_confidence',
        message: `${lowConfCount} classificações com confiança < 70%`
      });
    }

    // 5. Verificar músicas sem letras
    const { count: noLyricsCount } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .or('lyrics.is.null,lyrics.eq.');

    if (noLyricsCount && noLyricsCount > 5000) {
      issues.push({
        file: 'songs',
        severity: 'medium',
        type: 'missing_lyrics',
        message: `${noLyricsCount} músicas sem letras no catálogo`
      });
    }

    // 6. Verificar alertas métricos não resolvidos
    const { count: unresolvedAlerts } = await supabase
      .from('metric_alerts')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null);

    if (unresolvedAlerts && unresolvedAlerts > 5) {
      issues.push({
        file: 'metric_alerts',
        severity: unresolvedAlerts > 20 ? 'critical' : 'high',
        type: 'unresolved_alerts',
        message: `${unresolvedAlerts} alertas métricos não resolvidos`
      });
    }

    // Calcular métricas
    const totalIssues = issues.length;
    const resolvedIssues = Math.max(0, baselineIssues - totalIssues);
    const newIssues = Math.max(0, totalIssues - baselineIssues);
    const pendingIssues = totalIssues;
    
    const improvementPercentage = baselineIssues > 0 
      ? ((baselineIssues - totalIssues) / baselineIssues) * 100 
      : 0;

    // Contar arquivos analisados (tabelas verificadas)
    const filesAnalyzed = 6; // edge_function_logs, annotation_jobs, semantic_disambiguation_cache (2x), songs, metric_alerts

    const scanResult: ScanResult = {
      scanType,
      filesAnalyzed,
      totalIssues,
      resolvedIssues,
      newIssues,
      pendingIssues,
      issues,
      improvementPercentage
    };

    // Salvar resultado no histórico
    const { data: savedScan, error: saveError } = await supabase
      .from('code_scan_history')
      .insert({
        scan_type: scanType,
        files_analyzed: filesAnalyzed,
        total_issues: totalIssues,
        resolved_issues: resolvedIssues,
        new_issues: newIssues,
        pending_issues: pendingIssues,
        improvement_percentage: Math.round(improvementPercentage * 100) / 100,
        scan_duration_ms: Date.now() - startTime,
        comparison_baseline: lastScan?.id || null,
        scan_data: {
          comparison: {
            resolved: [],
            new: issues.filter(i => i.severity === 'critical' || i.severity === 'high'),
            pending: issues
          },
          summary: {
            totalIssues,
            resolvedSinceBaseline: resolvedIssues,
            newIssues,
            overallImprovement: improvementPercentage.toFixed(1)
          },
          issues
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('[scan-code-quality] Erro ao salvar scan:', saveError);
    }

    console.log(`[scan-code-quality] Scan concluído: ${totalIssues} issues em ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      scan: savedScan || scanResult,
      summary: {
        totalIssues,
        resolvedSinceBaseline: resolvedIssues,
        newIssues,
        overallImprovement: improvementPercentage.toFixed(1)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[scan-code-quality] Erro:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
