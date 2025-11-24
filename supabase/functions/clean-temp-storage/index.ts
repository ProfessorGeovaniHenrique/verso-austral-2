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
  const log = createEdgeLogger('clean-temp-storage', requestId);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    log.info('Cleaning temporary storage files');

    // Listar todos os arquivos em temp-imports/
    const { data: files, error: listError } = await supabase.storage
      .from('corpus')
      .list('temp-imports', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (listError) {
      log.error('Error listing files', listError);
      throw listError;
    }

    log.info('Files found', { count: files?.length || 0 });

    // Filtrar apenas arquivos .json do Gutenberg
    const gutenbergFiles = files?.filter(f => 
      f.name.startsWith('gutenberg-') && f.name.endsWith('.json')
    ) || [];

    log.info('Gutenberg files to delete', { count: gutenbergFiles.length });

    if (gutenbergFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum arquivo temporário encontrado',
          deleted: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deletar arquivos
    const filePaths = gutenbergFiles.map(f => `temp-imports/${f.name}`);
    const { data: deleteData, error: deleteError } = await supabase.storage
      .from('corpus')
      .remove(filePaths);

    if (deleteError) {
      log.error('Error deleting files', deleteError);
      throw deleteError;
    }

    log.info('Temporary files deleted', { count: gutenbergFiles.length });

    return new Response(
      JSON.stringify({
        success: true,
        message: `${gutenbergFiles.length} arquivos temporários deletados`,
        deleted: gutenbergFiles.length,
        files: gutenbergFiles.map(f => f.name)
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
