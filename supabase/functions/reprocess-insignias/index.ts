import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache para dialectal_lexicon
let dialectalCache: Map<string, {
  origemPrimaria?: string;
  origemRegionalista?: string[];
  influenciaPlatina?: boolean;
}> | null = null;

// Cache para corpora
let corporaCache: Map<string, string> | null = null;

async function loadDialectalCache(supabase: any) {
  if (dialectalCache) return dialectalCache;
  
  const { data } = await supabase
    .from('dialectal_lexicon')
    .select('verbete_normalizado, origem_primaria, origem_regionalista, influencia_platina');
  
  dialectalCache = new Map();
  data?.forEach((entry: any) => {
    dialectalCache!.set(entry.verbete_normalizado.toLowerCase(), {
      origemPrimaria: entry.origem_primaria,
      origemRegionalista: entry.origem_regionalista,
      influenciaPlatina: entry.influencia_platina,
    });
  });
  
  console.log(`✅ Dialectal cache loaded: ${dialectalCache.size} entradas`);
  return dialectalCache;
}

async function loadCorporaCache(supabase: any) {
  if (corporaCache) return corporaCache;
  
  const { data } = await supabase
    .from('corpora')
    .select('id, normalized_name');
  
  corporaCache = new Map();
  data?.forEach((corpus: any) => {
    corporaCache!.set(corpus.id, corpus.normalized_name);
  });
  
  console.log(`✅ Corpora cache loaded: ${corporaCache.size} corpora`);
  return corporaCache;
}

