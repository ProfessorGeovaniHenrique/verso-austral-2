import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";
import { classifySafeStopword, isContextDependent } from "../_shared/stopwords-classifier.ts";
import { getLexiconRule } from "../_shared/semantic-rules-lexicon.ts";
import { inheritDomainFromSynonyms } from "../_shared/synonym-propagation.ts";
import { detectGauchoMWEs } from "../_shared/gaucho-mwe.ts";
import { enrichTokensWithPOS, calculatePOSCoverage } from "../_shared/pos-enrichment.ts";
import { normalizeText } from "../_shared/text-normalizer.ts";
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface AnnotateArtistRequest {
  artistId?: string;
  artistName?: string;
  jobId?: string;
  continueFrom?: {
    songIndex: number;
    wordIndex: number;
  };
}

const CHUNK_SIZE = 100; // FASE 4: Aumentado de 50 para 100 (batch processing suporta mais)
const CHUNK_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutos
const BATCH_SIZE = 15; // Máximo de palavras por batch Gemini

/**
 * Mapeamento de MWEs conhecidas para seus domínios semânticos
 * Prioridade máxima: classificação instantânea (0ms)
 */
const MWE_SEMANTIC_DOMAINS: Record<string, { tagset: string; confianca: number; justificativa: string }> = {
  'mate amargo': { tagset: 'AP.ALI', confianca: 0.99, justificativa: 'Bebida tradicional gaúcha - chimarrão amargo' },
  'mate doce': { tagset: 'AP.ALI', confianca: 0.99, justificativa: 'Bebida gaúcha com açúcar' },
  'mate chimarrão': { tagset: 'AP.ALI', confianca: 0.99, justificativa: 'Bebida tradicional gaúcha' },
  'cavalo gateado': { tagset: 'NA.FAU', confianca: 0.99, justificativa: 'Cavalo de pelagem mesclada característica' },
  'cavalo tordilho': { tagset: 'NA.FAU', confianca: 0.99, justificativa: 'Cavalo de pelagem cinza' },
  'cavalo zaino': { tagset: 'NA.FAU', confianca: 0.99, justificativa: 'Cavalo de pelagem escura uniforme' },
  'cavalo alazão': { tagset: 'NA.FAU', confianca: 0.99, justificativa: 'Cavalo de pelagem avermelhada' },
  'cavalo pampa': { tagset: 'NA.FAU', confianca: 0.99, justificativa: 'Cavalo de pelagem com manchas' },
  'bomba de prata': { tagset: 'OA', confianca: 0.99, justificativa: 'Utensílio de chimarrão em prata' },
  'bota de couro': { tagset: 'OA', confianca: 0.98, justificativa: 'Calçado tradicional campeiro' },
  'cuia de porongo': { tagset: 'OA', confianca: 0.99, justificativa: 'Recipiente tradicional do mate' },
  'lida no campo': { tagset: 'AP.TRA', confianca: 0.98, justificativa: 'Trabalho rural gaúcho' },
  'trabalho no campo': { tagset: 'AP.TRA', confianca: 0.98, justificativa: 'Atividade rural' },
  'pago lindo': { tagset: 'SH', confianca: 0.97, justificativa: 'Gaúcho qualificado' },
  'pago véio': { tagset: 'SH', confianca: 0.97, justificativa: 'Gaúcho experiente' },
  'prenda linda': { tagset: 'SH', confianca: 0.98, justificativa: 'Mulher gaúcha qualificada' },
  'prenda gaúcha': { tagset: 'SH', confianca: 0.98, justificativa: 'Mulher da cultura gaúcha' },
  'churrasco de gado': { tagset: 'AP.ALI', confianca: 0.99, justificativa: 'Culinária tradicional gaúcha' },
  'churrasco de costela': { tagset: 'AP.ALI', confianca: 0.99, justificativa: 'Prato típico gaúcho' },
  'na querência': { tagset: 'NA.GEO', confianca: 0.97, justificativa: 'Local de origem/pertencimento' },
  'no lombo': { tagset: 'AP.TRA', confianca: 0.96, justificativa: 'Montado no cavalo' },
  'pelos pagos': { tagset: 'NA.GEO', confianca: 0.97, justificativa: 'Pela região de origem' },
  'da campanha': { tagset: 'NA.GEO', confianca: 0.97, justificativa: 'Da região campeira' },
  'pro galpão': { tagset: 'EL', confianca: 0.96, justificativa: 'Para construção rural tradicional' },
  'de boa tradição': { tagset: 'CC', confianca: 0.96, justificativa: 'Expressão de herança cultural' },
  'de velha tradição': { tagset: 'CC', confianca: 0.96, justificativa: 'Expressão de herança cultural antiga' },
  'tropa velha': { tagset: 'NA.FAU', confianca: 0.97, justificativa: 'Gado/cavalos experientes' },
  'tropa gorda': { tagset: 'NA.FAU', confianca: 0.97, justificativa: 'Gado bem nutrido' },
  'tropa mansa': { tagset: 'NA.FAU', confianca: 0.97, justificativa: 'Gado domesticado' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const logger = createEdgeLogger('annotate-artist-songs', requestId);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody: AnnotateArtistRequest = await req.json();
    const { artistId, artistName, jobId, continueFrom } = requestBody;

    // MODO 1: Continuar job existente
    if (jobId && continueFrom) {
      logger.info('Continuando job existente', { jobId, continueFrom });
      await processChunk(supabaseClient, jobId, continueFrom, logger);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Chunk processado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODO 2: Criar novo job
    if (!artistId && !artistName) {
      throw new Error('artistId ou artistName obrigatório');
    }

    // Buscar artista
    let artist;
    if (artistId) {
      const { data, error } = await supabaseClient
        .from('artists')
        .select('id, name')
        .eq('id', artistId)
        .single();
      
      if (error || !data) throw new Error(`Artista não encontrado: ${artistId}`);
      artist = data;
    } else {
      const { data, error } = await supabaseClient
        .from('artists')
        .select('id, name')
        .ilike('name', `%${artistName}%`)
        .limit(1)
        .single();
      
      if (error || !data) throw new Error(`Artista não encontrado: ${artistName}`);
      artist = data;
    }

    logger.info('Artista identificado', { artistId: artist.id, artistName: artist.name });

    // Buscar músicas com letra E corpus_id para detecção dinâmica de corpus
    const { data: songs, error: songsError } = await supabaseClient
      .from('songs')
      .select('id, title, lyrics, corpus_id')
      .eq('artist_id', artist.id)
      .not('lyrics', 'is', null)
      .neq('lyrics', '');

    // SPRINT IC-1: Criar mapa de corpus_id → normalized_name
    const corpusIds = [...new Set(songs?.filter(s => s.corpus_id).map(s => s.corpus_id) || [])];
    let corpusMap = new Map<string, string>();
    
    if (corpusIds.length > 0) {
      const { data: corpora } = await supabaseClient
        .from('corpora')
        .select('id, normalized_name')
        .in('id', corpusIds);
      
      corpora?.forEach(c => corpusMap.set(c.id, c.normalized_name));
    }
    
    logger.info('Corpus map loaded', { corpusIds: corpusIds.length, mappings: corpusMap.size });

    if (songsError || !songs || songs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          jobId: null,
          message: 'Nenhuma música com letra encontrada',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular total de palavras
    let totalWords = 0;
    for (const song of songs) {
      const words = tokenizeLyrics(song.lyrics);
      totalWords += words.length;
    }

    logger.info('Músicas carregadas', { count: songs.length, totalWords });

    // Criar job
    const { data: newJob, error: jobError } = await supabaseClient
      .from('semantic_annotation_jobs')
      .insert({
        artist_id: artist.id,
        artist_name: artist.name,
        status: 'processando',
        total_songs: songs.length,
        total_words: totalWords,
        processed_words: 0,
        cached_words: 0,
        new_words: 0,
        current_song_index: 0,
        current_word_index: 0,
        chunk_size: CHUNK_SIZE,
        chunks_processed: 0,
        last_chunk_at: new Date(Date.now() - 5000).toISOString(), // 5s no passado para passar na validação anti-duplicação do primeiro chunk
      })
      .select()
      .single();

    if (jobError || !newJob) {
      throw new Error('Erro ao criar job: ' + jobError?.message);
    }

    logger.info('Job criado', { jobId: newJob.id });

    // Retornar job_id imediatamente
    const response = new Response(
      JSON.stringify({
        success: true,
        jobId: newJob.id,
        artistId: artist.id,
        artistName: artist.name,
        totalSongs: songs.length,
        totalWords,
        message: 'Processamento iniciado em chunks (batch optimized)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Iniciar primeiro chunk assincronamente
    processChunk(supabaseClient, newJob.id, { songIndex: 0, wordIndex: 0 }, logger)
      .catch(err => logger.error('First chunk failed', err));

    return response;

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao processar request', errorObj);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorObj.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * FASE 4: Processar chunk com batch Gemini e cache inline
 */
async function processChunk(
  supabase: any,
  jobId: string,
  continueFrom: { songIndex: number; wordIndex: number },
  logger: any
) {
  const startTime = Date.now();
  
  logger.info('processChunk iniciado', { 
    jobId, 
    continueFrom,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Proteção anti-duplicação: verificar se outro chunk está rodando
    const { data: lockCheck } = await supabase
      .from('semantic_annotation_jobs')
      .update({ last_chunk_at: new Date().toISOString() })
      .eq('id', jobId)
      .lte('last_chunk_at', new Date(Date.now() - 5000).toISOString()) // FASE 4: 5s threshold (compensar remoção do setTimeout delay)
      .select('id')
      .single();

    if (!lockCheck) {
      logger.warn('Outro chunk já está processando, abortando', { jobId });
      return;
    }

    // Buscar job
    const { data: job, error: jobError } = await supabase
      .from('semantic_annotation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job não encontrado');
    }

    // Verificar se job foi cancelado
    if (job.status === 'cancelado') {
      logger.info('Job foi cancelado, abortando chunk', { jobId });
      return;
    }

    // Buscar artista e músicas
    const { data: artist } = await supabase
      .from('artists')
      .select('id, name')
      .eq('id', job.artist_id)
      .single();

    // SPRINT IC-1: Buscar músicas com corpus_id para detecção dinâmica
    const { data: songs } = await supabase
      .from('songs')
      .select('id, title, lyrics, corpus_id')
      .eq('artist_id', job.artist_id)
      .not('lyrics', 'is', null)
      .neq('lyrics', '');

    // SPRINT IC-1: Criar mapa de corpus_id → normalized_name
    const corpusIds = [...new Set(songs?.filter((s: any) => s.corpus_id).map((s: any) => s.corpus_id) || [])];
    let corpusMap = new Map<string, string>();
    
    if (corpusIds.length > 0) {
      const { data: corpora } = await supabase
        .from('corpora')
        .select('id, normalized_name')
        .in('id', corpusIds);
      
      corpora?.forEach((c: any) => corpusMap.set(c.id, c.normalized_name));
    }
    
    logger.info('Corpus map loaded for chunk', { corpusIds: corpusIds.length, mappings: corpusMap.size });

    if (!songs || songs.length === 0) {
      throw new Error('Nenhuma música encontrada');
    }

    logger.info('Processando chunk (batch optimized)', { 
      jobId, 
      songIndex: continueFrom.songIndex, 
      wordIndex: continueFrom.wordIndex,
      totalSongs: songs.length 
    });

    let processedInChunk = 0;
    let cachedInChunk = 0;
    let newInChunk = 0;
    let currentSongIndex = continueFrom.songIndex;
    let currentWordIndex = continueFrom.wordIndex;

    // FASE 4: Coletar palavras do chunk para batch processing
    // SPRINT IC-1: Adicionado corpusType para detecção dinâmica de corpus
    const chunkWords: Array<{
      palavra: string;
      lema: string;
      pos: string;
      posDetalhada: string;
      contextoEsquerdo: string;
      contextoDireito: string;
      songId: string;
      songIndex: number;
      wordIndex: number;
      isMWE: boolean;
      posSource?: string;
      posConfidence?: number;
      corpusType: string; // SPRINT IC-1: Corpus dinâmico
    }> = [];

    // Coletar até CHUNK_SIZE palavras usando tokenizador com MWEs
    outer: for (let s = currentSongIndex; s < songs.length; s++) {
      const song = songs[s];
      const tokensWithMWE = tokenizeLyricsWithMWEs(song.lyrics);

      for (let w = (s === currentSongIndex ? currentWordIndex : 0); w < tokensWithMWE.length; w++) {
        if (chunkWords.length >= CHUNK_SIZE) {
          break outer;
        }

        const tokenData = tokensWithMWE[w];
        const contextoEsquerdo = tokensWithMWE.slice(Math.max(0, w - 5), w).map(t => t.token).join(' ');
        const contextoDireito = tokensWithMWE.slice(w + 1, Math.min(tokensWithMWE.length, w + 6)).map(t => t.token).join(' ');

        // SPRINT IC-1: Determinar corpusType dinamicamente a partir da música
        const songCorpusType = song.corpus_id ? (corpusMap.get(song.corpus_id) || 'gaucho') : 'gaucho';
        
        chunkWords.push({
          palavra: tokenData.token,
          lema: tokenData.token, // Será enriquecido via POS pipeline
          pos: tokenData.pos || 'UNKNOWN',
          posDetalhada: 'UNKNOWN',
          contextoEsquerdo,
          contextoDireito,
          songId: song.id,
          songIndex: s,
          wordIndex: w,
          isMWE: tokenData.isMWE,
          corpusType: songCorpusType, // SPRINT IC-1: Corpus dinâmico
        });
      }
    }

    logger.info('Chunk coletado', { wordsCount: chunkWords.length });

    // ========== FASE 4: ENRIQUECIMENTO POS ==========
    // Enriquecer tokens com POS usando pipeline híbrido 4-layer
    logger.info('Iniciando enriquecimento POS', { tokensCount: chunkWords.length });
    
    const tokensToEnrich = chunkWords.map(w => ({
      palavra: w.palavra,
      contextoEsquerdo: w.contextoEsquerdo,
      contextoDireito: w.contextoDireito,
    }));
    
    const enrichedTokens = await enrichTokensWithPOS(tokensToEnrich);
    const posCoverage = calculatePOSCoverage(enrichedTokens);
    
    logger.info('POS enrichment completo', {
      coverage: `${posCoverage.coverageRate.toFixed(1)}%`,
      sources: posCoverage.sourceDistribution,
      avgConfidence: posCoverage.avgConfidence.toFixed(2),
    });
    
    // Mesclar POS data com chunkWords
    chunkWords.forEach((word, idx) => {
      const posData = enrichedTokens[idx];
      if (posData && posData.pos !== 'UNKNOWN') {
        word.lema = posData.lema;
        word.pos = posData.pos;
        word.posDetalhada = posData.posDetalhada;
        word.posSource = posData.source;
        word.posConfidence = posData.confidence;
      }
    });

    // FASE 1+2: Classificar palavras usando MWEs + stopwords + cache de dois níveis
    const wordsNeedingGemini: typeof chunkWords = [];

    for (const wordData of chunkWords) {
      // 🏆 PRIORIDADE MÁXIMA: MWEs conhecidas (0ms, 99% confiança)
      if (wordData.isMWE) {
        const mweClassification = MWE_SEMANTIC_DOMAINS[wordData.palavra.toLowerCase()];
        if (mweClassification) {
          const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
          await saveWithArtistSong(
            supabase,
            wordData.palavra,
            hash,
            mweClassification.tagset,
            mweClassification.confianca,
            'mwe_rule',
            mweClassification.justificativa,
            artist.id,
            wordData.songId,
            [],
            false,
            wordData.corpusType // SPRINT IC-1: Corpus dinâmico
          );
          cachedInChunk++; // Contabilizar como "cached" (zero cost)
          processedInChunk++;
          logger.info('MWE detectada e classificada', { 
            mwe: wordData.palavra, 
            tagset: mweClassification.tagset 
          });
          continue;
        }
      }
      
      // FASE 1: Safe stopwords (0ms)
      const safeResult = classifySafeStopword(wordData.palavra);
      if (safeResult) {
        const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
        await saveWithArtistSong(
          supabase,
          wordData.palavra,
          hash,
          safeResult.tagset_codigo,
          safeResult.confianca,
          'rule_based',
          safeResult.justificativa,
          artist.id,
          wordData.songId,
          [],
          false,
          wordData.corpusType // SPRINT IC-1: Corpus dinâmico
        );
        cachedInChunk++; // Contabilizar como "cached" (zero cost)
        processedInChunk++;
        continue;
      }

      // FASE 2: Cache nível 1 (palavra apenas)
      const wordCache = await checkWordOnlyCache(supabase, wordData.palavra);
      if (wordCache) {
        const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
        await saveWithArtistSong(
          supabase,
          wordData.palavra,
          hash,
          wordCache.tagset_codigo,
          wordCache.confianca,
          'cache',
          wordCache.justificativa || 'Cache palavra',
          artist.id,
          wordData.songId,
          [],
          false,
          wordData.corpusType // SPRINT IC-1: Corpus dinâmico
        );
        await supabase.rpc('increment_semantic_cache_hit', { cache_id: wordCache.id });
        cachedInChunk++;
        processedInChunk++;
        continue;
      }

      // FASE 2: Cache nível 2 (palavra + contexto)
      const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
      const contextCache = await checkContextCache(supabase, wordData.palavra, hash);
      if (contextCache) {
        await saveWithArtistSong(
          supabase,
          wordData.palavra,
          hash,
          contextCache.tagset_codigo,
          contextCache.confianca,
          'cache',
          contextCache.justificativa || 'Cache contexto',
          artist.id,
          wordData.songId,
          [],
          false,
          wordData.corpusType // SPRINT IC-1: Corpus dinâmico
        );
        await supabase.rpc('increment_semantic_cache_hit', { cache_id: contextCache.id });
        cachedInChunk++;
        processedInChunk++;
        continue;
      }

      // Regras do léxico dialetal
      const lexiconRule = await getLexiconRule(wordData.palavra);
      if (lexiconRule) {
        await saveWithArtistSong(
          supabase,
          wordData.palavra,
          hash,
          lexiconRule.tagset_codigo,
          lexiconRule.confianca,
          'rule_based',
          lexiconRule.justificativa,
          artist.id,
          wordData.songId,
          lexiconRule.tagsets_alternativos || [],
          lexiconRule.is_polysemous || false,
          wordData.corpusType // SPRINT IC-1: Corpus dinâmico
        );
        newInChunk++;
        processedInChunk++;
        continue;
      }

      // Herança de sinônimos
      const inherited = await inheritDomainFromSynonyms(wordData.palavra);
      if (inherited) {
        await saveWithArtistSong(
          supabase,
          wordData.palavra,
          hash,
          inherited.tagset_codigo,
          inherited.confianca,
          'rule_based',
          inherited.justificativa || 'Herdado de sinônimo',
          artist.id,
          wordData.songId,
          [],
          false,
          wordData.corpusType // SPRINT IC-1: Corpus dinâmico
        );
        newInChunk++;
        processedInChunk++;
        continue;
      }

      // FASE 4: Regras baseadas em POS (com dados enriquecidos do pipeline)
      // Agora temos POS tags confiáveis via 4-layer pipeline!
      const posBasedRule = applyPOSBasedRules(wordData.pos, wordData.posDetalhada);
      if (posBasedRule) {
        await saveWithArtistSong(
          supabase,
          wordData.palavra,
          hash,
          posBasedRule.tagset_codigo,
          posBasedRule.confianca,
          'pos_based',
          `POS-based rule: ${wordData.pos} → ${posBasedRule.tagset_codigo} (source: ${wordData.posSource})`,
          artist.id,
          wordData.songId,
          [],
          false,
          wordData.corpusType // SPRINT IC-1: Corpus dinâmico
        );
        newInChunk++;
        processedInChunk++;
        continue;
      }
      
      // Não classificada por nenhuma regra → precisa Gemini
      wordsNeedingGemini.push(wordData);
    }

    logger.info('Pré-processamento concluído', {
      total: chunkWords.length,
      cached: cachedInChunk,
      needingGemini: wordsNeedingGemini.length,
    });

    // FASE 3: Processar palavras restantes em batches via Gemini
    if (wordsNeedingGemini.length > 0) {
      for (let i = 0; i < wordsNeedingGemini.length; i += BATCH_SIZE) {
        const batch = wordsNeedingGemini.slice(i, i + BATCH_SIZE);
        
        try {
          const batchResults = await batchClassifyWithGemini(batch, logger);

          // Salvar resultados do batch
          for (const wordData of batch) {
            const result = batchResults.get(wordData.palavra.toLowerCase());
            
            if (result) {
              const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
              await saveWithArtistSong(
                supabase,
                wordData.palavra,
                hash,
                result.tagset_codigo,
                result.confianca,
                result.fonte,
                result.justificativa || 'Gemini batch',
                artist.id,
                wordData.songId
              );
              newInChunk++;
              processedInChunk++;
            } else {
              // Fallback: tentar individual
              try {
                const individualResult = await callSemanticAnnotatorSingle(
                  wordData.palavra,
                  wordData.contextoEsquerdo,
                  wordData.contextoDireito,
                  logger
                );
                
                if (individualResult) {
                  const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
                  await saveWithArtistSong(
                    supabase,
                    wordData.palavra,
                    hash,
                    individualResult.tagset_codigo,
                    individualResult.confianca,
                    individualResult.fonte,
                    individualResult.justificativa || 'Gemini individual',
                    artist.id,
                    wordData.songId,
                    individualResult.tagsets_alternativos || [],
                    individualResult.is_polysemous || false,
                    wordData.corpusType // SPRINT IC-1: Corpus dinâmico
                  );
                  newInChunk++;
                }
                processedInChunk++;
              } catch (err) {
                logger.warn('Erro individual fallback', { palavra: wordData.palavra, error: err });
                processedInChunk++;
              }
            }
          }
        } catch (batchError) {
          logger.error('Erro no batch Gemini', batchError);
          // Fallback: processar individualmente
          for (const wordData of batch) {
            try {
              const result = await callSemanticAnnotatorSingle(
                wordData.palavra,
                wordData.contextoEsquerdo,
                wordData.contextoDireito,
                logger
              );
              
              if (result) {
                const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
                await saveWithArtistSong(
                  supabase,
                  wordData.palavra,
                  hash,
                  result.tagset_codigo,
                  result.confianca,
                  result.fonte,
                  result.justificativa || 'Gemini fallback',
                  artist.id,
                  wordData.songId,
                  result.tagsets_alternativos || [],
                  result.is_polysemous || false,
                  wordData.corpusType // SPRINT IC-1: Corpus dinâmico
                );
                newInChunk++;
              }
              processedInChunk++;
            } catch (err) {
              logger.warn('Erro em fallback individual', { palavra: wordData.palavra, error: err });
              processedInChunk++;
            }
          }
        }
      }
    }

    // Atualizar posição atual
    if (chunkWords.length > 0) {
      const lastWord = chunkWords[chunkWords.length - 1];
      currentSongIndex = lastWord.songIndex;
      currentWordIndex = lastWord.wordIndex + 1;
      
      // Se terminou a música, avançar para próxima
      const currentSongWords = tokenizeLyrics(songs[currentSongIndex].lyrics);
      if (currentWordIndex >= currentSongWords.length) {
        currentSongIndex++;
        currentWordIndex = 0;
      }
    }

    // Atualizar progresso no job
    const totalProcessed = job.processed_words + processedInChunk;
    const totalCached = job.cached_words + cachedInChunk;
    const totalNew = job.new_words + newInChunk;
    const chunksProcessed = job.chunks_processed + 1;

    const isCompleted = totalProcessed >= job.total_words;

    logger.info('Salvando progresso', { 
      jobId, 
      processedInChunk, 
      totalProcessed, 
      cachedInChunk, 
      newInChunk,
      currentSongIndex,
      currentWordIndex,
      wordsPerSecond: processedInChunk / ((Date.now() - startTime) / 1000)
    });

    await supabase
      .from('semantic_annotation_jobs')
      .update({
        status: isCompleted ? 'concluido' : 'processando',
        processed_words: totalProcessed,
        cached_words: totalCached,
        new_words: totalNew,
        current_song_index: currentSongIndex,
        current_word_index: currentWordIndex,
        chunks_processed: chunksProcessed,
        tempo_fim: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', jobId);

    // FASE 5: Métricas de validação
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const wordsPerSecond = processedInChunk / elapsedSeconds;
    const dictionaryHits = cachedInChunk;
    const geminiFallbacks = wordsNeedingGemini.length;
    const insigniasAssigned = totalProcessed - cachedInChunk; // Estimativa

    logger.info('✅ FASE 5: Chunk concluído com métricas', { 
      jobId, 
      processedInChunk, 
      totalProcessed, 
      isCompleted,
      chunksProcessed,
      elapsedSeconds,
      wordsPerSecond: wordsPerSecond.toFixed(2),
      // Métricas de otimização:
      dictionaryHits,
      geminiFallbacks,
      geminiPercentage: ((geminiFallbacks / processedInChunk) * 100).toFixed(1) + '%',
      cacheHitRate: ((dictionaryHits / processedInChunk) * 100).toFixed(1) + '%',
      insigniasAssigned
    });

    // Se não terminou, auto-invocar para próximo chunk
    if (!isCompleted) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      logger.info('Iniciando auto-invocação', { 
        jobId, 
        nextSongIndex: currentSongIndex, 
        nextWordIndex: currentWordIndex 
      });
      
      // Fire-and-forget: executar fetch diretamente sem setTimeout (que não funciona em Edge Functions)
      fetch(`${SUPABASE_URL}/functions/v1/annotate-artist-songs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          continueFrom: {
            songIndex: currentSongIndex,
            wordIndex: currentWordIndex,
          }
        }),
      })
      .then(response => {
        if (response.ok) {
          logger.info('Auto-invocação bem-sucedida', { jobId });
        } else {
          logger.warn('Auto-invocação falhou', { jobId, status: response.status });
        }
      })
      .catch(err => {
        logger.error('Auto-invoke failed', err);
        // Marcar job como pausado se auto-invocação falhar
        supabase
          .from('semantic_annotation_jobs')
          .update({ status: 'pausado' })
          .eq('id', jobId)
          .then(() => logger.warn('Job marcado como pausado', { jobId }));
      });
      
      logger.info('Auto-invocação disparada (fire-and-forget)', { jobId });
    }

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro no processamento do chunk', errorObj, { jobId });

    await supabase
      .from('semantic_annotation_jobs')
      .update({
        status: 'erro',
        erro_mensagem: errorObj.message,
        tempo_fim: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

// ============= UTILITY FUNCTIONS =============

/**
 * Tokenizador simples (sem MWEs)
 * Usado internamente por tokenizeLyricsWithMWEs
 * FASE 3: Normaliza texto e divide por espaços E hífens
 */
function simpleTokenize(text: string): string[] {
  // FASE 3: Normalizar texto antes de tokenizar
  const normalized = normalizeText(text);
  
  return normalized
    .toLowerCase()
    .split(/[\s\-]+/) // Dividir por espaços E hífens
    .map(w => w.replace(/[^\wáàâãéèêíïóôõöúçñ]/gi, ''))
    .filter(w => w.length > 1);
}

/**
 * NOVO: Tokenizador com detecção de MWEs (Multi-Word Expressions)
 * Prioriza expressões compostas antes da tokenização individual
 * 
 * @returns Array de tokens com flag isMWE e POS opcional
 */
function tokenizeLyricsWithMWEs(lyrics: string): Array<{
  token: string;
  isMWE: boolean;
  pos?: string;
}> {
  const lyricsLower = lyrics.toLowerCase();
  const mwes = detectGauchoMWEs(lyricsLower);
  
  const result: Array<{ token: string; isMWE: boolean; pos?: string }> = [];
  let currentIndex = 0;
  
  // Processar MWEs em ordem de aparição
  for (const mwe of mwes) {
    // Tokenizar texto antes da MWE
    if (mwe.startIndex > currentIndex) {
      const beforeText = lyricsLower.substring(currentIndex, mwe.startIndex);
      const beforeTokens = simpleTokenize(beforeText);
      beforeTokens.forEach(t => result.push({ token: t, isMWE: false }));
    }
    
    // Adicionar MWE como token único
    result.push({
      token: mwe.text,
      isMWE: true,
      pos: mwe.pos,
    });
    
    currentIndex = mwe.endIndex;
  }
  
  // Tokenizar texto restante após última MWE
  if (currentIndex < lyricsLower.length) {
    const afterText = lyricsLower.substring(currentIndex);
    const afterTokens = simpleTokenize(afterText);
    afterTokens.forEach(t => result.push({ token: t, isMWE: false }));
  }
  
  return result.filter(t => t.token.length > 1);
}

/**
 * LEGACY: Mantido para compatibilidade com outras funções
 * Usa tokenizador simples sem MWEs
 */
function tokenizeLyrics(lyrics: string): string[] {
  return simpleTokenize(lyrics);
}

async function hashContext(left: string, right: string): Promise<string> {
  const combined = `${left}|${right}`.toLowerCase();
  const msgUint8 = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Cache Nível 1: palavra apenas (alta confiança + não-polissêmica)
 */
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
  
  // Verificar se é polissêmica
  const { count } = await supabase
    .from('semantic_disambiguation_cache')
    .select('*', { count: 'exact', head: true })
    .eq('palavra', palavraNorm)
    .neq('tagset_codigo', wordCache.tagset_codigo);
  
  if (count && count > 0) return null;
  
  return wordCache;
}

/**
 * Cache Nível 2: palavra + contexto
 */
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
 * Regras contextuais (copiadas de annotate-semantic-domain)
 */
function applyContextualRules(palavra: string, lema?: string, pos?: string) {
  const lemaNorm = (lema || palavra).toLowerCase();
  
  if (isContextDependent(lemaNorm)) {
    return null;
  }
  
  const sentimentos = ['saudade', 'amor', 'paixão', 'dor', 'alegria', 'tristeza', 'verso', 'sonho'];
  if (sentimentos.includes(lemaNorm)) {
    return {
      tagset_codigo: 'SE',
      confianca: 0.98,
      fonte: 'rule_based',
      justificativa: 'Sentimento universal',
    };
  }

  const natureza = ['sol', 'lua', 'estrela', 'céu', 'campo', 'rio', 'vento', 'chuva', 'pampa', 'coxilha', 'várzea'];
  if (natureza.includes(lemaNorm)) {
    return {
      tagset_codigo: 'NA',
      confianca: 0.98,
      fonte: 'rule_based',
      justificativa: 'Elemento natural',
    };
  }

  if (pos && ['ADP', 'DET', 'CONJ', 'SCONJ', 'PRON'].includes(pos)) {
    return {
      tagset_codigo: 'MG',
      confianca: 0.99,
      fonte: 'rule_based',
      justificativa: 'Marcador gramatical',
    };
  }

  if (pos === 'VERB') {
    return {
      tagset_codigo: 'AP',
      confianca: 0.90,
      fonte: 'rule_based',
      justificativa: 'Verbo → Atividades',
    };
  }

  if (pos === 'ADJ') {
    return {
      tagset_codigo: 'EQ',
      confianca: 0.85,
      fonte: 'rule_based',
      justificativa: 'Adjetivo → Qualidades',
    };
  }

  return null;
}

/**
 * FASE 4: Regras baseadas em POS enriquecido via 4-layer pipeline
 * Prioridade ALTA: ~40% de redução em chamadas Gemini
 * 
 * Agora temos POS tags confiáveis de:
 * - Layer 1: VA Grammar (60% coverage, 100% accuracy)
 * - Layer 2: spaCy (30% coverage, ~95% accuracy)
 * - Layer 3: Gutenberg (5% coverage, ~92% accuracy)
 * - Layer 4: Gemini Flash (5% coverage, ~88% accuracy)
 */
function applyPOSBasedRules(
  pos: string,
  posDetalhada: string
): { tagset_codigo: string; confianca: number; justificativa: string } | null {
  
  // Verbos → Ações (AC)
  if (pos === 'VERB' || posDetalhada?.startsWith('V')) {
    return {
      tagset_codigo: 'AC',
      confianca: 0.90,
      justificativa: `Verbo via POS pipeline → Ações e Processos`,
    };
  }
  
  // Adjetivos → Qualidades/Sentimentos (EQ)
  if (pos === 'ADJ' || posDetalhada === 'ADJ') {
    return {
      tagset_codigo: 'EQ',
      confianca: 0.85,
      justificativa: `Adjetivo via POS pipeline → Estados e Qualidades`,
    };
  }
  
  // Substantivos próprios → Indivíduo (SH)
  if (posDetalhada === 'PROPN' || pos === 'PROPN') {
    return {
      tagset_codigo: 'SH',
      confianca: 0.88,
      justificativa: `Nome próprio via POS pipeline → Indivíduo`,
    };
  }
  
  // Advérbios → Marcadores Gramaticais
  if (pos === 'ADV' || posDetalhada === 'ADV') {
    return {
      tagset_codigo: 'MG',
      confianca: 0.92,
      justificativa: `Advérbio via POS pipeline → Marcadores Gramaticais`,
    };
  }
  
  // Marcadores gramaticais (preposições, conjunções, determinantes)
  if (['ADP', 'DET', 'CONJ', 'CCONJ', 'SCONJ', 'PART', 'PRON'].includes(pos)) {
    return {
      tagset_codigo: 'MG',
      confianca: 0.95,
      justificativa: `Marcador gramatical (${pos}) via POS pipeline`,
    };
  }
  
  return null;
}

/**
 * FASE 3: Interface com contexto do dicionário
 */
interface WordWithDictContext {
  palavra: string;
  lema: string;
  pos: string;
  contextoEsquerdo: string;
  contextoDireito: string;
  // NOVOS CAMPOS DICIONÁRIO:
  dictDefinicao?: string;
  dictClasse?: string;
  dictOrigem?: string;
  existeNoDicionario: boolean;
}

/**
 * FASE 3: Enriquecer palavras com contexto do dicionário antes de enviar ao Gemini
 */
async function enrichWordsWithDictionary(
  words: Array<{ palavra: string; lema: string; pos: string; contextoEsquerdo: string; contextoDireito: string }>,
  logger: any
): Promise<WordWithDictContext[]> {
  const { getLexiconRule } = await import('../_shared/semantic-rules-lexicon.ts');
  
  const enriched: WordWithDictContext[] = [];
  for (const w of words) {
    const rule = await getLexiconRule(w.palavra);
    enriched.push({
      ...w,
      existeNoDicionario: !!rule?.existeNoDicionario,
      dictDefinicao: rule?.definicaoAbreviada,
      dictClasse: rule?.classeGramatical,
      dictOrigem: rule?.origemPrimaria,
    });
  }
  
  logger.info('FASE 3: Palavras enriquecidas com dicionário', { 
    total: words.length, 
    comDicionario: enriched.filter(w => w.existeNoDicionario).length 
  });
  
  return enriched;
}

/**
 * FASE 3: Batch classify com Gemini + contexto do dicionário
 */
async function batchClassifyWithGemini(
  palavras: Array<{ palavra: string; lema: string; pos: string; contextoEsquerdo: string; contextoDireito: string }>,
  logger: any
) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurado');
  }

  // FASE 3: Enriquecer com contexto do dicionário
  const palavrasEnriquecidas = await enrichWordsWithDictionary(palavras, logger);

  const palavrasList = palavrasEnriquecidas.map((p, i) => {
    let info = `${i + 1}. Palavra: "${p.palavra}"`;
    
    // FASE 3: Adicionar contexto do dicionário se disponível
    if (p.existeNoDicionario) {
      info += ` [📚 DICIONÁRIO GAÚCHO]`;
      if (p.dictClasse) info += ` | Classe: ${p.dictClasse}`;
      if (p.dictDefinicao) info += ` | Def: "${p.dictDefinicao}"`;
      if (p.dictOrigem) info += ` | Origem: ${p.dictOrigem}`;
    }
    
    info += ` | Lema: "${p.lema}" | POS: ${p.pos}`;
    const sentenca = `${p.contextoEsquerdo} **${p.palavra}** ${p.contextoDireito}`.trim();
    info += ` | Contexto: "${sentenca}"`;
    return info;
  }).join('\n');

  const prompt = `Você é um especialista em análise semântica de texto. Classifique CADA palavra no CÓDIGO MAIS ESPECÍFICO disponível (N2, N3, N4 quando aplicável, senão N1).

**INSTRUÇÃO CRÍTICA:** Sempre retorne o código MAIS ESPECÍFICO possível. Se a palavra se encaixa em um subdomínio N2/N3/N4, USE ESSE CÓDIGO, não apenas N1.

**14 DOMÍNIOS SEMÂNTICOS N1 (use apenas se não há subdomínio específico):**
- AB (Abstrações): ideias abstratas, conceitos filosóficos, valores morais
- AC (Ações e Processos): verbos de ação física concreta (andar, pegar, construir, olhar, falar)
- AP (Atividades e Práticas Sociais): trabalho, alimentação, vestuário, lazer, transporte
- CC (Cultura e Conhecimento): arte, educação, religião, ciência, comunicação
- EL (Estruturas e Lugares): construções, locais físicos, espaços (galpão, rancho, estância)
- EQ (Estados, Qualidades e Medidas): adjetivos, características, tempo, dimensões
- MG (Marcadores Gramaticais): artigos, preposições, conjunções, palavras funcionais
- NA (Natureza e Paisagem): flora, fauna, clima, geografia, elementos naturais
- NC (Não Classificado): use apenas se nenhum domínio se aplica
- OA (Objetos e Artefatos): ferramentas, utensílios, equipamentos, vestimenta
- SB (Saúde e Bem-Estar): doenças humanas/animais, tratamentos, bem-estar, saúde mental
- SE (Sentimentos): amor, saudade, alegria, tristeza, emoções
- SH (Indivíduo): pessoa, corpo humano, características humanas, identidade (gaúcho, prenda)
- SP (Sociedade e Organização Política): governo, lei, relações sociais, política

**SUBDOMÍNIOS ESPECÍFICOS N2/N3/N4 (PRIORIZE ESTES quando aplicável):**

**Ações e Processos (AC):**
- AC.MD (Movimento): andar, cavalgar, galopar, trotar, caminhar, correr, voar
- AC.MD.LOC (Locomoção Humana): andar, correr, pular, dançar
- AC.MD.MON (Montaria): cavalgar, montar, galopar, trotar
- AC.MI (Manipulação de Objetos): pegar, segurar, laçar, domar, arrear
- AC.MI.PEG (Pegar/Segurar): pegar, agarrar, segurar, soltar
- AC.MI.FOR (Força Aplicada): laçar, domar, puxar, empurrar

**Atividades e Práticas (AP):**
- AP.TRA (Trabalho): campear, tropear, tosquiar, marcar
- AP.TRA.RUR (Trabalho Rural): campear, tropear, marcar, castrar, tosquiar
- AP.ALI (Alimentação): mate, chimarrão, churrasco, carreteiro, charque
- AP.ALI.BEB (Bebidas): mate, chimarrão, vinho, cachaça
- AP.ALI.COM (Comidas): churrasco, carreteiro, charque, arroz
- AP.VES (Vestuário): bombacha, bota, poncho, lenço, chapéu
- AP.LAZ (Lazer): fandango, rodeio, vanerão, trova, payada
- AP.TRA.COM (Comércio): vender, comprar, trocar, negociar

**Natureza e Paisagem (NA):**
- NA.FAU (Fauna): cavalo, gado, ovelha, potro, égua, gateado, tordilho, cachorro
- NA.GEO (Geografia): coxilha, várzea, pampa, campanha, fronteira, planície
- NA.FLO (Flora): árvore, erva, capim, mato, flor
- NA.CLI (Clima): chuva, sol, vento, frio, calor

**Objetos e Artefatos (OA):**
- OA.FER (Ferramentas): arreio, espora, laço, facão, machado, martelo
- OA.ARM (Armas): revólver, faca, espada, pistola
- OA.UTD (Utensílios Domésticos): cuia, bomba, panela, prato

**Saúde (SB):**
- SB.05 (Saúde Animal): veterinário, vermífugo, doença animal
- SB.05.01 (Doenças Animais): cinomose, raiva, febre aftosa
- SB.05.02 (Tratamentos Veterinários): vermífugo, castração, vacina animal
- SB.05.02.01 (Medicamentos Veterinários): vermífugo, antibiótico animal

**Estruturas (EL):**
- EL.RUR (Estruturas Rurais): galpão, rancho, estância, mangueira, curral, cercado

**Sentimentos (SE):**
- SE (Sentimentos): saudade, amor, paixão, dor, alegria, tristeza, querência

**EXEMPLOS DE CLASSIFICAÇÃO CORRETA:**
- "chimarrão" → AP.ALI.BEB (não apenas AP ou AP.ALI)
- "galpão" → EL.RUR (não apenas EL)
- "cavalo" → NA.FAU (não apenas NA)
- "vermífugo" → SB.05.02.01 (não apenas SB ou SB.05)
- "laçar" → AC.MI.FOR (não apenas AC ou AC.MI)

**PALAVRAS A CLASSIFICAR:**
${palavrasList}

**RETORNE JSON ARRAY com o código MAIS ESPECÍFICO disponível (ordem idêntica):**
[
  {"palavra": "palavra1", "tagset_codigo": "XX.YY.ZZ", "confianca": 0.95, "justificativa": "razão específica"},
  {"palavra": "palavra2", "tagset_codigo": "AA.BB", "confianca": 0.90, "justificativa": "razão"},
  ...
]`;

  const timer = logger.startTimer();
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Você é um classificador semântico preciso. Retorne APENAS JSON array válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  timer.end({ operation: 'gemini_batch_classify', count: palavras.length });

  if (!response.ok) {
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    logger.error('Batch response sem JSON', { content });
    return new Map();
  }

  const results = JSON.parse(jsonMatch[0]);
  const resultMap = new Map();

  for (const r of results) {
    if (r.palavra && r.tagset_codigo && typeof r.confianca === 'number') {
      resultMap.set(r.palavra.toLowerCase(), {
        tagset_codigo: r.tagset_codigo,
        tagsets_alternativos: r.tagsets_alternativos || [],
        is_polysemous: r.is_polysemous || false,
        confianca: r.confianca,
        fonte: 'gemini_flash',
        justificativa: r.justificativa || 'Batch',
      });
    }
  }

  return resultMap;
}

/**
 * Fallback: classificação individual via Gemini
 */
async function callSemanticAnnotatorSingle(
  palavra: string,
  contextoEsquerdo: string,
  contextoDireito: string,
  logger: any
) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/annotate-semantic-domain`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      palavra,
      contexto_esquerdo: contextoEsquerdo,
      contexto_direito: contextoDireito,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.success ? data.result : null;
}

/**
 * FASE 2: Cache global em memória para dialectal_lexicon
 * Previne N queries por chunk (99% redução de queries)
 */
let dialectalCache: Map<string, {
  origemPrimaria?: string;
  origemRegionalista?: string[];
  influenciaPlatina?: boolean;
}> | null = null;

async function loadDialectalCacheForInsignias(supabase: any) {
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
  
  console.log(`✅ FASE 2: Dialectal cache loaded: ${dialectalCache.size} entradas`);
  return dialectalCache;
}

/**
 * FASE 2: Inferir insígnias culturais usando cache em memória (zero queries por palavra)
 * Sprint IC-2: Mapeamento expandido de origens regionais
 */
async function inferCulturalInsignias(
  palavra: string,
  corpusType: string,
  supabase: any
): Promise<string[]> {
  const cache = await loadDialectalCacheForInsignias(supabase);
  const dialectal = cache.get(palavra.toLowerCase());
  const insignias: string[] = [];
  
  // Mapeamento de origem_primaria para insígnias
  const origemPrimariaMap: Record<string, string> = {
    'BRAS': 'Brasileiro',
    'PLAT': 'Platino',
    'PORT': 'Lusitano',
    'ESP': 'Platino',      // Espanhol → influência platina
    'IND': 'Indígena',
    'AME': 'Indígena',     // Ameríndio → Indígena
    'AFR': 'Afro-Brasileiro',
  };
  
  // Estados/regiões que mapeiam para Nordestino
  const regionaisNordeste = [
    'NORDESTE', 'nordeste', 'nordestino',
    'BA', 'CE', 'PE', 'PB', 'PI', 'AL', 'SE', 'RN', 'MA',
    'Bahia', 'Ceará', 'Pernambuco', 'Paraíba', 'Piauí', 
    'Alagoas', 'Sergipe', 'Rio Grande do Norte', 'Maranhão',
    'sertão', 'sertanejo', 'cangaço'
  ];
  
  // Estados/regiões que mapeiam para Gaúcho
  const regionaisGaucho = [
    'RS', 'Rio Grande do Sul', 'gaúcho', 'gaucho',
    'campeiro', 'fronteira', 'pampa', 'campanha',
    'missioneiro', 'charqueada', 'estância'
  ];
  
  // Estados/regiões que mapeiam para Caipira
  const regionaisCaipira = [
    'SP', 'MG', 'GO', 'MS', 'MT', 'PR',
    'São Paulo', 'Minas Gerais', 'Goiás', 'Mato Grosso', 'Paraná',
    'caipira', 'interior', 'sertão paulista', 'roceiro'
  ];
  
  // Termos que indicam influência platina
  const termosPlatinosRegionais = [
    'platino', 'rio-platense', 'castelhano', 'uruguaio', 'argentino',
    'fronteiriço', 'pampeano'
  ];
  
  if (dialectal) {
    // 1. Mapear origem_primaria
    if (dialectal.origemPrimaria && origemPrimariaMap[dialectal.origemPrimaria]) {
      const insignia = origemPrimariaMap[dialectal.origemPrimaria];
      if (!insignias.includes(insignia)) {
        insignias.push(insignia);
      }
    }
    
    // 2. Mapear origem_regionalista (pode ter múltiplas)
    if (dialectal.origemRegionalista && dialectal.origemRegionalista.length > 0) {
      for (const origem of dialectal.origemRegionalista) {
        const origemLower = origem.toLowerCase();
        
        // Verificar Nordestino
        if (regionaisNordeste.some(r => origemLower.includes(r.toLowerCase()) || r.toLowerCase().includes(origemLower))) {
          if (!insignias.includes('Nordestino')) {
            insignias.push('Nordestino');
          }
        }
        
        // Verificar Gaúcho
        if (regionaisGaucho.some(r => origemLower.includes(r.toLowerCase()) || r.toLowerCase().includes(origemLower))) {
          if (!insignias.includes('Gaúcho')) {
            insignias.push('Gaúcho');
          }
        }
        
        // Verificar Caipira
        if (regionaisCaipira.some(r => origemLower.includes(r.toLowerCase()) || r.toLowerCase().includes(origemLower))) {
          if (!insignias.includes('Caipira')) {
            insignias.push('Caipira');
          }
        }
        
        // Verificar Platino via regionais
        if (termosPlatinosRegionais.some(r => origemLower.includes(r.toLowerCase()))) {
          if (!insignias.includes('Platino')) {
            insignias.push('Platino');
          }
        }
      }
    }
    
    // 3. Influência platina explícita
    if (dialectal.influenciaPlatina && !insignias.includes('Platino')) {
      insignias.push('Platino');
    }
    
    // REMOVIDO: Não marcar automaticamente como Gaúcho só por estar no dicionário
    // O dicionário dialectal contém palavras de múltiplas regiões
  }
  
  // 4. Insígnia do corpus de origem (sempre adicionar se não existir)
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

async function saveWithArtistSong(
  supabase: any,
  palavra: string,
  contextoHash: string,
  tagsetCodigo: string,
  confianca: number,
  fonte: string,
  justificativa: string,
  artistId: string,
  songId: string,
  tagsetsAlternativos: string[] = [],
  isPolysemous: boolean = false,
  corpusType: string = 'gaucho'
): Promise<void> {
  // Inferir insígnias culturais
  const insignias = await inferCulturalInsignias(palavra, corpusType, supabase);
  
  await supabase.from('semantic_disambiguation_cache').upsert({
    palavra: palavra.toLowerCase(),
    contexto_hash: contextoHash,
    tagset_codigo: tagsetCodigo,
    tagsets_alternativos: tagsetsAlternativos,
    is_polysemous: isPolysemous,
    insignias_culturais: insignias,
    confianca,
    fonte,
    justificativa,
    artist_id: artistId,
    song_id: songId,
  }, {
    onConflict: 'palavra,contexto_hash',
    ignoreDuplicates: false
  });
  
  // FASE 4: Salvar atribuição com UPSERT (previne duplicatas)
  if (insignias.length > 0) {
    await supabase.from('cultural_insignia_attribution').upsert(
      insignias.map((insignia: string) => ({
        palavra: palavra.toLowerCase(),
        insignia,
        fonte: fonte,
        tipo_atribuicao: 'automatico',
        confianca: confianca,
        metadata: { corpus_type: corpusType, tagset: tagsetCodigo }
      })),
      { onConflict: 'palavra,insignia', ignoreDuplicates: true }
    );
  }
}
