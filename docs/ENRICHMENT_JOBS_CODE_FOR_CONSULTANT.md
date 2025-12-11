# Código Completo: Sistema de Jobs de Enriquecimento

> **Documento gerado em**: 2025-12-11
> **Propósito**: Consultoria de especialista para resolver travamentos no sistema de enriquecimento

---

## Índice
1. [Problema Atual](#problema-atual)
2. [Arquitetura Geral](#arquitetura-geral)
3. [Backend - Edge Functions](#backend---edge-functions)
   - [enrich-songs-batch/index.ts](#enrich-songs-batchindexts)
   - [enrich-music-data/index.ts](#enrich-music-dataindexts)
   - [enrich-music-data/modes.ts](#enrich-music-datamodests)
   - [orchestrate-corpus-enrichment/index.ts](#orchestrate-corpus-enrichmentindexts)
4. [Frontend - Hooks](#frontend---hooks)
   - [useEnrichmentJob.ts](#useenrichmentjobts)
   - [useEnrichmentOrchestration.ts](#useenrichmentorchestrationts)
   - [useEnrichment.ts](#useenrichmentts)
5. [Frontend - Services](#frontend---services)
   - [enrichmentService.ts](#enrichmentservicets)
6. [Frontend - Componentes](#frontend---componentes)
   - [EnrichmentOrchestrationPanel.tsx](#enrichmentorchestrationpaneltsx)
   - [CorpusPipelineStep.tsx](#corpuspipelinesteptsx)
7. [Schema do Banco de Dados](#schema-do-banco-de-dados)

---

## Problema Atual

O job de enriquecimento está **travando** após processar poucos chunks. O job permanece em status "processando" mas não avança.

### Sintomas:
- Job fica em `status = 'processando'` mas `last_chunk_at` não atualiza
- Auto-invocação da próxima chunk falha silenciosamente
- `EdgeRuntime.waitUntil` não consegue executar retry
- Job não é marcado como `pausado`, ficando eternamente travado

### Dados do Job Travado:
```sql
SELECT id, status, songs_processed, total_songs, last_chunk_at, erro_mensagem 
FROM enrichment_jobs 
WHERE status = 'processando';
-- Resultado: job parado há 6+ horas após processar apenas 7 de 25.188 músicas
```

---

## Arquitetura Geral

```
┌─────────────────┐     ┌─────────────────────────┐
│   Frontend      │     │   Edge Functions        │
├─────────────────┤     ├─────────────────────────┤
│                 │     │                         │
│ useEnrichment   │────▶│ enrich-songs-batch      │
│ OrchestrationHook    │ (processa chunks)        │
│                 │     │         │               │
│ useEnrichmentJob│     │         ▼               │
│                 │     │ enrich-music-data       │
│                 │     │ (enriquece 1 música)    │
│                 │     │         │               │
│                 │◀────│ Auto-invocação          │
│                 │     │ (próximo chunk)         │
└─────────────────┘     └─────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────────────────────────────────────┐
│              Supabase Database                   │
│  - enrichment_jobs (estado dos jobs)            │
│  - songs (músicas a enriquecer)                 │
└─────────────────────────────────────────────────┘
```

---

## Backend - Edge Functions

### enrich-songs-batch/index.ts

```typescript
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
const CHUNK_SIZE = 15; // Aumentado de 5 para 15 para melhor throughput
const PARALLEL_SONGS = 1;
const LOCK_TIMEOUT_MS = 90000;
const ABANDONED_TIMEOUT_MS = 3 * 60 * 1000;
const AUTO_INVOKE_RETRIES = 3;
const RATE_LIMIT_BASE_MS = 300;
const RATE_LIMIT_MAX_MS = 2000;
const RATE_LIMIT_BACKOFF_FACTOR = 1.5;
const RATE_LIMIT_COOLDOWN_FACTOR = 0.9;
const MAX_CONSECUTIVE_ERRORS = 5;
const RETRY_ATTEMPTS = 2;

// ============ CIRCUIT BREAKER CONSTANTS ============
const CIRCUIT_BREAKER_MAX_CHUNKS_NO_PROGRESS = 10;
const CIRCUIT_BREAKER_MAX_TOTAL_TIME_MS = 60 * 60 * 1000; // 60 minutos (aumentado de 30)
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
  const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MS).toISOString();
  
  const { data: abandonedJobs, error } = await supabase
    .from('enrichment_jobs')
    .select('id, job_type, artist_name, songs_processed, last_chunk_at')
    .eq('status', 'processando')
    .lt('last_chunk_at', abandonedThreshold);
  
  if (error || !abandonedJobs || abandonedJobs.length === 0) {
    return 0;
  }
  
  console.log(`[enrich-batch] 🔍 Detectados ${abandonedJobs.length} jobs abandonados`);
  
  for (const job of abandonedJobs) {
    console.log(`[enrich-batch] ⚠️ Pausando job ${job.id} (${job.artist_name || job.job_type}) - ${job.songs_processed} músicas`);
    
    await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'pausado', 
        erro_mensagem: `Pausado automaticamente (sem heartbeat). Processou ${job.songs_processed} músicas.`,
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

    // ============ AUTO-INVOCAÇÃO COM WAITUNTIL (SPRINT ENRICHMENT-AUTO-RESUME) ============
    // Usa EdgeRuntime.waitUntil para garantir retry mesmo após response
    if (hasMoreAfterThis) {
      console.log(`[enrich-batch] 🔗 Invocando próximo chunk (índice ${nextIndex})...`);
      
      const invokeResult = await autoInvokeNextChunk(job.id, nextIndex);
      
      if (!invokeResult.success) {
        console.log(`[enrich-batch] ⚠️ Auto-invocação falhou, agendando retry via waitUntil`);
        
        // SPRINT ENRICHMENT-AUTO-RESUME: Usar EdgeRuntime.waitUntil para retry em background
        // Isso permite que a response seja retornada enquanto o retry acontece
        // @ts-ignore - EdgeRuntime.waitUntil existe no Deno runtime do Supabase
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil((async () => {
            console.log(`[enrich-batch] ⏳ waitUntil: Aguardando 30s para retry...`);
            await new Promise(r => setTimeout(r, 30000)); // 30 segundos
            
            console.log(`[enrich-batch] 🔄 waitUntil: Tentando auto-invocação novamente...`);
            const retryResult = await autoInvokeNextChunk(job.id, nextIndex);
            
            if (!retryResult.success) {
              console.log(`[enrich-batch] ❌ waitUntil: Retry também falhou, marcando como pausado`);
              await supabase
                .from('enrichment_jobs')
                .update({ 
                  status: 'pausado',
                  erro_mensagem: `Auto-invocação falhou após retry. GitHub Actions ou frontend retomará em breve.`,
                })
                .eq('id', job.id);
            } else {
              console.log(`[enrich-batch] ✅ waitUntil: Retry bem sucedido!`);
            }
          })());
          
          // Não marcar como pausado ainda - waitUntil vai tentar
          console.log(`[enrich-batch] 🕐 Retry agendado via EdgeRuntime.waitUntil`);
        } else {
          // Fallback se EdgeRuntime não disponível
          await supabase
            .from('enrichment_jobs')
            .update({ 
              status: 'pausado',
              erro_mensagem: `Auto-invocação falhou: ${invokeResult.error}. Clique "Retomar".`,
            })
            .eq('id', job.id);
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
```

---

### enrich-music-data/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { handleSingleMode, handleDatabaseMode, handleLegacyMode } from "./modes.ts";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('enrich-music-data', requestId);
  
  log.info('Request received', { method: req.method });
  
  if (req.method === 'OPTIONS') {
    log.debug('CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    log.debug('Supabase client initialized');

    const body = await req.json();
    const mode = body.mode || 'single';
    
    log.info('Enrichment mode determined', { mode, songId: body.songId, artistId: body.artistId });
    
    if (mode === 'database') {
      return await handleDatabaseMode(body, supabase, log);
    } else if (mode === 'legacy') {
      return await handleLegacyMode(body, log);
    } else {
      return await handleSingleMode(body, supabase, log);
    }

  } catch (error) {
    log.fatal('Enrichment request failed', error instanceof Error ? error : new Error(String(error)));
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### orchestrate-corpus-enrichment/index.ts

```typescript
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
```

---

## Frontend - Hooks

### useEnrichmentJob.ts

```typescript
/**
 * Hook para gerenciar jobs de enriquecimento persistentes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useEnrichmentJob');

export type EnrichmentJobType = 'metadata' | 'youtube' | 'lyrics' | 'full';
export type EnrichmentScope = 'all' | 'artist' | 'corpus' | 'selection' | 'letter';
export type EnrichmentStatus = 'pendente' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado';

export interface EnrichmentJob {
  id: string;
  job_type: EnrichmentJobType;
  scope: EnrichmentScope;
  artist_id: string | null;
  artist_name: string | null;
  corpus_id: string | null;
  corpus_type: string | null;
  song_ids: string[];
  status: EnrichmentStatus;
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
  created_at: string;
  updated_at: string;
  tempo_inicio: string | null;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  metadata: Record<string, unknown>;
}

export interface UseEnrichmentJobOptions {
  artistId?: string;
  corpusId?: string;
  jobType?: EnrichmentJobType;
  autoRefresh?: boolean;
  refreshInterval?: number;
  autoResumeEnabled?: boolean;
}

const ABANDONED_TIMEOUT_MINUTES = 3;
const AUTO_RESUME_DELAY_MS = 15000;
const MAX_AUTO_RESUME_RETRIES = 3;

export function useEnrichmentJob(options: UseEnrichmentJobOptions = {}) {
  const { 
    artistId, 
    corpusId, 
    jobType, 
    autoRefresh = true, 
    refreshInterval = 15000,
    autoResumeEnabled = true
  } = options;

  const [activeJob, setActiveJob] = useState<EnrichmentJob | null>(null);
  const [lastCompletedJob, setLastCompletedJob] = useState<EnrichmentJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  
  const [autoResumeCount, setAutoResumeCount] = useState(0);
  const [isAutoResuming, setIsAutoResuming] = useState(false);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchActiveJob = useCallback(async () => {
    try {
      let query = supabase
        .from('enrichment_jobs')
        .select('*')
        .in('status', ['pendente', 'processando', 'pausado'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (artistId) {
        query = query.eq('artist_id', artistId);
      }
      if (corpusId) {
        query = query.eq('corpus_id', corpusId);
      }
      if (jobType) {
        query = query.eq('job_type', jobType);
      }

      const { data, error } = await query;

      if (error) {
        log.error('Error fetching job', error);
        return;
      }

      setActiveJob(data && data.length > 0 ? data[0] as EnrichmentJob : null);
    } finally {
      setIsLoading(false);
    }
  }, [artistId, corpusId, jobType]);

  const fetchLastCompletedJob = useCallback(async () => {
    let query = supabase
      .from('enrichment_jobs')
      .select('*')
      .eq('status', 'concluido')
      .order('tempo_fim', { ascending: false })
      .limit(1);

    if (artistId) {
      query = query.eq('artist_id', artistId);
    }
    if (corpusId) {
      query = query.eq('corpus_id', corpusId);
    }
    if (jobType) {
      query = query.eq('job_type', jobType);
    }

    const { data } = await query;
    setLastCompletedJob(data && data.length > 0 ? data[0] as EnrichmentJob : null);
  }, [artistId, corpusId, jobType]);

  const startJob = useCallback(async (params: {
    jobType: EnrichmentJobType;
    scope?: EnrichmentScope;
    artistId?: string;
    artistName?: string;
    corpusId?: string;
    corpusType?: string;
    songIds?: string[];
    forceReenrich?: boolean;
  }) => {
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: {
          jobType: params.jobType,
          scope: params.scope || 'all',
          artistId: params.artistId,
          artistName: params.artistName,
          corpusId: params.corpusId,
          corpusType: params.corpusType,
          songIds: params.songIds,
          forceReenrich: params.forceReenrich || false,
        }
      });

      if (error) {
        toast.error('Erro ao iniciar job de enriquecimento');
        log.error('Error starting job', error);
        return null;
      }

      if (!data.success) {
        if (data.existingJobId) {
          toast.warning('Já existe um job ativo para este escopo', {
            description: 'Deseja cancelar o existente e iniciar novo?',
            action: {
              label: 'Forçar Reinício',
              onClick: () => forceRestartJob(params)
            },
            duration: 10000
          });
        } else if (data.hint === 'Use forceLock: true para forçar reinício') {
          toast.warning('Outro chunk está em execução', {
            description: 'O job pode estar travado. Forçar reinício?',
            action: {
              label: 'Forçar',
              onClick: () => resumeJobWithForce()
            },
            duration: 10000
          });
        } else {
          toast.error(data.error || 'Erro ao iniciar job');
        }
        return null;
      }

      toast.success('Job de enriquecimento iniciado!');
      await fetchActiveJob();
      return data.jobId;
    } finally {
      setIsStarting(false);
    }
  }, [fetchActiveJob]);

  const forceRestartJob = useCallback(async (params: Parameters<typeof startJob>[0]) => {
    if (activeJob) {
      await supabase
        .from('enrichment_jobs')
        .update({ 
          status: 'cancelado',
          is_cancelling: false,
          tempo_fim: new Date().toISOString(),
          erro_mensagem: 'Cancelado para reinício forçado'
        })
        .eq('id', activeJob.id);
      
      setActiveJob(null);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    return startJob(params);
  }, [activeJob, startJob]);

  const resumeJobWithForce = useCallback(async () => {
    if (!activeJob || isResuming) return;

    setIsResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: {
          jobId: activeJob.id,
          continueFrom: activeJob.current_song_index,
          forceLock: true
        }
      });

      if (error) {
        toast.error('Erro ao forçar retomada do job');
        log.error('Error forcing resume', error);
        return;
      }

      toast.success('Job retomado com força!');
      await fetchActiveJob();
    } finally {
      setIsResuming(false);
    }
  }, [activeJob, isResuming, fetchActiveJob]);

  const pauseJob = useCallback(async () => {
    if (!activeJob) return;

    const { error } = await supabase
      .from('enrichment_jobs')
      .update({ status: 'pausado' })
      .eq('id', activeJob.id);

    if (error) {
      toast.error('Erro ao pausar job');
      console.error('[useEnrichmentJob] Erro pausando:', error);
      return;
    }

    toast.info('Job pausado');
    await fetchActiveJob();
  }, [activeJob, fetchActiveJob]);

  const cancelJob = useCallback(async () => {
    if (!activeJob) return;

    const { error } = await supabase
      .from('enrichment_jobs')
      .update({ is_cancelling: true })
      .eq('id', activeJob.id);

    if (error) {
      toast.error('Erro ao solicitar cancelamento');
      console.error('[useEnrichmentJob] Erro cancelando:', error);
      return;
    }

    toast.info('Cancelamento solicitado...');
    await fetchActiveJob();
  }, [activeJob, fetchActiveJob]);

  const resumeJob = useCallback(async () => {
    if (!activeJob || isResuming) return;
    
    const isStuck = activeJob.status === 'processando' && activeJob.last_chunk_at
      ? new Date().getTime() - new Date(activeJob.last_chunk_at).getTime() > ABANDONED_TIMEOUT_MINUTES * 60 * 1000
      : false;

    if (isStuck) {
      return resumeJobWithForce();
    }

    if (activeJob.status !== 'pausado') return;

    setIsResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: {
          jobId: activeJob.id,
          continueFrom: activeJob.current_song_index,
        }
      });

      if (error) {
        toast.error('Erro ao retomar job');
        console.error('[useEnrichmentJob] Erro retomando:', error);
        return;
      }

      toast.success('Job retomado!');
      await fetchActiveJob();
    } finally {
      setIsResuming(false);
    }
  }, [activeJob, isResuming, fetchActiveJob, resumeJobWithForce]);

  const restartJob = useCallback(async (params: Parameters<typeof startJob>[0]) => {
    return forceRestartJob(params);
  }, [forceRestartJob]);

  const cleanupAbandonedJobs = useCallback(async () => {
    const abandonedThreshold = new Date(Date.now() - ABANDONED_TIMEOUT_MINUTES * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'pausado',
        erro_mensagem: 'Job pausado automaticamente (sem heartbeat). Clique "Retomar" para continuar.',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'processando')
      .lt('last_chunk_at', abandonedThreshold)
      .select();

    if (error) {
      toast.error('Erro ao limpar jobs abandonados');
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      toast.success(`${count} job(s) abandonado(s) pausado(s)`);
    }
    
    await fetchActiveJob();
    return count;
  }, [fetchActiveJob]);

  const progress = activeJob && activeJob.total_songs > 0
    ? Math.round((activeJob.songs_processed / activeJob.total_songs) * 100)
    : 0;

  const isAbandoned = activeJob && activeJob.status === 'processando' && activeJob.last_chunk_at
    ? new Date().getTime() - new Date(activeJob.last_chunk_at).getTime() > ABANDONED_TIMEOUT_MINUTES * 60 * 1000
    : false;

  const needsAttention = isAbandoned || activeJob?.status === 'pausado';

  useEffect(() => {
    fetchActiveJob();
    fetchLastCompletedJob();

    const channel = supabase
      .channel('enrichment-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrichment_jobs',
        },
        (payload) => {
          log.debug('Realtime update', { eventType: payload.eventType });
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const job = payload.new as EnrichmentJob;
            
            const matchesFilters = 
              (!artistId || job.artist_id === artistId) &&
              (!corpusId || job.corpus_id === corpusId) &&
              (!jobType || job.job_type === jobType);

            if (matchesFilters) {
              if (['pendente', 'processando', 'pausado'].includes(job.status)) {
                setActiveJob(job);
              } else if (job.status === 'concluido') {
                setActiveJob(null);
                setLastCompletedJob(job);
              } else if (['cancelado', 'erro'].includes(job.status)) {
                setActiveJob(null);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [artistId, corpusId, jobType, fetchActiveJob, fetchLastCompletedJob]);

  useEffect(() => {
    if (autoRefresh && activeJob && ['processando', 'pausado'].includes(activeJob.status)) {
      refreshIntervalRef.current = setInterval(fetchActiveJob, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, activeJob, refreshInterval, fetchActiveJob]);

  // Auto-resume for paused jobs
  useEffect(() => {
    if (autoResumeTimeoutRef.current) {
      clearTimeout(autoResumeTimeoutRef.current);
      autoResumeTimeoutRef.current = null;
    }

    if (
      !autoResumeEnabled ||
      !activeJob ||
      activeJob.status !== 'pausado' ||
      isResuming ||
      isAutoResuming ||
      autoResumeCount >= MAX_AUTO_RESUME_RETRIES ||
      activeJob.erro_mensagem?.toLowerCase().includes('circuit breaker')
    ) {
      return;
    }

    log.info(`Auto-resume scheduled (attempt ${autoResumeCount + 1}/${MAX_AUTO_RESUME_RETRIES})`);

    autoResumeTimeoutRef.current = setTimeout(async () => {
      setIsAutoResuming(true);
      
      try {
        log.info(`Auto-resuming job ${activeJob.id}...`);
        toast.info('Retomando job automaticamente...', { duration: 3000 });
        
        const { data, error } = await supabase.functions.invoke('enrich-songs-batch', {
          body: {
            jobId: activeJob.id,
            continueFrom: activeJob.current_song_index,
          }
        });

        if (error || !data?.success) {
          setAutoResumeCount(prev => prev + 1);
          log.warn(`Auto-resume failed (attempt ${autoResumeCount + 1})`, error || data?.error);
          
          if (autoResumeCount + 1 >= MAX_AUTO_RESUME_RETRIES) {
            toast.warning('Não foi possível retomar automaticamente. Clique em "Retomar" manualmente.', {
              duration: 10000
            });
          }
        } else {
          setAutoResumeCount(0);
          toast.success('Job retomado automaticamente!');
        }
        
        await fetchActiveJob();
      } catch (err) {
        setAutoResumeCount(prev => prev + 1);
        log.error('Auto-resume exception', err);
      } finally {
        setIsAutoResuming(false);
      }
    }, AUTO_RESUME_DELAY_MS);

    return () => {
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
        autoResumeTimeoutRef.current = null;
      }
    };
  }, [activeJob, autoResumeEnabled, isResuming, isAutoResuming, autoResumeCount, fetchActiveJob]);

  useEffect(() => {
    if (!activeJob || activeJob.status === 'processando') {
      setAutoResumeCount(0);
    }
  }, [activeJob?.id, activeJob?.status]);

  return {
    activeJob,
    lastCompletedJob,
    isLoading,
    isStarting,
    isResuming,
    progress,
    isAbandoned,
    isProcessing: activeJob?.status === 'processando' && !isAbandoned,
    isPaused: activeJob?.status === 'pausado',
    isCompleted: activeJob?.status === 'concluido',
    isCancelling: activeJob?.is_cancelling || false,
    hasActiveJob: !!activeJob,
    startJob,
    pauseJob,
    cancelJob,
    resumeJob,
    restartJob,
    forceRestartJob,
    resumeJobWithForce,
    cleanupAbandonedJobs,
    refetch: fetchActiveJob,
  };
}
```

---

### useEnrichmentOrchestration.ts

```typescript
/**
 * Hook para gerenciar orquestração de enriquecimento por corpus
 * Sprint AUD-P3: Batch Execution
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useEnrichmentOrchestration');

export interface CorpusStatus {
  id: string;
  name: string;
  type: string;
  pendingCount: number;
  isCompleted: boolean;
  isActive: boolean;
  songsProcessed: number;
  songsFailed: number;
}

export interface OrchestrationState {
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

export interface OrchestrationData {
  state: OrchestrationState;
  corpora: CorpusStatus[];
  orphansCleaned: number;
}

const POLL_INTERVAL_ACTIVE = 5000;
const POLL_INTERVAL_IDLE = 15000;
const REALTIME_DEBOUNCE_MS = 2000;

export function useEnrichmentOrchestration() {
  const [data, setData] = useState<OrchestrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);
  const isFetchingRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { body: { action: 'status' } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar status');
      }

      isRunningRef.current = result.state.isRunning;

      setData({
        state: result.state,
        corpora: result.corpora,
        orphansCleaned: result.orphansCleaned,
      });
      setError(null);
    } catch (err) {
      log.error('Error fetching status', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const start = useCallback(async (corpusId?: string, jobType: 'metadata' | 'youtube' | 'full' = 'metadata') => {
    setIsStarting(true);
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { 
          body: { 
            action: 'start',
            corpusId,
            jobType,
          } 
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!result.success) {
        toast.error(result.error || 'Erro ao iniciar');
        return false;
      }

      toast.success(result.message || 'Processamento iniciado!');
      await fetchStatus();
      return true;
    } catch (err) {
      log.error('Error starting', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar');
      return false;
    } finally {
      setIsStarting(false);
    }
  }, [fetchStatus]);

  const stop = useCallback(async () => {
    setIsStopping(true);
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { body: { action: 'stop' } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!result.success) {
        toast.error(result.error || 'Erro ao parar');
        return false;
      }

      toast.info(result.message || 'Processamento parado');
      await fetchStatus();
      return true;
    } catch (err) {
      log.error('Error stopping', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao parar');
      return false;
    } finally {
      setIsStopping(false);
    }
  }, [fetchStatus]);

  const skip = useCallback(async (jobType: 'metadata' | 'youtube' | 'full' = 'metadata') => {
    setIsSkipping(true);
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { body: { action: 'skip', jobType } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!result.success) {
        toast.error(result.error || 'Erro ao pular');
        return false;
      }

      toast.info(result.message || 'Corpus pulado');
      await fetchStatus();
      return true;
    } catch (err) {
      log.error('Error skipping', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao pular');
      return false;
    } finally {
      setIsSkipping(false);
    }
  }, [fetchStatus]);

  const cleanup = useCallback(async () => {
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-corpus-enrichment',
        { body: { action: 'cleanup' } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result.orphansCleaned > 0) {
        toast.success(`${result.orphansCleaned} jobs órfãos limpos`);
      } else {
        toast.info('Nenhum job órfão encontrado');
      }

      await fetchStatus();
      return result.orphansCleaned;
    } catch (err) {
      log.error('Error cleaning up', err);
      toast.error(err instanceof Error ? err.message : 'Erro na limpeza');
      return 0;
    }
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
    
    const setupPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      const interval = isRunningRef.current ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
      pollIntervalRef.current = setInterval(() => {
        fetchStatus();
        const newInterval = isRunningRef.current ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
        if (newInterval !== interval) {
          setupPolling();
        }
      }, interval);
    };
    
    setupPolling();
    
    channelRef.current = supabase
      .channel('enrichment-orchestration-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrichment_jobs' },
        () => {
          if (realtimeDebounceRef.current) {
            clearTimeout(realtimeDebounceRef.current);
          }
          realtimeDebounceRef.current = setTimeout(() => {
            log.debug('Realtime update - refetching orchestration status');
            fetchStatus();
          }, REALTIME_DEBOUNCE_MS);
        }
      )
      .subscribe();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchStatus]);

  const totalPending = data?.corpora.reduce((sum, c) => sum + c.pendingCount, 0) || 0;
  const totalCompleted = data?.corpora.filter(c => c.isCompleted).length || 0;
  const progress = data?.state.isRunning && data.state.totalProcessed > 0
    ? Math.round((data.state.totalProcessed / (data.state.totalProcessed + totalPending)) * 100)
    : 0;

  const calculateETA = useCallback(() => {
    if (!data?.state.isRunning || !data.state.startedAt || data.state.totalProcessed === 0) {
      return null;
    }

    const elapsedMs = Date.now() - new Date(data.state.startedAt).getTime();
    const rate = data.state.totalProcessed / (elapsedMs / 1000);
    const remaining = totalPending;
    const etaSeconds = remaining / rate;

    return {
      rate: rate * 60,
      remainingMinutes: Math.round(etaSeconds / 60),
      remainingHours: Math.round(etaSeconds / 3600 * 10) / 10,
    };
  }, [data, totalPending]);

  return {
    data,
    isLoading,
    error,
    isStarting,
    isStopping,
    isSkipping,
    totalPending,
    totalCompleted,
    progress,
    eta: calculateETA(),
    start,
    stop,
    skip,
    cleanup,
    refetch: fetchStatus,
  };
}
```

---

### useEnrichment.ts

```typescript
/**
 * Hook para gerenciar enriquecimento de músicas
 * FASE 1: Separação de responsabilidades
 */

import { useState } from 'react';
import { enrichmentService } from '@/services/enrichmentService';
import { toast } from 'sonner';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useEnrichment');

export function useEnrichment() {
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentSongId: string | null;
  } | null>(null);

  const enrichSong = async (songId: string) => {
    log.info(`Enriching song metadata`, { songId });
    
    setEnrichingIds(prev => new Set(prev).add(songId));
    
    try {
      const result = await enrichmentService.enrichSong(songId, 'metadata-only');
      
      if (result.success) {
        toast.success('Metadados enriquecidos com sucesso!');
      } else {
        toast.error(`Erro ao enriquecer: ${result.error}`);
      }
      
      return result;
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const enrichBatch = async (songIds: string[]) => {
    log.info(`Starting batch metadata enrichment`, { count: songIds.length });
    
    setBatchProgress({ current: 0, total: songIds.length, currentSongId: null });
    
    try {
      const results = await enrichmentService.enrichBatch(
        songIds,
        (current, total, currentSongId) => {
          setBatchProgress({ current, total, currentSongId });
        },
        'metadata-only'
      );
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === songIds.length) {
        toast.success(`${successCount} músicas enriquecidas com sucesso!`);
      } else {
        toast.warning(`${successCount}/${songIds.length} músicas enriquecidas. Algumas falharam.`);
      }
      
      return results;
    } finally {
      setBatchProgress(null);
    }
  };

  const isEnriching = (songId: string) => enrichingIds.has(songId);

  return { 
    enrichSong, 
    enrichBatch, 
    isEnriching, 
    enrichingIds,
    batchProgress
  };
}
```

---

## Frontend - Services

### enrichmentService.ts

```typescript
/**
 * Serviço centralizado de enriquecimento de músicas
 * FASE 1: Arquitetura limpa - um único ponto de controle
 */

import { supabase } from '@/integrations/supabase/client';
import type { EnrichmentResult } from '@/types/music';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('enrichmentService');

export const enrichmentService = {
  /**
   * Enriquece uma música individual com modo específico
   */
  async enrichSong(songId: string, mode: 'full' | 'metadata-only' | 'youtube-only' = 'full', forceReenrich: boolean = false): Promise<EnrichmentResult> {
    log.info(`Starting enrichment for song ${songId}`, { mode, forceReenrich });
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-music-data', {
        body: { songId, mode, forceReenrich }
      });
      
      if (error) {
        log.error(`Edge function error for song ${songId}`, error as Error);
        throw error;
      }
      
      if (!data || !data.success) {
        log.warn(`Enrichment failed for song ${songId}`, { data });
        return {
          success: false,
          songId,
          error: data?.error || 'Enrichment failed'
        };
      }
      
      // BUG-3 FIX: Verificar persistência no banco ANTES de reportar sucesso
      const { data: verifyData, error: verifyError } = await supabase
        .from('songs')
        .select('status, youtube_url, composer, updated_at')
        .eq('id', songId)
        .single();
      
      if (verifyError) {
        log.warn(`Could not verify persistence for song ${songId}`, { verifyError });
      } else {
        const wasUpdated = verifyData?.status === 'enriched' || 
                           verifyData?.youtube_url || 
                           verifyData?.composer;
        
        if (!wasUpdated) {
          log.warn(`Enrichment reported success but no changes detected for song ${songId}`);
          return {
            success: false,
            songId,
            error: 'Enrichment reported success but no data was persisted'
          };
        }
        
        log.info(`Verified persistence for song ${songId}`, { 
          status: verifyData?.status,
          hasYoutube: !!verifyData?.youtube_url,
          hasComposer: !!verifyData?.composer
        });
      }
      
      return {
        success: true,
        songId,
        data: data.data
      };
    } catch (error) {
      log.error(`Error enriching song ${songId}`, error as Error);
      return { 
        success: false,
        songId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Enriquece múltiplas músicas em lote com rate limiting e modo específico
   */
  async enrichBatch(
    songIds: string[],
    onProgress?: (current: number, total: number, currentSongId: string) => void,
    mode: 'full' | 'metadata-only' | 'youtube-only' = 'metadata-only',
    forceReenrich: boolean = false
  ): Promise<EnrichmentResult[]> {
    log.info(`Starting batch enrichment for ${songIds.length} songs`, { mode, forceReenrich });
    
    const results: EnrichmentResult[] = [];
    
    for (let i = 0; i < songIds.length; i++) {
      const songId = songIds[i];
      
      // Rate limiting: 1 requisição por segundo (exceto a primeira)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await this.enrichSong(songId, mode, forceReenrich);
      results.push(result);
      
      onProgress?.(i + 1, songIds.length, songId);
    }
    
    const successCount = results.filter(r => r.success).length;
    log.info(`Batch complete: ${successCount}/${songIds.length} successful`);
    
    return results;
  },

  /**
   * Enriquece automaticamente músicas pendentes após importação
   */
  async autoEnrichNewSongs(corpusId?: string | null, limit: number = 10): Promise<void> {
    log.info(`Auto-enriching up to ${limit} pending songs`);
    
    try {
      let query = supabase
        .from('songs')
        .select('id')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (corpusId) {
        query = query.eq('corpus_id', corpusId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        log.info('No pending songs to enrich');
        return;
      }
      
      log.info(`Found ${data.length} pending songs, starting enrichment`);
      
      await this.enrichBatch(
        data.map(s => s.id),
        (current, total) => {
          log.debug(`Auto-enrichment progress: ${current}/${total}`);
        }
      );
      
      log.info('Auto-enrichment complete');
    } catch (error) {
      log.error('Error in auto-enrichment', error as Error);
      throw error;
    }
  }
};
```

---

## Schema do Banco de Dados

### Tabela: enrichment_jobs

```sql
CREATE TABLE public.enrichment_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL,                    -- 'metadata' | 'youtube' | 'lyrics' | 'full'
  scope text NOT NULL,                       -- 'all' | 'artist' | 'corpus' | 'selection'
  artist_id uuid NULL,
  artist_name text NULL,
  corpus_id uuid NULL,
  corpus_type text NULL,
  song_ids text[] NULL,                      -- Lista de IDs quando scope = 'selection'
  status text NOT NULL DEFAULT 'pendente',   -- 'pendente' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado'
  is_cancelling boolean DEFAULT false,
  total_songs integer NOT NULL DEFAULT 0,
  songs_processed integer DEFAULT 0,
  songs_succeeded integer DEFAULT 0,
  songs_failed integer DEFAULT 0,
  current_song_index integer DEFAULT 0,
  chunk_size integer DEFAULT 20,
  chunks_processed integer DEFAULT 0,
  last_chunk_at timestamp with time zone NULL, -- Heartbeat - última atividade
  force_reenrich boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tempo_inicio timestamp with time zone NULL,
  tempo_fim timestamp with time zone NULL,
  erro_mensagem text NULL,
  metadata jsonb DEFAULT '{}'::jsonb         -- Circuit breaker state, lastProcessedSongId, etc.
);
```

---

## Diagnóstico do Problema

### Hipóteses:
1. **Auto-invocação falha silenciosamente**: A função `autoInvokeNextChunk` falha mas o `EdgeRuntime.waitUntil` não consegue fazer o retry
2. **Timeout da Edge Function**: O chunk demora mais que 4 minutos e a função é terminada antes de completar a auto-invocação
3. **Lock acquisition race condition**: Múltiplas invocações concorrentes causam conflito de lock
4. **detectAndHandleAbandonedJobs não funciona corretamente**: O threshold de 3 minutos usa `last_chunk_at < threshold` mas o job tem um `last_chunk_at` válido do primeiro chunk

### Pontos Críticos a Investigar:
1. Linha 814-862: Lógica de auto-invocação e fallback para `EdgeRuntime.waitUntil`
2. Linha 123-152: `detectAndHandleAbandonedJobs` - verifica se detecta jobs com progresso mas travados
3. Linha 99-121: `acquireLock` - verificar se o lock está sendo adquirido corretamente
4. Logs da Edge Function no Supabase Dashboard

---

*Documento gerado automaticamente para consultoria especializada.*
