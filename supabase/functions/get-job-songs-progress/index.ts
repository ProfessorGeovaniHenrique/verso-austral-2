import { createSupabaseClient } from '../_shared/supabase.ts';
import { createEdgeLogger } from '../_shared/unified-logger.ts';

const log = createEdgeLogger('get-job-songs-progress');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SongProgress {
  id: string;
  title: string;
  totalWords: number;
  processedWords: number;
  status: 'completed' | 'processing' | 'pending';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Buscar job para obter artist_id e current_song_index
    const { data: job, error: jobError } = await supabase
      .from('semantic_annotation_jobs')
      .select('artist_id, current_song_index')
      .eq('id', jobId)
      .single();

    // Se job não encontrado, retornar array vazio (não é erro fatal)
    if (jobError) {
      if (jobError.code === 'PGRST116') {
        // PGRST116 = no rows found
        log.info('Job not found, returning empty array', { jobId });
        return new Response(
          JSON.stringify({ songs: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw jobError;
    }

    if (!job) {
      log.info('Job data is null, returning empty array', { jobId });
      return new Response(
        JSON.stringify({ songs: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar todas as músicas do artista
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, title, lyrics')
      .eq('artist_id', job.artist_id)
      .order('title');

    if (songsError) {
      throw songsError;
    }

    if (!songs) {
      return new Response(
        JSON.stringify({ songs: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para cada música, contar palavras processadas no cache
    const songsProgress: SongProgress[] = await Promise.all(
      songs.map(async (song, index) => {
        const lyrics = song.lyrics || '';
        const words = lyrics
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter((w: string) => w.length > 0);
        
        const totalWords = words.length;

        // Contar palavras processadas no cache
        const { count, error: countError } = await supabase
          .from('semantic_disambiguation_cache')
          .select('*', { count: 'exact', head: true })
          .eq('song_id', song.id);

        const processedWords = countError ? 0 : (count || 0);

        // Determinar status
        let status: 'completed' | 'processing' | 'pending';
        if (processedWords >= totalWords && totalWords > 0) {
          status = 'completed';
        } else if (index === job.current_song_index) {
          status = 'processing';
        } else {
          status = 'pending';
        }

        return {
          id: song.id,
          title: song.title,
          totalWords,
          processedWords,
          status,
        };
      })
    );

    log.info('Songs progress fetched', { 
      jobId, 
      totalSongs: songsProgress.length,
      completed: songsProgress.filter(s => s.status === 'completed').length 
    });

    return new Response(
      JSON.stringify({ songs: songsProgress }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error fetching songs progress', error as Error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
