/**
 * ✅ FASE 3 - BLOCO 1 + SPRINT 1: Edge Function de Cancelamento com Advisory Locks
 * Usa função SQL atômica para prevenir race conditions em cancelamentos simultâneos
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelRequest {
  jobId: string;
  reason: string;
}

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

    const { jobId, reason } = await req.json() as CancelRequest;

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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
