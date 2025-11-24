import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createEdgeLogger } from '../_shared/unified-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DuplicateAnalysis {
  dictionarySource: string;
  totalEntries: number;
  uniqueEntries: number;
  duplicateCount: number;
  duplicateRate: number;
  topDuplicates: Array<{
    verbete: string;
    occurrences: number;
    entries: Array<{ 
      id: string; 
      classe_gramatical: string | null; 
      definicoes: any;
      volume_fonte: string | null;
    }>;
  }>;
  analyzedAt: string;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('analyze-duplicates', requestId);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { source, table = 'dialectal_lexicon' } = await req.json();

    if (!source) {
      throw new Error('Campo "source" é obrigatório (ex: "Navarro 2014")');
    }

    log.info('Analyzing duplicates', { source, table });

    // Buscar todos os verbetes da fonte especificada
    const { data: entries, error } = await supabase
      .from(table)
      .select('id, verbete, verbete_normalizado, classe_gramatical, definicoes, volume_fonte')
      .eq('volume_fonte', source);

    if (error) throw error;

    if (!entries || entries.length === 0) {
      log.warn('No entries found for source', { source });
      return new Response(
        JSON.stringify({
          error: `Nenhum verbete encontrado para a fonte "${source}"`,
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    log.info('Entries found', { totalEntries: entries.length });

    // Agrupar por verbete_normalizado
    type EntryType = typeof entries[0];
    const grouped: Record<string, EntryType[]> = {};
    
    for (const entry of entries) {
      const key = entry.verbete_normalizado;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    }

    const uniqueCount = Object.keys(grouped).length;
    log.info('Grouping complete', { uniqueEntries: uniqueCount });

    // Filtrar duplicatas (mais de 1 ocorrência)
    const duplicates = Object.entries(grouped)
      .filter((entry): entry is [string, EntryType[]] => {
        const [, entryList] = entry;
        return entryList.length > 1;
      })
      .map(([verbete, entryList]) => ({
        verbete,
        occurrences: entryList.length,
        entries: entryList.map((e: EntryType) => ({
          id: e.id,
          classe_gramatical: e.classe_gramatical,
          definicoes: e.definicoes,
          volume_fonte: e.volume_fonte
        }))
      }))
      .sort((a, b) => b.occurrences - a.occurrences);

    log.info('Duplicate analysis complete', { duplicatesFound: duplicates.length });

    const analysis: DuplicateAnalysis = {
      dictionarySource: source,
      totalEntries: entries.length,
      uniqueEntries: Object.keys(grouped).length,
      duplicateCount: duplicates.length,
      duplicateRate: entries.length > 0 
        ? Number(((duplicates.length / entries.length) * 100).toFixed(2))
        : 0,
      topDuplicates: duplicates.slice(0, 20),
      analyzedAt: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(analysis),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    log.fatal('Duplicate analysis failed', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Erro ao processar análise de duplicatas'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
