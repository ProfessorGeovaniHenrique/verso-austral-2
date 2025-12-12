import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * Orquestra anotação semântica de corpus inteiro, processando artista por artista
 */

interface AnnotateCorpusRequest {
  jobId?: string;        // Continuar job existente
  corpusId?: string;     // Criar novo job para este corpus
  corpusName?: string;   // Ou pelo nome
  action?: 'pause' | 'resume' | 'cancel';
}

const AUTO_INVOKE_DELAY_MS = 30000; // 30s entre verificações (tempo médio de um chunk)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body: AnnotateCorpusRequest = await req.json();
    const { jobId, corpusId, corpusName, action } = body;

    // AÇÃO: Pausar, Retomar ou Cancelar
    if (jobId && action) {
      return await handleAction(supabase, jobId, action);
    }

    // MODO: Continuar job existente
    if (jobId && !action) {
      return await continueJob(supabase, jobId);
    }

    // MODO: Criar novo job
    if (corpusId || corpusName) {
      return await createNewJob(supabase, corpusId, corpusName);
    }

    return new Response(
      JSON.stringify({ error: 'corpusId, corpusName ou jobId obrigatório' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('annotate-corpus error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAction(supabase: any, jobId: string, action: string) {
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

  const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === 'cancel') {
    updates.tempo_fim = new Date().toISOString();
  }

  const { error } = await supabase
    .from('corpus_annotation_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) throw error;

  // Se retomando, auto-invocar para processar próximo artista
  if (action === 'resume') {
    autoInvoke(supabase, jobId);
  }

  return new Response(
    JSON.stringify({ success: true, status: newStatus }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createNewJob(supabase: any, corpusId?: string, corpusName?: string) {
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

  // Buscar artistas do corpus ordenados por total de músicas
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

  // Estimar palavras (média de 150 palavras por música)
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
    })
    .select()
    .single();

  if (jobError || !newJob) throw new Error('Erro ao criar job: ' + jobError?.message);

  console.log('Corpus annotation job criado:', newJob.id, 'Artistas:', artists.length);

  // Iniciar primeiro artista
  await startNextArtist(supabase, newJob.id, artists, 0);

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

async function continueJob(supabase: any, jobId: string) {
  // Buscar job
  const { data: job, error: jobError } = await supabase
    .from('corpus_annotation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) throw new Error('Job não encontrado');

  // Verificar status
  if (job.status === 'cancelado' || job.status === 'concluido') {
    return new Response(
      JSON.stringify({ success: false, message: `Job já ${job.status}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (job.status === 'pausado') {
    return new Response(
      JSON.stringify({ success: false, message: 'Job pausado. Use action=resume para retomar.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verificar status do artista atual
  if (job.current_artist_job_id) {
    const { data: artistJob } = await supabase
      .from('semantic_annotation_jobs')
      .select('status, processed_words, total_words')
      .eq('id', job.current_artist_job_id)
      .single();

    if (artistJob) {
      if (artistJob.status === 'processando') {
        // Ainda processando, não fazer nada
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Artista atual ainda processando',
            currentArtist: job.current_artist_name,
            artistProgress: artistJob.total_words > 0 
              ? Math.round((artistJob.processed_words / artistJob.total_words) * 100) 
              : 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (artistJob.status === 'concluido' || artistJob.status === 'erro') {
        // Artista concluído, passar para o próximo
        const processedArtists = job.processed_artists + 1;
        
        // Buscar artistas do corpus
        const { data: artists } = await supabase
          .from('artists')
          .select('id, name')
          .eq('corpus_id', job.corpus_id)
          .order('name');

        if (processedArtists >= job.total_artists) {
          // Corpus concluído!
          await supabase
            .from('corpus_annotation_jobs')
            .update({
              status: 'concluido',
              processed_artists: processedArtists,
              tempo_fim: new Date().toISOString(),
            })
            .eq('id', jobId);

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Corpus anotação concluída!',
              totalArtists: job.total_artists,
              processedArtists,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Atualizar progresso e iniciar próximo artista
        await supabase
          .from('corpus_annotation_jobs')
          .update({
            processed_artists: processedArtists,
            last_artist_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        await startNextArtist(supabase, jobId, artists || [], processedArtists);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Próximo artista iniciado',
            processedArtists,
            totalArtists: job.total_artists,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  // Nenhum artista em andamento, iniciar o próximo
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name')
    .eq('corpus_id', job.corpus_id)
    .order('name');

  await startNextArtist(supabase, jobId, artists || [], job.processed_artists);

  return new Response(
    JSON.stringify({ success: true, message: 'Processamento continuado' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function startNextArtist(supabase: any, jobId: string, artists: any[], artistIndex: number) {
  if (artistIndex >= artists.length) {
    // Concluído
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        status: 'concluido',
        tempo_fim: new Date().toISOString(),
        processed_artists: artists.length,
      })
      .eq('id', jobId);
    return;
  }

  const artist = artists[artistIndex];
  console.log(`Iniciando artista ${artistIndex + 1}/${artists.length}: ${artist.name}`);

  // ========== CORREÇÃO 1: Atualizar ANTES de invocar para evitar race condition ==========
  // Pré-registrar o artista atual ANTES de invocar
  await supabase
    .from('corpus_annotation_jobs')
    .update({
      current_artist_id: artist.id,
      current_artist_name: artist.name,
      current_artist_job_id: null, // Será atualizado após a resposta
      last_artist_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  // Invocar annotate-artist-songs
  const { data: artistJobData, error: invokeError } = await supabase.functions.invoke(
    'annotate-artist-songs',
    {
      body: { artistId: artist.id },
    }
  );

  if (invokeError) {
    console.error('Erro ao invocar annotate-artist-songs:', invokeError);
    // Marcar erro mas continuar com próximo artista
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        erro_mensagem: `Erro no artista ${artist.name}: ${invokeError.message}`,
      })
      .eq('id', jobId);
  }

  // ========== CORREÇÃO 1: Extrair jobId da resposta e atualizar SINCRONAMENTE ==========
  const artistJobId = artistJobData?.jobId || null;
  const isRecent = artistJobData?.isRecent || false;
  const isExisting = artistJobData?.isExisting || false;
  
  // Se artista foi marcado como recente (já processado), incrementar contador e prosseguir
  if (isRecent || (isExisting && artistJobData?.status === 'concluido')) {
    console.log(`Artista ${artist.name} já processado recentemente, pulando para próximo`);
    
    // CORREÇÃO: Buscar processed_artists atual do banco para evitar race condition
    const { data: currentJob } = await supabase
      .from('corpus_annotation_jobs')
      .select('processed_artists')
      .eq('id', jobId)
      .single();
    
    const newProcessedArtists = (currentJob?.processed_artists || artistIndex) + 1;
    
    // Incrementar processed_artists com valor correto do banco
    await supabase
      .from('corpus_annotation_jobs')
      .update({
        processed_artists: newProcessedArtists,
        last_artist_at: new Date().toISOString(),
        current_artist_id: null,
        current_artist_name: null,
        current_artist_job_id: null,
      })
      .eq('id', jobId);
    
    console.log(`Artista ${artist.name} skipped, processed_artists: ${newProcessedArtists}`);
    
    // Invocar próximo artista imediatamente usando o índice correto
    await startNextArtist(supabase, jobId, artists, newProcessedArtists);
    return;
  }
  
  // Atualizar job com o artistJobId APÓS a resposta (correção do bug original)
  await supabase
    .from('corpus_annotation_jobs')
    .update({
      current_artist_job_id: artistJobId,
      last_artist_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  console.log(`Artista ${artist.name} iniciado. Job ID: ${artistJobId || 'N/A'}`);

  // SPRINT SEMANTIC-PIPELINE-FIX: Usar EdgeRuntime.waitUntil para auto-invocação
  // EdgeRuntime.waitUntil permite execução após resposta HTTP
  autoInvoke(supabase, jobId);
}

function autoInvoke(supabase: any, jobId: string) {
  // SPRINT SEMANTIC-PIPELINE-FIX: Usar EdgeRuntime.waitUntil em vez de setTimeout
  // @ts-ignore - EdgeRuntime disponível em Deno Edge Functions
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(
      (async () => {
        await new Promise(resolve => setTimeout(resolve, AUTO_INVOKE_DELAY_MS));
        try {
          console.log(`Auto-invoking annotate-corpus for job ${jobId}`);
          await supabase.functions.invoke('annotate-corpus', {
            body: { jobId },
          });
        } catch (err) {
          console.error('EdgeRuntime auto-invoke failed:', err);
        }
      })()
    );
  } else {
    // Fallback: setTimeout (não funciona após resposta HTTP, mas serve para testes)
    console.warn('EdgeRuntime.waitUntil not available, using setTimeout fallback');
    setTimeout(async () => {
      try {
        await supabase.functions.invoke('annotate-corpus', {
          body: { jobId },
        });
      } catch (err) {
        console.error('setTimeout auto-invoke failed:', err);
      }
    }, AUTO_INVOKE_DELAY_MS);
  }
}
