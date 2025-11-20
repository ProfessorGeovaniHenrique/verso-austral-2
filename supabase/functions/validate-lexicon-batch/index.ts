import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  dictionaryType: 'dialectal' | 'gutenberg' | 'rochaPombo' | 'unesp';
  batchSize: 100 | 1000;
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
        // Rocha Pombo não tem campo de validação (já é confiável)
        return new Response(
          JSON.stringify({ 
            validated: 0, 
            skipped: 0, 
            message: 'Rocha Pombo já possui dados validados pela ABL' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      
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
    const { data: entries, error: fetchError } = await supabase
      .from(tableName)
      .select('id')
      .eq(
        dictionaryType === 'dialectal' ? 'validado_humanamente' : 'validado', 
        false
      )
      .gte('confianca_extracao', 0.90)
      .limit(batchSize);

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

    // Atualizar entradas para validadas
    const ids = entries.map(e => e.id);
    const updateField = dictionaryType === 'dialectal' ? 'validado_humanamente' : 'validado';
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ [updateField]: true })
      .in('id', ids);

    if (updateError) {
      throw new Error(`Erro ao atualizar entradas: ${updateError.message}`);
    }

    console.log(`✅ ${entries.length} entradas validadas com sucesso`);

    return new Response(
      JSON.stringify({
        validated: entries.length,
        skipped: batchSize - entries.length,
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
