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
  const log = createEdgeLogger('clear-all-dictionaries', requestId);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    log.info('Starting cleanup of all dictionaries');

    // Deletar todos os registros de cada tabela
    const tables = [
      'dialectal_lexicon',
      'lexical_definitions', 
      'lexical_synonyms',
      'gutenberg_lexicon',
      'human_validations'
    ];

    const results: Record<string, { deleted: number; error?: string }> = {};

    for (const table of tables) {
      try {
        // Deletar todos os registros (usando condição que sempre é true)
        const { error, count } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
          log.error(`Error clearing ${table}`, error);
          results[table] = { deleted: 0, error: error.message };
        } else {
          log.info(`Table cleared`, { table, deleted: count || 0 });
          results[table] = { deleted: count || 0 };
        }
      } catch (err: any) {
        log.error(`Error processing ${table}`, err);
        results[table] = { deleted: 0, error: err.message };
      }
    }

    // Contar registros após limpeza
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      counts[table] = count || 0;
    }

    // Log da operação
    await supabase.from('system_logs').insert({
      level: 'info',
      category: 'dictionary_cleanup',
      message: 'Limpeza completa de dicionários realizada',
      metadata: {
        timestamp: new Date().toISOString(),
        action: 'clear_all_dictionaries',
        results,
        counts_after: counts
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Todos os dicionários foram limpos com sucesso',
        results,
        counts
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
