/**
 * 🎯 PROCESS CORPUS ANALYSIS - Pipeline Real CE + CR
 * 
 * Processa Corpus de Estudo (CE) e Corpus de Referência (CR) com dados REAIS
 * do semantic_disambiguation_cache, calculando Log-likelihood comparativo
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";
import { createEdgeLogger } from '../_shared/unified-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mini Corpus Nordestino - 25 músicas fixas
const MINI_CORPUS_IDS = [
  'e41be768-e70a-4510-b2f2-dbc32996980a', // Vaqueiro Velho
  '797439f5-5594-457d-aba1-2985e7a8afd8', // Não É Fácil
  '1652ac4b-02a4-4717-b25b-5366f87693b2', // Trancelim
  '0dbe9d1c-a26f-4f45-8042-13b00706744b', // Homem de Saia
  'eb67e982-2577-4dfd-84bd-0e93569e16c4', // Saga de um Vaqueiro
  '2e996e5f-e7b4-4b54-8d2a-94c8b58e36f9', // Nordeste Independente
  'a5bb6a82-4f56-4185-b17b-264975e370da', // Amor Na Vaquejada
  '3e9d7e97-d1a9-473a-a806-6e528b59db29', // Jesus É Verbo
  '84f093fb-3e81-4da3-a994-e5658a038eb3', // Preconceito
  '5bcf9328-59ba-4262-93ce-7dc7e338b6cb', // Mistérios da Vida
  '88b37a11-aa2d-4fed-94ee-5956a1de7df3', // Sonho de Vaqueiro
  '8d36db01-521e-4fc7-9757-d7c7e2509d80', // É Gaia
  '7c99ae23-76ff-47eb-bdae-ba0c2d8f68ed', // Eunapolitano
  'bc217139-4255-4d07-85f1-56e5c9e7b206', // Capoeira do Arnaldo
  '2b44edb2-3b3d-44c0-83f7-21b2a04f4333', // Comedor de Gilete
  'b8887713-4bc3-43c1-a97c-2061af5d234c', // Amigo fura olho
  '6d8ec724-1f4d-49b4-9519-774ae991fc86', // Mulé Rendeira
  '88ad5397-78b2-4c7c-b799-b99456313801', // Todo Castigo
  '0724e63b-748c-4c86-9bac-aeef30cf4021', // Jesus também foi menino
  'c6f589cd-ca8f-4084-8158-97883e4b793d', // Vem Meu São João
  'df697f7f-b334-463f-bb8a-f48f6b12c02e', // Coração No Prejuízo
  '888293c5-15c1-460f-aeeb-7c0f8f11ce3c', // Mui Louco Por Você
  '2ce845f7-9a4d-4fb8-838f-68918ffe9b05', // Não Me Vendo
  '8c302b7a-f0db-44e9-9d21-fa5f3022f242', // Eu Te Esperarei
  '4de6ca20-2b20-41a2-b8bb-10f9020d3d75', // Amor Voraz
];

/**
 * Aguarda até que uma música seja anotada no cache
 */
async function waitForAnnotation(
  supabase: any,
  songId: string,
  timeoutMs: number,
  log: any
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const { count } = await supabase
      .from('semantic_disambiguation_cache')
      .select('*', { count: 'exact', head: true })
      .eq('song_id', songId);
    
    if (count && count > 0) {
      log.info('Song annotation complete', { songId, words: count });
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll a cada 2s
  }
  
  log.warn('Annotation timeout', { songId });
  return false;
}

/**
 * Aguarda até que múltiplas músicas sejam anotadas
 */
async function waitForMultipleAnnotations(
  supabase: any,
  songIds: string[],
  timeoutMs: number,
  log: any
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const { data } = await supabase
      .from('semantic_disambiguation_cache')
      .select('song_id')
      .in('song_id', songIds);
    
    const annotatedIds = new Set(data?.map((d: any) => d.song_id) || []);
    const allAnnotated = songIds.every(id => annotatedIds.has(id));
    
    if (allAnnotated) {
      log.info('All CR songs annotated', { count: songIds.length });
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Poll a cada 3s
  }
  
  log.warn('Some CR songs may not be fully annotated');
}

