/**
 * Edge Function: enrich-songs-batch
 * Sprint ENRICH-ARCHITECTURE-FIX: Auto-invocação síncrona
 * 
 * CORREÇÕES CRÍTICAS:
 * - Auto-invocação SÍNCRONA (não setTimeout que é cancelado)
 * - Circuit breaker para prevenir loops infinitos
 * - Retry resiliente com exponential backoff
 * - Monitoramento melhorado com métricas de saúde
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ CONSTANTES ============
const CHUNK_SIZE = 15;
const PARALLEL_SONGS = 1;
const LOCK_TIMEOUT_MS = 90000;
const ABANDONED_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutos sem heartbeat
const STUCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos sem progresso (novo critério)
const AUTO_INVOKE_RETRIES = 3;
const RATE_LIMIT_BASE_MS = 300;
const RATE_LIMIT_MAX_MS = 2000;
const RATE_LIMIT_BACKOFF_FACTOR = 1.5;
const RATE_LIMIT_COOLDOWN_FACTOR = 0.9;
const MAX_CONSECUTIVE_ERRORS = 5;
const RETRY_ATTEMPTS = 2;

// ============ CIRCUIT BREAKER CONSTANTS ============
const CIRCUIT_BREAKER_MAX_CHUNKS_NO_PROGRESS = 10;
const CIRCUIT_BREAKER_MAX_TOTAL_TIME_MS = 60 * 60 * 1000;
const CIRCUIT_BREAKER_MAX_CONSECUTIVE_FAILURES = 3;

interface EnrichmentJobPayload {
  jobId?: string;
  continueFrom?: number;
  forceLock?: boolean;
  jobType?: 'metadata' | 'youtube' | 'lyrics' | 'full';
  scope?: 'all' | 'artist' | 'corpus' | 'selection';
  artistId?: string;
  artistName?: string;
  corpusId?: string;
  corpusType?: string;
  songIds?: string[];
  forceReenrich?: boolean;
}

interface EnrichmentJob {
  id: string;
  job_type: string;
  scope: string;
  artist_id: string | null;
  artist_name: string | null;
  corpus_id: string | null;
  corpus_type: string | null;
  song_ids: string[];
  status: string;
  is_cancelling: boolean;
  total_songs: number;
  songs_processed: number;
  songs_succeeded: number;
  songs_failed: number;
  current_song_index: number;
  chunk_size: number;
  chunks_processed: number;
  last_chunk_at: string | null;
  force_reenrich: boolean;
  tempo_inicio: string | null;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  metadata: Record<string, unknown>;
}

interface EnrichResult {
  success: boolean;
  error?: string;
  durationMs: number;
  rateLimitHit: boolean;
}

interface CircuitBreakerState {
  consecutiveChunkFailures: number;
  chunksWithoutProgress: number;
  lastSuccessfulChunk: number;
  jobStartTime: number;
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
      .from('enrichment_jobs')
      .update({ last_chunk_at: new Date().toISOString() })
      .eq('id', jobId)
      .select();
    
    console.log(`[enrich-batch] Force lock adquirido para job ${jobId}`);
    return !error && data && data.length > 0;
  }
  
  const { data, error } = await supabase
    .from('enrichment_jobs')
    .update({ last_chunk_at: new Date().toISOString() })
    .eq('id', jobId)
    .or(`last_chunk_at.is.null,last_chunk_at.lte.${lockThreshold}`)
    .select();
  
  return !error && data && data.length > 0;
}

async function detectAndHandleAbandonedJobs(supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  // Critério 1: Jobs sem heartbeat por 3 minutos
  const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MS).toISOString();
  // Critério 2: Jobs "processando" há mais de 30 minutos sem progresso real
  const stuckThreshold = new Date(Date.now() - STUCK_TIMEOUT_MS).toISOString();
  
  // Buscar jobs abandonados (sem heartbeat)
  const { data: abandonedJobs, error } = await supabase
    .from('enrichment_jobs')
    .select('id, job_type, artist_name, songs_processed, last_chunk_at, updated_at')
    .eq('status', 'processando')
    .or(`last_chunk_at.lt.${abandonedThreshold},updated_at.lt.${stuckThreshold}`)
    .limit(10);
  
  if (error || !abandonedJobs || abandonedJobs.length === 0) {
    return 0;
  }
  
  console.log(`[enrich-batch] 🔍 Detectados ${abandonedJobs.length} jobs abandonados/stuck`);
  
  for (const job of abandonedJobs) {
    const lastActivity = job.last_chunk_at || job.updated_at;
    const minutesInactive = lastActivity 
      ? Math.round((Date.now() - new Date(lastActivity).getTime()) / 60000)
      : 999;
    
    console.log(`[enrich-batch] ⚠️ Pausando job ${job.id} (${job.artist_name || job.job_type}) - sem atividade há ${minutesInactive}min`);
    
    await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'pausado', 
        erro_mensagem: `Auto-pausado: sem atividade há ${minutesInactive} min. Clique "Retomar" para continuar.`,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
  }
  
  return abandonedJobs.length;
}

async function checkCancellation(supabase: ReturnType<typeof createSupabaseClient>, jobId: string): Promise<boolean> {
  const { data } = await supabase
    .from('enrichment_jobs')
    .select('is_cancelling, status')
    .eq('id', jobId)
    .single();
  
  return data?.is_cancelling || data?.status === 'cancelado';
}

async function updateHeartbeat(
  supabase: ReturnType<typeof createSupabaseClient>,
  jobId: string,
  songsProcessed: number,
  songsSucceeded: number,
  songsFailed: number,
  currentIndex: number,
  lastSongId?: string,
  additionalMetadata?: Record<string, unknown>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    songs_processed: songsProcessed,
    songs_succeeded: songsSucceeded,
    songs_failed: songsFailed,
    current_song_index: currentIndex,
    last_chunk_at: new Date().toISOString(),
  };
  
  if (lastSongId || additionalMetadata) {
    updateData.metadata = {
      ...(lastSongId ? { lastProcessedSongId: lastSongId } : {}),
      ...additionalMetadata
    };
  }
  
  const { error } = await supabase
    .from('enrichment_jobs')
    .update(updateData)
    .eq('id', jobId);
  
  if (error) {
    console.error(`[enrich-batch] ⚠️ Erro heartbeat:`, error.message);
  }
}

async function getSongsToEnrich(
  supabase: ReturnType<typeof createSupabaseClient>,
  job: EnrichmentJob,
  startIndex: number
): Promise<{ id: string; title: string; artist_name: string }[]> {
  if (job.song_ids && job.song_ids.length > 0) {
    const songSlice = job.song_ids.slice(startIndex, startIndex + CHUNK_SIZE);
    const { data } = await supabase
      .from('songs')
      .select('id, title, artists!inner(name)')
      .in('id', songSlice);
    
    return (data || []).map(s => ({
      id: s.id,
      title: s.title,
      artist_name: Array.isArray(s.artists) ? s.artists[0]?.name || 'Desconhecido' : 'Desconhecido'
    }));
  }

  const lastProcessedId = (job.metadata as Record<string, unknown>)?.lastProcessedSongId as string | undefined;

  let query = supabase
    .from('songs')
    .select('id, title, artists!inner(name)')
    .order('id', { ascending: true })
    .limit(CHUNK_SIZE);

  if (job.scope === 'artist' && job.artist_id) {
    query = query.eq('artist_id', job.artist_id);
  } else if (job.scope === 'corpus' && job.corpus_id) {
    query = query.eq('corpus_id', job.corpus_id);
  }

  if (!job.force_reenrich) {
    query = query.in('status', ['pending', 'error']);
  }

  if (lastProcessedId) {
    query = query.gt('id', lastProcessedId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error(`[enrich-batch] Erro buscando músicas:`, error);
    return [];
  }
  
  console.log(`[enrich-batch] 📋 ${data?.length || 0} músicas (cursor: ${lastProcessedId?.slice(0, 8) || 'início'})`);
  
  return (data || []).map(s => ({
    id: s.id,
    title: s.title,
    artist_name: Array.isArray(s.artists) ? s.artists[0]?.name || 'Desconhecido' : 'Desconhecido'
  }));
}

async function enrichSingleSong(
  supabase: ReturnType<typeof createSupabaseClient>,
  songId: string,
  jobType: string,
  forceReenrich: boolean
): Promise<EnrichResult> {
  const startTime = Date.now();
  
  try {
    const mode = jobType === 'full' ? 'full' : 
                 jobType === 'youtube' ? 'youtube-only' : 
                 jobType === 'lyrics' ? 'lyrics-only' : 'metadata-only';

    const { data, error } = await supabase.functions.invoke('enrich-music-data', {
      body: { songId, mode, forceReenrich }
    });

    const durationMs = Date.now() - startTime;

    if (error) {
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.toLowerCase().includes('rate limit') ||
                          error.message?.toLowerCase().includes('quota');
      
      return { success: false, error: error.message, durationMs, rateLimitHit: isRateLimit };
    }

    return { success: data?.success || false, error: data?.error, durationMs, rateLimitHit: false };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      durationMs,
      rateLimitHit: false
    };
  }
}

async function enrichWithRetry(
  supabase: ReturnType<typeof createSupabaseClient>,
  songId: string,
  jobType: string,
  forceReenrich: boolean,
  maxRetries: number = RETRY_ATTEMPTS
): Promise<EnrichResult> {
  let lastResult: EnrichResult = { success: false, durationMs: 0, rateLimitHit: false };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastResult = await enrichSingleSong(supabase, songId, jobType, forceReenrich);
    
    if (lastResult.success) {
      return lastResult;
    }
    
    if (lastResult.rateLimitHit && attempt < maxRetries) {
      const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
      console.log(`[enrich-batch] Rate limit, aguardando ${backoffMs}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    } else if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return lastResult;
}

/**
 * SPRINT ENRICH-ARCHITECTURE-FIX: Auto-invocação síncrona com retry resiliente
 * Esta função é chamada DEPOIS do processamento, de forma síncrona (await)
 */
