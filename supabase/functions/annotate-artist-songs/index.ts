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
}

interface ProcessingProgress {
  totalWords: number;
  processedWords: number;
  cachedWords: number;
  newWords: number;
  songs: number;
}

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
    const { artistId, artistName } = requestBody;

    if (!artistId && !artistName) {
      throw new Error('artistId ou artistName obrigatório');
    }

    // 1️⃣ Buscar artista
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

    // 2️⃣ Buscar músicas com letra do artista
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

    // 3️⃣ Criar job na tabela
    const { data: job, error: jobError } = await supabaseClient
      .from('semantic_annotation_jobs')
      .insert({
        artist_id: artist.id,
        artist_name: artist.name,
        status: 'iniciado',
        total_songs: songs.length,
        total_words: totalWords,
        processed_words: 0,
        cached_words: 0,
        new_words: 0,
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Erro ao criar job: ' + jobError?.message);
    }

    logger.info('Job criado', { jobId: job.id });

    // 4️⃣ Retornar job_id imediatamente
    const response = new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        artistId: artist.id,
        artistName: artist.name,
        totalSongs: songs.length,
        totalWords,
        message: 'Processamento iniciado em background'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // 5️⃣ Processar em background (não aguardar)
    processAnnotationJob(supabaseClient, job.id, artist, songs, logger).catch(err => {
      logger.error('Background processing failed', err);
    });

    return response;

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao iniciar job de anotação', errorObj);

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
 * Processar anotação em background
 */
async function processAnnotationJob(
  supabase: any,
  jobId: string,
  artist: { id: string; name: string },
  songs: any[],
  logger: any
) {
  const startTime = Date.now();
  
  try {
    // Atualizar status para 'processando'
    await supabase
      .from('semantic_annotation_jobs')
      .update({ status: 'processando' })
      .eq('id', jobId);

    logger.info('Iniciando processamento de job', { jobId, artistName: artist.name });

    const progress: ProcessingProgress = {
      totalWords: 0,
      processedWords: 0,
      cachedWords: 0,
      newWords: 0,
      songs: songs.length,
    };

    for (const song of songs) {
      const words = tokenizeLyrics(song.lyrics);
      progress.totalWords += words.length;

      for (let i = 0; i < words.length; i++) {
        const palavra = words[i];
        const contextoEsquerdo = words.slice(Math.max(0, i - 5), i).join(' ');
        const contextoDireito = words.slice(i + 1, Math.min(words.length, i + 6)).join(' ');

        const contextoHash = await hashContext(contextoEsquerdo, contextoDireito);
        const cached = await checkCache(supabase, palavra, contextoHash);

        if (cached) {
          progress.cachedWords++;
          progress.processedWords++;
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

              progress.newWords++;
              progress.processedWords++;
            }
          } catch (error) {
            logger.warn('Erro ao anotar palavra', { 
              palavra, 
              error: error instanceof Error ? error.message : String(error) 
            });
            progress.processedWords++;
          }
        }

        // Atualizar progresso a cada 50 palavras
        if (progress.processedWords % 50 === 0) {
          await supabase
            .from('semantic_annotation_jobs')
            .update({
              processed_words: progress.processedWords,
              cached_words: progress.cachedWords,
              new_words: progress.newWords,
            })
            .eq('id', jobId);
        }
      }
    }

    // Job concluído
    const processingTime = Date.now() - startTime;
    await supabase
      .from('semantic_annotation_jobs')
      .update({
        status: 'concluido',
        processed_words: progress.processedWords,
        cached_words: progress.cachedWords,
        new_words: progress.newWords,
        tempo_fim: new Date().toISOString(),
        metadata: { processingTime }
      })
      .eq('id', jobId);

    logger.info('Job concluído', { jobId, progress, processingTime });

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro no processamento do job', errorObj, { jobId });

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

/**
 * Tokenizar letra em palavras
 */
function tokenizeLyrics(lyrics: string): string[] {
  return lyrics
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^\wáàâãéèêíïóôõöúçñ]/gi, ''))
    .filter(w => w.length > 1); // Palavras com 2+ caracteres
}

/**
 * Hash simples do contexto
 */
async function hashContext(left: string, right: string): Promise<string> {
  const combined = `${left}|${right}`.toLowerCase();
  const msgUint8 = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Verificar cache
 */
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

/**
 * Chamar edge function annotate-semantic-domain
 */
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

/**
 * Salvar no cache com artist_id e song_id
 */
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
  await supabase.from('semantic_disambiguation_cache').insert({
    palavra: palavra.toLowerCase(),
    contexto_hash: contextoHash,
    tagset_codigo: tagsetCodigo,
    confianca,
    fonte,
    justificativa,
    artist_id: artistId,
    song_id: songId,
  });
}
