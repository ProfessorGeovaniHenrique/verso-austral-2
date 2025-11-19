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
  console.log(`[${requestId}] process-pending-jobs invoked`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`);
      return new Response(JSON.stringify({ error: "Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar jobs pendentes (ordenados por criação)
    const { data: pendingJobs, error: fetchError } = await supabase
      .from("annotation_jobs")
      .select("*")
      .eq("status", "pending")
      .order("tempo_inicio", { ascending: true })
      .limit(MAX_JOBS_PER_RUN);

    if (fetchError) {
      console.error(`[${requestId}] Error fetching pending jobs:`, fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log(`[${requestId}] No pending jobs`);
      return new Response(JSON.stringify({ message: "No pending jobs", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Found ${pendingJobs.length} pending job(s)`);

    const results: Array<{ job_id: any; success: boolean; error?: string }> = [];

    for (const job of pendingJobs) {
      const jobId = job.id;
      console.log(`[${requestId}] Attempting to lock job ${jobId}`);

      // Optimistic lock: transition pending -> processing
      const { data: updated, error: updateErr } = await supabase
        .from("annotation_jobs")
        .update({ status: "processing", tempo_inicio: job.tempo_inicio || new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "pending")
        .select()
        .single();

      if (updateErr || !updated) {
        console.warn(`[${requestId}] Could not lock job ${jobId}:`, updateErr?.message || "already claimed");
        results.push({ job_id: jobId, success: false, error: updateErr?.message || "lock_failed" });
        continue;
      }

      console.log(`[${requestId}] Locked job ${jobId}, invoking annotate-semantic`);

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
          console.error(`[${requestId}] Invocation error for job ${jobId}:`, invokeResponse.error);
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
          console.log(`[${requestId}] Invocation success for job ${jobId}`);
          results.push({ job_id: jobId, success: true });
        }
      } catch (err) {
        const msg = ((err && (err as Error).message) || String(err)) as string;
        console.error(`[${requestId}] Fatal error invoking job ${jobId}:`, msg);
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

    console.log(`[${requestId}] Processing completed; results:`, results);
    return new Response(JSON.stringify({ message: "Jobs processed", processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] Unhandled error:`, error);
    return new Response(JSON.stringify({ error: (error as Error).message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