async function autoInvokeNextChunk(jobId: string, continueFrom: number): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  for (let attempt = 1; attempt <= AUTO_INVOKE_RETRIES; attempt++) {
    try {
      console.log(`[enrich-batch] 🚀 Auto-invocação ${attempt}/${AUTO_INVOKE_RETRIES} (índice ${continueFrom})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`${supabaseUrl}/functions/v1/enrich-songs-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ jobId, continueFrom }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[enrich-batch] ✅ Auto-invocação bem sucedida`);
        return { success: true };
      }
      
      const errorText = await response.text().catch(() => 'unknown');
      console.warn(`[enrich-batch] ⚠️ Auto-invocação ${attempt} falhou: ${response.status}`);
      
      if (attempt < AUTO_INVOKE_RETRIES) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'unknown';
      console.error(`[enrich-batch] ❌ Exceção auto-invocação ${attempt}: ${errorMsg}`);
      
      if (attempt < AUTO_INVOKE_RETRIES) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return { success: false, error: `Falhou após ${AUTO_INVOKE_RETRIES} tentativas` };
}

/**
 * CIRCUIT BREAKER: Verifica se o job deve ser pausado
 */
function checkCircuitBreaker(
  state: CircuitBreakerState,
  chunkSucceeded: number,
  chunkFailed: number
): { shouldBreak: boolean; reason?: string } {
  // Verificar tempo total de execução
  const elapsedMs = Date.now() - state.jobStartTime;
  if (elapsedMs > CIRCUIT_BREAKER_MAX_TOTAL_TIME_MS) {
    return { 
      shouldBreak: true, 
      reason: `Tempo máximo excedido (${Math.round(elapsedMs / 60000)}min)` 
    };
  }
  
  // Verificar falhas consecutivas de chunks
  if (state.consecutiveChunkFailures >= CIRCUIT_BREAKER_MAX_CONSECUTIVE_FAILURES) {
    return { 
      shouldBreak: true, 
      reason: `${state.consecutiveChunkFailures} chunks consecutivos falharam` 
    };
  }
  
  // Verificar chunks sem progresso real
  if (state.chunksWithoutProgress >= CIRCUIT_BREAKER_MAX_CHUNKS_NO_PROGRESS) {
    return { 
      shouldBreak: true, 
      reason: `${state.chunksWithoutProgress} chunks sem progresso` 
    };
  }
  
  return { shouldBreak: false };
}

async function countTotalSongs(
  supabase: ReturnType<typeof createSupabaseClient>,
  job: EnrichmentJob
): Promise<number> {
  if (job.song_ids && job.song_ids.length > 0) {
    return job.song_ids.length;
  }

  let query = supabase.from('songs').select('id', { count: 'exact', head: true });

  if (job.scope === 'artist' && job.artist_id) {
    query = query.eq('artist_id', job.artist_id);
  } else if (job.scope === 'corpus' && job.corpus_id) {
    query = query.eq('corpus_id', job.corpus_id);
  }

  if (!job.force_reenrich) {
    query = query.in('status', ['pending', 'error']);
  }

  const { count } = await query;
  return count || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createSupabaseClient();

  try {
    const payload: EnrichmentJobPayload = await req.json();
    console.log(`[enrich-batch] 🏗️ ARCHITECTURE-FIX v2: CHUNK=${CHUNK_SIZE}`);
    console.log(`[enrich-batch] Payload:`, JSON.stringify(payload));

    // Detectar e limpar jobs abandonados
    const abandonedCount = await detectAndHandleAbandonedJobs(supabase);
    if (abandonedCount > 0) {
      console.log(`[enrich-batch] ${abandonedCount} jobs pausados`);
    }

    let job: EnrichmentJob;
    let startIndex = payload.continueFrom || 0;
    let isNewJob = false;
    let circuitBreakerState: CircuitBreakerState;

    if (payload.jobId) {
      const { data, error } = await supabase
        .from('enrichment_jobs')
        .select('*')
        .eq('id', payload.jobId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Job não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      job = data as EnrichmentJob;
      
      // Inicializar circuit breaker state do metadata do job
      const metadata = job.metadata || {};
      circuitBreakerState = {
        consecutiveChunkFailures: (metadata.consecutiveChunkFailures as number) || 0,
        chunksWithoutProgress: (metadata.chunksWithoutProgress as number) || 0,
        lastSuccessfulChunk: (metadata.lastSuccessfulChunk as number) || 0,
        jobStartTime: job.tempo_inicio ? new Date(job.tempo_inicio).getTime() : Date.now(),
      };
      
      if (job.status === 'cancelado' || job.status === 'concluido') {
        return new Response(
          JSON.stringify({ success: false, error: `Job já está ${job.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (await checkCancellation(supabase, job.id)) {
        await supabase
          .from('enrichment_jobs')
          .update({ 
            status: 'cancelado', 
            tempo_fim: new Date().toISOString(),
            is_cancelling: false
          })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({ success: true, message: 'Job cancelado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ARCHITECTURE-FIX v2: Reconhecer auto-invocação como continuação legítima
      const isContinuation = !!payload.continueFrom;
      const shouldForceLock = payload.forceLock || job.status === 'pausado' || isContinuation;
      
      console.log(`[enrich-batch] 🏗️ ARCHITECTURE-FIX v2: CHUNK=${CHUNK_SIZE}`);
      console.log(`[enrich-batch] Payload: ${JSON.stringify({jobId: payload.jobId, continueFrom: payload.continueFrom})}`);
      
      const lockAcquired = await acquireLock(supabase, job.id, shouldForceLock);
      if (!lockAcquired) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Lock não adquirido',
            hint: 'Use forceLock: true para forçar'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else {
      isNewJob = true;
      const jobType = payload.jobType || 'metadata';
      const scope = payload.scope || 'all';

      let existingQuery = supabase
        .from('enrichment_jobs')
        .select('id')
        .eq('job_type', jobType)
        .in('status', ['pendente', 'processando', 'pausado']);

      if (scope === 'artist' && payload.artistId) {
        existingQuery = existingQuery.eq('artist_id', payload.artistId);
      } else if (scope === 'corpus' && payload.corpusId) {
        existingQuery = existingQuery.eq('corpus_id', payload.corpusId);
      }

      const { data: existing } = await existingQuery.limit(1);
      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Job ativo existente',
            existingJobId: existing[0].id
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: newJob, error: createError } = await supabase
        .from('enrichment_jobs')
        .insert({
          job_type: jobType,
          scope: scope,
          artist_id: payload.artistId || null,
          artist_name: payload.artistName || null,
          corpus_id: payload.corpusId || null,
          corpus_type: payload.corpusType || null,
          song_ids: payload.songIds || [],
          force_reenrich: payload.forceReenrich || false,
          status: 'processando',
          tempo_inicio: new Date().toISOString(),
          last_chunk_at: new Date().toISOString(),
          chunk_size: CHUNK_SIZE,
        })
        .select()
        .single();

      if (createError || !newJob) {
        console.error(`[enrich-batch] Erro criando job:`, createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro criando job' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      job = newJob as EnrichmentJob;
      circuitBreakerState = {
        consecutiveChunkFailures: 0,
        chunksWithoutProgress: 0,
        lastSuccessfulChunk: 0,
        jobStartTime: Date.now(),
      };

      const totalSongs = await countTotalSongs(supabase, job);
      await supabase
        .from('enrichment_jobs')
        .update({ total_songs: totalSongs })
        .eq('id', job.id);
      
      job.total_songs = totalSongs;
      console.log(`[enrich-batch] Novo job: ${job.id}, ${totalSongs} músicas`);
    }

    if (!isNewJob) {
      await supabase
        .from('enrichment_jobs')
        .update({ status: 'processando', erro_mensagem: null })
        .eq('id', job.id);
    }

    // Buscar músicas para este chunk
    const songs = await getSongsToEnrich(supabase, job, startIndex);
    console.log(`[enrich-batch] Processando ${songs.length} músicas a partir de ${startIndex}`);

    if (songs.length === 0) {
      await supabase
        .from('enrichment_jobs')
        .update({
          status: 'concluido',
          tempo_fim: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`[enrich-batch] 🎉 Job ${job.id} concluído!`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Job concluído',
          jobId: job.id,
          stats: {
            processed: job.songs_processed,
            succeeded: job.songs_succeeded,
            failed: job.songs_failed
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ PROCESSAMENTO SEQUENCIAL COM HEARTBEAT ============
    let succeeded = 0;
    let failed = 0;
    let currentRateLimit = RATE_LIMIT_BASE_MS;
    let consecutiveErrors = 0;
    let totalProcessingTimeMs = 0;
    let rateLimitHits = 0;
    let lastSongId: string | undefined;

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      
      // Verificar cancelamento
      if (await checkCancellation(supabase, job.id)) {
        console.log(`[enrich-batch] Job cancelado`);
        await supabase
          .from('enrichment_jobs')
          .update({ 
            status: 'cancelado', 
            tempo_fim: new Date().toISOString(),
            is_cancelling: false,
            songs_processed: job.songs_processed + succeeded + failed,
            songs_succeeded: job.songs_succeeded + succeeded,
            songs_failed: job.songs_failed + failed,
          })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({ success: true, message: 'Job cancelado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[enrich-batch] 🎵 [${i + 1}/${songs.length}] "${song.title.substring(0, 25)}..."`);

      const result = await enrichWithRetry(supabase, song.id, job.job_type, job.force_reenrich);
      totalProcessingTimeMs += result.durationMs;

      if (result.success) {
        succeeded++;
        consecutiveErrors = 0;
        currentRateLimit = Math.max(RATE_LIMIT_BASE_MS, Math.round(currentRateLimit * RATE_LIMIT_COOLDOWN_FACTOR));
      } else {
        failed++;
        consecutiveErrors++;
        if (result.rateLimitHit) {
          rateLimitHits++;
          currentRateLimit = Math.min(RATE_LIMIT_MAX_MS, Math.round(currentRateLimit * RATE_LIMIT_BACKOFF_FACTOR));
        }
      }

      lastSongId = song.id;

      // Heartbeat após cada música
      await updateHeartbeat(
        supabase,
        job.id,
        job.songs_processed + succeeded + failed,
        job.songs_succeeded + succeeded,
        job.songs_failed + failed,
        startIndex + i + 1,
        lastSongId
      );

      console.log(`[enrich-batch] ${result.success ? '✅' : '❌'} ${result.durationMs}ms | ${succeeded}✅ ${failed}❌`);

      // Auto-pause após muitos erros
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.log(`[enrich-batch] 🛑 ${consecutiveErrors} erros - pausando`);
        
        await supabase
          .from('enrichment_jobs')
          .update({ 
            status: 'pausado',
            erro_mensagem: `Pausado: ${consecutiveErrors} erros consecutivos.`,
          })
          .eq('id', job.id);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Pausado após ${consecutiveErrors} erros`,
            jobId: job.id,
            partialStats: { succeeded, failed, rateLimitHits }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rate limit entre músicas
      if (i < songs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, currentRateLimit));
      }
    }

    // Atualizar estatísticas do chunk
    const newProcessed = job.songs_processed + succeeded + failed;
    const newSucceeded = job.songs_succeeded + succeeded;
    const newFailed = job.songs_failed + failed;
    const chunksProcessed = job.chunks_processed + 1;
    const nextIndex = startIndex + songs.length;
    const hasMoreAfterThis = nextIndex < job.total_songs;

    const avgTimePerSong = songs.length > 0 ? Math.round(totalProcessingTimeMs / songs.length) : 0;
    const songsPerMinute = avgTimePerSong > 0 ? Math.round(60000 / avgTimePerSong) : 0;

    // Atualizar circuit breaker state
    const chunkHadProgress = succeeded > 0;
    if (chunkHadProgress) {
      circuitBreakerState.consecutiveChunkFailures = 0;
      circuitBreakerState.chunksWithoutProgress = 0;
      circuitBreakerState.lastSuccessfulChunk = chunksProcessed;
    } else {
      circuitBreakerState.consecutiveChunkFailures++;
      circuitBreakerState.chunksWithoutProgress++;
    }

    // Verificar circuit breaker
    const circuitCheck = checkCircuitBreaker(circuitBreakerState, succeeded, failed);
    if (circuitCheck.shouldBreak) {
      console.log(`[enrich-batch] 🔌 Circuit breaker ativado: ${circuitCheck.reason}`);
      
      await supabase
        .from('enrichment_jobs')
        .update({ 
          status: 'pausado',
          erro_mensagem: `Circuit breaker: ${circuitCheck.reason}`,
          songs_processed: newProcessed,
          songs_succeeded: newSucceeded,
          songs_failed: newFailed,
          metadata: {
            ...job.metadata,
            circuitBreakerTriggered: true,
            circuitBreakerReason: circuitCheck.reason,
            ...circuitBreakerState
          }
        })
        .eq('id', job.id);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Circuit breaker: ${circuitCheck.reason}`,
          jobId: job.id,
          stats: { succeeded, failed }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar job com estatísticas e circuit breaker state
    await supabase
      .from('enrichment_jobs')
      .update({
        songs_processed: newProcessed,
        songs_succeeded: newSucceeded,
        songs_failed: newFailed,
        current_song_index: nextIndex,
        chunks_processed: chunksProcessed,
        last_chunk_at: new Date().toISOString(),
        metadata: {
          ...job.metadata,
          lastProcessedSongId: lastSongId,
          ...circuitBreakerState,
          lastChunkStats: {
            avgTimePerSongMs: avgTimePerSong,
            songsPerMinute,
            rateLimitHits,
            lastRateLimit: currentRateLimit,
            processedAt: new Date().toISOString()
          }
        }
      })
      .eq('id', job.id);

    console.log(`[enrich-batch] 📊 Chunk ${chunksProcessed}: ${succeeded}✅ ${failed}❌ | ${songsPerMinute}/min`);

    // ============ AUTO-INVOCAÇÃO COM FALLBACK IMEDIATO ============
    if (hasMoreAfterThis) {
      console.log(`[enrich-batch] 🔗 Invocando próximo chunk (índice ${nextIndex})...`);
      
      const invokeResult = await autoInvokeNextChunk(job.id, nextIndex);
      
      if (!invokeResult.success) {
        console.log(`[enrich-batch] ⚠️ Auto-invocação falhou, marcando como PAUSADO imediatamente`);
        
        // CORREÇÃO CRÍTICA: Marcar como pausado IMEDIATAMENTE
        // Não confiar apenas no EdgeRuntime.waitUntil que pode falhar silenciosamente
        await supabase
          .from('enrichment_jobs')
          .update({ 
            status: 'pausado',
            erro_mensagem: `Auto-invocação falhou após ${AUTO_INVOKE_RETRIES} tentativas. Frontend/GitHub Actions retomará automaticamente.`,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        // OPCIONAL: Tentar EdgeRuntime.waitUntil como backup secundário
        // @ts-ignore - EdgeRuntime.waitUntil existe no Deno runtime do Supabase
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil((async () => {
            console.log(`[enrich-batch] ⏳ waitUntil backup: Aguardando 30s...`);
            await new Promise(r => setTimeout(r, 30000));
            
            // Verificar se job ainda está pausado (não foi retomado manualmente)
            const { data: currentJob } = await supabase
              .from('enrichment_jobs')
              .select('status')
              .eq('id', job.id)
              .single();
            
            if (currentJob?.status === 'pausado') {
              console.log(`[enrich-batch] 🔄 waitUntil: Tentando retry backup...`);
              const retryResult = await autoInvokeNextChunk(job.id, nextIndex);
              if (retryResult.success) {
                console.log(`[enrich-batch] ✅ waitUntil backup: Retry bem sucedido!`);
              }
            }
          })());
        }
      }
    } else {
      // Job concluído
      await supabase
        .from('enrichment_jobs')
        .update({
          status: 'concluido',
          tempo_fim: new Date().toISOString(),
        })
        .eq('id', job.id);
      
      console.log(`[enrich-batch] 🎉 Job ${job.id} concluído!`);
    }

    const duration = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        chunk: chunksProcessed,
        processed: songs.length,
        succeeded,
        failed,
        totalProcessed: newProcessed,
        totalSongs: job.total_songs,
        hasMore: hasMoreAfterThis,
        durationMs: duration,
        metrics: {
          avgTimePerSongMs: avgTimePerSong,
          songsPerMinute,
          currentRateLimit,
          rateLimitHits,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error(`[enrich-batch] Erro fatal:`, err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
