/**
 * Edge Function: process-catalog-batch
 * Orquestra processamento completo em batch usando process-song-complete
 * Com auto-invocação recursiva e rate limit adaptativo
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUNK_SIZE = 30;
const LOCK_TIMEOUT_MS = 90000;
const AUTO_INVOKE_DELAY_MS = 3000;
const RATE_LIMIT_BASE_MS = 500;
const MAX_CONSECUTIVE_ERRORS = 5;

interface ProcessBatchPayload {
  jobId?: string;
  continueFrom?: number;
  forceLock?: boolean;
  scope?: 'global' | 'corpus' | 'artist';
  scopeFilter?: string; // corpus_id ou artist_id
  skipEnrichment?: boolean;
  skipAnnotation?: boolean;
  forceReprocess?: boolean;
}

interface ProcessingJob {
  id: string;
  status: string;
  scope: string;
  scope_filter: string | null;
  total_songs: number;
  songs_processed: number;
  songs_enriched: number;
  songs_annotated: number;
  songs_failed: number;
  avg_quality_score: number;
  total_quality_points: number;
  quality_distribution: Record<string, number>;
  chunk_size: number;
  chunks_processed: number;
  current_song_index: number;
  last_chunk_at: string | null;
  is_cancelling: boolean;
  metadata: Record<string, unknown>;
}

function createSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function acquireLock(supabase: ReturnType<typeof createSupabaseClient>, jobId: string, forceLock = false): Promise<boolean> {
  const lockThreshold = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();
  
  if (forceLock) {
    const { data, error } = await supabase
      .from('processing_jobs')
      .update({ last_chunk_at: new Date().toISOString() })
      .eq('id', jobId)
      .select();
    
    return !error && data && data.length > 0;
  }
  
  const { data, error } = await supabase
    .from('processing_jobs')
    .update({ last_chunk_at: new Date().toISOString() })
    .eq('id', jobId)
    .or(`last_chunk_at.is.null,last_chunk_at.lte.${lockThreshold}`)
    .select();
  
  return !error && data && data.length > 0;
}

async function checkCancellation(supabase: ReturnType<typeof createSupabaseClient>, jobId: string): Promise<boolean> {
  const { data } = await supabase
    .from('processing_jobs')
    .select('is_cancelling, status')
    .eq('id', jobId)
    .single();
  
  return data?.is_cancelling || data?.status === 'cancelado';
}

async function getSongsToProcess(
  supabase: ReturnType<typeof createSupabaseClient>,
  job: ProcessingJob,
  startIndex: number
): Promise<Array<{ id: string; title: string }>> {
  let query = supabase
    .from('songs')
    .select('id, title')
    .order('created_at', { ascending: true })
    .range(startIndex, startIndex + CHUNK_SIZE - 1);

  if (job.scope === 'artist' && job.scope_filter) {
    query = query.eq('artist_id', job.scope_filter);
  } else if (job.scope === 'corpus' && job.scope_filter) {
    query = query.eq('corpus_id', job.scope_filter);
  }

  const { data } = await query;
  return data || [];
}

async function countTotalSongs(
  supabase: ReturnType<typeof createSupabaseClient>,
  scope: string,
  scopeFilter?: string
): Promise<number> {
  let query = supabase.from('songs').select('id', { count: 'exact', head: true });

  if (scope === 'artist' && scopeFilter) {
    query = query.eq('artist_id', scopeFilter);
  } else if (scope === 'corpus' && scopeFilter) {
    query = query.eq('corpus_id', scopeFilter);
  }

  const { count } = await query;
  return count || 0;
}

async function processSong(
  supabase: ReturnType<typeof createSupabaseClient>,
  songId: string,
  skipEnrichment: boolean,
  skipAnnotation: boolean,
  forceReprocess: boolean
): Promise<{ success: boolean; qualityScore: number; enriched: boolean; annotated: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('process-song-complete', {
      body: { songId, skipEnrichment, skipAnnotation, forceReprocess }
    });

    if (error) {
      console.error(`[process-catalog-batch] Erro processando música ${songId}:`, error);
      return { success: false, qualityScore: 0, enriched: false, annotated: false };
    }

    const phases = data?.phases || {};
    return {
      success: data?.success || false,
      qualityScore: phases.quality?.score || 0,
      enriched: phases.enrichment?.success || false,
      annotated: phases.annotation?.wordsProcessed > 0
    };
  } catch (err) {
    console.error(`[process-catalog-batch] Exceção processando música ${songId}:`, err);
    return { success: false, qualityScore: 0, enriched: false, annotated: false };
  }
}

async function updateJobProgress(
  supabase: ReturnType<typeof createSupabaseClient>,
  jobId: string,
  updates: Partial<ProcessingJob>
): Promise<void> {
  const { error } = await supabase
    .from('processing_jobs')
    .update({
      ...updates,
      last_chunk_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (error) {
    console.error(`[process-catalog-batch] Erro atualizando job:`, error);
  }
}

function getQualityBucket(score: number): string {
  if (score <= 25) return '0-25';
  if (score <= 50) return '26-50';
  if (score <= 75) return '51-75';
  return '76-100';
}

async function autoInvokeNextChunk(jobId: string, continueFrom: number): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  try {
    console.log(`[process-catalog-batch] Auto-invocando próximo chunk (índice ${continueFrom})...`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-catalog-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ jobId, continueFrom }),
    });

    if (!response.ok) {
      console.error(`[process-catalog-batch] Falha na auto-invocação: ${response.status}`);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error(`[process-catalog-batch] Erro na auto-invocação:`, err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createSupabaseClient();

  try {
    const payload: ProcessBatchPayload = await req.json();
    console.log(`[process-catalog-batch] Payload:`, JSON.stringify(payload));

    let job: ProcessingJob;
    let startIndex = payload.continueFrom || 0;
    let isNewJob = false;

    if (payload.jobId) {
      // Continuar job existente
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('id', payload.jobId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Job não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      job = data as ProcessingJob;

      if (job.status === 'cancelado' || job.status === 'concluido') {
        return new Response(
          JSON.stringify({ success: false, error: `Job já está ${job.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (await checkCancellation(supabase, job.id)) {
        await supabase
          .from('processing_jobs')
          .update({ 
            status: 'cancelado', 
            completed_at: new Date().toISOString(),
            is_cancelling: false
          })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({ success: true, message: 'Job cancelado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lockAcquired = await acquireLock(supabase, job.id, payload.forceLock);
      if (!lockAcquired) {
        return new Response(
          JSON.stringify({ success: false, error: 'Lock não adquirido' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else {
      // Criar novo job
      isNewJob = true;
      const scope = payload.scope || 'global';
      const scopeFilter = payload.scopeFilter || null;

      const totalSongs = await countTotalSongs(supabase, scope, scopeFilter || undefined);

      const { data: newJob, error: createError } = await supabase
        .from('processing_jobs')
        .insert({
          scope,
          scope_filter: scopeFilter,
          total_songs: totalSongs,
          status: 'processando',
          started_at: new Date().toISOString(),
          last_chunk_at: new Date().toISOString(),
          chunk_size: CHUNK_SIZE,
          metadata: {
            skipEnrichment: payload.skipEnrichment || false,
            skipAnnotation: payload.skipAnnotation || false,
            forceReprocess: payload.forceReprocess || false
          }
        })
        .select()
        .single();

      if (createError || !newJob) {
        console.error(`[process-catalog-batch] Erro criando job:`, createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro criando job' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      job = newJob as ProcessingJob;
      console.log(`[process-catalog-batch] Novo job criado: ${job.id}, total: ${totalSongs}`);
    }

    // Atualizar status para processando
    if (!isNewJob) {
      await supabase
        .from('processing_jobs')
        .update({ status: 'processando' })
        .eq('id', job.id);
    }

    // Buscar músicas para este chunk
    const songs = await getSongsToProcess(supabase, job, startIndex);
    console.log(`[process-catalog-batch] Processando ${songs.length} músicas a partir do índice ${startIndex}`);

    if (songs.length === 0) {
      // Job concluído
      const avgQuality = job.songs_processed > 0 
        ? Math.round(job.total_quality_points / job.songs_processed) 
        : 0;

      await supabase
        .from('processing_jobs')
        .update({
          status: 'concluido',
          completed_at: new Date().toISOString(),
          avg_quality_score: avgQuality
        })
        .eq('id', job.id);

      console.log(`[process-catalog-batch] Job ${job.id} concluído!`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId: job.id, 
          status: 'concluido',
          stats: {
            processed: job.songs_processed,
            enriched: job.songs_enriched,
            annotated: job.songs_annotated,
            failed: job.songs_failed,
            avgQuality
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar chunk
    const metadata = job.metadata as Record<string, boolean> || {};
    const skipEnrichment = metadata.skipEnrichment || payload.skipEnrichment || false;
    const skipAnnotation = metadata.skipAnnotation || payload.skipAnnotation || false;
    const forceReprocess = metadata.forceReprocess || payload.forceReprocess || false;

    let processed = 0;
    let enriched = 0;
    let annotated = 0;
    let failed = 0;
    let totalQualityPoints = 0;
    const qualityDistribution = { ...job.quality_distribution } as Record<string, number>;
    let consecutiveErrors = 0;

    for (const song of songs) {
      // Verificar cancelamento
      if (await checkCancellation(supabase, job.id)) {
        console.log(`[process-catalog-batch] Job cancelado durante processamento`);
        break;
      }

      console.log(`[process-catalog-batch] Processando: ${song.title}`);
      const result = await processSong(supabase, song.id, skipEnrichment, skipAnnotation, forceReprocess);

      if (result.success) {
        processed++;
        if (result.enriched) enriched++;
        if (result.annotated) annotated++;
        totalQualityPoints += result.qualityScore;
        
        const bucket = getQualityBucket(result.qualityScore);
        qualityDistribution[bucket] = (qualityDistribution[bucket] || 0) + 1;
        
        consecutiveErrors = 0;
      } else {
        failed++;
        consecutiveErrors++;
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`[process-catalog-batch] ${MAX_CONSECUTIVE_ERRORS} erros consecutivos, pausando job`);
          
          // Update job with error state
          await supabase
            .from('processing_jobs')
            .update({
              status: 'pausado',
              songs_processed: job.songs_processed + processed,
              songs_enriched: job.songs_enriched + enriched,
              songs_annotated: job.songs_annotated + annotated,
              songs_failed: job.songs_failed + failed,
              total_quality_points: job.total_quality_points + totalQualityPoints,
              quality_distribution: qualityDistribution,
              current_song_index: startIndex + processed + failed,
              chunks_processed: job.chunks_processed + 1,
              error_message: 'Pausado automaticamente após erros consecutivos',
              last_chunk_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          return new Response(
            JSON.stringify({ success: false, error: 'Pausado após erros consecutivos' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BASE_MS));
    }

    // Atualizar progresso
    const newProcessed = job.songs_processed + processed;
    const newQualityPoints = job.total_quality_points + totalQualityPoints;
    const avgQuality = newProcessed > 0 ? Math.round(newQualityPoints / newProcessed) : 0;

    await updateJobProgress(supabase, job.id, {
      songs_processed: newProcessed,
      songs_enriched: job.songs_enriched + enriched,
      songs_annotated: job.songs_annotated + annotated,
      songs_failed: job.songs_failed + failed,
      total_quality_points: newQualityPoints,
      avg_quality_score: avgQuality,
      quality_distribution: qualityDistribution,
      current_song_index: startIndex + songs.length,
      chunks_processed: job.chunks_processed + 1
    });

    // Auto-invocar próximo chunk
    const nextIndex = startIndex + songs.length;
    if (nextIndex < job.total_songs && !(await checkCancellation(supabase, job.id))) {
      await new Promise(resolve => setTimeout(resolve, AUTO_INVOKE_DELAY_MS));
      await autoInvokeNextChunk(job.id, nextIndex);
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        chunkStats: {
          processed,
          enriched,
          annotated,
          failed,
          avgQuality: processed > 0 ? Math.round(totalQualityPoints / processed) : 0
        },
        totalProgress: {
          processed: newProcessed,
          total: job.total_songs,
          percent: Math.round((newProcessed / job.total_songs) * 100)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error(`[process-catalog-batch] Erro geral:`, err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
