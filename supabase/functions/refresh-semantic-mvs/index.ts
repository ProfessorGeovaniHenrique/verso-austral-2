/**
 * Edge Function: refresh-semantic-mvs
 * Atualiza as materialized views de cobertura semântica
 * 
 * Usa função SECURITY DEFINER no banco para ter permissão de escrita
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('[refresh-semantic-mvs] Iniciando refresh das MVs...');

    // Chamar função SECURITY DEFINER
    const { error } = await supabase.rpc('refresh_semantic_coverage_mvs');
    
    if (error) {
      console.error('[refresh-semantic-mvs] Erro RPC:', error);
      throw new Error(error.message || 'Erro ao executar refresh');
    }

    const duration = Date.now() - startTime;
    console.log(`[refresh-semantic-mvs] Concluído em ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        duration,
        message: 'Materialized views atualizadas'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[refresh-semantic-mvs] Erro:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
