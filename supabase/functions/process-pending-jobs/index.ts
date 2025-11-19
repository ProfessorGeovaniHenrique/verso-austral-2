/**
 * Processador agendado de jobs de anotação pendentes
 * Executa via pg_cron a cada minuto para garantir processamento
 * mesmo se EdgeRuntime.waitUntil falhar
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] 🔄 Iniciando processamento de jobs pendentes`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar jobs pendentes (máximo 5 por execução)
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('annotation_jobs')
      .select('*')
      .eq('status', 'pendente')
      .order('tempo_inicio', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error(`[${requestId}] Erro ao buscar jobs pendentes:`, fetchError);
      throw fetchError;
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log(`[${requestId}] ✅ Nenhum job pendente encontrado`);
      return new Response(
        JSON.stringify({ message: 'Nenhum job pendente', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] 📋 ${pendingJobs.length} job(s) pendente(s) encontrado(s)`);

    // Processar cada job invocando a função annotate-semantic
    const results = [];
    for (const job of pendingJobs) {
      try {
        console.log(`[${requestId}] 🚀 Processando job ${job.id}`);

        // Marcar como processando
        await supabase
          .from('annotation_jobs')
          .update({ status: 'processando' })
          .eq('id', job.id);

        // Invocar função de anotação
        const { data: invokeData, error: invokeError } = await supabase.functions.invoke(
          'annotate-semantic',
          {
            body: {
              corpus_type: job.corpus_type,
              demo_mode: job.demo_mode,
              custom_text: job.custom_text,
              reference_corpus: job.reference_corpus,
              job_id: job.id, // Passar job_id para não criar novo
            },
          }
        );

        if (invokeError) {
          console.error(`[${requestId}] Erro ao invocar annotate-semantic para job ${job.id}:`, invokeError);
          
          // Marcar como erro
          await supabase
            .from('annotation_jobs')
            .update({ 
              status: 'erro',
              erro_mensagem: invokeError.message,
              tempo_fim: new Date().toISOString()
            })
            .eq('id', job.id);

          results.push({ job_id: job.id, success: false, error: invokeError.message });
        } else {
          console.log(`[${requestId}] ✅ Job ${job.id} processado com sucesso`);
          results.push({ job_id: job.id, success: true });
        }
      } catch (error) {
        console.error(`[${requestId}] Erro ao processar job ${job.id}:`, error);
        results.push({ job_id: job.id, success: false, error: (error as Error).message });
      }
    }

    console.log(`[${requestId}] ✅ Processamento concluído: ${results.length} job(s)`);

    return new Response(
      JSON.stringify({ 
        message: 'Jobs processados',
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Erro fatal no processador de jobs:`, error);
    
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
