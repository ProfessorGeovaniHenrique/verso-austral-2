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

// Mapear domínio extraído para valores permitidos pelo constraint songs_lyrics_source_check
const mapToAllowedSource = (domain: string | null): string | null => {
  if (!domain) return null;
  
  const domainMap: Record<string, string> = {
    'letras.mus.br': 'letras.mus.br',
    'letras.com.br': 'letras.mus.br',
    'genius.com': 'genius',
    'vagalume.com.br': 'web_search',
    'cifraclub.com.br': 'web_search',
    'letras.com': 'web_search',
    'musica.com': 'web_search',
    'kboing.com.br': 'web_search',
  };
  
  return domainMap[domain] || 'web_search';
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

    // PRÉ-CARREGAR TODOS OS ARTISTAS em uma única query
    const { data: allArtists, error: artistsError } = await supabase
      .from('artists')
      .select('id, normalized_name');

    if (artistsError) {
      log.error('Failed to load artists', artistsError);
      throw new Error('Failed to load artists');
    }

    // Criar mapa de artistas para lookup O(1)
    const artistMap = new Map<string, string>();
    for (const artist of allArtists || []) {
      if (artist.normalized_name) {
        artistMap.set(artist.normalized_name, artist.id);
      }
    }

    log.info('Artists loaded', { totalArtists: artistMap.size });

    let songsUpdated = 0;
    let songsNotFound = 0;
    const notFoundList: string[] = [];

    // Processar em batches de 100 para eficiência
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = songs.slice(i, i + BATCH_SIZE) as SongUpdate[];
      
      // Preparar dados normalizados para o batch
      const batchData = batch
        .filter(song => song.titulo && song.artista)
        .map(song => ({
          original: song,
          normalizedTitle: normalizeText(song.titulo),
          normalizedArtist: normalizeText(song.artista),
          artistId: artistMap.get(normalizeText(song.artista))
        }));

      // Filtrar músicas cujos artistas existem
      const validBatchData = batchData.filter(d => d.artistId);
      const invalidArtists = batchData.filter(d => !d.artistId);

      // Registrar artistas não encontrados
      for (const invalid of invalidArtists) {
        songsNotFound++;
        if (notFoundList.length < 50) {
          notFoundList.push(`${invalid.original.artista} - ${invalid.original.titulo} (artista não encontrado)`);
        }
      }

      if (validBatchData.length === 0) continue;

      // Buscar todas as músicas do batch em uma única query
      const normalizedTitles = validBatchData.map(d => d.normalizedTitle);
      const artistIds = [...new Set(validBatchData.map(d => d.artistId))];

      const { data: existingSongs, error: songsError } = await supabase
        .from('songs')
        .select('id, normalized_title, artist_id')
        .in('normalized_title', normalizedTitles)
        .in('artist_id', artistIds);

      if (songsError) {
        log.error('Failed to fetch songs batch', songsError);
        continue;
      }

      // Criar mapa de músicas existentes para lookup O(1)
      const songMap = new Map<string, string>();
      for (const song of existingSongs || []) {
        const key = `${song.normalized_title}|${song.artist_id}`;
        songMap.set(key, song.id);
      }

      // Processar atualizações
      for (const data of validBatchData) {
        const key = `${data.normalizedTitle}|${data.artistId}`;
        const songId = songMap.get(key);

        if (!songId) {
          songsNotFound++;
          if (notFoundList.length < 50) {
            notFoundList.push(`${data.original.artista} - ${data.original.titulo}`);
          }
          continue;
        }

        // Preparar dados de atualização
        const updateData: Record<string, unknown> = {};
        
        if (data.original.compositor) {
          updateData.composer = data.original.compositor;
        }
        
        if (data.original.lyricsUrl) {
          updateData.lyrics_url = data.original.lyricsUrl;
          const extractedDomain = extractDomain(data.original.lyricsUrl);
          updateData.lyrics_source = mapToAllowedSource(extractedDomain);
        }
        
        if (data.original.letra) {
          updateData.lyrics = data.original.letra;
        }

        // Só atualiza se houver dados
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('songs')
            .update(updateData)
            .eq('id', songId);

          if (updateError) {
            log.error('Failed to update song', updateError, { songId });
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
      notFoundList: notFoundList.slice(0, 50),
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