function inferCulturalInsignias(
  palavra: string,
  corpusType: string,
  dialectalData: Map<string, any>
): string[] {
  const dialectal = dialectalData.get(palavra.toLowerCase());
  const insignias: string[] = [];
  
  const origemPrimariaMap: Record<string, string> = {
    'BRAS': 'Brasileiro',
    'PLAT': 'Platino',
    'PORT': 'Lusitano',
    'ESP': 'Platino',
    'IND': 'Indígena',
    'AME': 'Indígena',
    'AFR': 'Afro-Brasileiro',
  };
  
  const regionaisNordeste = [
    'NORDESTE', 'nordeste', 'nordestino',
    'BA', 'CE', 'PE', 'PB', 'PI', 'AL', 'SE', 'RN', 'MA',
    'Bahia', 'Ceará', 'Pernambuco', 'Paraíba', 'Piauí', 
    'Alagoas', 'Sergipe', 'Rio Grande do Norte', 'Maranhão',
    'sertão', 'sertanejo', 'cangaço'
  ];
  
  const regionaisGaucho = [
    'RS', 'Rio Grande do Sul', 'gaúcho', 'gaucho',
    'campeiro', 'fronteira', 'pampa', 'campanha',
    'missioneiro', 'charqueada', 'estância'
  ];
  
  const regionaisCaipira = [
    'SP', 'MG', 'GO', 'MS', 'MT', 'PR',
    'São Paulo', 'Minas Gerais', 'Goiás', 'Mato Grosso', 'Paraná',
    'caipira', 'interior', 'sertão paulista', 'roceiro'
  ];
  
  const termosPlatinosRegionais = [
    'platino', 'rio-platense', 'castelhano', 'uruguaio', 'argentino',
    'fronteiriço', 'pampeano'
  ];
  
  if (dialectal) {
    if (dialectal.origemPrimaria && origemPrimariaMap[dialectal.origemPrimaria]) {
      const insignia = origemPrimariaMap[dialectal.origemPrimaria];
      if (!insignias.includes(insignia)) {
        insignias.push(insignia);
      }
    }
    
    if (dialectal.origemRegionalista && dialectal.origemRegionalista.length > 0) {
      for (const origem of dialectal.origemRegionalista) {
        const origemLower = origem.toLowerCase();
        
        if (regionaisNordeste.some(r => origemLower.includes(r.toLowerCase()) || r.toLowerCase().includes(origemLower))) {
          if (!insignias.includes('Nordestino')) insignias.push('Nordestino');
        }
        
        if (regionaisGaucho.some(r => origemLower.includes(r.toLowerCase()) || r.toLowerCase().includes(origemLower))) {
          if (!insignias.includes('Gaúcho')) insignias.push('Gaúcho');
        }
        
        if (regionaisCaipira.some(r => origemLower.includes(r.toLowerCase()) || r.toLowerCase().includes(origemLower))) {
          if (!insignias.includes('Caipira')) insignias.push('Caipira');
        }
        
        if (termosPlatinosRegionais.some(r => origemLower.includes(r.toLowerCase()))) {
          if (!insignias.includes('Platino')) insignias.push('Platino');
        }
      }
    }
    
    if (dialectal.influenciaPlatina && !insignias.includes('Platino')) {
      insignias.push('Platino');
    }
  }
  
  // Insígnia do corpus de origem
  const corpusInsignias: Record<string, string> = {
    'gaucho': 'Gaúcho',
    'nordestino': 'Nordestino',
    'sertanejo': 'Sertanejo',
  };
  
  if (corpusInsignias[corpusType] && !insignias.includes(corpusInsignias[corpusType])) {
    insignias.push(corpusInsignias[corpusType]);
  }
  
  return insignias;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { mode = 'analyze', batchSize = 500, offset = 0 } = await req.json().catch(() => ({}));
    
    console.log(`🏷️ Reprocess Insignias - Mode: ${mode}, Batch: ${batchSize}, Offset: ${offset}`);

    // Mode: analyze
    if (mode === 'analyze') {
      const { count: withoutInsignias } = await supabase
        .from('semantic_disambiguation_cache')
        .select('*', { count: 'exact', head: true })
        .or('insignias_culturais.is.null,insignias_culturais.eq.{}');

      const { count: withSongId } = await supabase
        .from('semantic_disambiguation_cache')
        .select('*', { count: 'exact', head: true })
        .or('insignias_culturais.is.null,insignias_culturais.eq.{}')
        .not('song_id', 'is', null);

      const { count: withoutSongId } = await supabase
        .from('semantic_disambiguation_cache')
        .select('*', { count: 'exact', head: true })
        .or('insignias_culturais.is.null,insignias_culturais.eq.{}')
        .is('song_id', null);

      return new Response(JSON.stringify({
        success: true,
        analysis: {
          totalWithoutInsignias: withoutInsignias || 0,
          withSongId: withSongId || 0,
          withoutSongId: withoutSongId || 0,
          batchesNeeded: Math.ceil((withSongId || 0) / batchSize),
          note: 'Entries without song_id will use artist_id fallback'
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mode: reprocess
    if (mode === 'reprocess') {
      // Load caches
      const dialectalData = await loadDialectalCache(supabase);
      const corporaData = await loadCorporaCache(supabase);

      // Fetch entries without insignias that have song_id
      const { data: entries, error: fetchError } = await supabase
        .from('semantic_disambiguation_cache')
        .select('id, palavra, song_id, artist_id')
        .or('insignias_culturais.is.null,insignias_culturais.eq.{}')
        .order('cached_at', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (fetchError) {
        throw new Error(`Erro ao buscar cache: ${fetchError.message}`);
      }

      if (!entries || entries.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Reprocessamento concluído - sem mais entradas',
          processed: 0,
          offset,
          hasMore: false
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Collect unique song_ids
      const songIds = [...new Set(entries.filter(e => e.song_id).map(e => e.song_id))];
      
      // Fetch corpus_id for songs
      const songCorpusMap = new Map<string, string>();
      if (songIds.length > 0) {
        const { data: songs } = await supabase
          .from('songs')
          .select('id, corpus_id')
          .in('id', songIds);
        
        songs?.forEach((song: any) => {
          const corpusName = corporaData.get(song.corpus_id) || 'gaucho';
          songCorpusMap.set(song.id, corpusName);
        });
      }

      // Fallback: fetch corpus from artist_id
      const artistIds = [...new Set(entries.filter(e => !e.song_id && e.artist_id).map(e => e.artist_id))];
      const artistCorpusMap = new Map<string, string>();
      if (artistIds.length > 0) {
        const { data: artists } = await supabase
          .from('artists')
          .select('id, corpus_id')
          .in('id', artistIds);
        
        artists?.forEach((artist: any) => {
          const corpusName = corporaData.get(artist.corpus_id) || 'gaucho';
          artistCorpusMap.set(artist.id, corpusName);
        });
      }

      // Process entries
      let updated = 0;
      let skipped = 0;
      const updateBatch: Array<{ id: string; insignias_culturais: string[] }> = [];

      for (const entry of entries) {
        let corpusType = 'gaucho'; // default
        
        if (entry.song_id && songCorpusMap.has(entry.song_id)) {
          corpusType = songCorpusMap.get(entry.song_id)!;
        } else if (entry.artist_id && artistCorpusMap.has(entry.artist_id)) {
          corpusType = artistCorpusMap.get(entry.artist_id)!;
        }
        
        const newInsignias = inferCulturalInsignias(entry.palavra, corpusType, dialectalData);
        
        if (newInsignias.length > 0) {
          updateBatch.push({ id: entry.id, insignias_culturais: newInsignias });
        } else {
          skipped++;
        }
      }

      // Batch update
      for (const item of updateBatch) {
        const { error: updateError } = await supabase
          .from('semantic_disambiguation_cache')
          .update({ insignias_culturais: item.insignias_culturais })
          .eq('id', item.id);
        
        if (!updateError) {
          updated++;
        } else {
          console.warn(`⚠️ Erro ao atualizar ${item.id}: ${updateError.message}`);
          skipped++;
        }
      }

      const hasMore = entries.length === batchSize;

      console.log(`✅ Batch processado: ${updated} atualizados, ${skipped} ignorados, offset: ${offset}`);

      return new Response(JSON.stringify({
        success: true,
        processed: entries.length,
        updated,
        skipped,
        offset,
        nextOffset: offset + batchSize,
        hasMore
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      error: 'Mode inválido. Use "analyze" ou "reprocess"'
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro no reprocess:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
