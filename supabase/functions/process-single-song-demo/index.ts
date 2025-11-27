import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const log = createEdgeLogger('process-single-song-demo');
  
  try {
    const { songId, referenceCorpusSize = 25 } = await req.json();
    
    if (!songId) {
      return new Response(
        JSON.stringify({ error: 'songId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();
    log.info('Processing demo song', { songId, referenceCorpusSize });

    // 1. Buscar a música
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, title, lyrics, artist_id, artists(name)')
      .eq('id', songId)
      .single();

    if (songError || !song || !song.lyrics) {
      if (songError) log.error('Song not found or no lyrics', songError as Error);
      return new Response(
        JSON.stringify({ error: 'Música não encontrada ou sem letra' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const artistName = (song.artists as any)?.name || 'Unknown';
    log.info('Song loaded', { title: song.title, artist: artistName });

    // 2. Tokenizar letra (split por espaços e quebras de linha, remover pontuação)
    const words = song.lyrics
      .toLowerCase()
      .replace(/[.,!?;:()[\]"'—]/g, ' ')
      .split(/\s+/)
      .filter((w: string) => w.length > 0);

    const totalWords = words.length;
    log.info('Words tokenized', { totalWords });

    // 3. Processar cada palavra via annotate-semantic-domain
    let processedWords = 0;
    
    for (let i = 0; i < words.length; i++) {
      const palavra = words[i];
      
      // Verificar se já existe no cache
      const { data: cached } = await supabase
        .from('semantic_disambiguation_cache')
        .select('id')
        .eq('palavra', palavra)
        .eq('song_id', songId)
        .maybeSingle();

      if (cached) {
        processedWords++;
        continue; // Já processada
      }

      // Processar palavra via edge function
      try {
        const { data: annotationData, error: annotationError } = await supabase.functions.invoke(
          'annotate-semantic-domain',
          {
            body: {
              palavra,
              corpusType: 'gaucho',
              contexto_esquerdo: words[i - 1] || '',
              contexto_direito: words[i + 1] || ''
            }
          }
        );

        if (annotationError) {
          log.warn('Annotation failed for word', { palavra, error: annotationError });
          continue;
        }

        // Salvar no cache com song_id
        if (annotationData?.tagset_codigo) {
          await supabase.from('semantic_disambiguation_cache').insert({
            palavra,
            tagset_codigo: annotationData.tagset_codigo,
            confianca: annotationData.confianca || 0.5,
            fonte: 'gemini',
            song_id: songId,
            artist_id: song.artist_id,
            contexto_hash: `${words[i - 1] || ''}_${palavra}_${words[i + 1] || ''}`,
            lema: annotationData.lema || palavra,
            pos: annotationData.pos
          });
        }

        processedWords++;
        
        // Log progresso a cada 20 palavras
        if (processedWords % 20 === 0) {
          log.info('Processing progress', { 
            processedWords, 
            totalWords, 
            percentage: Math.round((processedWords / totalWords) * 100) 
          });
        }
      } catch (error) {
        log.error('Error processing word', error as Error, { palavra });
      }
    }

    log.info('Song processing complete', { processedWords, totalWords });

    // 4. Processar corpus de referência nordestino (25 músicas)
    log.info('Processing reference corpus', { referenceCorpusSize });
    
    const { data: nordestinas, error: nordestinasError } = await supabase
      .from('songs')
      .select('id, title, lyrics, artist_id')
      .not('lyrics', 'is', null)
      .limit(referenceCorpusSize);

    if (!nordestinasError && nordestinas) {
      let refProcessed = 0;
      
      for (const refSong of nordestinas) {
        // Verificar se já processada
        const { count } = await supabase
          .from('semantic_disambiguation_cache')
          .select('*', { count: 'exact', head: true })
          .eq('song_id', refSong.id);

        if (count && count > 10) {
          refProcessed++;
          continue; // Já processada
        }

        // Tokenizar e processar (processo simplificado para referência)
        const refWords = refSong.lyrics
          .toLowerCase()
          .replace(/[.,!?;:()[\]"'—]/g, ' ')
          .split(/\s+/)
          .filter((w: string) => w.length > 0)
          .slice(0, 50); // Apenas primeiras 50 palavras de cada música

        for (const palavra of refWords) {
          const { data: cached } = await supabase
            .from('semantic_disambiguation_cache')
            .select('id')
            .eq('palavra', palavra)
            .eq('song_id', refSong.id)
            .maybeSingle();

          if (!cached) {
            const { data: annotationData } = await supabase.functions.invoke(
              'annotate-semantic-domain',
              { body: { palavra, corpusType: 'nordestino' } }
            );

            if (annotationData?.tagset_codigo) {
              await supabase.from('semantic_disambiguation_cache').insert({
                palavra,
                tagset_codigo: annotationData.tagset_codigo,
                confianca: annotationData.confianca || 0.5,
                fonte: 'gemini',
                song_id: refSong.id,
                artist_id: refSong.artist_id,
                contexto_hash: palavra
              });
            }
          }
        }

        refProcessed++;
        log.info('Reference song processed', { 
          refProcessed, 
          total: referenceCorpusSize,
          title: refSong.title 
        });
      }
    }

    log.info('Demo processing complete', { 
      songProcessed: processedWords, 
      referenceProcessed: referenceCorpusSize 
    });

    return new Response(
      JSON.stringify({
        success: true,
        songId,
        processedWords,
        totalWords,
        referenceCorpusSize,
        message: 'Processamento completo!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error in process-single-song-demo', error as Error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
