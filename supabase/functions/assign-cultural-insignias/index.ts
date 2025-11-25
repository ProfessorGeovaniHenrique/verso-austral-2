import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsigniaRequest {
  palavra: string;
  lema?: string;
  corpus_type?: string; // 'gaucho', 'nordestino', etc.
}

interface InsigniaResult {
  insignias: string[];
  primary: string;
  secondary: string[];
  confianca: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const logger = createEdgeLogger('assign-cultural-insignias', requestId);
  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody: InsigniaRequest = await req.json();
    const { palavra, lema, corpus_type = 'gaucho' } = requestBody;

    logger.info('Atribuindo insígnias culturais', { palavra, lema, corpus_type });

    // 1️⃣ INSÍGNIA PRIMÁRIA: baseada no corpus_type
    const primaryInsignia = mapCorpusTypeToInsignia(corpus_type);

    // 2️⃣ INSÍGNIAS SECUNDÁRIAS: buscar em dialectal_lexicon
    const secondaryInsignias = await getSecondaryInsignias(
      supabaseClient,
      lema || palavra,
      logger
    );

    // 3️⃣ Combinar e remover duplicatas
    const allInsignias = Array.from(new Set([primaryInsignia, ...secondaryInsignias]));

    // 4️⃣ Salvar atribuições no banco
    const attributions = allInsignias.map((insignia, index) => ({
      palavra: palavra.toLowerCase(),
      insignia,
      tipo_atribuicao: index === 0 ? 'primary' : 'secondary',
      fonte: index === 0 ? 'corpus_type' : 'dialectal_lexicon',
      confianca: index === 0 ? 0.99 : 0.85,
      metadata: { corpus_type, lema },
    }));

    const { error: insertError } = await supabaseClient
      .from('cultural_insignia_attribution')
      .insert(attributions);

    if (insertError) {
      logger.error('Erro ao salvar atribuições', new Error(insertError.message), { palavra });
    }

    const result: InsigniaResult = {
      insignias: allInsignias,
      primary: primaryInsignia,
      secondary: secondaryInsignias,
      confianca: 0.90,
    };

    logger.info('Insígnias atribuídas', { 
      palavra, 
      total: allInsignias.length,
      primary: primaryInsignia,
      processingTime: Date.now() - startTime 
    });

    return new Response(
      JSON.stringify({
        success: true,
        result,
        processingTime: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao atribuir insígnias', errorObj);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorObj.message,
        processingTime: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Mapear corpus_type para insígnia primária
 */
function mapCorpusTypeToInsignia(corpusType: string): string {
  const mapping: Record<string, string> = {
    'gaucho': 'Gaúcho',
    'nordestino': 'Nordestino',
    'indigena': 'Indígena',
    'platino': 'Platino',
    'afro_brasileiro': 'Afro-Brasileiro',
    'caipira': 'Caipira',
  };

  return mapping[corpusType] || 'Gaúcho';
}

/**
 * Buscar insígnias secundárias em dialectal_lexicon
 */
async function getSecondaryInsignias(
  supabase: any,
  palavra: string,
  logger: any
): Promise<string[]> {
  const { data, error } = await supabase
    .from('dialectal_lexicon')
    .select('origem_regionalista, influencia_platina')
    .eq('verbete_normalizado', palavra.toLowerCase())
    .single();

  if (error || !data) {
    logger.info('Palavra não encontrada em dialectal_lexicon', { palavra });
    return [];
  }

  const insignias: string[] = [];

  // Mapear origem_regionalista
  if (data.origem_regionalista && Array.isArray(data.origem_regionalista)) {
    const origemMap: Record<string, string> = {
      'campeiro': 'Gaúcho',
      'gaucho': 'Gaúcho',
      'platino': 'Platino',
      'nordestino': 'Nordestino',
      'caipira': 'Caipira',
    };

    data.origem_regionalista.forEach((origem: string) => {
      const insignia = origemMap[origem.toLowerCase()];
      if (insignia && !insignias.includes(insignia)) {
        insignias.push(insignia);
      }
    });
  }

  // Adicionar Platino se influência platina confirmada
  if (data.influencia_platina && !insignias.includes('Platino')) {
    insignias.push('Platino');
  }

  logger.info('Insígnias secundárias encontradas', { palavra, insignias });
  return insignias;
}
