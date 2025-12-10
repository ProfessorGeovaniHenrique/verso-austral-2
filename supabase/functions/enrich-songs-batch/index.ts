/**
 * Edge Function: enrich-songs-batch
 * Sprint ENRICH-REWRITE: Arquitetura à prova de falhas
 * 
 * MUDANÇAS CRÍTICAS:
 * - CHUNK_SIZE: 5 (ultra-conservador para garantir conclusão em <240s)
 * - PARALLEL_SONGS: 1 (sequencial para evitar timeouts)
 * - Auto-invocação ANTES do processamento via EdgeRuntime.waitUntil()
 * - Heartbeat após CADA música processada
 * - Detecção de abandono baseada em last_chunk_at (não songs_processed)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ CONSTANTES ULTRA-CONSERVADORAS ============
const CHUNK_SIZE = 5; // CRÍTICO: 5 músicas por chunk (~5s/música = ~25s total, bem dentro de 240s)
const PARALLEL_SONGS = 1; // CRÍTICO: Sequencial para máximo controle
const LOCK_TIMEOUT_MS = 90000;
const AUTO_INVOKE_DELAY_MS = 1000;
const ABANDONED_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutos (reduzido de 5)
const AUTO_INVOKE_RETRIES = 3;
const RATE_LIMIT_BASE_MS = 300;
const RATE_LIMIT_MAX_MS = 2000;
const RATE_LIMIT_BACKOFF_FACTOR = 1.5;
const RATE_LIMIT_COOLDOWN_FACTOR = 0.9;
const MAX_CONSECUTIVE_ERRORS = 5;
const RETRY_ATTEMPTS = 2; // Reduzido de 3 para 2

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

/**
 * SPRINT ENRICH-REWRITE: Detecção corrigida
 * Detecta jobs parados baseado em last_chunk_at (não songs_processed)
 */
