import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { mode = 'analyze', batchSize = 1000, offset = 0 } = await req.json().catch(() => ({}));
    
    console.log(`🏷️ Backfill Insignia Attribution - Mode: ${mode}, Batch: ${batchSize}, Offset: ${offset}`);

    // Mode: analyze - apenas conta quantas entradas precisam ser processadas
    if (mode === 'analyze') {
      const { count: totalWithInsignias } = await supabase
        .from('semantic_disambiguation_cache')
        .select('*', { count: 'exact', head: true })
        .not('insignias_culturais', 'is', null)
        .neq('insignias_culturais', '{}');

      const { count: alreadyAttributed } = await supabase
        .from('cultural_insignia_attribution')
        .select('*', { count: 'exact', head: true });

      // Contar por insígnia no cache
      const { data: sampleData } = await supabase
        .from('semantic_disambiguation_cache')
        .select('insignias_culturais')
        .not('insignias_culturais', 'is', null)
        .neq('insignias_culturais', '{}')
        .limit(5000);

      const insigniaDistribution: Record<string, number> = {};
      sampleData?.forEach(entry => {
        entry.insignias_culturais?.forEach((ins: string) => {
          insigniaDistribution[ins] = (insigniaDistribution[ins] || 0) + 1;
        });
      });

      return new Response(JSON.stringify({
        success: true,
        analysis: {
          totalEntriesWithInsignias: totalWithInsignias || 0,
          alreadyInAttributionTable: alreadyAttributed || 0,
          estimatedNewAttributions: (totalWithInsignias || 0) - (alreadyAttributed || 0),
          insigniaDistribution,
          batchesNeeded: Math.ceil((totalWithInsignias || 0) / batchSize)
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mode: backfill - processa um batch
    if (mode === 'backfill') {
      const { data: cacheEntries, error: fetchError } = await supabase
        .from('semantic_disambiguation_cache')
        .select('id, palavra, insignias_culturais, fonte, confianca, tagset_codigo')
        .not('insignias_culturais', 'is', null)
        .neq('insignias_culturais', '{}')
        .order('cached_at', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (fetchError) {
        throw new Error(`Erro ao buscar cache: ${fetchError.message}`);
      }

      if (!cacheEntries || cacheEntries.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Backfill concluído - sem mais entradas para processar',
          processed: 0,
          offset,
          hasMore: false
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Preparar attributions para upsert
      const attributions: Array<{
        palavra: string;
        insignia: string;
        fonte: string;
        tipo_atribuicao: string;
        confianca: number;
        metadata: Record<string, any>;
      }> = [];

      for (const entry of cacheEntries) {
        if (entry.insignias_culturais && entry.insignias_culturais.length > 0) {
          for (const insignia of entry.insignias_culturais) {
            attributions.push({
              palavra: entry.palavra,
              insignia,
              fonte: entry.fonte || 'cache_backfill',
              tipo_atribuicao: 'backfill',
              confianca: entry.confianca || 0.9,
              metadata: {
                tagset: entry.tagset_codigo,
                cache_id: entry.id,
                backfill_date: new Date().toISOString()
              }
            });
          }
        }
      }

      // Upsert em batches menores para evitar conflitos
      let inserted = 0;
      let skipped = 0;
      const upsertBatchSize = 100;

      for (let i = 0; i < attributions.length; i += upsertBatchSize) {
        const batch = attributions.slice(i, i + upsertBatchSize);
        
        // Usar insert com ignoreDuplicates para evitar conflitos
        const { error: upsertError, count } = await supabase
          .from('cultural_insignia_attribution')
          .upsert(batch, { 
            onConflict: 'palavra,insignia',
            ignoreDuplicates: true 
          });

        if (upsertError) {
          console.warn(`⚠️ Erro no batch ${i}: ${upsertError.message}`);
          skipped += batch.length;
        } else {
          inserted += batch.length;
        }
      }

      const hasMore = cacheEntries.length === batchSize;

      console.log(`✅ Batch processado: ${inserted} inseridos, ${skipped} ignorados, offset: ${offset}`);

      return new Response(JSON.stringify({
        success: true,
        processed: cacheEntries.length,
        attributionsCreated: inserted,
        skipped,
        offset,
        nextOffset: offset + batchSize,
        hasMore
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      error: 'Mode inválido. Use "analyze" ou "backfill"'
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro no backfill:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
