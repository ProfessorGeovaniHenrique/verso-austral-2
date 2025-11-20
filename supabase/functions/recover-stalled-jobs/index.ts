import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Checking for stalled jobs...');

    // Find jobs stalled for > 15 minutes
    const stalledThreshold = new Date(Date.now() - 15 * 60 * 1000);
    
    const { data: stalledJobs, error: fetchError } = await supabase
      .from('dictionary_import_jobs')
      .select('*')
      .in('status', ['processando', 'iniciado'])
      .lt('atualizado_em', stalledThreshold.toISOString());

    if (fetchError) throw fetchError;

    if (!stalledJobs || stalledJobs.length === 0) {
      console.log('✅ No stalled jobs found');
      return new Response(JSON.stringify({ message: 'No stalled jobs', recovered: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`⚠️ Found ${stalledJobs.length} stalled job(s)`);

    const recoveryResults = [];

    for (const job of stalledJobs) {
      console.log(`🔧 Attempting recovery for job ${job.id} (${job.tipo_dicionario})...`);

      // Check how many recovery attempts already exist
      const { data: previousAttempts } = await supabase
        .from('dictionary_job_recovery_log')
        .select('recovery_attempt')
        .eq('job_id', job.id)
        .order('recovery_attempt', { ascending: false })
        .limit(1);

      const attemptNumber = (previousAttempts?.[0]?.recovery_attempt || 0) + 1;

      if (attemptNumber > 3) {
        // Too many attempts, mark as error
        console.log(`❌ Job ${job.id} has failed recovery ${attemptNumber} times. Marking as error.`);

        await supabase
          .from('dictionary_import_jobs')
          .update({
            status: 'erro',
            erro_mensagem: `Job travado após ${attemptNumber} tentativas de recuperação automática`,
            tempo_fim: new Date().toISOString()
          })
          .eq('id', job.id);

        await supabase
          .from('dictionary_job_recovery_log')
          .insert({
            job_id: job.id,
            recovery_attempt: attemptNumber,
            strategy: 'force-complete',
            success: false,
            error_message: 'Maximum recovery attempts exceeded',
            metadata: { reason: 'Too many failed recovery attempts' }
          });

        recoveryResults.push({
          job_id: job.id,
          tipo: job.tipo_dicionario,
          success: false,
          reason: 'Max attempts exceeded'
        });

        continue;
      }

      // Strategy 1: Try to resume from last offset
      try {
        const lastOffset = job.verbetes_processados || 0;

        // Update job to retry
        await supabase
          .from('dictionary_import_jobs')
          .update({
            status: 'processando',
            atualizado_em: new Date().toISOString(),
            erro_mensagem: null
          })
          .eq('id', job.id);

        // Log recovery attempt
        await supabase
          .from('dictionary_job_recovery_log')
          .insert({
            job_id: job.id,
            recovery_attempt: attemptNumber,
            strategy: 'auto-retry',
            success: true,
            error_message: null,
            metadata: { 
              last_offset: lastOffset,
              time_stalled: Date.now() - new Date(job.atualizado_em).getTime()
            }
          });

        console.log(`✅ Job ${job.id} marked for retry (attempt ${attemptNumber})`);

        recoveryResults.push({
          job_id: job.id,
          tipo: job.tipo_dicionario,
          success: true,
          strategy: 'auto-retry',
          attempt: attemptNumber
        });

      } catch (error) {
        console.error(`❌ Failed to recover job ${job.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await supabase
          .from('dictionary_job_recovery_log')
          .insert({
            job_id: job.id,
            recovery_attempt: attemptNumber,
            strategy: 'auto-retry',
            success: false,
            error_message: errorMessage,
            metadata: { error: String(error) }
          });

        recoveryResults.push({
          job_id: job.id,
          tipo: job.tipo_dicionario,
          success: false,
          reason: errorMessage
        });
      }
    }

    const successCount = recoveryResults.filter(r => r.success).length;

    console.log(`✅ Recovery complete: ${successCount}/${stalledJobs.length} jobs recovered`);

    return new Response(JSON.stringify({ 
      message: `Recovered ${successCount}/${stalledJobs.length} stalled jobs`,
      results: recoveryResults,
      recovered: successCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in recover-stalled-jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
