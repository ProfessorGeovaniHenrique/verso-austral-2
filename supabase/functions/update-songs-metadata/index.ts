import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SongUpdate {
  titulo: string;
  artista: string;
  compositor?: string;
  lyricsUrl?: string;
  letra?: string;
}

interface UpdateResult {
  songsUpdated: number;
  songsNotFound: number;
  notFoundList: string[];
}

// Extrair domínio da URL para lyrics_source
const extractDomain = (url: string): string | null => {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return null;
  }
};

// Função para normalizar texto (minúsculas, sem acentos)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('update-songs-metadata', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { songs, corpusId } = await req.json();
    
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      log.warn('Invalid request - empty songs array');
      return new Response(
        JSON.stringify({ error: 'Songs array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Update started', { songCount: songs.length, corpusId });

    let songsUpdated = 0;
    let songsNotFound = 0;
    const notFoundList: string[] = [];

    // Processar em batches para evitar timeouts
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = songs.slice(i, i + BATCH_SIZE) as SongUpdate[];
      
      for (const song of batch) {
        if (!song.titulo || !song.artista) continue;

        const normalizedTitle = normalizeText(song.titulo);
        const normalizedArtist = normalizeText(song.artista);

        // Buscar artista pelo nome normalizado
        const { data: artist } = await supabase
          .from('artists')
          .select('id')
          .eq('normalized_name', normalizedArtist)
          .maybeSingle();

        if (!artist) {
          songsNotFound++;
          notFoundList.push(`${song.artista} - ${song.titulo} (artista não encontrado)`);
          continue;
        }

        // Buscar música pelo título normalizado e artist_id
        const { data: existingSong } = await supabase
          .from('songs')
          .select('id')
          .eq('normalized_title', normalizedTitle)
          .eq('artist_id', artist.id)
          .maybeSingle();

        if (!existingSong) {
          songsNotFound++;
          notFoundList.push(`${song.artista} - ${song.titulo}`);
          continue;
        }

        // Preparar dados de atualização
        const updateData: Record<string, unknown> = {};
        
        if (song.compositor) {
          updateData.composer = song.compositor;
        }
        
        if (song.lyricsUrl) {
          updateData.lyrics_url = song.lyricsUrl;
          updateData.lyrics_source = extractDomain(song.lyricsUrl);
        }
        
        if (song.letra) {
          updateData.lyrics = song.letra;
        }

        // Só atualiza se houver dados
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('songs')
            .update(updateData)
            .eq('id', existingSong.id);

          if (updateError) {
            log.error('Failed to update song', updateError, { songId: existingSong.id });
          } else {
            songsUpdated++;
          }
        }
      }

      log.info('Batch progress', { 
        processed: Math.min(i + BATCH_SIZE, songs.length), 
        total: songs.length,
        updated: songsUpdated 
      });
    }

    log.info('Update completed', { songsUpdated, songsNotFound });

    const result: UpdateResult = {
      songsUpdated,
      songsNotFound,
      notFoundList: notFoundList.slice(0, 50), // Limitar lista para não estourar payload
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.fatal('Update failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        requestId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
