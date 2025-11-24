import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createEdgeLogger } from '../_shared/unified-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  dictionaryType: 'dialectal' | 'gutenberg' | 'rochaPombo' | 'unesp';
  batchSize: 100 | 1000 | 10000;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('validate-lexicon-batch', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dictionaryType, batchSize }: ValidationRequest = await req.json();

    log.info('Starting batch validation', { dictionaryType, batchSize });

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
      log.warn('No entries found for validation');
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

    log.info('Updating entries in chunks', { 
      totalEntries: ids.length, 
      tableName, 
      updateField, 
      chunksCount: chunks.length 
    });

    // Processar cada chunk sequencialmente
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

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
        log.error('Chunk update failed', error as Error, { chunkIndex: i + 1 });
        throw new Error(`Erro ao atualizar chunk ${i + 1}/${chunks.length}: ${error.message}`);
      }

      totalUpdated += data?.length || 0;
      log.debug('Chunk complete', { chunkIndex: i + 1, rowsUpdated: data?.length || 0 });
    }

    log.logDatabaseQuery(tableName, 'update', totalUpdated);
    log.info('Batch validation complete', { totalUpdated, totalEntries: ids.length });

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
    log.fatal('Batch validation failed', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
