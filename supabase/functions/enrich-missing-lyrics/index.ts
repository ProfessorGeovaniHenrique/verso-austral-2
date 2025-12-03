import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistId, mode = 'analyze', limit = 50 } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!artistId) {
      return new Response(
        JSON.stringify({ error: 'artistId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get artist info
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, name')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return new Response(
        JSON.stringify({ error: 'Artist not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get songs statistics
    const { count: totalSongs } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artistId);

    const { count: withLyrics } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .not('lyrics', 'is', null);

    const withoutLyrics = (totalSongs || 0) - (withLyrics || 0);
    const coveragePercent = totalSongs ? ((withLyrics || 0) / totalSongs) * 100 : 0;

    // ANALYZE MODE: Return statistics only
    if (mode === 'analyze') {
      console.log(`[enrich-missing-lyrics] Analysis for ${artist.name}: ${withLyrics}/${totalSongs} songs have lyrics`);
      
      return new Response(
        JSON.stringify({
          artistId,
          artistName: artist.name,
          totalSongs: totalSongs || 0,
          withLyrics: withLyrics || 0,
          withoutLyrics,
          coveragePercent: Math.round(coveragePercent * 100) / 100
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ENRICH MODE: Fetch missing lyrics
    if (mode === 'enrich') {
      console.log(`[enrich-missing-lyrics] Starting enrichment for ${artist.name} (limit: ${limit})`);

      // Get songs without lyrics
      const { data: songsToEnrich, error: songsError } = await supabase
        .from('songs')
        .select('id, title')
        .eq('artist_id', artistId)
        .is('lyrics', null)
        .limit(limit);

      if (songsError) {
        throw new Error(`Failed to fetch songs: ${songsError.message}`);
      }

      if (!songsToEnrich || songsToEnrich.length === 0) {
        return new Response(
          JSON.stringify({
            processed: 0,
            enriched: 0,
            notFound: 0,
            errors: 0,
            results: [],
            message: 'No songs to enrich'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results: Array<{
        songId: string;
        title: string;
        source: string | null;
        sourceUrl: string | null;
        success: boolean;
        error?: string;
      }> = [];

      let enriched = 0;
      let notFound = 0;
      let errors = 0;

      // Process songs with rate limiting (1 req/second)
      for (const song of songsToEnrich) {
        try {
          console.log(`[enrich-missing-lyrics] Fetching lyrics for: ${song.title}`);

          // Call fetch-lyrics function
          const fetchResponse = await fetch(`${SUPABASE_URL}/functions/v1/fetch-lyrics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              artistName: artist.name,
              songTitle: song.title
            })
          });

          if (!fetchResponse.ok) {
            throw new Error(`fetch-lyrics returned ${fetchResponse.status}`);
          }

          const lyricsResult = await fetchResponse.json();

          if (lyricsResult.found && lyricsResult.lyrics && lyricsResult.sourceUrl) {
            // Save lyrics with source attribution
            const { error: updateError } = await supabase
              .from('songs')
              .update({
                lyrics: lyricsResult.lyrics,
                lyrics_source: lyricsResult.source,
                lyrics_url: lyricsResult.sourceUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', song.id);

            if (updateError) {
              throw new Error(`Failed to save lyrics: ${updateError.message}`);
            }

            enriched++;
            results.push({
              songId: song.id,
              title: song.title,
              source: lyricsResult.source,
              sourceUrl: lyricsResult.sourceUrl,
              success: true
            });
            console.log(`[enrich-missing-lyrics] ✅ Saved lyrics for: ${song.title} (source: ${lyricsResult.source})`);
          } else {
            notFound++;
            results.push({
              songId: song.id,
              title: song.title,
              source: null,
              sourceUrl: null,
              success: false
            });
            console.log(`[enrich-missing-lyrics] ❌ No lyrics found for: ${song.title}`);
          }

        } catch (error) {
          errors++;
          results.push({
            songId: song.id,
            title: song.title,
            source: null,
            sourceUrl: null,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
          console.error(`[enrich-missing-lyrics] Error processing ${song.title}:`, error);
        }

        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`[enrich-missing-lyrics] Completed: ${enriched} enriched, ${notFound} not found, ${errors} errors`);

      return new Response(
        JSON.stringify({
          processed: songsToEnrich.length,
          enriched,
          notFound,
          errors,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid mode. Use "analyze" or "enrich"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-missing-lyrics] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});