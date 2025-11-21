import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

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
      return new Response(
        JSON.stringify({ error: 'Songs array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[extract-music-titles] Processing ${songs.length} songs`);

    // Validar corpus_id se fornecido
    if (corpusId) {
      const { data: corpus, error: corpusError } = await supabase
        .from('corpora')
        .select('id')
        .eq('id', corpusId)
        .single();

      if (corpusError || !corpus) {
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

    console.log(`[extract-music-titles] Found ${uniqueArtists.size} unique artists`);

    const artistIds: Record<string, string> = {};
    let artistsCreated = 0;

    // Insert or get artists
    for (const [normalized, original] of uniqueArtists.entries()) {
      // Check if artist exists
      const { data: existing } = await supabase
        .from('artists')
        .select('id')
        .eq('normalized_name', normalized)
        .maybeSingle();

      if (existing) {
        artistIds[original] = existing.id;
      } else {
        // Create new artist
        const { data: newArtist, error } = await supabase
          .from('artists')
          .insert({
            name: original,
            normalized_name: normalized,
            corpus_id: corpusId || null,
          })
          .select('id')
          .single();

        if (error) {
          console.error(`[extract-music-titles] Error creating artist ${original}:`, error);
          throw error;
        }

        artistIds[original] = newArtist.id;
        artistsCreated++;
      }
    }

    console.log(`[extract-music-titles] Created ${artistsCreated} new artists`);

    // Process songs
    const songIds: string[] = [];
    let songsCreated = 0;
    let duplicatesSkipped = 0;

    for (const song of songs) {
      if (!song.titulo || !song.artista) {
        console.warn('[extract-music-titles] Skipping song without title or artist');
        continue;
      }

      const artistId = artistIds[song.artista];
      const normalizedTitle = normalizeText(song.titulo);

      // Check for duplicates
      const { data: existing } = await supabase
        .from('songs')
        .select('id')
        .eq('artist_id', artistId)
        .eq('normalized_title', normalizedTitle)
        .maybeSingle();

      if (existing) {
        songIds.push(existing.id);
        duplicatesSkipped++;
        continue;
      }

      // Create new song
      const { data: newSong, error } = await supabase
        .from('songs')
        .insert({
          title: song.titulo,
          normalized_title: normalizedTitle,
          artist_id: artistId,
          composer: song.compositor || null,
          release_year: song.ano || null,
          lyrics: song.letra || null,  // ✅ FASE 0: Salvar letra no banco
          status: 'pending',
          upload_id: uploadId || null,
          corpus_id: corpusId || null,
          raw_data: {
            album: song.album,
            genero: song.genero,
          },
        })
        .select('id')
        .single();

      if (error) {
        console.error(`[extract-music-titles] Error creating song ${song.titulo}:`, error);
        throw error;
      }

      songIds.push(newSong.id);
      songsCreated++;
    }

    console.log(`[extract-music-titles] Created ${songsCreated} new songs, skipped ${duplicatesSkipped} duplicates`);

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
    console.error('[extract-music-titles] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
