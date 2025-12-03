/**
 * Edge Function: enrich-songs-batch
 * Processa enriquecimento de músicas em chunks com auto-invocação
 * Similar à arquitetura de scraping (scrape-gaucho-artists)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUNK_SIZE = 20; // Músicas por chunk
const LOCK_TIMEOUT_MS = 30000; // 30 segundos para evitar race conditions
const AUTO_INVOKE_DELAY_MS = 10000; // 10 segundos (consistente com scraping)

interface EnrichmentJobPayload {
  jobId?: string;
  continueFrom?: number;
  // Parâmetros para novo job
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

function createSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function acquireLock(supabase: ReturnType<typeof createSupabaseClient>, jobId: string): Promise<boolean> {
  const lockThreshold = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();
  
  const { data, error } = await supabase
    .from('enrichment_jobs')
    .update({ last_chunk_at: new Date().toISOString() })
    .eq('id', jobId)
    .or(`last_chunk_at.is.null,last_chunk_at.lte.${lockThreshold}`)
    .select();
  
  return !error && data && data.length > 0;
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
  // Se job tem song_ids específicos (seleção manual)
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

  // Query base
  let query = supabase
    .from('songs')
    .select('id, title, artists!inner(name)')
    .order('created_at', { ascending: true })
    .range(startIndex, startIndex + CHUNK_SIZE - 1);

  // Filtros por escopo
  if (job.scope === 'artist' && job.artist_id) {
    query = query.eq('artist_id', job.artist_id);
  } else if (job.scope === 'corpus' && job.corpus_id) {
    query = query.eq('corpus_id', job.corpus_id);
  }

  // Filtrar por status se não for force_reenrich
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

async function enrichSingleSong(
  supabase: ReturnType<typeof createSupabaseClient>,
  songId: string,
  jobType: string,
  forceReenrich: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const mode = jobType === 'full' ? 'full' : 
                 jobType === 'youtube' ? 'youtube-only' : 
                 jobType === 'lyrics' ? 'lyrics-only' : 'metadata-only';

    const { data, error } = await supabase.functions.invoke('enrich-music-data', {
      body: { songId, mode, forceReenrich }
    });

    if (error) {
      console.error(`[enrich-batch] Erro enriquecendo ${songId}:`, error);
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, error: data?.error };
  } catch (err) {
    console.error(`[enrich-batch] Exceção enriquecendo ${songId}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
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

    let job: EnrichmentJob;
    let startIndex = payload.continueFrom || 0;
    let isNewJob = false;

    // Criar novo job ou continuar existente
    if (payload.jobId) {
      // Continuar job existente
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
      
      // Verificar status
      if (job.status === 'cancelado' || job.status === 'concluido') {
        return new Response(
          JSON.stringify({ success: false, error: `Job já está ${job.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar cancelamento pendente
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

      // Adquirir lock APENAS para jobs existentes (continuação)
      const lockAcquired = await acquireLock(supabase, job.id);
      if (!lockAcquired) {
        console.log(`[enrich-batch] Lock não adquirido para job ${job.id} (outro chunk em execução)`);
        return new Response(
          JSON.stringify({ success: false, error: 'Lock não adquirido (outro chunk em execução)' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else {
      // Criar novo job
      isNewJob = true;
      const jobType = payload.jobType || 'metadata';
      const scope = payload.scope || 'all';

      // Verificar se já existe job ativo para este escopo
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

      // Criar job com last_chunk_at já definido (evita race condition)
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
          last_chunk_at: new Date().toISOString(), // Lock inicial
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

      // Contar total de músicas
      const totalSongs = await countTotalSongs(supabase, job);
      await supabase
        .from('enrichment_jobs')
        .update({ total_songs: totalSongs })
        .eq('id', job.id);
      
      job.total_songs = totalSongs;
      console.log(`[enrich-batch] Novo job criado: ${job.id}, total de músicas: ${totalSongs}`);
    }

    // Atualizar status para processando (apenas se não for novo job)
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
      // Job concluído
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

    // Processar músicas do chunk
    let succeeded = 0;
    let failed = 0;

    for (const song of songs) {
      // Verificar cancelamento a cada música
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

      console.log(`[enrich-batch] Enriquecendo: ${song.title} (${song.id})`);
      const result = await enrichSingleSong(supabase, song.id, job.job_type, job.force_reenrich);
      
      if (result.success) {
        succeeded++;
      } else {
        failed++;
        console.warn(`[enrich-batch] Falha em ${song.id}: ${result.error}`);
      }

      // Rate limiting: 1 segundo entre requisições
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Atualizar progresso
    const newProcessed = job.songs_processed + succeeded + failed;
    const newSucceeded = job.songs_succeeded + succeeded;
    const newFailed = job.songs_failed + failed;
    const newIndex = startIndex + songs.length;
    const chunksProcessed = job.chunks_processed + 1;

    await supabase
      .from('enrichment_jobs')
      .update({
        songs_processed: newProcessed,
        songs_succeeded: newSucceeded,
        songs_failed: newFailed,
        current_song_index: newIndex,
        chunks_processed: chunksProcessed,
      })
      .eq('id', job.id);

    console.log(`[enrich-batch] Chunk ${chunksProcessed} concluído: ${succeeded} sucesso, ${failed} falhas`);

    // Verificar se há mais músicas
    const hasMore = newIndex < job.total_songs;

    if (hasMore && !await checkCancellation(supabase, job.id)) {
      // Auto-invocar próximo chunk com delay
      console.log(`[enrich-batch] ⏳ Aguardando ${AUTO_INVOKE_DELAY_MS}ms antes de invocar próximo chunk...`);
      await new Promise(r => setTimeout(r, AUTO_INVOKE_DELAY_MS));
      
      const autoInvokeSuccess = await autoInvokeNextChunk(job.id, newIndex);
      
      // Se auto-invocação falhou, marcar como pausado para recovery automático
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
      // Marcar como concluído
      await supabase
        .from('enrichment_jobs')
        .update({
          status: 'concluido',
          tempo_fim: new Date().toISOString(),
        })
        .eq('id', job.id);
      
      console.log(`[enrich-batch] Job ${job.id} concluído com sucesso!`);
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
