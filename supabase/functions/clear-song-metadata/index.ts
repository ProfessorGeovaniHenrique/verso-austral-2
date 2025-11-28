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

  const log = createEdgeLogger('clear-song-metadata', crypto.randomUUID());
  
  try {
    const { songIds } = await req.json();
    
    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      log.warn('Invalid request: songIds missing or empty');
      return new Response(
        JSON.stringify({ error: 'songIds array is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info(`Clearing metadata for ${songIds.length} songs`, { songIds });

    const supabase = createSupabaseClient();

    // Clear metadata fields in songs table
    const { error: updateError } = await supabase
      .from('songs')
      .update({
        composer: null,
        release_year: null,
        confidence_score: 0,
        metadata_confidence_score: null,
        enrichment_source: null,
        status: 'pending'
      })
      .in('id', songIds);

    if (updateError) {
      log.error('Failed to clear song metadata', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to clear metadata', details: updateError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clear corresponding cache entries
    const { error: cacheError } = await supabase
      .from('gemini_cache')
      .delete()
      .in('title', songIds.map(id => `enrichment_${id}`));

    if (cacheError) {
      log.warn('Failed to clear cache entries', { error: cacheError.message });
      // Non-critical, continue
    }

    log.info(`Successfully cleared metadata for ${songIds.length} songs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        clearedCount: songIds.length,
        message: `Metadados limpos para ${songIds.length} música(s)`
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Unexpected error in clear-song-metadata', error as Error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
