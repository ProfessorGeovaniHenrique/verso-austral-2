import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnotateArtistRequest {
  artistId?: string;
  artistName?: string;
  jobId?: string;
  continueFrom?: {
    songIndex: number;
    wordIndex: number;
  };
}

const CHUNK_SIZE = 50; // Palavras por chunk (reduzido para garantir conclusão em 4min)
const CHUNK_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutos

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const logger = createEdgeLogger('annotate-artist-songs', requestId);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody: AnnotateArtistRequest = await req.json();
    const { artistId, artistName, jobId, continueFrom } = requestBody;

    // MODO 1: Continuar job existente
    if (jobId && continueFrom) {
      logger.info('Continuando job existente', { jobId, continueFrom });
      await processChunk(supabaseClient, jobId, continueFrom, logger);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Chunk processado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODO 2: Criar novo job
    if (!artistId && !artistName) {
      throw new Error('artistId ou artistName obrigatório');
    }

    // Buscar artista
    let artist;
    if (artistId) {
      const { data, error } = await supabaseClient
        .from('artists')
        .select('id, name')
        .eq('id', artistId)
        .single();
      
      if (error || !data) throw new Error(`Artista não encontrado: ${artistId}`);
      artist = data;
    } else {
      const { data, error } = await supabaseClient
        .from('artists')
        .select('id, name')
        .ilike('name', `%${artistName}%`)
        .limit(1)
        .single();
      
      if (error || !data) throw new Error(`Artista não encontrado: ${artistName}`);
      artist = data;
    }

    logger.info('Artista identificado', { artistId: artist.id, artistName: artist.name });

    // Buscar músicas com letra
    const { data: songs, error: songsError } = await supabaseClient
      .from('songs')
      .select('id, title, lyrics')
      .eq('artist_id', artist.id)
      .not('lyrics', 'is', null)
      .neq('lyrics', '');

    if (songsError || !songs || songs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          jobId: null,
          message: 'Nenhuma música com letra encontrada',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular total de palavras
    let totalWords = 0;
    for (const song of songs) {
      const words = tokenizeLyrics(song.lyrics);
      totalWords += words.length;
    }

    logger.info('Músicas carregadas', { count: songs.length, totalWords });

    // Criar job
    const { data: newJob, error: jobError } = await supabaseClient
      .from('semantic_annotation_jobs')
      .insert({
        artist_id: artist.id,
        artist_name: artist.name,
        status: 'processando',
        total_songs: songs.length,
        total_words: totalWords,
        processed_words: 0,
        cached_words: 0,
        new_words: 0,
        current_song_index: 0,
        current_word_index: 0,
        chunk_size: CHUNK_SIZE,
        chunks_processed: 0,
        last_chunk_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !newJob) {
      throw new Error('Erro ao criar job: ' + jobError?.message);
    }

    logger.info('Job criado', { jobId: newJob.id });

    // Retornar job_id imediatamente
    const response = new Response(
      JSON.stringify({
        success: true,
        jobId: newJob.id,
        artistId: artist.id,
        artistName: artist.name,
        totalSongs: songs.length,
        totalWords,
        message: 'Processamento iniciado em chunks'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Iniciar primeiro chunk assincronamente
    processChunk(supabaseClient, newJob.id, { songIndex: 0, wordIndex: 0 }, logger)
      .catch(err => logger.error('First chunk failed', err));

    return response;

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao processar request', errorObj);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorObj.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Processar um chunk de palavras
 */
async function processChunk(
  supabase: any,
  jobId: string,
  continueFrom: { songIndex: number; wordIndex: number },
  logger: any
) {
  const startTime = Date.now();
  
  try {
    // Proteção anti-duplicação: verificar se outro chunk está rodando
    const { data: lockCheck } = await supabase
      .from('semantic_annotation_jobs')
      .update({ last_chunk_at: new Date().toISOString() })
      .eq('id', jobId)
      .lte('last_chunk_at', new Date(Date.now() - 30000).toISOString()) // CORRIGIDO: lte = "último chunk há mais de 30s"
      .select('id')
      .single();

    if (!lockCheck) {
      logger.warn('Outro chunk já está processando, abortando', { jobId });
      return;
    }

    // Buscar job
    const { data: job, error: jobError } = await supabase
      .from('semantic_annotation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job não encontrado');
    }

    // Verificar se job foi cancelado
    if (job.status === 'cancelado') {
      logger.info('Job foi cancelado, abortando chunk', { jobId });
      return;
    }

    // Buscar artista e músicas
    const { data: artist } = await supabase
      .from('artists')
      .select('id, name')
      .eq('id', job.artist_id)
      .single();

    const { data: songs } = await supabase
      .from('songs')
      .select('id, title, lyrics')
      .eq('artist_id', job.artist_id)
      .not('lyrics', 'is', null)
      .neq('lyrics', '');

    if (!songs || songs.length === 0) {
      throw new Error('Nenhuma música encontrada');
    }

    logger.info('Processando chunk', { 
      jobId, 
      songIndex: continueFrom.songIndex, 
      wordIndex: continueFrom.wordIndex,
      totalSongs: songs.length 
    });

    let processedInChunk = 0;
    let cachedInChunk = 0;
    let newInChunk = 0;
    let currentSongIndex = continueFrom.songIndex;
    let currentWordIndex = continueFrom.wordIndex;

    // Processar até CHUNK_SIZE palavras ou timeout
    outer: for (let s = currentSongIndex; s < songs.length; s++) {
      const song = songs[s];
      const words = tokenizeLyrics(song.lyrics);

      for (let w = (s === currentSongIndex ? currentWordIndex : 0); w < words.length; w++) {
        // Timeout check
        if (Date.now() - startTime > CHUNK_TIMEOUT_MS) {
          logger.warn('Chunk timeout, salvando progresso', { processedInChunk });
          break outer;
        }

        // Chunk size check
        if (processedInChunk >= CHUNK_SIZE) {
          break outer;
        }

        const palavra = words[w];
        const contextoEsquerdo = words.slice(Math.max(0, w - 5), w).join(' ');
        const contextoDireito = words.slice(w + 1, Math.min(words.length, w + 6)).join(' ');

        const contextoHash = await hashContext(contextoEsquerdo, contextoDireito);
        const cached = await checkCache(supabase, palavra, contextoHash);

        if (cached) {
          cachedInChunk++;
          processedInChunk++;
        } else {
          try {
            const annotationResult = await callSemanticAnnotator(
              palavra,
              contextoEsquerdo,
              contextoDireito
            );

            if (annotationResult.success) {
              await saveWithArtistSong(
                supabase,
                palavra,
                contextoHash,
                annotationResult.result.tagset_codigo,
                annotationResult.result.confianca,
                annotationResult.result.fonte,
                annotationResult.result.justificativa,
                artist.id,
                song.id
              );

              newInChunk++;
              processedInChunk++;
            }
          } catch (error) {
            logger.warn('Erro ao anotar palavra', { 
              palavra, 
              error: error instanceof Error ? error.message : String(error) 
            });
            processedInChunk++;
          }
        }

        currentSongIndex = s;
        currentWordIndex = w + 1;
      }

      // Se terminou a música, avançar para próxima
      if (currentWordIndex >= words.length) {
        currentSongIndex = s + 1;
        currentWordIndex = 0;
      }
    }

    // Atualizar progresso no job
    const totalProcessed = job.processed_words + processedInChunk;
    const totalCached = job.cached_words + cachedInChunk;
    const totalNew = job.new_words + newInChunk;
    const chunksProcessed = job.chunks_processed + 1;

    const isCompleted = totalProcessed >= job.total_words;

    logger.info('Salvando progresso', { 
      jobId, 
      processedInChunk, 
      totalProcessed, 
      cachedInChunk, 
      newInChunk,
      currentSongIndex,
      currentWordIndex
    });

    // CRÍTICO: NÃO atualizar last_chunk_at aqui (será atualizado pelo próximo chunk no lockCheck)
    await supabase
      .from('semantic_annotation_jobs')
      .update({
        status: isCompleted ? 'concluido' : 'processando',
        processed_words: totalProcessed,
        cached_words: totalCached,
        new_words: totalNew,
        current_song_index: currentSongIndex,
        current_word_index: currentWordIndex,
        chunks_processed: chunksProcessed,
        tempo_fim: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', jobId);

    logger.info('Chunk concluído', { 
      jobId, 
      processedInChunk, 
      totalProcessed, 
      isCompleted,
      chunksProcessed 
    });

    // Se não terminou, auto-invocar para próximo chunk com retry (ASSÍNCRONO)
    if (!isCompleted) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      const invokeNextChunk = async (retries = 3) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/annotate-artist-songs`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jobId: jobId,
                continueFrom: {
                  songIndex: currentSongIndex,
                  wordIndex: currentWordIndex,
                }
              }),
            });
            
            if (response.ok) {
              logger.info('Auto-invocação bem-sucedida', { jobId, attempt });
              return;
            }
            
            logger.warn('Auto-invocação falhou, tentando novamente', { 
              jobId, attempt, status: response.status 
            });
          } catch (err) {
            logger.warn('Erro na auto-invocação', { 
              jobId, 
              attempt, 
              error: err instanceof Error ? err.message : String(err) 
            });
          }
          
          // Aguardar antes de retry (backoff exponencial)
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }
        
        // Todos os retries falharam, marcar como pausado
        logger.error('Auto-invocação falhou após todos os retries', { jobId });
        await supabase
          .from('semantic_annotation_jobs')
          .update({ status: 'pausado' })
          .eq('id', jobId);
      };

      // Disparo assíncrono sem await (não bloqueia resposta HTTP)
      invokeNextChunk().catch(err => logger.error('invokeNextChunk error', err));
    }

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro no processamento do chunk', errorObj, { jobId });

    await supabase
      .from('semantic_annotation_jobs')
      .update({
        status: 'erro',
        erro_mensagem: errorObj.message,
        tempo_fim: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

function tokenizeLyrics(lyrics: string): string[] {
  return lyrics
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^\wáàâãéèêíïóôõöúçñ]/gi, ''))
    .filter(w => w.length > 1);
}

async function hashContext(left: string, right: string): Promise<string> {
  const combined = `${left}|${right}`.toLowerCase();
  const msgUint8 = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

async function checkCache(supabase: any, palavra: string, contextoHash: string) {
  const { data, error } = await supabase
    .from('semantic_disambiguation_cache')
    .select('id')
    .eq('palavra', palavra.toLowerCase())
    .eq('contexto_hash', contextoHash)
    .single();

  if (error || !data) return null;
  return data;
}

async function callSemanticAnnotator(
  palavra: string,
  contextoEsquerdo: string,
  contextoDireito: string
): Promise<any> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/annotate-semantic-domain`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      palavra,
      contexto_esquerdo: contextoEsquerdo,
      contexto_direito: contextoDireito,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Semantic annotator error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function saveWithArtistSong(
  supabase: any,
  palavra: string,
  contextoHash: string,
  tagsetCodigo: string,
  confianca: number,
  fonte: string,
  justificativa: string,
  artistId: string,
  songId: string
): Promise<void> {
  // UPSERT: se já existe (palavra + contexto_hash), atualiza com artist_id/song_id
  await supabase.from('semantic_disambiguation_cache').upsert({
    palavra: palavra.toLowerCase(),
    contexto_hash: contextoHash,
    tagset_codigo: tagsetCodigo,
    confianca,
    fonte,
    justificativa,
    artist_id: artistId,
    song_id: songId,
  }, {
    onConflict: 'palavra,contexto_hash',
    ignoreDuplicates: false // false = UPDATE em caso de conflito
  });
}
