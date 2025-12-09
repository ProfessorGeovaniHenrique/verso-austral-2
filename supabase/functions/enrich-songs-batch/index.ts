/**
 * Edge Function: enrich-songs-batch
 * Processa enriquecimento de músicas em chunks com auto-invocação
 * 
 * SPRINT 1 - THROUGHPUT BOOST:
 * - CHUNK_SIZE: 20 → 50 (+150%)
 * - Rate limit adaptativo: 300-1500ms
 * - Paralelismo: 3 músicas simultâneas
 * - Auto-pause após 5 erros consecutivos
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ SPRINT 1: CONSTANTES OTIMIZADAS ============
const CHUNK_SIZE = 50; // Aumentado de 20 para 50 (+150%)
const LOCK_TIMEOUT_MS = 90000; // 90 segundos para evitar race conditions
const AUTO_INVOKE_DELAY_MS = 3000; // Reduzido de 10s para 3s (-70%)
const ABANDONED_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos para considerar job abandonado

// Rate Limit Adaptativo
const PARALLEL_SONGS = 3; // Processar 3 músicas em paralelo
const RATE_LIMIT_BASE_MS = 300; // Base: 300ms entre lotes
const RATE_LIMIT_MAX_MS = 1500; // Máximo em caso de erros
const RATE_LIMIT_BACKOFF_FACTOR = 1.5; // Fator de aumento em erros
const RATE_LIMIT_COOLDOWN_FACTOR = 0.9; // Fator de redução em sucesso
const MAX_CONSECUTIVE_ERRORS = 5; // Pausa automática após 5 erros
const RETRY_ATTEMPTS = 3; // Tentativas por música

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

// Interface para resultado de enriquecimento individual
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

async function detectAndHandleAbandonedJobs(supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MS).toISOString();
  
  const { data: abandonedJobs, error } = await supabase
    .from('enrichment_jobs')
    .select('id, job_type, artist_name, songs_processed')
    .eq('status', 'processando')
    .eq('songs_processed', 0)
    .lt('tempo_inicio', abandonedThreshold);
  
  if (error || !abandonedJobs || abandonedJobs.length === 0) {
    return 0;
  }
  
  console.log(`[enrich-batch] Detectados ${abandonedJobs.length} jobs abandonados`);
  
  for (const job of abandonedJobs) {
    console.log(`[enrich-batch] Marcando job ${job.id} (${job.artist_name || job.job_type}) como erro (abandonado)`);
    await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'erro', 
        erro_mensagem: 'Job abandonado automaticamente (sem progresso por 5 min)',
        tempo_fim: new Date().toISOString()
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

  let query = supabase
    .from('songs')
    .select('id, title, artists!inner(name)')
    .order('created_at', { ascending: true })
    .range(startIndex, startIndex + CHUNK_SIZE - 1);

  if (job.scope === 'artist' && job.artist_id) {
    query = query.eq('artist_id', job.artist_id);
  } else if (job.scope === 'corpus' && job.corpus_id) {
    query = query.eq('corpus_id', job.corpus_id);
  }

  if (!job.force_reenrich) {
    query = query.in('status', ['pending', 'error']);
  }

  const { data } = await query;
  
  return (data || []).map(s => ({
    id: s.id,
    title: s.title,
    artist_name: Array.isArray(s.artists) ? s.artists[0]?.name || 'Desconhecido' : 'Desconhecido'
  }));
}

// SPRINT 1: Função melhorada com timing e detecção de rate limit
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
      return { 
        success: false, 
        error: error.message, 
        durationMs,
        rateLimitHit: isRateLimit
      };
    }

    return { 
      success: data?.success || false, 
      error: data?.error, 
      durationMs,
      rateLimitHit: false
    };
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

// SPRINT 1: Retry com exponential backoff
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
    
    // Se for rate limit, aumentar delay
    if (lastResult.rateLimitHit) {
      const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
      console.log(`[enrich-batch] Rate limit detectado, aguardando ${backoffMs}ms (tentativa ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    } else if (attempt < maxRetries) {
      // Retry normal com pequeno delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return lastResult;
}

async function autoInvokeNextChunk(jobId: string, continueFrom: number): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  try {
    console.log(`[enrich-batch] Auto-invocando próximo chunk (índice ${continueFrom})...`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/enrich-songs-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ jobId, continueFrom }),
    });

    if (!response.ok) {
      console.error(`[enrich-batch] Falha na auto-invocação: ${response.status}`);
      return false;
    }
    
    console.log(`[enrich-batch] Auto-invocação iniciada com sucesso`);
    return true;
  } catch (err) {
    console.error(`[enrich-batch] Erro na auto-invocação:`, err);
    return false;
  }
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
    console.log(`[enrich-batch] Payload recebido:`, JSON.stringify(payload));
    console.log(`[enrich-batch] 🚀 SPRINT 1: CHUNK_SIZE=${CHUNK_SIZE}, PARALLEL=${PARALLEL_SONGS}, RATE_BASE=${RATE_LIMIT_BASE_MS}ms`);

    // Detectar e limpar jobs abandonados
    const abandonedCount = await detectAndHandleAbandonedJobs(supabase);
    if (abandonedCount > 0) {
      console.log(`[enrich-batch] ${abandonedCount} jobs abandonados foram marcados como erro`);
    }

    let job: EnrichmentJob;
    let startIndex = payload.continueFrom || 0;
    let isNewJob = false;

    // Criar novo job ou continuar existente
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
        console.log(`[enrich-batch] Lock não adquirido para job ${job.id} (outro chunk em execução)`);
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
      console.log(`[enrich-batch] Novo job criado: ${job.id}, total de músicas: ${totalSongs}`);
    }

    if (!isNewJob) {
      await supabase
        .from('enrichment_jobs')
        .update({ status: 'processando' })
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

      console.log(`[enrich-batch] Job ${job.id} concluído!`);
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

    // ============ SPRINT 1: PROCESSAMENTO PARALELO COM RATE LIMIT ADAPTATIVO ============
    let succeeded = 0;
    let failed = 0;
    let currentRateLimit = RATE_LIMIT_BASE_MS;
    let consecutiveErrors = 0;
    let totalProcessingTimeMs = 0;
    let rateLimitHits = 0;

    // Processar em lotes paralelos de PARALLEL_SONGS
    for (let i = 0; i < songs.length; i += PARALLEL_SONGS) {
      // Verificar cancelamento a cada lote
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

      // Pegar lote de músicas para processar em paralelo
      const batch = songs.slice(i, i + PARALLEL_SONGS);
      const batchStartTime = Date.now();
      
      console.log(`[enrich-batch] 🎵 Processando lote paralelo: ${batch.map(s => s.title.substring(0, 20)).join(', ')}`);

      // Processar lote em paralelo com retry
      const results = await Promise.all(
        batch.map(song => enrichWithRetry(supabase, song.id, job.job_type, job.force_reenrich))
      );

      const batchDuration = Date.now() - batchStartTime;
      let batchSucceeded = 0;
      let batchFailed = 0;
      let batchRateLimits = 0;

      for (const result of results) {
        totalProcessingTimeMs += result.durationMs;
        
        if (result.success) {
          batchSucceeded++;
          succeeded++;
        } else {
          batchFailed++;
          failed++;
        }
        
        if (result.rateLimitHit) {
          batchRateLimits++;
          rateLimitHits++;
        }
      }

      // Atualizar rate limit adaptativo
      if (batchFailed > 0 || batchRateLimits > 0) {
        consecutiveErrors += batchFailed;
        
        // Aumentar rate limit em erros
        currentRateLimit = Math.min(
          RATE_LIMIT_MAX_MS, 
          Math.round(currentRateLimit * RATE_LIMIT_BACKOFF_FACTOR)
        );
        
        console.log(`[enrich-batch] ⚠️ Lote com ${batchFailed} falhas, ${batchRateLimits} rate limits. Rate limit: ${currentRateLimit}ms`);
        
        // Auto-pause após muitos erros consecutivos
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.log(`[enrich-batch] 🛑 ${consecutiveErrors} erros consecutivos - pausando job automaticamente`);
          
          await supabase
            .from('enrichment_jobs')
            .update({ 
              status: 'pausado',
              songs_processed: job.songs_processed + succeeded + failed,
              songs_succeeded: job.songs_succeeded + succeeded,
              songs_failed: job.songs_failed + failed,
              current_song_index: startIndex + i + batch.length,
              erro_mensagem: `Auto-pausado após ${consecutiveErrors} erros consecutivos. Último rate limit: ${currentRateLimit}ms`,
              metadata: {
                ...job.metadata,
                lastRateLimit: currentRateLimit,
                rateLimitHits,
                autoPausedAt: new Date().toISOString()
              }
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
      } else {
        // Sucesso total do lote - reduzir rate limit gradualmente
        consecutiveErrors = 0;
        currentRateLimit = Math.max(
          RATE_LIMIT_BASE_MS,
          Math.round(currentRateLimit * RATE_LIMIT_COOLDOWN_FACTOR)
        );
      }

      const avgTimePerSong = batch.length > 0 ? Math.round(batchDuration / batch.length) : 0;
      console.log(`[enrich-batch] ✅ Lote concluído: ${batchSucceeded}/${batch.length} sucesso em ${batchDuration}ms (${avgTimePerSong}ms/música). Rate: ${currentRateLimit}ms`);

      // Aguardar rate limit entre lotes (não entre músicas individuais)
      if (i + PARALLEL_SONGS < songs.length) {
        await new Promise(resolve => setTimeout(resolve, currentRateLimit));
      }
    }

    // Atualizar progresso
    const newProcessed = job.songs_processed + succeeded + failed;
    const newSucceeded = job.songs_succeeded + succeeded;
    const newFailed = job.songs_failed + failed;
    const newIndex = startIndex + songs.length;
    const chunksProcessed = job.chunks_processed + 1;

    // Calcular métricas de velocidade
    const avgTimePerSong = songs.length > 0 ? Math.round(totalProcessingTimeMs / songs.length) : 0;
    const songsPerMinute = avgTimePerSong > 0 ? Math.round(60000 / avgTimePerSong * PARALLEL_SONGS) : 0;

    await supabase
      .from('enrichment_jobs')
      .update({
        songs_processed: newProcessed,
        songs_succeeded: newSucceeded,
        songs_failed: newFailed,
        current_song_index: newIndex,
        chunks_processed: chunksProcessed,
        metadata: {
          ...job.metadata,
          lastChunkStats: {
            avgTimePerSongMs: avgTimePerSong,
            songsPerMinute,
            rateLimitHits,
            lastRateLimit: currentRateLimit,
            parallelSongs: PARALLEL_SONGS,
            processedAt: new Date().toISOString()
          }
        }
      })
      .eq('id', job.id);

    console.log(`[enrich-batch] 📊 Chunk ${chunksProcessed} concluído: ${succeeded}✅ ${failed}❌ | ${songsPerMinute} músicas/min | Rate: ${currentRateLimit}ms`);

    // Verificar se há mais músicas
    const hasMore = newIndex < job.total_songs;

    if (hasMore && !await checkCancellation(supabase, job.id)) {
      console.log(`[enrich-batch] ⏳ Aguardando ${AUTO_INVOKE_DELAY_MS}ms antes de invocar próximo chunk...`);
      await new Promise(r => setTimeout(r, AUTO_INVOKE_DELAY_MS));
      
      const autoInvokeSuccess = await autoInvokeNextChunk(job.id, newIndex);
      
      if (!autoInvokeSuccess) {
        console.log(`[enrich-batch] ⚠️ Marcando job como pausado para recovery automático`);
        await supabase
          .from('enrichment_jobs')
          .update({ 
            status: 'pausado',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    } else if (!hasMore) {
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
        hasMore,
        durationMs: duration,
        // SPRINT 1: Métricas adicionais
        metrics: {
          avgTimePerSongMs: avgTimePerSong,
          songsPerMinute,
          currentRateLimit,
          rateLimitHits,
          parallelSongs: PARALLEL_SONGS
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
