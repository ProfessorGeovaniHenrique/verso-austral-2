/**
 * ✅ SPRINT 1 + SPRINT 2: Cancelamento com Advisory Locks + Validação + Rate Limiting
 * Usa função SQL atômica + validação Zod + rate limiting Upstash
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cancelJobSchema, createValidationMiddleware } from "../_shared/validation.ts";
import { checkRateLimit, RateLimitPresets, createRateLimitHeaders } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🛑 CANCELAMENTO SOLICITADO (ATOMIC)                      
║  📋 Job ID: ${jobId.substring(0, 8)}...
║  👤 Usuário: ${user.email}
║  📝 Motivo: ${reason}
║  🔒 Usando Advisory Lock
╚═══════════════════════════════════════════════════════════╝
`);

    // 🔒 Chamar função SQL atômica com advisory lock
    // Previne race conditions em cancelamentos simultâneos
    const { data, error: rpcError } = await supabaseClient
      .rpc('cancel_job_atomic', {
        p_job_id: jobId,
        p_user_id: user.id,
        p_reason: reason
      });

    if (rpcError) {
      console.error(`❌ Erro na função atômica: ${rpcError.message}`);
      throw rpcError;
    }

    if (!data || data.length === 0) {
      throw new Error('Nenhum resultado retornado da função de cancelamento');
    }

    const result = data[0];

    if (!result.success) {
      throw new Error(result.message || 'Falha ao cancelar job');
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ JOB CANCELADO COM SUCESSO (ATOMIC)                    
║  📊 Status: ${result.job_status}
║  ⏱️  Tipo: ${result.forced ? 'FORÇADO após timeout' : 'GRACEFUL'}
║  💬 Mensagem: ${result.message}
╚═══════════════════════════════════════════════════════════╝
`);

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
    console.error(`
╔═══════════════════════════════════════════════════════════╗
║  💥 ERRO AO CANCELAR JOB                                  
║  ❌ ${error.message}
╚═══════════════════════════════════════════════════════════╝
`);
    console.error('Stack trace:', error.stack);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
