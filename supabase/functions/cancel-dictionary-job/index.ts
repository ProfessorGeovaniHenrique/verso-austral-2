/**
 * ✅ SPRINT 1 + SPRINT 2 + SPRINT 3: Cancelamento Resiliente
 * Advisory Locks + Validação + Rate Limiting + Circuit Breaker + Retry + Idempotência
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cancelJobSchema, createValidationMiddleware } from "../_shared/validation.ts";
import { checkRateLimit, RateLimitPresets, createRateLimitHeaders } from "../_shared/rate-limit.ts";
import { withCircuitBreaker, CircuitBreakerPresets } from "../_shared/circuit-breaker.ts";
import { withSupabaseRetry } from "../_shared/retry.ts";
import { withTimeout, Timeouts } from "../_shared/timeout.ts";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withInstrumentation('cancel-dictionary-job', async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await createHealthCheck('cancel-dictionary-job', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autenticado");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Não autenticado");
    }

    // 🔒 Rate Limiting (5 cancelamentos por minuto por usuário)
    const rateLimitResult = await checkRateLimit(
      `cancel-job:${user.id}`,
      RateLimitPresets.STRICT
    );

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...createRateLimitHeaders(rateLimitResult),
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    // ✅ Validação com Zod
    const validateRequest = createValidationMiddleware(cancelJobSchema);
    const validation = await validateRequest(req);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: validation.error,
          details: validation.details?.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { jobId, reason } = validation.data;

    // Validação
    if (!jobId || !reason || reason.trim().length < 5) {
      throw new Error("jobId e reason (mínimo 5 caracteres) são obrigatórios");
    }

    // Job cancellation requested

    // 🔒 Executar com Circuit Breaker + Retry + Timeout + Idempotência
    const result = await withTimeout(
      () => withCircuitBreaker(
        'cancel-job-db',
        () => withSupabaseRetry(async () => {
          // Função SQL é idempotente - pode ser chamada múltiplas vezes
          const { data, error } = await supabaseClient.rpc('cancel_job_atomic', {
            p_job_id: jobId,
            p_user_id: user.id,
            p_reason: reason
          });

          if (error) throw error;
          if (!data || data.length === 0) {
            throw new Error('Nenhum resultado retornado');
          }
          return data[0];
        }),
        undefined, // no fallback
        CircuitBreakerPresets.CRITICAL
      ),
      Timeouts.JOB_CANCELLATION,
      'Timeout ao cancelar job (30s)'
    );

    if (!result.success) {
      throw new Error(result.message || 'Falha ao cancelar job');
    }

    // Job cancelled successfully

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: result.message,
        jobId,
        jobStatus: result.job_status,
        forcedCancellation: result.forced
      }),
      { 
        headers: { 
          ...corsHeaders, 
          ...createRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error: any) {
    // Error cancelling job

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