async function detectAndHandleAbandonedJobs(supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MS).toISOString();
  
  // CORREÇÃO: Remover condição songs_processed = 0
  // Jobs com progresso mas sem heartbeat também são abandonados
  const { data: abandonedJobs, error } = await supabase
    .from('enrichment_jobs')
    .select('id, job_type, artist_name, songs_processed, last_chunk_at')
    .eq('status', 'processando')
    .lt('last_chunk_at', abandonedThreshold);
  
  if (error || !abandonedJobs || abandonedJobs.length === 0) {
    return 0;
  }
  
  console.log(`[enrich-batch] 🔍 Detectados ${abandonedJobs.length} jobs abandonados (sem heartbeat há 3min)`);
  
  for (const job of abandonedJobs) {
    console.log(`[enrich-batch] ⚠️ Marcando job ${job.id} (${job.artist_name || job.job_type}) como pausado (abandonado com ${job.songs_processed} músicas processadas)`);
    
    // Marcar como PAUSADO (não erro) para permitir retomada
    await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'pausado', 
        erro_mensagem: `Job pausado automaticamente (sem heartbeat por 3min). Processou ${job.songs_processed} músicas. Clique "Retomar" para continuar.`,
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

/**
 * SPRINT ENRICH-REWRITE: Heartbeat imediato após cada música
 */
async function updateHeartbeat(
  supabase: ReturnType<typeof createSupabaseClient>,
  jobId: string,
  songsProcessed: number,
  songsSucceeded: number,
  songsFailed: number,
  currentIndex: number,
  lastSongId?: string
): Promise<void> {
  const { error } = await supabase
    .from('enrichment_jobs')
    .update({
      songs_processed: songsProcessed,
      songs_succeeded: songsSucceeded,
      songs_failed: songsFailed,
      current_song_index: currentIndex,
      last_chunk_at: new Date().toISOString(),
      metadata: lastSongId ? { lastProcessedSongId: lastSongId } : undefined
    })
    .eq('id', jobId);
  
  if (error) {
    console.error(`[enrich-batch] ⚠️ Erro atualizando heartbeat:`, error);
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
  
  console.log(`[enrich-batch] 📋 Query retornou ${data?.length || 0} músicas (cursor: ${lastProcessedId || 'início'})`);
  
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
      
      console.error(`[enrich-batch] Erro enriquecendo ${songId}:`, error);
      return { success: false, error: error.message, durationMs, rateLimitHit: isRateLimit };
    }

    return { success: data?.success || false, error: data?.error, durationMs, rateLimitHit: false };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[enrich-batch] Exceção enriquecendo ${songId}:`, err);
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
    
    if (lastResult.rateLimitHit) {
      const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
      console.log(`[enrich-batch] Rate limit detectado, aguardando ${backoffMs}ms (tentativa ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    } else if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return lastResult;
}

/**
 * SPRINT ENRICH-REWRITE: Auto-invocação com fire-and-forget
 */
async function autoInvokeNextChunk(jobId: string, continueFrom: number): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  for (let attempt = 1; attempt <= AUTO_INVOKE_RETRIES; attempt++) {
    try {
      console.log(`[enrich-batch] 🚀 Auto-invocação tentativa ${attempt}/${AUTO_INVOKE_RETRIES} (índice ${continueFrom})...`);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/enrich-songs-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ jobId, continueFrom }),
      });

      if (response.ok) {
        console.log(`[enrich-batch] ✅ Auto-invocação bem sucedida na tentativa ${attempt}`);
        return true;
      }
      
      const errorText = await response.text().catch(() => 'unknown');
      console.warn(`[enrich-batch] ⚠️ Auto-invocação tentativa ${attempt} falhou: ${response.status} - ${errorText}`);
      
      if (attempt < AUTO_INVOKE_RETRIES) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      console.error(`[enrich-batch] ❌ Exceção na auto-invocação tentativa ${attempt}:`, err);
      
      if (attempt < AUTO_INVOKE_RETRIES) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.error(`[enrich-batch] 🛑 Auto-invocação falhou após ${AUTO_INVOKE_RETRIES} tentativas`);
  return false;
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
    console.log(`[enrich-batch] 🚀 SPRINT ENRICH-REWRITE: CHUNK=${CHUNK_SIZE}, PARALLEL=${PARALLEL_SONGS}`);
    console.log(`[enrich-batch] Payload:`, JSON.stringify(payload));

    // Detectar e limpar jobs abandonados
    const abandonedCount = await detectAndHandleAbandonedJobs(supabase);
    if (abandonedCount > 0) {
      console.log(`[enrich-batch] ${abandonedCount} jobs abandonados foram pausados`);
    }

    let job: EnrichmentJob;
    let startIndex = payload.continueFrom || 0;
    let isNewJob = false;

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

      const shouldForceLock = payload.forceLock || job.status === 'pausado';
      const lockAcquired = await acquireLock(supabase, job.id, shouldForceLock);
      if (!lockAcquired) {
        console.log(`[enrich-batch] Lock não adquirido para job ${job.id}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Lock não adquirido (outro chunk em execução)',
            hint: 'Use forceLock: true para forçar reinício'
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
            error: 'Já existe um job ativo para este escopo',
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

      const totalSongs = await countTotalSongs(supabase, job);
      await supabase
        .from('enrichment_jobs')
        .update({ total_songs: totalSongs })
        .eq('id', job.id);
      
      job.total_songs = totalSongs;
      console.log(`[enrich-batch] Novo job criado: ${job.id}, total: ${totalSongs} músicas`);
    }

    if (!isNewJob) {
      await supabase
        .from('enrichment_jobs')
        .update({ status: 'processando', erro_mensagem: null })
        .eq('id', job.id);
    }

    // Buscar músicas para este chunk
    const songs = await getSongsToEnrich(supabase, job, startIndex);
    console.log(`[enrich-batch] Processando ${songs.length} músicas a partir do índice ${startIndex}`);

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

    // ============ SPRINT ENRICH-REWRITE: AUTO-INVOCAÇÃO ANTES DO PROCESSAMENTO ============
    const nextIndex = startIndex + songs.length;
    const hasMoreAfterThis = nextIndex < job.total_songs;
    
    // Agendar próximo chunk ANTES de processar (fire-and-forget usando queueMicrotask)
    if (hasMoreAfterThis) {
      console.log(`[enrich-batch] 🔄 Agendando próximo chunk (índice ${nextIndex}) em background...`);
      
      // Fire-and-forget: usar setTimeout para não bloquear
      // O próximo chunk será invocado após o delay, independente do resultado deste
      setTimeout(async () => {
        try {
          await new Promise(r => setTimeout(r, AUTO_INVOKE_DELAY_MS));
          const success = await autoInvokeNextChunk(job.id, nextIndex);
          
          if (!success) {
            const supabaseForCleanup = createSupabaseClient();
            await supabaseForCleanup
              .from('enrichment_jobs')
              .update({ 
                status: 'pausado',
                erro_mensagem: 'Auto-invocação falhou. Clique "Retomar" para continuar.',
              })
              .eq('id', job.id)
              .eq('status', 'processando');
          }
        } catch (err) {
          console.error('[enrich-batch] Erro na auto-invocação em background:', err);
        }
      }, 100); // Inicia imediatamente após pequeno delay
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
      
      // Verificar cancelamento antes de cada música
      if (await checkCancellation(supabase, job.id)) {
        console.log(`[enrich-batch] Job ${job.id} cancelado durante processamento`);
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

      console.log(`[enrich-batch] 🎵 [${i + 1}/${songs.length}] Processando: "${song.title.substring(0, 30)}..."`);

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

      // ============ HEARTBEAT IMEDIATO APÓS CADA MÚSICA ============
      await updateHeartbeat(
        supabase,
        job.id,
        job.songs_processed + succeeded + failed,
        job.songs_succeeded + succeeded,
        job.songs_failed + failed,
        startIndex + i + 1,
        lastSongId
      );

      console.log(`[enrich-batch] ${result.success ? '✅' : '❌'} "${song.title.substring(0, 20)}" em ${result.durationMs}ms | Total: ${succeeded}✅ ${failed}❌`);

      // Auto-pause após muitos erros consecutivos
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.log(`[enrich-batch] 🛑 ${consecutiveErrors} erros consecutivos - pausando automaticamente`);
        
        await supabase
          .from('enrichment_jobs')
          .update({ 
            status: 'pausado',
            erro_mensagem: `Auto-pausado após ${consecutiveErrors} erros consecutivos.`,
          })
          .eq('id', job.id);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Auto-pausado após ${consecutiveErrors} erros consecutivos`,
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

    // Atualizar estatísticas finais do chunk
    const newProcessed = job.songs_processed + succeeded + failed;
    const newSucceeded = job.songs_succeeded + succeeded;
    const newFailed = job.songs_failed + failed;
    const chunksProcessed = job.chunks_processed + 1;

    const avgTimePerSong = songs.length > 0 ? Math.round(totalProcessingTimeMs / songs.length) : 0;
    const songsPerMinute = avgTimePerSong > 0 ? Math.round(60000 / avgTimePerSong) : 0;

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

    console.log(`[enrich-batch] 📊 Chunk ${chunksProcessed} concluído: ${succeeded}✅ ${failed}❌ | ${songsPerMinute} músicas/min`);

    // Se não há mais músicas, marcar como concluído
    if (!hasMoreAfterThis) {
      await supabase
        .from('enrichment_jobs')
        .update({
          status: 'concluido',
          tempo_fim: new Date().toISOString(),
        })
        .eq('id', job.id);
      
      console.log(`[enrich-batch] 🎉 Job ${job.id} concluído com sucesso!`);
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