/**
 * Calcula Log-likelihood comparando CE vs CR
 */
function calculateLogLikelihood(
  ceFreq: Map<string, number>,
  crFreq: Map<string, number>
): Map<string, { ll: number; mi: number; significance: string }> {
  const results = new Map();
  
  const ceTotal = Array.from(ceFreq.values()).reduce((a, b) => a + b, 0);
  const crTotal = Array.from(crFreq.values()).reduce((a, b) => a + b, 0);
  
  // Para cada domínio no CE
  ceFreq.forEach((ceCount, domain) => {
    const crCount = crFreq.get(domain) || 0;
    
    // Frequências esperadas
    const e1 = ceTotal * (ceCount + crCount) / (ceTotal + crTotal);
    const e2 = crTotal * (ceCount + crCount) / (ceTotal + crTotal);
    
    // Log-likelihood
    let ll = 0;
    if (ceCount > 0) ll += 2 * ceCount * Math.log(ceCount / e1);
    if (crCount > 0) ll += 2 * crCount * Math.log(crCount / e2);
    
    // Mutual Information
    const pCE = ceCount / ceTotal;
    const pCR = crCount / crTotal;
    const mi = pCE > 0 && pCR > 0 ? Math.log2(pCE / pCR) : 0;
    
    // Significância (p < 0.001 → LL > 10.83, p < 0.01 → LL > 6.63)
    const significance = ll > 10.83 ? 'Alta' : ll > 6.63 ? 'Média' : 'Baixa';
    
    results.set(domain, { 
      ll: parseFloat(ll.toFixed(2)), 
      mi: parseFloat(mi.toFixed(3)), 
      significance 
    });
  });
  
  return results;
}

