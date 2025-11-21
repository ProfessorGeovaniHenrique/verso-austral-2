import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  dictionaryType: 'dialectal' | 'gutenberg' | 'rochaPombo' | 'unesp';
  batchSize: 100 | 1000 | 10000;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dictionaryType, batchSize }: ValidationRequest = await req.json();

    console.log(`🔍 Iniciando validação em lote: ${dictionaryType}, tamanho: ${batchSize}`);

    let tableName: string;
    let validationCriteria: any = {};

    // Determinar tabela e critérios
    switch (dictionaryType) {
      case 'dialectal':
        tableName = 'dialectal_lexicon';
        validationCriteria = {
          validado_humanamente: false,
          confianca_extracao: { gte: 0.90 }
        };
        break;
      
      case 'gutenberg':
        tableName = 'gutenberg_lexicon';
        validationCriteria = {
          validado: false,
          confianca_extracao: { gte: 0.90 }
        };
        break;
      
      case 'rochaPombo':
        tableName = 'lexical_synonyms';
        validationCriteria = {
          validado_humanamente: false,
          confianca_extracao: { gte: 0.90 },
          fonte: 'rocha_pombo'
        };
        break;
      
      case 'unesp':
        // UNESP não tem campo de validação (já é confiável)
        return new Response(
          JSON.stringify({ 
            validated: 0, 
            skipped: 0, 
            message: 'UNESP já possui dados validados academicamente' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      
      default:
        throw new Error(`Tipo de dicionário inválido: ${dictionaryType}`);
    }

    // Buscar entradas não validadas com alta confiança
    let query = supabase
      .from(tableName)
      .select('id')
      .gte('confianca_extracao', 0.90)
      .limit(batchSize);

    if (dictionaryType === 'rochaPombo') {
      query = query.eq('fonte', 'rocha_pombo').eq('validado_humanamente', false);
    } else if (dictionaryType === 'dialectal') {
      query = query.eq('validado_humanamente', false);
    } else {
      query = query.eq('validado', false);
    }

    const { data: entries, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Erro ao buscar entradas: ${fetchError.message}`);
    }

    if (!entries || entries.length === 0) {
      console.log('⚠️ Nenhuma entrada encontrada para validação');
      return new Response(
        JSON.stringify({ validated: 0, skipped: 0, message: 'Nenhuma entrada disponível para validação' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Helper para chunking
    const chunkArray = <T>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    // Atualizar entradas em chunks de 100 (evita URL limit do PostgREST)
    const ids = entries.map(e => e.id);
    const updateField = (dictionaryType === 'dialectal' || dictionaryType === 'rochaPombo') 
      ? 'validado_humanamente' 
      : 'validado';
    const chunks = chunkArray(ids, 100);
    let totalUpdated = 0;

    console.log(`🔄 Atualizando ${ids.length} entradas na tabela ${tableName}`);
    console.log(`📝 Campo de update: ${updateField} = true`);
    console.log(`📦 Processando ${chunks.length} chunks de ~100 IDs cada`);

    // Processar cada chunk sequencialmente
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🔄 Chunk ${i + 1}/${chunks.length}: ${chunk.length} IDs`);

      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          [updateField]: true,
          validation_status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .in('id', chunk)
        .select('id');

      if (error) {
        console.error(`❌ Erro no chunk ${i + 1}:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Erro ao atualizar chunk ${i + 1}/${chunks.length}: ${error.message}`);
      }

      totalUpdated += data?.length || 0;
      console.log(`✅ Chunk ${i + 1} completo: ${data?.length || 0} linhas atualizadas`);
    }

    console.log(`✅ Total atualizado: ${totalUpdated} de ${ids.length} entradas`);

    console.log(`✅ ${entries.length} entradas validadas com sucesso`);

    return new Response(
      JSON.stringify({
        validated: totalUpdated,
        skipped: batchSize - entries.length,
        chunks_processed: chunks.length,
        dictionaryType,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro na validação em lote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
