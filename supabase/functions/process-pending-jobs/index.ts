/**
 * Edge Function: process-pending-jobs
 *
 * - Busca jobs com status 'pending' (limit configurável)
 * - Marca job como 'processing' (optimistic lock) antes de processar
 * - Invoca a função 'annotate-semantic' passando job_id para processamento
 * - Em caso de erro, marca job como 'erro' e salva erro_mensagem
 * - Retorna um resumo JSON
 *
 * Segurança:
 * - Usa SUPABASE_SERVICE_ROLE_KEY (NUNCA expor no frontend)
 * - Recomenda-se implantar e agendar esta função no ambiente de staging/production
 *
 * Observação:
 * - A função 'annotate-semantic' deve aceitar payload contendo job_id para processar um job existente
 *   (ou ajuste a invocação conforme sua implementação).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_JOBS_PER_RUN = Number(Deno.env.get("PPJ_MAX_JOBS") || 5);
const INVOKE_TIMEOUT_MS = Number(Deno.env.get("PPJ_INVOKE_TIMEOUT_MS") || 60_000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const requestStartTime = Date.now();
  const log = createEdgeLogger('process-pending-jobs', requestId);
  
  log.info('Function invoked', { maxJobsPerRun: MAX_JOBS_PER_RUN, timeout: INVOKE_TIMEOUT_MS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      log.fatal('Missing required environment variables', undefined, { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      });
      return new Response(JSON.stringify({ error: "Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar jobs pendentes usando FOR UPDATE SKIP LOCKED para evitar race conditions
    // Nota: Como Supabase JS não suporta FOR UPDATE SKIP LOCKED nativamente,
    // usamos uma transação com RPC call ou fazemos lock otimista
    const { data: pendingJobs, error: fetchError } = await supabase
      .from("annotation_jobs")
      .select("*")
      .eq("status", "pending")
      .order("tempo_inicio", { ascending: true })
      .limit(MAX_JOBS_PER_RUN);

    if (fetchError) {
      log.error('Error fetching pending jobs', fetchError as Error, { operation: 'fetch_jobs' });
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      log.info('No pending jobs found', { queueStatus: 'empty' });
      return new Response(JSON.stringify({ message: "No pending jobs", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.info('Found pending jobs', { count: pendingJobs.length });

    const results: Array<{ job_id: any; success: boolean; error?: string }> = [];

    for (const job of pendingJobs) {
      const jobId = job.id;
      log.debug('Attempting to lock job', { jobId, corpusType: job.corpus_type });

      // Optimistic lock melhorado: transition pending -> processing atômicamente
      // A condição .eq("status", "pending") garante que apenas um worker processa o job
      const { data: updated, error: updateErr } = await supabase
        .from("annotation_jobs")
        .update({ 
          status: "processing", 
          tempo_inicio: job.tempo_inicio || new Date().toISOString(),
          progresso: 0,
          palavras_processadas: 0
        })
        .eq("id", jobId)
        .eq("status", "pending") // Lock condition: só atualiza se ainda está pending
        .select()
        .single();

      if (updateErr || !updated) {
        log.warn('Could not lock job - race condition', { 
          jobId, 
          error: updateErr?.message || 'already_claimed',
          lockStatus: 'failed'
        });
        results.push({ job_id: jobId, success: false, error: updateErr?.message || "lock_failed_race_condition" });
        continue;
      }

      log.logJobStart(jobId, 1, { 
        corpusType: job.corpus_type, 
        demoMode: job.demo_mode,
        lockStatus: 'acquired'
      });

      try {
        // Payload enviado para o processor (a função annotate-semantic deve suportar job_id)
        const invokePayload = {
          corpus_type: job.corpus_type,
          demo_mode: job.demo_mode === true || job.demo_mode === "true",
          custom_text: job.custom_text || null,
          artist_filter: job.artist_filter || null,
          start_line: job.start_line ?? null,
          end_line: job.end_line ?? null,
          reference_corpus: job.reference_corpus || null,
          job_id: jobId,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);

        const invokeResponse = await supabase.functions.invoke("annotate-semantic", {
          body: invokePayload,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (invokeResponse.error) {
          log.logJobError(jobId, invokeResponse.error as Error, { 
            operation: 'invoke_annotate_semantic'
          });
          await supabase
            .from("annotation_jobs")
            .update({
              status: "erro",
              erro_mensagem: String(invokeResponse.error.message || invokeResponse.error),
              tempo_fim: new Date().toISOString(),
            })
            .eq("id", jobId);

          results.push({ job_id: jobId, success: false, error: String(invokeResponse.error.message || invokeResponse.error) });
        } else {
          log.logJobComplete(jobId, 1, Date.now() - requestStartTime, { status: 'invoked_successfully' });
          results.push({ job_id: jobId, success: true });
        }
      } catch (err) {
        const msg = ((err && (err as Error).message) || String(err)) as string;
        log.fatal('Fatal error invoking job', err as Error, { jobId, operation: 'invoke' });
        await supabase
          .from("annotation_jobs")
          .update({
            status: "erro",
            erro_mensagem: msg,
            tempo_fim: new Date().toISOString(),
          })
          .eq("id", jobId);

        results.push({ job_id: jobId, success: false, error: msg });
      }
    }

    log.info('Processing completed', { 
      totalProcessed: results.length, 
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    return new Response(JSON.stringify({ message: "Jobs processed", processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const log = createEdgeLogger('process-pending-jobs', crypto.randomUUID());
    log.fatal('Unhandled error in function', error as Error);
    return new Response(JSON.stringify({ error: (error as Error).message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
