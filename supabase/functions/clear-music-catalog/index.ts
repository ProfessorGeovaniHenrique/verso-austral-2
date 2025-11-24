import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { createEdgeLogger } from '../_shared/unified-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('clear-music-catalog', requestId);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    log.info('Starting music catalog cleanup');

    // Deletar songs primeiro (tem FK para artists e uploads)
    const { error: songsError, count: songsCount } = await supabase
      .from('songs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (songsError) {
      log.error('Error deleting songs', songsError);
      throw songsError;
    }

    // Deletar artists
    const { error: artistsError, count: artistsCount } = await supabase
      .from('artists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (artistsError) {
      log.error('Error deleting artists', artistsError);
      throw artistsError;
    }

    // Deletar uploads
    const { error: uploadsError, count: uploadsCount } = await supabase
      .from('uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (uploadsError) {
      log.error('Error deleting uploads', uploadsError);
      throw uploadsError;
    }

    log.info('Cleanup completed', {
      songs: songsCount || 0,
      artists: artistsCount || 0,
      uploads: uploadsCount || 0
    });

    // Log da operação
    await supabase.from('system_logs').insert({
      level: 'info',
      category: 'music_catalog_cleanup',
      message: 'Catálogo de músicas limpo com sucesso',
      metadata: {
        timestamp: new Date().toISOString(),
        songs_deleted: songsCount || 0,
        artists_deleted: artistsCount || 0,
        uploads_deleted: uploadsCount || 0
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Catálogo limpo com sucesso',
        deleted: {
          songs: songsCount || 0,
          artists: artistsCount || 0,
          uploads: uploadsCount || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    log.error('Error in cleanup', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
