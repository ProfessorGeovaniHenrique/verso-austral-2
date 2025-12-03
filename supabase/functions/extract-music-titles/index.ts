import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedMusic {
  titulo: string;
  artista: string;
  album?: string;
  ano?: string;
  compositor?: string;
  genero?: string;
  letra?: string;  // ✅ FASE 0: Adicionar campo letra
}

interface DeduplicationResult {
  artistsCreated: number;
  songsCreated: number;
  duplicatesSkipped: number;
  artistIds: Record<string, string>;
  songIds: string[];
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('extract-music-titles', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { songs, uploadId, corpusId } = await req.json();
    
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      log.warn('Invalid request - empty songs array');
      return new Response(
        JSON.stringify({ error: 'Songs array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Extraction started', { songCount: songs.length, uploadId, corpusId });

    // Validar corpus_id se fornecido
    if (corpusId) {
      const { data: corpus, error: corpusError } = await supabase
        .from('corpora')
        .select('id')
        .eq('id', corpusId)
        .single();

      log.logDatabaseQuery('corpora', 'select', corpus ? 1 : 0);

      if (corpusError || !corpus) {
        log.error('Invalid corpus', corpusError, { corpusId });
        return new Response(
          JSON.stringify({ error: 'Corpus inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Função para normalizar texto (minúsculas, sem acentos)
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    };

    // Deduplicate artists
    const uniqueArtists = new Map<string, string>();
    songs.forEach((song: ParsedMusic) => {
      if (song.artista) {
        const normalized = normalizeText(song.artista);
        if (!uniqueArtists.has(normalized)) {
          uniqueArtists.set(normalized, song.artista);
        }
      }
    });

    log.info('Unique artists identified', { uniqueCount: uniqueArtists.size });

    // OTIMIZAÇÃO: Batch upsert para artistas COM atualização de corpus_id
    const artistsToInsert = Array.from(uniqueArtists.entries()).map(([normalized, original]) => ({
      name: original,
      normalized_name: normalized,
      corpus_id: corpusId || null,
    }));

    // Primeiro: buscar artistas existentes
    const normalizedNames = Array.from(uniqueArtists.keys());
    const { data: existingArtists } = await supabase
      .from('artists')
      .select('id, name, normalized_name, corpus_id')
      .in('normalized_name', normalizedNames);

    const existingArtistMap = new Map(
      (existingArtists || []).map(a => [a.normalized_name, a])
    );

    // Separar artistas novos dos existentes que precisam atualização
    const newArtists: typeof artistsToInsert = [];
    const artistsToUpdate: Array<{ id: string; corpus_id: string }> = [];
    const artistIds: Record<string, string> = {};

    for (const artist of artistsToInsert) {
      const existing = existingArtistMap.get(artist.normalized_name);
      if (existing) {
        artistIds[artist.name] = existing.id;
        // Atualizar corpus_id se estava null e agora tem valor
        if (!existing.corpus_id && corpusId) {
          artistsToUpdate.push({ id: existing.id, corpus_id: corpusId });
        }
      } else {
        newArtists.push(artist);
      }
    }

    // Inserir novos artistas
    let artistsCreated = 0;
    if (newArtists.length > 0) {
      const { data: insertedArtists, error: insertError } = await supabase
        .from('artists')
        .insert(newArtists)
        .select('id, name, normalized_name');

      if (insertError) {
        log.error('Failed to insert new artists', insertError);
        throw new Error(`Falha ao criar artistas: ${insertError.message}`);
      }

      insertedArtists?.forEach(artist => {
        artistIds[artist.name] = artist.id;
      });
      artistsCreated = insertedArtists?.length || 0;
    }

    // Atualizar corpus_id dos artistas existentes que não tinham
    if (artistsToUpdate.length > 0 && corpusId) {
      for (const artist of artistsToUpdate) {
        await supabase
          .from('artists')
          .update({ corpus_id: artist.corpus_id })
          .eq('id', artist.id);
      }
      log.info('Updated corpus_id for existing artists', { count: artistsToUpdate.length });
    }

    log.logDatabaseQuery('artists', 'insert', newArtists.length);
    log.info('Artists processed', { 
      new: artistsCreated, 
      existing: existingArtistMap.size,
      corpusUpdated: artistsToUpdate.length 
    });

    // VALIDAÇÃO: Verificar integridade dos artist_ids
    const missingArtists = songs.filter(song => song.artista && !artistIds[song.artista]);
    if (missingArtists.length > 0) {
      log.error('Artist mapping failed', new Error('Missing artists'), { missingCount: missingArtists.length });
      throw new Error(`Falha ao mapear ${missingArtists.length} artistas necessários`);
    }

    // ✅ OTIMIZAÇÃO: Processar músicas em batches
    const BATCH_SIZE = 500;
    const songIds: string[] = [];
    let songsCreated = 0;
    let duplicatesSkipped = 0;
    const totalBatches = Math.ceil(songs.length / BATCH_SIZE);

    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = songs.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      log.info('Processing batch', { batchNumber, totalBatches, batchSize: batch.length });

      // Preparar músicas do batch
      const batchSongs = batch
        .filter(song => song.titulo && song.artista)
        .map(song => ({
          title: song.titulo,
          normalized_title: normalizeText(song.titulo),
          artist_id: artistIds[song.artista],
          composer: song.compositor || null,
          release_year: song.ano || null,
          lyrics: song.letra || null,
          status: 'pending' as const,
          upload_id: uploadId || null,
          corpus_id: corpusId || null,
          raw_data: {
            album: song.album,
            genero: song.genero,
          },
        }));

      if (batchSongs.length === 0) continue;

      // Verificar duplicatas em lote
      const normalizedTitles = batchSongs.map(s => s.normalized_title);
      const artistIdsInBatch = [...new Set(batchSongs.map(s => s.artist_id))];

      const { data: existing } = await supabase
        .from('songs')
        .select('normalized_title, artist_id')
        .in('normalized_title', normalizedTitles)
        .in('artist_id', artistIdsInBatch);

      // Criar Set de duplicatas para lookup rápido
      const existingSet = new Set(
        (existing || []).map(e => `${e.artist_id}_${e.normalized_title}`)
      );

      // Filtrar apenas músicas novas
      const newSongs = batchSongs.filter(s => 
        !existingSet.has(`${s.artist_id}_${s.normalized_title}`)
      );

      const skippedInBatch = batchSongs.length - newSongs.length;
      duplicatesSkipped += skippedInBatch;

      // Inserir novas músicas em lote (com upsert para evitar race conditions)
      if (newSongs.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('songs')
          .upsert(newSongs, {
            onConflict: 'normalized_title,artist_id',
            ignoreDuplicates: true
          })
          .select('id');

        log.logDatabaseQuery('songs', 'insert', newSongs.length);

        if (insertError) {
          log.error('Batch upsert failed', new Error(insertError.message), { batchNumber, code: insertError.code });
          throw new Error(`Batch ${batchNumber} falhou: ${insertError.message}`);
        }

        songsCreated += inserted?.length || 0;
        if (inserted) {
          songIds.push(...inserted.map(s => s.id));
        }
      }

      log.info('Batch completed', { batchNumber, newSongs: newSongs.length, duplicates: skippedInBatch });
    }

    log.info('Extraction completed', { songsCreated, duplicatesSkipped });

    // Update upload status if provided
    if (uploadId) {
      await supabase
        .from('uploads')
        .update({
          status: 'processed',
          processed_rows: songsCreated,
          total_rows: songs.length,
        })
        .eq('id', uploadId);
    }

    const result: DeduplicationResult = {
      artistsCreated,
      songsCreated,
      duplicatesSkipped,
      artistIds,
      songIds,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.fatal('Extraction failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        requestId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
