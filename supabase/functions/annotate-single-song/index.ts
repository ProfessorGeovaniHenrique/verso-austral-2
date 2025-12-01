import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";
import { classifySafeStopword, isContextDependent } from "../_shared/stopwords-classifier.ts";
import { getLexiconRule } from "../_shared/semantic-rules-lexicon.ts";
import { inheritDomainFromSynonyms } from "../_shared/synonym-propagation.ts";
import { enrichTokensWithPOS, calculatePOSCoverage } from "../_shared/pos-enrichment.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnotateSingleSongRequest {
  songId: string;
  forceReprocess?: boolean;
}

interface AnnotateSingleSongResponse {
  success: boolean;
  songId: string;
  songTitle: string;
  artistName: string;
  stats: {
    totalWords: number;
    processedWords: number;
    cachedWords: number;
    newWords: number;
    processingTimeMs: number;
    posEnrichedWords: number;
    posBasedClassifications: number;
    posCoverage: number;
  };
  error?: string;
}

const BATCH_SIZE = 15;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const logger = createEdgeLogger('annotate-single-song', requestId);
  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { songId, forceReprocess = false }: AnnotateSingleSongRequest = await req.json();

    if (!songId) {
      throw new Error('songId obrigatório');
    }

    logger.info('Request received', { songId, forceReprocess });

    // Buscar música com artista
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select(`
        id,
        title,
        lyrics,
        artist_id,
        artists (
          id,
          name
        )
      `)
      .eq('id', songId)
      .single();

    if (songError || !song) {
      throw new Error('Música não encontrada');
    }

    if (!song.lyrics || song.lyrics.trim() === '') {
      throw new Error('Música não possui letra');
    }

    const artist = song.artists as any;
    logger.info('Song loaded', { 
      songId, 
      title: song.title, 
      artistName: artist?.name,
      lyricsLength: song.lyrics.length 
    });

    // Tokenizar letra
    const words = tokenizeLyrics(song.lyrics);
    logger.info('Lyrics tokenized', { totalWords: words.length });

    // Verificar cobertura no cache (se não for forçar reprocessamento)
    if (!forceReprocess) {
      const { count: cachedCount } = await supabase
        .from('semantic_disambiguation_cache')
        .select('*', { count: 'exact', head: true })
        .eq('song_id', songId);

      if (cachedCount && cachedCount >= words.length * 0.95) {
        logger.info('Song already has sufficient coverage', { 
          cachedCount, 
          totalWords: words.length,
          coverage: ((cachedCount / words.length) * 100).toFixed(1) + '%'
        });

        const response: AnnotateSingleSongResponse = {
          success: true,
          songId,
          songTitle: song.title,
          artistName: artist?.name || 'Desconhecido',
          stats: {
            totalWords: words.length,
            processedWords: 0,
            cachedWords: cachedCount || 0,
            newWords: 0,
            processingTimeMs: Date.now() - startTime,
            posEnrichedWords: 0,
            posBasedClassifications: 0,
            posCoverage: 0,
          }
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // FASE 0: Enriquecimento POS (nova pipeline de 4 camadas)
    const tokensToEnrich = words.map(w => ({ palavra: w, contextoEsquerdo: '', contextoDireito: '' }));
    const enrichedTokens = await enrichTokensWithPOS(tokensToEnrich);
    const posCoverage = calculatePOSCoverage(enrichedTokens);
    
    logger.info('POS enrichment complete', {
      totalTokens: enrichedTokens.length,
      coveredTokens: posCoverage.covered,
      coverageRate: (posCoverage.coverageRate * 100).toFixed(1) + '%',
      sourceDistribution: posCoverage.sourceDistribution
    });

    // Processar palavras
    let processedWords = 0;
    let cachedWords = 0;
    let newWords = 0;
    let posBasedClassifications = 0;

    const wordsToProcess: Array<{
      palavra: string;
      contextoEsquerdo: string;
      contextoDireito: string;
      posTag?: string;
      posSource?: string;
    }> = [];

    for (let i = 0; i < words.length; i++) {
      const palavra = words[i];
      const contextoEsquerdo = words.slice(Math.max(0, i - 5), i).join(' ');
      const contextoDireito = words.slice(i + 1, Math.min(words.length, i + 6)).join(' ');
      
      const enrichedToken = enrichedTokens[i];
      wordsToProcess.push({ 
        palavra, 
        contextoEsquerdo, 
        contextoDireito,
        posTag: enrichedToken?.pos,
        posSource: enrichedToken?.source
      });
    }

    logger.info('Starting classification', { totalWords: wordsToProcess.length });

    const wordsNeedingGemini: typeof wordsToProcess = [];

    // FASE 1+2: Classificar com regras e cache
    for (const wordData of wordsToProcess) {
      // Safe stopwords
      const safeResult = classifySafeStopword(wordData.palavra);
      if (safeResult) {
        const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
        await saveToCache(
          supabase,
          wordData.palavra,
          hash,
          safeResult.tagset_codigo,
          safeResult.confianca,
          'rule_based',
          safeResult.justificativa,
          artist.id,
          songId
        );
        cachedWords++;
        processedWords++;
        continue;
      }

      // Cache palavra apenas
      const wordCache = await checkWordOnlyCache(supabase, wordData.palavra);
      if (wordCache) {
        const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
        await saveToCache(
          supabase,
          wordData.palavra,
          hash,
          wordCache.tagset_codigo,
          wordCache.confianca,
          'rule_based',
          wordCache.justificativa || 'Cache palavra',
          artist.id,
          songId
        );
        await supabase.rpc('increment_semantic_cache_hit', { cache_id: wordCache.id });
        cachedWords++;
        processedWords++;
        continue;
      }

      // Cache contexto
      const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
      const contextCache = await checkContextCache(supabase, wordData.palavra, hash);
      if (contextCache) {
        await saveToCache(
          supabase,
          wordData.palavra,
          hash,
          contextCache.tagset_codigo,
          contextCache.confianca,
          'rule_based',
          contextCache.justificativa || 'Cache contexto',
          artist.id,
          songId
        );
        await supabase.rpc('increment_semantic_cache_hit', { cache_id: contextCache.id });
        cachedWords++;
        processedWords++;
        continue;
      }

      // Regras do léxico dialetal
      const lexiconRule = await getLexiconRule(wordData.palavra);
      if (lexiconRule) {
        await saveToCache(
          supabase,
          wordData.palavra,
          hash,
          lexiconRule.tagset_codigo,
          lexiconRule.confianca,
          'rule_based',
          lexiconRule.justificativa,
          artist.id,
          songId,
          lexiconRule.tagsets_alternativos,
          lexiconRule.is_polysemous
        );
        newWords++;
        processedWords++;
        continue;
      }

      // Herança de sinônimos
      const inherited = await inheritDomainFromSynonyms(wordData.palavra);
      if (inherited) {
        await saveToCache(
          supabase,
          wordData.palavra,
          hash,
          inherited.tagset_codigo,
          inherited.confianca,
          'rule_based',
          inherited.justificativa || 'Herdado de sinônimo',
          artist.id,
          songId
        );
        newWords++;
        processedWords++;
        continue;
      }

      // NOVA CAMADA: Regras baseadas em POS
      if (wordData.posTag) {
        const posResult = applyPOSBasedRules(wordData.posTag, wordData.palavra);
        if (posResult) {
          await saveToCache(
            supabase,
            wordData.palavra,
            hash,
            posResult.tagset_codigo,
            posResult.confianca,
            'pos_rule',
            `POS: ${wordData.posTag} (${wordData.posSource}) → ${posResult.justificativa}`,
            artist.id,
            songId
          );
          newWords++;
          processedWords++;
          posBasedClassifications++;
          continue;
        }
      }

      // Regras contextuais
      if (!isContextDependent(wordData.palavra)) {
        const ruleResult = applyContextualRules(wordData.palavra);
        if (ruleResult) {
          await saveToCache(
            supabase,
            wordData.palavra,
            hash,
            ruleResult.tagset_codigo,
            ruleResult.confianca,
            'rule_based',
            ruleResult.justificativa,
            artist.id,
            songId
          );
          newWords++;
          processedWords++;
          continue;
        }
      }

      // Precisa Gemini
      wordsNeedingGemini.push(wordData);
    }

    logger.info('Pre-processing complete', {
      total: wordsToProcess.length,
      cached: cachedWords,
      posBasedClassifications,
      needingGemini: wordsNeedingGemini.length,
    });

    // FASE 3: Processar com Gemini em batches
    if (wordsNeedingGemini.length > 0) {
      for (let i = 0; i < wordsNeedingGemini.length; i += BATCH_SIZE) {
        const batch = wordsNeedingGemini.slice(i, i + BATCH_SIZE);
        
        try {
          const batchResults = await batchClassifyWithGemini(batch, logger);

          for (const wordData of batch) {
            const result = batchResults.get(wordData.palavra.toLowerCase());
            
            if (result) {
              const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
              await saveToCache(
                supabase,
                wordData.palavra,
                hash,
                result.tagset_codigo,
                result.confianca,
                result.fonte,
                result.justificativa || 'Gemini batch',
                artist.id,
                songId
              );
              newWords++;
              processedWords++;
            }
          }
        } catch (batchError) {
          logger.error('Batch error', batchError instanceof Error ? batchError : new Error(String(batchError)));
          // Continue processing other batches
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;
    logger.info('Song annotation complete', {
      songId,
      totalWords: words.length,
      processedWords,
      cachedWords,
      newWords,
      posEnrichedWords: posCoverage.covered,
      posBasedClassifications,
      posCoverage: (posCoverage.coverageRate * 100).toFixed(1) + '%',
      processingTimeMs,
      wordsPerSecond: (processedWords / (processingTimeMs / 1000)).toFixed(2),
    });

    const response: AnnotateSingleSongResponse = {
      success: true,
      songId,
      songTitle: song.title,
      artistName: artist?.name || 'Desconhecido',
      stats: {
        totalWords: words.length,
        processedWords,
        cachedWords,
        newWords,
        processingTimeMs,
        posEnrichedWords: posCoverage.covered,
        posBasedClassifications,
        posCoverage: posCoverage.coverageRate,
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Error processing song', errorObj);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorObj.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= UTILITY FUNCTIONS =============

function tokenizeLyrics(lyrics: string): string[] {
  return lyrics
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^\wáàâãéèêíïóôõöúçñ]/gi, ''))
    .filter(w => w.length > 1);
}

async function hashContext(left: string, right: string): Promise<string> {
  const combined = `${left}|${right}`.toLowerCase();
  const msgUint8 = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

async function checkWordOnlyCache(supabase: any, palavra: string) {
  const palavraNorm = palavra.toLowerCase();
  
  const { data: wordCache, error } = await supabase
    .from('semantic_disambiguation_cache')
    .select('id, tagset_codigo, confianca, justificativa')
    .eq('palavra', palavraNorm)
    .gte('confianca', 0.90)
    .order('confianca', { ascending: false })
    .limit(1)
    .single();

  if (error || !wordCache) return null;
  
  const { count } = await supabase
    .from('semantic_disambiguation_cache')
    .select('*', { count: 'exact', head: true })
    .eq('palavra', palavraNorm)
    .neq('tagset_codigo', wordCache.tagset_codigo);
  
  if (count && count > 0) return null;
  
  return wordCache;
}

async function checkContextCache(supabase: any, palavra: string, contextoHash: string) {
  const { data, error } = await supabase
    .from('semantic_disambiguation_cache')
    .select('id, tagset_codigo, confianca, justificativa')
    .eq('palavra', palavra.toLowerCase())
    .eq('contexto_hash', contextoHash)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * NOVA FUNÇÃO: Aplica regras baseadas em POS tags
 */
function applyPOSBasedRules(posTag: string, palavra: string) {
  // Verbos → AC (Ações e Processos)
  if (posTag === 'VERB') {
    return {
      tagset_codigo: 'AC',
      confianca: 0.92,
      justificativa: 'Verbo identificado via POS → Ações e Processos'
    };
  }

  // Adjetivos → EQ (Estados e Qualidades)
  if (posTag === 'ADJ') {
    return {
      tagset_codigo: 'EQ',
      confianca: 0.90,
      justificativa: 'Adjetivo identificado via POS → Estados e Qualidades'
    };
  }

  // Marcadores gramaticais → MG
  if (['ADP', 'DET', 'CONJ', 'SCONJ', 'PRON'].includes(posTag)) {
    return {
      tagset_codigo: 'MG',
      confianca: 0.98,
      justificativa: `${posTag} identificado via POS → Marcador Gramatical`
    };
  }

  // Nomes próprios → SH (Indivíduo)
  if (posTag === 'PROPN') {
    return {
      tagset_codigo: 'SH',
      confianca: 0.88,
      justificativa: 'Nome próprio identificado via POS → Indivíduo'
    };
  }

  return null;
}

function applyContextualRules(palavra: string) {
  const palavraNorm = palavra.toLowerCase();
  
  if (isContextDependent(palavraNorm)) {
    return null;
  }
  
  const sentimentos = ['saudade', 'amor', 'paixão', 'dor', 'alegria', 'tristeza', 'verso', 'sonho'];
  if (sentimentos.includes(palavraNorm)) {
    return {
      tagset_codigo: 'SE',
      confianca: 0.98,
      fonte: 'rule_based',
      justificativa: 'Sentimento universal',
    };
  }

  const natureza = ['sol', 'lua', 'estrela', 'céu', 'campo', 'rio', 'vento', 'chuva', 'pampa', 'coxilha', 'várzea'];
  if (natureza.includes(palavraNorm)) {
    return {
      tagset_codigo: 'NA',
      confianca: 0.98,
      fonte: 'rule_based',
      justificativa: 'Elemento natural',
    };
  }

  return null;
}

async function batchClassifyWithGemini(
  palavras: Array<{ palavra: string; contextoEsquerdo: string; contextoDireito: string }>,
  logger: any
) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurado');
  }

  const palavrasList = palavras.map((p, i) => {
    const sentenca = `${p.contextoEsquerdo} **${p.palavra}** ${p.contextoDireito}`.trim();
    return `${i + 1}. Palavra: "${p.palavra}" | Contexto: "${sentenca}"`;
  }).join('\n');

  const prompt = `Classifique CADA palavra em um dos 14 domínios semânticos.

**14 DOMÍNIOS SEMÂNTICOS N1:**
- AB (Abstrações): ideias abstratas, conceitos filosóficos, valores
- AC (Ações e Processos): verbos de ação física (andar, pegar, construir, olhar, falar)
- AP (Atividades e Práticas): trabalho, alimentação, vestuário, lazer, transporte
- CC (Cultura e Conhecimento): arte, educação, religião, ciência, comunicação
- EL (Estruturas e Lugares): construções, locais físicos, espaços
- EQ (Estados e Qualidades): adjetivos, características, tempo, medidas
- MG (Marcadores Gramaticais): artigos, preposições, conjunções
- NA (Natureza e Paisagem): flora, fauna, clima, geografia
- NC (Não Classificado): não se encaixa
- OA (Objetos e Artefatos): ferramentas, utensílios, equipamentos
- SB (Saúde e Bem-Estar): doenças humanas/animais, tratamentos, bem-estar
- SE (Sentimentos): amor, saudade, alegria, emoções
- SH (Indivíduo): pessoa, corpo humano, características humanas
- SP (Sociedade e Política): governo, lei, relações sociais

**SUBDOMÍNIOS IMPORTANTES:**
- AP.ALI (Alimentação): mate, churrasco, cuia
- NA.FAU (Fauna): cavalo, gado, ovelha
- OA (Objetos Campeiros): arreio, espora, laço
- SB.05 (Saúde Animal): veterinário, vermífugo, castração animal
- SE (Sentimentos): saudade, querência, paixão

**IMPORTANTE - SAÚDE ANIMAL:**
Use SB ou SB.05 para termos veterinários (veterinário, vermífugo, castração animal, cinomose, raiva).

**PALAVRAS:**
${palavrasList}

**RETORNE JSON ARRAY:**
[
  {"palavra": "palavra1", "tagset_codigo": "XX", "confianca": 0.95, "justificativa": "razão"},
  ...
]`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  let classifications;
  try {
    const parsed = JSON.parse(content);
    classifications = parsed.classifications || parsed;
  } catch {
    classifications = [];
  }

  const resultMap = new Map();
  for (const item of classifications) {
    if (item.palavra && item.tagset_codigo) {
      resultMap.set(item.palavra.toLowerCase(), {
        tagset_codigo: item.tagset_codigo,
        confianca: item.confianca || 0.85,
        fonte: 'gemini',
        justificativa: item.justificativa || 'Gemini classification'
      });
    }
  }

  return resultMap;
}

async function saveToCache(
  supabase: any,
  palavra: string,
  contextoHash: string,
  tagsetCodigo: string,
  confianca: number,
  fonte: string,
  justificativa: string,
  artistId: string,
  songId: string,
  tagsetsAlternativos?: string[],
  isPolysemous?: boolean
) {
  const { error } = await supabase
    .from('semantic_disambiguation_cache')
    .insert({
      palavra: palavra.toLowerCase(),
      contexto_hash: contextoHash,
      tagset_codigo: tagsetCodigo,
      confianca,
      fonte,
      justificativa,
      artist_id: artistId,
      song_id: songId,
      tagsets_alternativos: tagsetsAlternativos || null,
      is_polysemous: isPolysemous || false,
    });

  if (error && error.code !== '23505') {
    throw error;
  }
}
