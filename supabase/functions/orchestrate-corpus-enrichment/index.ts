/**
 * Edge Function: orchestrate-corpus-enrichment
 * Orquestra processamento sequencial de enriquecimento por corpus
 * 
 * Sprint AUD-P3: Batch Execution
 * - Processa corpora em sequência: Gaúcho → Sertanejo → Nordestino
 * - Auto-detecta conclusão e inicia próximo corpus
 * - Limpa jobs órfãos antes de iniciar
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ordem de processamento dos corpora (IDs corretos do banco)
const CORPUS_SEQUENCE = [
  { id: '0f6e39d6-2f4d-4b6a-9a14-c122abc64f8c', name: 'Gaúcho', type: 'gaucho' },
  { id: 'fcc48703-d291-421c-b3a3-e2c3c6c8cfe0', name: 'Sertanejo', type: 'sertanejo' },
  { id: '1e7256cd-5adf-4196-85f9-4af7031f098a', name: 'Nordestino', type: 'nordestino' },
];

const ABANDONED_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

interface OrchestrationPayload {
  action: 'start' | 'status' | 'skip' | 'stop' | 'cleanup';
  corpusId?: string;
  jobType?: 'metadata' | 'youtube' | 'full';
}

interface OrchestrationState {
  isRunning: boolean;
  currentCorpusIndex: number;
  currentCorpusId: string | null;
  currentCorpusName: string | null;
  currentJobId: string | null;
  completedCorpora: string[];
  totalProcessed: number;
  totalFailed: number;
  startedAt: string | null;
  lastActivity: string | null;
}

function createSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function cleanupOrphanedJobs(supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MS).toISOString();
  
  // Buscar jobs órfãos
  const { data: orphanedJobs, error } = await supabase
    .from('enrichment_jobs')
    .select('id, job_type, corpus_type, artist_name, songs_processed, tempo_inicio')
    .eq('status', 'processando')
    .eq('songs_processed', 0)
    .lt('tempo_inicio', abandonedThreshold);
  
  if (error || !orphanedJobs || orphanedJobs.length === 0) {
    return 0;
  }
  
  console.log(`[orchestrate] Detectados ${orphanedJobs.length} jobs órfãos`);
  
  for (const job of orphanedJobs) {
    console.log(`[orchestrate] Marcando job ${job.id} (${job.corpus_type || job.artist_name}) como erro`);
    await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'erro', 
        erro_mensagem: 'Job órfão - sem progresso por 5+ minutos',
        tempo_fim: new Date().toISOString()
      })
      .eq('id', job.id);
  }
  
  return orphanedJobs.length;
}

async function getOrchestrationState(supabase: ReturnType<typeof createSupabaseClient>): Promise<OrchestrationState> {
  // Verificar se há job ativo
  const { data: activeJob } = await supabase
    .from('enrichment_jobs')
    .select('*')
    .eq('scope', 'corpus')
    .in('status', ['processando', 'pausado', 'pendente'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  // Buscar corpora já concluídos
  const { data: completedJobs } = await supabase
    .from('enrichment_jobs')
    .select('corpus_id, songs_processed, songs_failed, tempo_fim')
    .eq('scope', 'corpus')
    .eq('status', 'concluido')
    .order('tempo_fim', { ascending: false });
  
  const completedCorpora = [...new Set((completedJobs || []).map(j => j.corpus_id).filter(Boolean))];
  const totalProcessed = (completedJobs || []).reduce((sum, j) => sum + (j.songs_processed || 0), 0);
  const totalFailed = (completedJobs || []).reduce((sum, j) => sum + (j.songs_failed || 0), 0);
  
  if (activeJob) {
    const corpusIndex = CORPUS_SEQUENCE.findIndex(c => c.id === activeJob.corpus_id);
    return {
      isRunning: activeJob.status === 'processando',
      currentCorpusIndex: corpusIndex,
      currentCorpusId: activeJob.corpus_id,
      currentCorpusName: CORPUS_SEQUENCE[corpusIndex]?.name || null,
      currentJobId: activeJob.id,
      completedCorpora,
      totalProcessed: totalProcessed + (activeJob.songs_processed || 0),
      totalFailed: totalFailed + (activeJob.songs_failed || 0),
      startedAt: activeJob.tempo_inicio,
      lastActivity: activeJob.last_chunk_at || activeJob.updated_at,
    };
  }
  
  return {
    isRunning: false,
    currentCorpusIndex: -1,
    currentCorpusId: null,
    currentCorpusName: null,
    currentJobId: null,
    completedCorpora,
    totalProcessed,
    totalFailed,
    startedAt: null,
    lastActivity: null,
  };
}

async function getCorpusPendingCount(supabase: ReturnType<typeof createSupabaseClient>, corpusId: string): Promise<number> {
  const { count } = await supabase
    .from('songs')
    .select('id', { count: 'exact', head: true })
    .eq('corpus_id', corpusId)
    .in('status', ['pending', 'error']);
  
  return count || 0;
}

async function startCorpusEnrichment(
  supabase: ReturnType<typeof createSupabaseClient>,
  corpusId: string,
  corpusType: string,
  jobType: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/enrich-songs-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        jobType,
        scope: 'corpus',
        corpusId,
        corpusType,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Falha ao iniciar enriquecimento' };
    }
    
    return { success: true, jobId: data.jobId };
  } catch (err) {
    console.error(`[orchestrate] Erro iniciando corpus ${corpusType}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

async function stopOrchestration(supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  const { data: activeJobs, error } = await supabase
    .from('enrichment_jobs')
    .update({ is_cancelling: true })
    .eq('scope', 'corpus')
    .in('status', ['processando', 'pausado', 'pendente'])
    .select();
  
  if (error) {
    console.error('[orchestrate] Erro ao parar:', error);
    return 0;
  }
  
  return activeJobs?.length || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createSupabaseClient();

  try {
    const payload: OrchestrationPayload = await req.json();
    console.log(`[orchestrate] Ação: ${payload.action}`);

    // Limpar jobs órfãos em qualquer ação
    const orphansCleaned = await cleanupOrphanedJobs(supabase);
    if (orphansCleaned > 0) {
      console.log(`[orchestrate] ${orphansCleaned} jobs órfãos limpos`);
    }

    const state = await getOrchestrationState(supabase);

    switch (payload.action) {
      case 'status': {
        // Buscar estatísticas por corpus
        const corpusStats = await Promise.all(
          CORPUS_SEQUENCE.map(async (corpus) => {
            const pendingCount = await getCorpusPendingCount(supabase, corpus.id);
            const isCompleted = state.completedCorpora.includes(corpus.id);
            const isActive = state.currentCorpusId === corpus.id;
            
            // Buscar último job do corpus
            const { data: lastJob } = await supabase
              .from('enrichment_jobs')
              .select('songs_processed, songs_succeeded, songs_failed, tempo_fim')
              .eq('corpus_id', corpus.id)
              .eq('scope', 'corpus')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            return {
              ...corpus,
              pendingCount,
              isCompleted,
              isActive,
              songsProcessed: lastJob?.songs_processed || 0,
              songsFailed: lastJob?.songs_failed || 0,
            };
          })
        );

        return new Response(
          JSON.stringify({
            success: true,
            state,
            corpora: corpusStats,
            orphansCleaned,
            sequence: CORPUS_SEQUENCE,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cleanup': {
        return new Response(
          JSON.stringify({
            success: true,
            orphansCleaned,
            message: `${orphansCleaned} jobs órfãos limpos`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'start': {
        if (state.isRunning) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Já existe um processamento em andamento',
              state,
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Determinar próximo corpus a processar
        let nextCorpus = null;
        
        if (payload.corpusId) {
          // Corpus específico solicitado
          nextCorpus = CORPUS_SEQUENCE.find(c => c.id === payload.corpusId);
        } else {
          // Próximo na sequência não concluído
          for (const corpus of CORPUS_SEQUENCE) {
            if (!state.completedCorpora.includes(corpus.id)) {
              nextCorpus = corpus;
              break;
            }
          }
        }

        if (!nextCorpus) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Todos os corpora já foram processados',
              state,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[orchestrate] Iniciando corpus: ${nextCorpus.name}`);
        const result = await startCorpusEnrichment(
          supabase,
          nextCorpus.id,
          nextCorpus.type,
          payload.jobType || 'metadata'
        );

        if (!result.success) {
          return new Response(
            JSON.stringify({
              success: false,
              error: result.error,
              corpus: nextCorpus,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Iniciado processamento do corpus ${nextCorpus.name}`,
            corpus: nextCorpus,
            jobId: result.jobId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'skip': {
        if (!state.currentJobId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Nenhum job ativo para pular',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cancelar job atual
        await supabase
          .from('enrichment_jobs')
          .update({ 
            status: 'cancelado',
            is_cancelling: false,
            tempo_fim: new Date().toISOString(),
            erro_mensagem: 'Pulado pelo orquestrador'
          })
          .eq('id', state.currentJobId);

        // Iniciar próximo corpus
        const nextIndex = state.currentCorpusIndex + 1;
        if (nextIndex < CORPUS_SEQUENCE.length) {
          const nextCorpus = CORPUS_SEQUENCE[nextIndex];
          const result = await startCorpusEnrichment(
            supabase,
            nextCorpus.id,
            nextCorpus.type,
            payload.jobType || 'metadata'
          );

          return new Response(
            JSON.stringify({
              success: true,
              message: `Pulado para corpus ${nextCorpus.name}`,
              corpus: nextCorpus,
              jobId: result.jobId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Último corpus pulado, orquestração concluída',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'stop': {
        const stopped = await stopOrchestration(supabase);
        return new Response(
          JSON.stringify({
            success: true,
            message: `${stopped} job(s) marcado(s) para cancelamento`,
            stopped,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err) {
    console.error('[orchestrate] Erro:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro interno' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
