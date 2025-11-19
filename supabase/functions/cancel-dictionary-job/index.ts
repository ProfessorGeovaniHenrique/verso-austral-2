/**
 * ✅ FASE 3 - BLOCO 1: Edge Function de Cancelamento de Jobs
 * Permite interromper importações em andamento com confirmação e logging
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
  cleanupData?: boolean;
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

    const { jobId, reason, cleanupData = false } = await req.json() as CancelRequest;

    // Validação
    if (!jobId || !reason || reason.trim().length < 5) {
      throw new Error("jobId e reason (mínimo 5 caracteres) são obrigatórios");
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🛑 CANCELAMENTO SOLICITADO                               
║  📋 Job ID: ${jobId.substring(0, 8)}...
║  👤 Usuário: ${user.email}
║  📝 Motivo: ${reason}
║  🧹 Cleanup: ${cleanupData ? 'SIM' : 'NÃO'}
╚═══════════════════════════════════════════════════════════╝
`);

    // 1️⃣ Buscar o job
    const { data: job, error: fetchError } = await supabaseClient
      .from('dictionary_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      throw new Error('Job não encontrado');
    }

    // Verificar se job pode ser cancelado
    if (!['iniciado', 'processando', 'pendente'].includes(job.status)) {
      throw new Error(`Job não pode ser cancelado (status: ${job.status})`);
    }

    console.log(`✅ Job encontrado: ${job.tipo_dicionario} (status: ${job.status})`);

    // 2️⃣ Sinalizar cancelamento
    const { error: updateError } = await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        is_cancelling: true,
        cancellation_reason: reason,
        cancelled_by: user.id,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) throw updateError;

    console.log(`🏴 Flag is_cancelling definido. Aguardando edge function detectar...`);

    // 3️⃣ Aguardar até 10 segundos para a edge function detectar e parar
    let attempts = 0;
    let jobCancelled = false;

    while (attempts < 20 && !jobCancelled) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: updatedJob } = await supabaseClient
        .from('dictionary_import_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (updatedJob?.status === 'cancelado') {
        jobCancelled = true;
        console.log(`✅ Edge function detectou cancelamento e parou gracefully`);
        break;
      }
      attempts++;
    }

    // 4️⃣ Se edge function não parou, forçar status
    if (!jobCancelled) {
      console.warn(`⚠️ Edge function não detectou cancelamento em 10s. Forçando status...`);
      
      const { error: forceError } = await supabaseClient
        .from('dictionary_import_jobs')
        .update({
          status: 'cancelado',
          cancelled_at: new Date().toISOString(),
          tempo_fim: new Date().toISOString(),
          erro_mensagem: 'Job cancelado manualmente pelo usuário'
        })
        .eq('id', jobId);

      if (forceError) throw forceError;
      console.log(`✅ Status forçado para 'cancelado'`);
    }

    // 5️⃣ Limpar dados parciais se solicitado
    let deletedEntries = 0;
    if (cleanupData) {
      console.log(`🧹 Limpando dados parciais do job ${jobId}...`);
      
      // Determinar tabela baseado no tipo de dicionário
      let tableName = 'dialectal_lexicon';
      if (job.tipo_dicionario.toLowerCase().includes('gutenberg')) {
        tableName = 'gutenberg_lexicon';
      } else if (job.tipo_dicionario.toLowerCase().includes('houaiss')) {
        tableName = 'lexical_synonyms';
      } else if (job.tipo_dicionario.toLowerCase().includes('unesp')) {
        tableName = 'lexical_definitions';
      }

      // Tentar deletar por metadata (assumindo que alguns jobs armazenam job_id)
      const { data: deletedData, error: deleteError } = await supabaseClient
        .from(tableName)
        .delete()
        .filter('metadata->job_id', 'eq', jobId)
        .select();

      if (!deleteError && deletedData && deletedData.length > 0) {
        deletedEntries = deletedData.length;
        console.log(`✅ ${deletedEntries} entradas removidas de ${tableName}`);
      } else {
        console.log(`ℹ️ Nenhuma entrada encontrada com job_id na metadata`);
      }
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ JOB CANCELADO COM SUCESSO                             
║  📊 Entradas removidas: ${deletedEntries}
║  ⏱️  Tempo de processamento: ${jobCancelled ? '<10s' : '10s (forçado)'}
╚═══════════════════════════════════════════════════════════╝
`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Job cancelado com sucesso',
        deletedEntries,
        jobId,
        forcedCancellation: !jobCancelled
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