serve(withInstrumentation('process-corpus-analysis', async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('process-corpus-analysis', requestId);

  // Health check
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.get('health') === 'true') {
    const health = await createHealthCheck('process-corpus-analysis', '2.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { songId, referenceCorpusType } = await req.json();

    log.info('Processing corpus analysis', { songId, referenceCorpusType });

    if (!songId) {
      throw new Error('songId é obrigatório');
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ==========================================
    // PARTE 1: PROCESSAR CE (Música de Estudo)
    // ==========================================
    
    log.info('Loading study song', { songId });
    
    // 1.1 Buscar música específica
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, title, lyrics, artist_id')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      log.error('Study song not found', songError);
      throw new Error(`Música de estudo não encontrada: ${songId}`);
    }

    log.info('Study song loaded', { title: song.title });

    // 1.2 Verificar cache
    const { count: ceCount } = await supabase
      .from('semantic_disambiguation_cache')
      .select('*', { count: 'exact', head: true })
      .eq('song_id', songId);

    // 1.3 Se não anotado, disparar anotação
    if (!ceCount || ceCount === 0) {
      log.info('CE not annotated, triggering annotation', { songId });
      
      const { error: annotateError } = await supabase.functions.invoke('annotate-single-song', {
        body: { songId, forceReprocess: false }
      });
      
      if (annotateError) {
        log.error('Error triggering CE annotation', annotateError);
        throw new Error('Erro ao anotar música de estudo');
      }
      
      // Aguardar processamento (30s timeout)
      const annotated = await waitForAnnotation(supabase, songId, 30000, log);
      if (!annotated) {
        throw new Error('Timeout ao aguardar anotação do CE');
      }
    }

    // 1.4 Buscar classificações REAIS do CE
    const { data: ceClassifications, error: ceError } = await supabase
      .from('semantic_disambiguation_cache')
      .select('palavra, tagset_codigo, confianca')
      .eq('song_id', songId);

    if (ceError) {
      log.error('Error fetching CE classifications', ceError);
      throw ceError;
    }

    log.info('CE classifications loaded', { count: ceClassifications?.length || 0 });

    // ==========================================
    // PARTE 2: PROCESSAR CR (25 Músicas Nordestinas)
    // ==========================================

    log.info('Loading reference corpus', { type: referenceCorpusType, songs: MINI_CORPUS_IDS.length });

    // 2.1 Verificar quais músicas já estão no cache
    const { data: crCacheCounts } = await supabase
      .from('semantic_disambiguation_cache')
      .select('song_id')
      .in('song_id', MINI_CORPUS_IDS);

    const annotatedSongIds = new Set(crCacheCounts?.map((c: any) => c.song_id) || []);
    const songsToAnnotate = MINI_CORPUS_IDS.filter(id => !annotatedSongIds.has(id));

    // 2.2 Disparar anotação de músicas não processadas em background (fire-and-forget)
    if (songsToAnnotate.length > 0) {
      log.info('Triggering CR annotation in background', { 
        count: songsToAnnotate.length,
        already_annotated: annotatedSongIds.size 
      });
      
      // Fire-and-forget: dispara anotação MAS não espera completar
      // Processa apenas primeiros 5 para não sobrecarregar
      const batch = songsToAnnotate.slice(0, 5);
      
      Promise.all(batch.map(id => 
        supabase.functions.invoke('annotate-single-song', {
          body: { songId: id, forceReprocess: false }
        })
      )).catch(e => log.warn('Background CR annotation error (non-blocking)', e));
      
      log.info('CR annotation triggered in background, continuing with available data');
    } else {
      log.info('All CR songs already annotated');
    }

    // 2.3 Buscar classificações REAIS do CR
    const { data: crClassifications, error: crError } = await supabase
      .from('semantic_disambiguation_cache')
      .select('palavra, tagset_codigo, confianca, song_id')
      .in('song_id', MINI_CORPUS_IDS);

    if (crError) {
      log.error('Error fetching CR classifications', crError);
      throw crError;
    }

    // Log detalhado sobre CR disponível
    const uniqueCRSongs = new Set(crClassifications?.map(c => c.song_id) || []).size;
    log.info('CR classifications loaded', { 
      total_words: crClassifications?.length || 0,
      unique_songs: uniqueCRSongs,
      expected_songs: MINI_CORPUS_IDS.length,
      coverage_percent: parseFloat(((uniqueCRSongs / MINI_CORPUS_IDS.length) * 100).toFixed(1))
    });

    // Tratamento para CR insuficiente (menos de 100 palavras)
    if (!crClassifications || crClassifications.length < 100) {
      log.warn('CR has insufficient data, proceeding with CE-only analysis', {
        cr_words: crClassifications?.length || 0,
        minimum_required: 100
      });
      // Continuará com análise usando apenas CE ou CR disponível
    }

    // ==========================================
    // PARTE 3: CALCULAR ESTATÍSTICAS REAIS
    // ==========================================

    // 3.1 Buscar tagsets para mapeamento
    const { data: tagsets } = await supabase
      .from('semantic_tagset')
      .select('codigo, nome, cor')
      .eq('status', 'ativo')
      .eq('nivel_profundidade', 1);

    const tagsetMap = new Map();
    (tagsets || []).forEach((t: any) => {
      tagsetMap.set(t.codigo, { nome: t.nome, cor: t.cor });
    });

    // 3.2 Agregar frequências por domínio - CE
    const ceFreqByDomain = new Map<string, number>();
    const ceWordFreq = new Map<string, number>();
    
    (ceClassifications || []).forEach((c: any) => {
      const domain = c.tagset_codigo || 'NC';
      ceFreqByDomain.set(domain, (ceFreqByDomain.get(domain) || 0) + 1);
      ceWordFreq.set(c.palavra, (ceWordFreq.get(c.palavra) || 0) + 1);
    });

    // 3.3 Agregar frequências por domínio - CR
    const crFreqByDomain = new Map<string, number>();
    
    (crClassifications || []).forEach((c: any) => {
      const domain = c.tagset_codigo || 'NC';
      crFreqByDomain.set(domain, (crFreqByDomain.get(domain) || 0) + 1);
    });

    // 3.4 Calcular Log-likelihood para cada domínio
    const llScores = calculateLogLikelihood(ceFreqByDomain, crFreqByDomain);

    log.info('Log-likelihood calculated', { domains: llScores.size });

    // 3.5 Montar resposta com dados REAIS
    const keywords = Array.from(ceWordFreq.entries())
      .map(([palavra, freq]) => {
        const classification = (ceClassifications || []).find((c: any) => c.palavra === palavra);
        const domain = classification?.tagset_codigo || 'NC';
        const tagsetInfo = tagsetMap.get(domain);
        const llInfo = llScores.get(domain) || { ll: 0, mi: 0, significance: 'Baixa' };

        return {
          palavra,
          frequencia: freq,
          ll: llInfo.ll,
          mi: llInfo.mi,
          significancia: llInfo.significance,
          dominio: tagsetInfo?.nome || 'Não Classificado',
          cor: tagsetInfo?.cor || '#6B7280',
          prosody: 'Neutra', // Prosódia não implementada ainda
          confianca: classification?.confianca || 0
        };
      })
      .sort((a, b) => b.ll - a.ll)
      .slice(0, 100);

    // 3.6 Agregar domínios com estatísticas
    const dominioMap = new Map();
    
    (ceClassifications || []).forEach((c: any) => {
      const domain = c.tagset_codigo || 'NC';
      if (!dominioMap.has(domain)) {
        dominioMap.set(domain, {
          palavras: new Set(),
          ocorrencias: 0,
          llScores: []
        });
      }
      const dom = dominioMap.get(domain);
      dom.palavras.add(c.palavra);
      dom.ocorrencias += 1;
      
      const llInfo = llScores.get(domain);
      if (llInfo) {
        dom.llScores.push(llInfo.ll);
      }
    });

    const totalOcorrencias = Array.from(dominioMap.values())
      .reduce((sum: number, d: any) => sum + d.ocorrencias, 0);

    const dominios = Array.from(dominioMap.entries()).map(([codigo, data]: [string, any]) => {
      const tagsetInfo = tagsetMap.get(codigo);
      const avgLL = data.llScores.length > 0 
        ? data.llScores.reduce((a: number, b: number) => a + b, 0) / data.llScores.length 
        : 0;

      return {
        dominio: tagsetInfo?.nome || 'Não Classificado',
        descricao: `Domínio semântico ${codigo}`,
        cor: tagsetInfo?.cor || '#6B7280',
        palavras: Array.from(data.palavras),
        ocorrencias: data.ocorrencias,
        avgLL: parseFloat(avgLL.toFixed(2)),
        avgMI: 0, // TODO: calcular MI médio
        riquezaLexical: data.palavras.size,
        percentual: parseFloat(((data.ocorrencias / totalOcorrencias) * 100).toFixed(1))
      };
    }).sort((a, b) => b.percentual - a.percentual);

    // 3.7 Cloud data
    const cloudData = dominios.slice(0, 15).map(d => ({
      codigo: d.dominio.substring(0, 3).toUpperCase(),
      nome: d.dominio,
      size: 50 + d.percentual * 2,
      color: d.cor,
      wordCount: d.riquezaLexical,
      avgScore: d.avgLL
    }));

    // 3.8 Prosódia
    const positivas = keywords.filter(k => k.prosody === 'Positiva').length;
    const negativas = keywords.filter(k => k.prosody === 'Negativa').length;
    const neutras = keywords.filter(k => k.prosody === 'Neutra').length;
    const total = keywords.length || 1;

    const result = {
      keywords,
      dominios,
      cloudData,
      estatisticas: {
        totalPalavras: (ceClassifications || []).length,
        palavrasUnicas: ceWordFreq.size,
        dominiosIdentificados: dominios.length,
        palavrasChaveSignificativas: keywords.filter(k => k.significancia === 'Alta').length,
        prosodiaDistribution: {
          positivas,
          negativas,
          neutras,
          percentualPositivo: parseFloat(((positivas / total) * 100).toFixed(1)),
          percentualNegativo: parseFloat(((negativas / total) * 100).toFixed(1)),
          percentualNeutro: parseFloat(((neutras / total) * 100).toFixed(1))
        }
      }
    };

    log.info('Processing complete', { 
      keywordsCount: keywords.length,
      domainsCount: dominios.length,
      ceWords: (ceClassifications || []).length,
      crWords: (crClassifications || []).length
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log.error('Error processing corpus', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
