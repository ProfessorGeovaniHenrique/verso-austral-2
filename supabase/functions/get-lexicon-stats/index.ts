import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LexiconStats {
  gaucho: {
    total: number;
    validados: number;
    confianca_media: number;
    campeiros: number;
    platinismos: number;
  };
  navarro: {
    total: number;
    validados: number;
    confianca_media: number;
  };
  gutenberg: {
    total: number;
    validados: number;
    confianca_media: number;
  };
  rochaPombo: {
    total: number;
    validados: number;
  };
  unesp: {
    total: number;
  };
  overall: {
    total_entries: number;
    validation_rate: number;
    last_import: string | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Fetching lexicon stats (optimized SQL aggregations)...');

    // ✅ FASE 1 & 2: Queries SQL otimizadas com COUNT direto (sem limite de 1000 linhas)
    const [gauchoResult, navarroResult, gutenbergResult, rochaPomboResult, rochaPomboValidadosResult, unespResult, lastImportResult] = await Promise.all([
      // Gaúcho Unificado V2 - Query SQL otimizada
      supabase.rpc('get_dialectal_stats_by_type', { dict_type: 'gaucho_unificado_v2' }).single(),
      
      // Navarro 2014 - Query SQL otimizada
      supabase.rpc('get_dialectal_stats_by_type', { dict_type: 'navarro_2014' }).single(),
      
      // Gutenberg
      supabase.rpc('get_gutenberg_stats', {}, { count: 'exact' }),
      
      // Rocha Pombo (ABL) total
      supabase.from('lexical_synonyms').select('*', { count: 'exact', head: true }).eq('fonte', 'rocha_pombo'),
      
      // Rocha Pombo (ABL) validados
      supabase.from('lexical_synonyms').select('*', { count: 'exact', head: true }).eq('fonte', 'rocha_pombo').eq('validado_humanamente', true),
      
      // UNESP count
      supabase.from('lexical_definitions').select('*', { count: 'exact', head: true }),
      
      // Last import
      supabase.from('dictionary_import_jobs')
        .select('tempo_fim')
        .eq('status', 'concluido')
        .order('tempo_fim', { ascending: false })
        .limit(1)
        .single()
    ]);

    // Processar stats Gaúcho (com fallback para dados vazios)
    const gauchoData = gauchoResult.data as any;
    const gauchoStats = {
      total: gauchoData?.total || 0,
      validados: gauchoData?.validados || 0,
      confianca_media: parseFloat(gauchoData?.confianca_media || '0'),
      campeiros: gauchoData?.campeiros || 0,
      platinismos: gauchoData?.platinismos || 0,
    };

    // Processar stats Navarro (com fallback para dados vazios)
    const navarroData = navarroResult.data as any;
    const navarroStats = {
      total: navarroData?.total || 0,
      validados: navarroData?.validados || 0,
      confianca_media: parseFloat(navarroData?.confianca_media || '0'),
    };

    // Process gutenberg data
    const gutenbergCount = gutenbergResult.data?.[0] || {
      total: 0,
      validados: 0,
      confianca_media: 0
    };

    const stats: LexiconStats = {
      gaucho: gauchoStats,
      navarro: navarroStats,
      gutenberg: {
        total: gutenbergCount.total || 0,
        validados: gutenbergCount.validados || 0,
        confianca_media: parseFloat(gutenbergCount.confianca_media || '0'),
      },
      rochaPombo: {
        total: rochaPomboResult.count || 0,
        validados: rochaPomboValidadosResult.count || 0,
      },
      unesp: {
        total: unespResult.count || 0,
      },
      overall: {
        total_entries: 
          gauchoStats.total + 
          navarroStats.total +
          (gutenbergCount.total || 0) + 
          (rochaPomboResult.count || 0) + 
          (unespResult.count || 0),
        validation_rate: 
          (gauchoStats.validados + navarroStats.validados + (gutenbergCount.validados || 0)) /
          Math.max(1, gauchoStats.total + navarroStats.total + (gutenbergCount.total || 0)),
        last_import: lastImportResult.data?.tempo_fim || null,
      },
    };

    console.log('✅ Stats fetched successfully:', stats);

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error fetching lexicon stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Create helper RPC functions in migration if they don't exist:
/*
CREATE OR REPLACE FUNCTION get_dialectal_stats()
RETURNS TABLE (
  total BIGINT,
  volume_i BIGINT,
  volume_ii BIGINT,
  validados BIGINT,
  confianca_media NUMERIC,
  campeiros BIGINT,
  platinismos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE volume_fonte = 'I')::BIGINT as volume_i,
    COUNT(*) FILTER (WHERE volume_fonte = 'II')::BIGINT as volume_ii,
    COUNT(*) FILTER (WHERE validado_humanamente = true)::BIGINT as validados,
    COALESCE(AVG(confianca_extracao), 0)::NUMERIC as confianca_media,
    COUNT(*) FILTER (WHERE 'campeiro' = ANY(origem_regionalista))::BIGINT as campeiros,
    COUNT(*) FILTER (WHERE influencia_platina = true)::BIGINT as platinismos
  FROM dialectal_lexicon;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_gutenberg_stats()
RETURNS TABLE (
  total BIGINT,
  validados BIGINT,
  confianca_media NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE validado = true)::BIGINT as validados,
    COALESCE(AVG(confianca_extracao), 0)::NUMERIC as confianca_media
  FROM gutenberg_lexicon;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
