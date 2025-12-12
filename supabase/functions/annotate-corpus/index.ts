import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * REFATORAÇÃO COMPLETA - Sistema de Lock Distribuído
 * Orquestra anotação semântica de corpus inteiro, processando artista por artista
 * com proteção contra duplicatas e race conditions
 */

interface AnnotateCorpusRequest {
  jobId?: string;
  corpusId?: string;
  corpusName?: string;
  action?: 'pause' | 'resume' | 'cancel';
  continueProcessing?: boolean;
}

const AUTO_INVOKE_DELAY_MS = 10000; // 10s entre verificações (reduzido para agilidade)
const ARTIST_JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos - timeout para considerar artista stuck

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`\n========== [${requestId}] annotate-corpus ==========`);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body: AnnotateCorpusRequest = await req.json();
    const { jobId, corpusId, corpusName, action, continueProcessing } = body;

    console.log(`📋 Params: jobId=${jobId}, corpusId=${corpusId}, action=${action}, continue=${continueProcessing}`);

    // AÇÃO: Pausar, Retomar ou Cancelar
    if (jobId && action) {
      return await handleAction(supabase, jobId, action, requestId);
    }

    // MODO: Continuar job existente
    if (jobId && (continueProcessing || !action)) {
      return await continueJob(supabase, jobId, requestId);
    }

    // MODO: Criar novo job
    if (corpusId || corpusName) {
      return await createNewJob(supabase, corpusId, corpusName, requestId);
    }

    return new Response(
      JSON.stringify({ error: 'corpusId, corpusName ou jobId obrigatório' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAction(supabase: any, jobId: string, action: string, requestId: string) {
  console.log(`🎬 [${requestId}] Action: ${action} on job ${jobId}`);
  
  const statusMap: Record<string, string> = {
    pause: 'pausado',
    resume: 'processando',
    cancel: 'cancelado',
  };

  const newStatus = statusMap[action];
  if (!newStatus) {
    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const updates: any = { 
    status: newStatus, 
    updated_at: new Date().toISOString() 
  };
  
  if (action === 'cancel') {
    updates.tempo_fim = new Date().toISOString();
    
    // CORREÇÃO: Cancelar também o job de artista atual
    const { data: job } = await supabase
      .from('corpus_annotation_jobs')
      .select('current_artist_job_id, current_artist_id')
      .eq('id', jobId)
      .single();
    
    if (job?.current_artist_job_id) {
      await supabase
        .from('semantic_annotation_jobs')
        .update({ 
          status: 'cancelado', 
          erro_mensagem: 'Cancelado: corpus job cancelado',
          tempo_fim: new Date().toISOString()
        })
        .eq('id', job.current_artist_job_id);
    }
    
    // Cancelar todos os jobs pendentes do artista atual
    if (job?.current_artist_id) {
      await supabase
        .from('semantic_annotation_jobs')
        .update({ 
          status: 'cancelado', 
          erro_mensagem: 'Cancelado: corpus job cancelado',
          tempo_fim: new Date().toISOString()
        })
        .eq('artist_id', job.current_artist_id)
        .in('status', ['processando', 'pendente', 'pausado']);
    }
  }

  const { error } = await supabase
    .from('corpus_annotation_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) throw error;

  // Se retomando, auto-invocar para processar próximo artista
  if (action === 'resume') {
    scheduleAutoInvoke(supabase, jobId, 2000); // 2s delay
  }

  return new Response(
    JSON.stringify({ success: true, status: newStatus }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createNewJob(supabase: any, corpusId?: string, corpusName?: string, requestId?: string) {
  console.log(`🆕 [${requestId}] Creating new corpus job`);
  
  // Buscar corpus
  let corpus;
  if (corpusId) {
    const { data, error } = await supabase
      .from('corpora')
      .select('id, name, normalized_name')
      .eq('id', corpusId)
      .single();
    if (error || !data) throw new Error(`Corpus não encontrado: ${corpusId}`);
    corpus = data;
  } else if (corpusName) {
    const { data, error } = await supabase
      .from('corpora')
      .select('id, name, normalized_name')
      .ilike('normalized_name', corpusName)
      .single();
    if (error || !data) throw new Error(`Corpus não encontrado: ${corpusName}`);
    corpus = data;
  }

  // Verificar se já existe job ativo para este corpus
  const { data: existingJob } = await supabase
    .from('corpus_annotation_jobs')
    .select('id, status')
    .eq('corpus_id', corpus.id)
    .in('status', ['pendente', 'processando', 'pausado'])
    .single();

  if (existingJob) {
    return new Response(
      JSON.stringify({
        error: 'Já existe um job ativo para este corpus',
        existingJobId: existingJob.id,
        status: existingJob.status,
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Buscar artistas do corpus ordenados por nome
  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select('id, name')
    .eq('corpus_id', corpus.id)
    .order('name');

  if (artistsError || !artists || artists.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Nenhum artista encontrado no corpus' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calcular estatísticas
  const { count: totalSongs } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .in('artist_id', artists.map((a: any) => a.id))
    .not('lyrics', 'is', null);

  const estimatedWords = (totalSongs || 0) * 150;

  // Criar job
  const { data: newJob, error: jobError } = await supabase
    .from('corpus_annotation_jobs')
    .insert({
      corpus_id: corpus.id,
      corpus_name: corpus.name,
      status: 'processando',
      total_artists: artists.length,
      processed_artists: 0,
      total_songs: totalSongs || 0,
      processed_songs: 0,
      total_words_estimated: estimatedWords,
      processed_words: 0,
      tempo_inicio: new Date().toISOString(),
    })
    .select()
    .single();

  if (jobError || !newJob) throw new Error('Erro ao criar job: ' + jobError?.message);

  console.log(`✅ [${requestId}] Corpus job criado: ${newJob.id}, ${artists.length} artistas`);

  // Iniciar primeiro artista
  await processNextArtist(supabase, newJob.id, artists, 0, requestId);

  return new Response(
    JSON.stringify({
      success: true,
      jobId: newJob.id,
      corpusId: corpus.id,
      corpusName: corpus.name,
      totalArtists: artists.length,
      totalSongs: totalSongs || 0,
      estimatedWords,
      message: 'Processamento de corpus iniciado',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function continueJob(supabase: any, jobId: string, requestId?: string) {
  console.log(`🔄 [${requestId}] Continuing job ${jobId}`);
  
  // Buscar job com lock otimista
  const { data: job, error: jobError } = await supabase
    .from('corpus_annotation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) throw new Error('Job não encontrado');

  // Verificar status
  if (job.status === 'cancelado') {
    console.log(`⛔ [${requestId}] Job cancelado`);
    return new Response(
      JSON.stringify({ success: false, message: 'Job cancelado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  if (job.status === 'concluido') {
    console.log(`✅ [${requestId}] Job já concluído`);
    return new Response(
      JSON.stringify({ success: true, message: 'Job já concluído' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (job.status === 'pausado') {
    console.log(`⏸️ [${requestId}] Job pausado`);
    return new Response(
      JSON.stringify({ success: false, message: 'Job pausado. Use action=resume para retomar.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Buscar artistas do corpus
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name')
    .eq('corpus_id', job.corpus_id)
    .order('name');

  if (!artists?.length) {
    throw new Error('Nenhum artista encontrado');
  }

  // Verificar status do artista atual
  if (job.current_artist_job_id) {
    const { data: artistJob } = await supabase
      .from('semantic_annotation_jobs')
      .select('id, status, processed_words, total_words, last_chunk_at, tempo_inicio')
      .eq('id', job.current_artist_job_id)
      .single();

    if (artistJob) {
      console.log(`📊 [${requestId}] Artista atual: ${job.current_artist_name}, status: ${artistJob.status}`);
      
      if (artistJob.status === 'processando') {
        // Verificar se está stuck
        const lastActivity = artistJob.last_chunk_at 
          ? new Date(artistJob.last_chunk_at).getTime()
          : new Date(artistJob.tempo_inicio).getTime();
        
        const timeSinceActivity = Date.now() - lastActivity;
        
        if (timeSinceActivity > ARTIST_JOB_TIMEOUT_MS) {
          // Artista stuck - pausar e prosseguir
          console.log(`⚠️ [${requestId}] Artista ${job.current_artist_name} stuck (${Math.round(timeSinceActivity / 60000)}min)`);
          
          await supabase
            .from('semantic_annotation_jobs')
            .update({ 
              status: 'pausado', 
              erro_mensagem: `Pausado automaticamente após ${Math.round(timeSinceActivity / 60000)}min sem atividade`
            })
            .eq('id', artistJob.id);
          
          // Prosseguir para próximo artista
          const nextIndex = job.processed_artists + 1;
          await processNextArtist(supabase, jobId, artists, nextIndex, requestId);
        } else {
          // Ainda processando normalmente
          console.log(`⏳ [${requestId}] Artista ainda processando, agendando verificação`);
          scheduleAutoInvoke(supabase, jobId, AUTO_INVOKE_DELAY_MS);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: artistJob.status === 'processando' ? 'Artista atual ainda processando' : 'Próximo artista iniciado',
            currentArtist: job.current_artist_name,
            progress: artistJob.total_words > 0 
              ? Math.round((artistJob.processed_words / artistJob.total_words) * 100) 
              : 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (artistJob.status === 'concluido' || artistJob.status === 'cancelado' || artistJob.status === 'erro') {
        // Artista terminado, passar para o próximo
        console.log(`✅ [${requestId}] Artista ${job.current_artist_name} finalizado (${artistJob.status})`);
        
        const nextIndex = job.processed_artists + 1;
        
        // Atualizar progresso
        await supabase
          .from('corpus_annotation_jobs')
          .update({
            processed_artists: nextIndex,
            processed_words: (job.processed_words || 0) + (artistJob.processed_words || 0),
            last_artist_at: new Date().toISOString(),
          })
          .eq('id', jobId);
        
        if (nextIndex >= job.total_artists) {
          // Corpus concluído!
          await supabase
            .from('corpus_annotation_jobs')
            .update({
              status: 'concluido',
              tempo_fim: new Date().toISOString(),
              current_artist_id: null,
              current_artist_name: null,
              current_artist_job_id: null,
            })
            .eq('id', jobId);

          console.log(`🎉 [${requestId}] Corpus job ${jobId} concluído!`);
          
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Corpus anotação concluída!',
              totalArtists: job.total_artists,
              processedArtists: nextIndex,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prosseguir para próximo artista
        await processNextArtist(supabase, jobId, artists, nextIndex, requestId);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Próximo artista iniciado',
            processedArtists: nextIndex,
            totalArtists: job.total_artists,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  // Nenhum artista em andamento, iniciar o próximo
  console.log(`🚀 [${requestId}] Iniciando artista ${job.processed_artists + 1}/${job.total_artists}`);
  await processNextArtist(supabase, jobId, artists, job.processed_artists, requestId);

  return new Response(
    JSON.stringify({ success: true, message: 'Processamento continuado' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processNextArtist(
  supabase: any, 
  jobId: string, 
  artists: any[], 
  artistIndex: number,
  requestId?: string
) {
  // Verificar se corpus job ainda está ativo
  const { data: corpusJob } = await supabase
    .from('corpus_annotation_jobs')
    .select('status, is_cancelling')
    .eq('id', jobId)
    .single();
  
  if (!corpusJob || corpusJob.status === 'cancelado' || corpusJob.is_cancelling) {
    console.log(`⛔ [${requestId}] Corpus job cancelado, abortando`);
    return;
  }

  if (artistIndex >= artists.length) {
    // Concluído
    console.log(`🎉 [${requestId}] Todos os ${artists.length} artistas processados!`);
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        status: 'concluido',
        tempo_fim: new Date().toISOString(),
        processed_artists: artists.length,
        current_artist_id: null,
        current_artist_name: null,
        current_artist_job_id: null,
      })
      .eq('id', jobId);
    return;
  }

  const artist = artists[artistIndex];
  console.log(`🎵 [${requestId}] Processando artista ${artistIndex + 1}/${artists.length}: ${artist.name}`);

  // CORREÇÃO 1: Cancelar TODOS os jobs pendentes/processando deste artista ANTES de iniciar
  const { data: cancelledJobs } = await supabase
    .from('semantic_annotation_jobs')
    .update({ 
      status: 'cancelado', 
      erro_mensagem: 'Cancelado automaticamente: novo job de corpus iniciado',
      tempo_fim: new Date().toISOString()
    })
    .eq('artist_id', artist.id)
    .in('status', ['processando', 'pendente', 'pausado'])
    .select('id');
  
  if (cancelledJobs?.length > 0) {
    console.log(`🧹 [${requestId}] ${cancelledJobs.length} jobs anteriores cancelados para ${artist.name}`);
  }

  // CORREÇÃO 2: Verificar se artista já tem cobertura alta no cache
  const { data: songs } = await supabase
    .from('songs')
    .select('lyrics')
    .eq('artist_id', artist.id)
    .not('lyrics', 'is', null);

  if (!songs?.length) {
    console.log(`⏭️ [${requestId}] Artista ${artist.name} sem músicas com letras, pulando`);
    
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        processed_artists: artistIndex + 1,
        last_artist_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    
    // Prosseguir para próximo artista recursivamente
    await processNextArtist(supabase, jobId, artists, artistIndex + 1, requestId);
    return;
  }

  // Tokenizar e verificar cobertura
  const allWords = new Set<string>();
  for (const song of songs) {
    if (song.lyrics) {
      const words = song.lyrics
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length >= 2);
      words.forEach((w: string) => allWords.add(w));
    }
  }

  const wordsArray = Array.from(allWords);
  
  // Verificar quantas já estão no cache (amostra de até 500 palavras)
  const sampleWords = wordsArray.slice(0, 500);
  const { count: cachedCount } = await supabase
    .from('semantic_disambiguation_cache')
    .select('*', { count: 'exact', head: true })
    .in('palavra', sampleWords);

  const coverage = sampleWords.length > 0 ? ((cachedCount || 0) / sampleWords.length) * 100 : 0;

  console.log(`📊 [${requestId}] ${artist.name}: ${wordsArray.length} palavras únicas, ${coverage.toFixed(1)}% cobertura`);

  if (coverage >= 95) {
    console.log(`⏭️ [${requestId}] Artista ${artist.name} já tem ${coverage.toFixed(1)}% cobertura, pulando`);
    
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        processed_artists: artistIndex + 1,
        last_artist_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    
    // Prosseguir para próximo artista recursivamente
    await processNextArtist(supabase, jobId, artists, artistIndex + 1, requestId);
    return;
  }

  // CORREÇÃO 3: Atualizar corpus job ANTES de invocar
  await supabase
    .from('corpus_annotation_jobs')
    .update({
      current_artist_id: artist.id,
      current_artist_name: artist.name,
      current_artist_job_id: null,
      last_artist_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  // Invocar annotate-artist-songs com corpusJobId
  const { data: artistJobData, error: invokeError } = await supabase.functions.invoke(
    'annotate-artist-songs',
    {
      body: { 
        artistId: artist.id, 
        artistName: artist.name,
        corpusJobId: jobId
      },
    }
  );

  if (invokeError) {
    console.error(`❌ [${requestId}] Erro ao invocar annotate-artist-songs:`, invokeError);
    
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        erro_mensagem: `Erro no artista ${artist.name}: ${invokeError.message}`,
      })
      .eq('id', jobId);
    
    // Continuar para próximo artista mesmo com erro
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        processed_artists: artistIndex + 1,
        last_artist_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    
    scheduleAutoInvoke(supabase, jobId, 5000);
    return;
  }

  // Extrair jobId da resposta
  const artistJobId = artistJobData?.jobId || null;
  const isRecent = artistJobData?.isRecent || false;
  const isExisting = artistJobData?.isExisting || false;
  
  console.log(`📋 [${requestId}] Resposta: jobId=${artistJobId}, isRecent=${isRecent}, isExisting=${isExisting}`);

  // Se artista foi marcado como recente (já processado), incrementar e prosseguir
  if (isRecent || (artistJobData?.coverage && artistJobData.coverage >= 95)) {
    console.log(`⏭️ [${requestId}] Artista ${artist.name} já anotado, pulando`);
    
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        processed_artists: artistIndex + 1,
        last_artist_at: new Date().toISOString(),
        current_artist_id: null,
        current_artist_name: null,
        current_artist_job_id: null,
      })
      .eq('id', jobId);
    
    // Prosseguir para próximo artista recursivamente (sem delay para agilidade)
    await processNextArtist(supabase, jobId, artists, artistIndex + 1, requestId);
    return;
  }
  
  // Atualizar job com o artistJobId
  if (artistJobId) {
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        current_artist_job_id: artistJobId,
        last_artist_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  console.log(`✅ [${requestId}] Artista ${artist.name} iniciado, job: ${artistJobId || 'N/A'}`);

  // Agendar verificação do progresso
  scheduleAutoInvoke(supabase, jobId, AUTO_INVOKE_DELAY_MS);
}

function scheduleAutoInvoke(supabase: any, jobId: string, delayMs: number) {
  // @ts-ignore - EdgeRuntime disponível em Deno Edge Functions
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(
      (async () => {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        try {
          console.log(`🔄 Auto-invoking annotate-corpus for job ${jobId}`);
          await supabase.functions.invoke('annotate-corpus', {
            body: { jobId, continueProcessing: true },
          });
        } catch (err) {
          console.error('Auto-invoke failed:', err);
        }
      })()
    );
  } else {
    console.warn('EdgeRuntime.waitUntil not available');
  }
}
