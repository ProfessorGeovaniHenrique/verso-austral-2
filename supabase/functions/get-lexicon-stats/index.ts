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

    console.log('🔍 Fetching lexicon stats (aggregated)...');

    // Parallel queries for maximum performance
    const [dialectalData, gutenbergResult, rochaPomboResult, unespResult, lastImportResult] = await Promise.all([
      // Dialectal - Buscar dados completos para separar Gaúcho e Navarro
      supabase.from('dialectal_lexicon')
        .select('volume_fonte, validado_humanamente, confianca_extracao, origem_regionalista, influencia_platina'),
      // Gutenberg
      supabase.rpc('get_gutenberg_stats', {}, { count: 'exact' }),
      // Rocha Pombo (ABL) count
      supabase.from('lexical_synonyms').select('*', { count: 'exact', head: true }).eq('fonte', 'rocha_pombo'),
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

    // Separar verbetes Gaúcho e Navarro baseado em volume_fonte
    const allDialectal = dialectalData.data || [];
    
    const gauchoVerbetes = allDialectal.filter(d => {
      const vol = (d.volume_fonte || '').toLowerCase();
      return vol.includes('i') || vol.includes('ii') || vol.includes('gaúcho') || vol.includes('gaucho');
    });
    
    const navarroVerbetes = allDialectal.filter(d => {
      const vol = (d.volume_fonte || '').toLowerCase();
      return vol.includes('navarro') || vol.includes('nordeste') || vol.includes('2014');
    });

    // Calcular stats Gaúcho
    const gauchoStats = {
      total: gauchoVerbetes.length,
      validados: gauchoVerbetes.filter(v => v.validado_humanamente).length,
      confianca_media: gauchoVerbetes.length > 0
        ? gauchoVerbetes.reduce((sum, v) => sum + (v.confianca_extracao || 0), 0) / gauchoVerbetes.length
        : 0,
      campeiros: gauchoVerbetes.filter(v => 
        Array.isArray(v.origem_regionalista) && v.origem_regionalista.includes('campeiro')
      ).length,
      platinismos: gauchoVerbetes.filter(v => v.influencia_platina).length,
    };

    // Calcular stats Navarro
    const navarroStats = {
      total: navarroVerbetes.length,
      validados: navarroVerbetes.filter(v => v.validado_humanamente).length,
      confianca_media: navarroVerbetes.length > 0
        ? navarroVerbetes.reduce((sum, v) => sum + (v.confianca_extracao || 0), 0) / navarroVerbetes.length
        : 0,
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
