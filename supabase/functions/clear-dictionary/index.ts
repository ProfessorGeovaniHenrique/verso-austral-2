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
  const log = createEdgeLogger('clear-dictionary', requestId);

  try {
    const { dictionaryType } = await req.json();
    
    if (!dictionaryType) {
      return new Response(
        JSON.stringify({ error: 'dictionaryType é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    log.info('Clearing dictionary', { dictionaryType });

    let tableName: string;
    let displayName: string;

    // Mapear tipo para tabela
    switch (dictionaryType) {
      case 'gaucho':
        tableName = 'dialectal_lexicon';
        displayName = 'Gaúcho Unificado';
        break;
      case 'navarro':
        tableName = 'lexical_definitions';
        displayName = 'Navarro 2014';
        break;
      case 'rochaPombo':
        tableName = 'lexical_synonyms';
        displayName = 'Rocha Pombo';
        break;
      case 'gutenberg':
        tableName = 'gutenberg_lexicon';
        displayName = 'Gutenberg';
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Tipo de dicionário inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Deletar todos os registros da tabela
    const { error, count } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      log.error(`Error clearing ${displayName}`, error);
      throw error;
    }

    log.info('Dictionary cleared', { displayName, deleted: count || 0 });

    // Log da operação
    await supabase.from('system_logs').insert({
      level: 'info',
      category: 'dictionary_cleanup',
      message: `Limpeza individual: ${displayName}`,
      metadata: {
        timestamp: new Date().toISOString(),
        action: 'clear_single_dictionary',
        dictionary_type: dictionaryType,
        table_name: tableName,
        records_deleted: count || 0
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Dicionário ${displayName} limpo com sucesso`,
        dictionaryType,
        recordsDeleted: count || 0
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
