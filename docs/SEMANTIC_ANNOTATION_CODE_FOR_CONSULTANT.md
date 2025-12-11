# Código Completo - Sistema de Anotação Semântica

**Gerado em:** 2025-12-11  
**Propósito:** Documentação para consultoria especializada

---

## Índice

1. [Diagnóstico do Problema Atual](#diagnóstico-do-problema-atual)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Backend - Edge Functions](#backend---edge-functions)
   - [annotate-artist-songs](#1-annotate-artist-songsindexts)
   - [annotate-semantic-domain](#2-annotate-semantic-domainindexts)
   - [annotate-corpus](#3-annotate-corpusindexts)
4. [Frontend - Hooks](#frontend---hooks)
   - [useSemanticAnnotationJob](#1-usesemanticannotationjobts)
   - [useSemanticCoverage](#2-usesemanticcoveragets)
   - [useSemanticAnnotationStats](#3-usesemanticannotationstatsts)
5. [Frontend - Componentes](#frontend---componentes)
   - [TabSemanticAnnotation](#1-tabsemanticannotationtsx)
   - [SemanticAnnotationJobsPanel](#2-semanticannotationjobspaneltsx)
6. [Tabelas do Banco de Dados](#tabelas-do-banco-de-dados)

---

## Diagnóstico do Problema Atual

### Sintoma
Jobs de anotação semântica travam silenciosamente após processar alguns chunks.

### Causa Raiz Identificada
1. Auto-invocação falha silenciosamente após o primeiro chunk
2. O job permanece em status "processando" indefinidamente
3. Não há mecanismo de detecção de jobs "stuck" (parados há muito tempo)
4. O retry de 30 segundos via `EdgeRuntime.waitUntil` não marca o job como pausado

### Solução Proposta
1. Corrigir `detectAndHandleAbandonedJobs` para detectar jobs em "processando" sem atividade por 30+ minutos
2. Adicionar retry automático no orquestrador quando `last_chunk_at` > 10 minutos
3. Adicionar heartbeat timeout no frontend para detectar jobs parados

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
├─────────────────────────────────────────────────────────────────────┤
│  TabSemanticAnnotation.tsx                                          │
│  └── SemanticAnnotationJobsPanel.tsx                               │
│      ├── useSemanticAnnotationStats (polling 5s)                   │
│      └── useSemanticAnnotationJob (gerenciar jobs)                 │
│  └── SemanticCoverageDashboard.tsx                                 │
│      └── useSemanticCoverage (MVs: corpus, artist, quality)        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Edge Functions)                    │
├─────────────────────────────────────────────────────────────────────┤
│  annotate-corpus                                                    │
│  └── Orquestra anotação de corpus inteiro (artista por artista)    │
│      └── Invoca annotate-artist-songs para cada artista            │
│                                                                     │
│  annotate-artist-songs                                              │
│  ├── Cria job em semantic_annotation_jobs                          │
│  ├── Processa em chunks de 100 palavras                            │
│  ├── Pipeline: MWE → Stopwords → Cache → Lexicon → POS → Gemini   │
│  └── Auto-invoca próximo chunk (retry 3x com exponential backoff)  │
│                                                                     │
│  annotate-semantic-domain                                           │
│  └── Classifica palavra individual ou batch via:                   │
│      ├── Cache de 2 níveis (palavra-only, palavra+contexto)        │
│      ├── Semantic Lexicon (pré-classificado)                       │
│      ├── Regras morfológicas                                       │
│      ├── Léxico dialetal                                           │
│      ├── Herança de sinônimos                                      │
│      ├── Regras contextuais (POS-based)                           │
│      └── Gemini Flash (fallback final)                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                    │
├─────────────────────────────────────────────────────────────────────┤
│  semantic_annotation_jobs       (status, progress, timestamps)     │
│  corpus_annotation_jobs         (orchestration por corpus)          │
│  semantic_disambiguation_cache  (palavras classificadas)           │
│  semantic_tagset               (hierarquia de domínios N1-N4)      │
│  semantic_coverage_by_corpus   (MV - cobertura por corpus)         │
│  semantic_coverage_by_artist   (MV - cobertura por artista)        │
│  semantic_quality_metrics      (MV - métricas de qualidade)        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Backend - Edge Functions

### 1. annotate-artist-songs/index.ts

**Localização:** `supabase/functions/annotate-artist-songs/index.ts`  
**Linhas:** 1594  
**Responsabilidade:** Processar anotação semântica de todas as músicas de um artista

```typescript
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
  // ... mais MWEs
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

    // ========== VERIFICAR JOB ATIVO EXISTENTE ==========
    const { data: existingJob } = await supabaseClient
      .from('semantic_annotation_jobs')
      .select('id, status, processed_words, total_words')
      .eq('artist_id', artist.id)
      .in('status', ['processando', 'pendente', 'pausado'])
      .order('tempo_inicio', { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      return new Response(
        JSON.stringify({
          success: true,
          jobId: existingJob.id,
          artistId: artist.id,
          artistName: artist.name,
          isExisting: true,
          status: existingJob.status,
          progress: existingJob.total_words > 0 
            ? Math.round((existingJob.processed_words / existingJob.total_words) * 100) 
            : 0,
          message: `Job existente encontrado (${existingJob.status})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar músicas com letra E corpus_id para detecção dinâmica de corpus
    const { data: songs, error: songsError } = await supabaseClient
      .from('songs')
      .select('id, title, lyrics, corpus_id')
      .eq('artist_id', artist.id)
      .not('lyrics', 'is', null)
      .neq('lyrics', '');

    // Criar mapa de corpus_id → normalized_name
    const corpusIds = [...new Set(songs?.filter(s => s.corpus_id).map(s => s.corpus_id) || [])];
    let corpusMap = new Map<string, string>();
    
    if (corpusIds.length > 0) {
      const { data: corpora } = await supabaseClient
        .from('corpora')
        .select('id, normalized_name')
        .in('id', corpusIds);
      
      corpora?.forEach(c => corpusMap.set(c.id, c.normalized_name));
    }

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
        last_chunk_at: new Date(Date.now() - 5000).toISOString(),
      })
      .select()
      .single();

    if (jobError || !newJob) {
      throw new Error('Erro ao criar job: ' + jobError?.message);
    }

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

    // Iniciar primeiro chunk com tratamento de erro robusto
    processChunk(supabaseClient, newJob.id, { songIndex: 0, wordIndex: 0 }, logger)
      .catch(async (err) => {
        logger.error('First chunk failed', err);
        await supabaseClient
          .from('semantic_annotation_jobs')
          .update({ 
            status: 'erro', 
            erro_mensagem: `Primeiro chunk falhou: ${err instanceof Error ? err.message : String(err)}`,
            tempo_fim: new Date().toISOString() 
          })
          .eq('id', newJob.id);
      });

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
 * Processar chunk com batch Gemini e cache inline
 */
async function processChunk(
  supabase: any,
  jobId: string,
  continueFrom: { songIndex: number; wordIndex: number },
  logger: any
) {
  const startTime = Date.now();
  
  try {
    // Proteção anti-duplicação: verificar se outro chunk está rodando
    const { data: lockCheck } = await supabase
      .from('semantic_annotation_jobs')
      .update({ last_chunk_at: new Date().toISOString() })
      .eq('id', jobId)
      .lte('last_chunk_at', new Date(Date.now() - 5000).toISOString())
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

    const { data: songs } = await supabase
      .from('songs')
      .select('id, title, lyrics, corpus_id')
      .eq('artist_id', job.artist_id)
      .not('lyrics', 'is', null)
      .neq('lyrics', '');

    if (!songs || songs.length === 0) {
      throw new Error('Nenhuma música encontrada');
    }

    let processedInChunk = 0;
    let cachedInChunk = 0;
    let newInChunk = 0;
    let currentSongIndex = continueFrom.songIndex;
    let currentWordIndex = continueFrom.wordIndex;

    // Coletar palavras do chunk para batch processing
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
      corpusType: string;
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

        const songCorpusType = song.corpus_id ? (corpusMap.get(song.corpus_id) || 'gaucho') : 'gaucho';
        
        chunkWords.push({
          palavra: tokenData.token,
          lema: tokenData.token,
          pos: tokenData.pos || 'UNKNOWN',
          posDetalhada: 'UNKNOWN',
          contextoEsquerdo,
          contextoDireito,
          songId: song.id,
          songIndex: s,
          wordIndex: w,
          isMWE: tokenData.isMWE,
          corpusType: songCorpusType,
        });
      }
    }

    // Verificar se não há mais palavras
    if (chunkWords.length === 0) {
      if (continueFrom.songIndex >= songs.length) {
        await supabase
          .from('semantic_annotation_jobs')
          .update({
            status: 'concluido',
            tempo_fim: new Date().toISOString(),
          })
          .eq('id', jobId);
        return;
      }
    }

    // Enriquecimento POS (modo otimizado - skipPOS=true)
    const tokensToEnrich = chunkWords.map(w => ({
      palavra: w.palavra,
      contextoEsquerdo: w.contextoEsquerdo,
      contextoDireito: w.contextoDireito,
    }));
    
    const enrichedTokens = await enrichTokensWithPOS(tokensToEnrich, { skipPOS: true });
    
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

    // PIPELINE DE CLASSIFICAÇÃO
    const wordsNeedingGemini: typeof chunkWords = [];

    for (const wordData of chunkWords) {
      // 1. PRIORIDADE MÁXIMA: MWEs conhecidas (0ms, 99% confiança)
      if (wordData.isMWE) {
        const mweClassification = MWE_SEMANTIC_DOMAINS[wordData.palavra.toLowerCase()];
        if (mweClassification) {
          const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
          await saveWithArtistSong(supabase, wordData.palavra, hash, mweClassification.tagset, 
            mweClassification.confianca, 'mwe_rule', mweClassification.justificativa,
            artist.id, wordData.songId, [], false, wordData.corpusType);
          cachedInChunk++;
          processedInChunk++;
          continue;
        }
      }
      
      // 2. Safe stopwords (0ms)
      const safeResult = classifySafeStopword(wordData.palavra);
      if (safeResult) {
        const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
        await saveWithArtistSong(supabase, wordData.palavra, hash, safeResult.tagset_codigo,
          safeResult.confianca, 'rule_based', safeResult.justificativa,
          artist.id, wordData.songId, [], false, wordData.corpusType);
        cachedInChunk++;
        processedInChunk++;
        continue;
      }

      // 3. Cache nível 1 (palavra apenas)
      const wordCache = await checkWordOnlyCache(supabase, wordData.palavra);
      if (wordCache) {
        const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
        await saveWithArtistSong(supabase, wordData.palavra, hash, wordCache.tagset_codigo,
          wordCache.confianca, 'cache', wordCache.justificativa || 'Cache palavra',
          artist.id, wordData.songId, [], false, wordData.corpusType);
        await supabase.rpc('increment_semantic_cache_hit', { cache_id: wordCache.id });
        cachedInChunk++;
        processedInChunk++;
        continue;
      }

      // 4. Cache nível 2 (palavra + contexto)
      const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
      const contextCache = await checkContextCache(supabase, wordData.palavra, hash);
      if (contextCache) {
        await saveWithArtistSong(supabase, wordData.palavra, hash, contextCache.tagset_codigo,
          contextCache.confianca, 'cache', contextCache.justificativa || 'Cache contexto',
          artist.id, wordData.songId, [], false, wordData.corpusType);
        await supabase.rpc('increment_semantic_cache_hit', { cache_id: contextCache.id });
        cachedInChunk++;
        processedInChunk++;
        continue;
      }

      // 5. Regras do léxico dialetal
      const lexiconRule = await getLexiconRule(wordData.palavra);
      if (lexiconRule) {
        await saveWithArtistSong(supabase, wordData.palavra, hash, lexiconRule.tagset_codigo,
          lexiconRule.confianca, 'rule_based', lexiconRule.justificativa,
          artist.id, wordData.songId, lexiconRule.tagsets_alternativos || [], 
          lexiconRule.is_polysemous || false, wordData.corpusType);
        newInChunk++;
        processedInChunk++;
        continue;
      }

      // 6. Herança de sinônimos
      const inherited = await inheritDomainFromSynonyms(wordData.palavra);
      if (inherited) {
        await saveWithArtistSong(supabase, wordData.palavra, hash, inherited.tagset_codigo,
          inherited.confianca, 'rule_based', inherited.justificativa || 'Herdado de sinônimo',
          artist.id, wordData.songId, [], false, wordData.corpusType);
        newInChunk++;
        processedInChunk++;
        continue;
      }

      // 7. Regras baseadas em POS
      const posBasedRule = applyPOSBasedRules(wordData.pos, wordData.posDetalhada);
      if (posBasedRule) {
        await saveWithArtistSong(supabase, wordData.palavra, hash, posBasedRule.tagset_codigo,
          posBasedRule.confianca, 'pos_based', 
          `POS-based rule: ${wordData.pos} → ${posBasedRule.tagset_codigo}`,
          artist.id, wordData.songId, [], false, wordData.corpusType);
        newInChunk++;
        processedInChunk++;
        continue;
      }
      
      // 8. Não classificada → precisa Gemini
      wordsNeedingGemini.push(wordData);
    }

    // PROCESSAR PALAVRAS VIA GEMINI (batches de 15)
    if (wordsNeedingGemini.length > 0) {
      for (let i = 0; i < wordsNeedingGemini.length; i += BATCH_SIZE) {
        const batch = wordsNeedingGemini.slice(i, i + BATCH_SIZE);
        
        try {
          const batchResults = await batchClassifyWithGemini(batch, logger);

          for (const wordData of batch) {
            const result = batchResults.get(wordData.palavra.toLowerCase());
            
            if (result) {
              const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
              await saveWithArtistSong(supabase, wordData.palavra, hash, result.tagset_codigo,
                result.confianca, result.fonte, result.justificativa || 'Gemini batch',
                artist.id, wordData.songId);
              newInChunk++;
              processedInChunk++;
            } else {
              // Fallback individual
              const individualResult = await callSemanticAnnotatorSingle(
                wordData.palavra, wordData.contextoEsquerdo, wordData.contextoDireito, logger
              );
              if (individualResult) {
                const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
                await saveWithArtistSong(supabase, wordData.palavra, hash, 
                  individualResult.tagset_codigo, individualResult.confianca, 
                  individualResult.fonte, individualResult.justificativa || 'Gemini individual',
                  artist.id, wordData.songId, [], false, wordData.corpusType);
                newInChunk++;
              }
              processedInChunk++;
            }
          }
        } catch (batchError) {
          logger.error('Erro no batch Gemini', batchError);
          // Fallback individual para todo o batch
          for (const wordData of batch) {
            try {
              const result = await callSemanticAnnotatorSingle(
                wordData.palavra, wordData.contextoEsquerdo, wordData.contextoDireito, logger
              );
              if (result) {
                const hash = await hashContext(wordData.contextoEsquerdo, wordData.contextoDireito);
                await saveWithArtistSong(supabase, wordData.palavra, hash, result.tagset_codigo,
                  result.confianca, result.fonte, result.justificativa || 'Gemini fallback',
                  artist.id, wordData.songId, [], false, wordData.corpusType);
                newInChunk++;
              }
              processedInChunk++;
            } catch (err) {
              processedInChunk++;
            }
          }
        }
      }
    }

    // Atualizar posição
    if (chunkWords.length > 0) {
      const lastWord = chunkWords[chunkWords.length - 1];
      currentSongIndex = lastWord.songIndex;
      currentWordIndex = lastWord.wordIndex + 1;
      
      const currentSongWords = tokenizeLyrics(songs[currentSongIndex].lyrics);
      if (currentWordIndex >= currentSongWords.length) {
        currentSongIndex++;
        currentWordIndex = 0;
      }
    }

    // Atualizar progresso
    const totalProcessed = job.processed_words + processedInChunk;
    const isCompleted = totalProcessed >= job.total_words || 
                        currentSongIndex >= songs.length ||
                        (chunkWords.length === 0 && continueFrom.songIndex >= songs.length);

    await supabase
      .from('semantic_annotation_jobs')
      .update({
        status: isCompleted ? 'concluido' : 'processando',
        processed_words: totalProcessed,
        cached_words: job.cached_words + cachedInChunk,
        new_words: job.new_words + newInChunk,
        current_song_index: currentSongIndex,
        current_word_index: currentWordIndex,
        chunks_processed: job.chunks_processed + 1,
        tempo_fim: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', jobId);

    // AUTO-INVOCAÇÃO com retry (se não terminou)
    if (!isCompleted) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      const MAX_RETRIES = 3;
      const BASE_DELAY_MS = 2000;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/annotate-artist-songs`, {
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
          });

          if (response.ok) {
            break; // Sucesso
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (err) {
          if (attempt === MAX_RETRIES) {
            // PROBLEMA CRÍTICO: Job fica pausado mas sem mecanismo de retry automático
            await supabase
              .from('semantic_annotation_jobs')
              .update({ 
                status: 'pausado',
                erro_mensagem: `Auto-invocação falhou após ${MAX_RETRIES} tentativas`
              })
              .eq('id', jobId);
          } else {
            // Exponential backoff
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
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

// ... (funções auxiliares: tokenizeLyrics, tokenizeLyricsWithMWEs, hashContext, 
//      checkWordOnlyCache, checkContextCache, saveWithArtistSong, 
//      applyPOSBasedRules, batchClassifyWithGemini, callSemanticAnnotatorSingle,
//      inferCulturalInsignias, etc.)
```

---

### 2. annotate-semantic-domain/index.ts

**Localização:** `supabase/functions/annotate-semantic-domain/index.ts`  
**Linhas:** 1399  
**Responsabilidade:** Classificar palavras individuais ou em batch

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
// ... imports

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID();
  const logger = createEdgeLogger('annotate-semantic-domain', requestId);
  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();

    // MODO BATCH: Detectar array de palavras
    if (Array.isArray(requestBody.words)) {
      return await handleBatchMode(requestBody, supabaseClient, logger, startTime);
    }

    // Modo singular
    const { palavra, lema, pos, contexto_esquerdo = '', contexto_direito = '' } = requestBody;

    // PIPELINE DE CLASSIFICAÇÃO:
    
    // 1. Safe stopwords (0ms, confiança 0.99)
    const safeStopword = classifySafeStopword(palavra);
    if (safeStopword) { /* salvar e retornar */ }

    // 2. Cache nível 1 (palavra apenas, alta confiança)
    const wordOnlyCache = await checkWordOnlyCache(supabaseClient, palavra);
    if (wordOnlyCache) { /* incrementar hit e retornar */ }
    
    // 3. Cache nível 2 (palavra + contexto para polissêmicas)
    const contextCache = await checkSemanticCache(supabaseClient, palavra, contextoHash);
    if (contextCache) { /* incrementar hit e retornar */ }

    // 4. Semantic Lexicon (pré-classificado)
    const lexiconResult = await getLexiconClassification(palavra.toLowerCase());
    if (lexiconResult) { /* salvar no cache e retornar */ }

    // 5. Regras morfológicas (zero-cost)
    if (hasMorphologicalPattern(palavra.toLowerCase())) {
      const morphResult = await applyMorphologicalRules(palavra.toLowerCase(), pos, getLexiconBase);
      if (morphResult) { /* salvar no cache e retornar */ }
    }

    // 6. Regras do léxico dialetal
    const lexiconRule = await getLexiconRule(palavra);
    if (lexiconRule) { /* salvar, propagar para sinônimos e retornar */ }

    // 7. Herança de sinônimos
    const inheritedDomain = await inheritDomainFromSynonyms(palavra);
    if (inheritedDomain) { /* salvar e retornar */ }

    // 8. Regras contextuais (fallback rápido)
    const ruleBasedResult = applyContextualRules(palavra, lema, pos);
    if (ruleBasedResult) { /* salvar, propagar e retornar */ }

    // 9. Gutenberg POS
    const gutenbergPOS = await getGutenbergPOS(palavra);
    if (gutenbergPOS) { /* mapear e retornar */ }

    // 10. Gemini Flash (fallback final)
    const geminiResult = await classifyWithGemini(palavra, lema, pos, contexto_esquerdo, contexto_direito, logger);
    
    // Salvar e retornar resultado

  } catch (error) {
    // Tratamento de erro
  }
});

/**
 * BATCH MODE HANDLER (OTIMIZADO)
 * FASE 4 OTIMIZAÇÕES:
 * - 4.1: Batch tagset lookup (1 query para N códigos)
 * - 4.2: Batch cache insert (1 upsert para N resultados)
 * - 4.3: Processamento paralelo controlado (concurrency=5)
 */
async function handleBatchMode(requestBody, supabaseClient, logger, startTime) {
  const { words, context = '' } = requestBody;

  // FASE 1: Processar palavras via pipeline rule-based (PARALELO)
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase().trim()).filter(Boolean))];
  const processedByRules = await processWordsWithRulesParallel(supabaseClient, uniqueWords, logger, 5);
  
  // FASE 2: Processar palavras restantes via Gemini Batch
  const geminiResults = new Map();
  // ... processar em batches de 15

  // FASE 3: Batch Tagset Lookup (1 query)
  const tagsetNomes = await getTagsetInfoBatch(supabaseClient, codigosParaBuscar);

  // FASE 4: Montar annotations
  // ...

  // FASE 5: Batch Cache Insert (1 operação)
  await saveToCacheBatch(supabaseClient, cacheEntries);

  return new Response(JSON.stringify({
    success: true,
    annotations,
    totalPalavras: words.length,
    processingTime: Date.now() - startTime
  }));
}
```

---

### 3. annotate-corpus/index.ts

**Localização:** `supabase/functions/annotate-corpus/index.ts`  
**Linhas:** 410  
**Responsabilidade:** Orquestrar anotação de corpus inteiro (artista por artista)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface AnnotateCorpusRequest {
  jobId?: string;        // Continuar job existente
  corpusId?: string;     // Criar novo job para este corpus
  corpusName?: string;   // Ou pelo nome
  action?: 'pause' | 'resume' | 'cancel';
}

const AUTO_INVOKE_DELAY_MS = 30000; // 30s entre verificações

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body: AnnotateCorpusRequest = await req.json();
    const { jobId, corpusId, corpusName, action } = body;

    // AÇÃO: Pausar, Retomar ou Cancelar
    if (jobId && action) {
      return await handleAction(supabase, jobId, action);
    }

    // MODO: Continuar job existente
    if (jobId && !action) {
      return await continueJob(supabase, jobId);
    }

    // MODO: Criar novo job
    if (corpusId || corpusName) {
      return await createNewJob(supabase, corpusId, corpusName);
    }

    return new Response(
      JSON.stringify({ error: 'corpusId, corpusName ou jobId obrigatório' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('annotate-corpus error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAction(supabase, jobId, action) {
  const statusMap = { pause: 'pausado', resume: 'processando', cancel: 'cancelado' };
  const newStatus = statusMap[action];
  
  await supabase.from('corpus_annotation_jobs').update({ 
    status: newStatus,
    tempo_fim: action === 'cancel' ? new Date().toISOString() : undefined
  }).eq('id', jobId);

  if (action === 'resume') {
    autoInvoke(supabase, jobId);
  }

  return new Response(JSON.stringify({ success: true, status: newStatus }));
}

async function createNewJob(supabase, corpusId, corpusName) {
  // Buscar corpus
  // Verificar se já existe job ativo
  // Buscar artistas do corpus
  // Criar job em corpus_annotation_jobs
  // Iniciar primeiro artista via annotate-artist-songs
  // Auto-invocar para próximo artista
}

async function continueJob(supabase, jobId) {
  // Buscar job
  // Verificar status do artista atual
  // Se concluído/erro, iniciar próximo artista
  // Se todos processados, marcar corpus como concluído
}

async function startNextArtist(supabase, jobId, artists, artistIndex) {
  const artist = artists[artistIndex];
  
  // Invocar annotate-artist-songs
  const { data: artistJobData } = await supabase.functions.invoke('annotate-artist-songs', {
    body: { artistId: artist.id },
  });

  // Atualizar job com artista atual
  await supabase.from('corpus_annotation_jobs').update({
    current_artist_id: artist.id,
    current_artist_name: artist.name,
    current_artist_job_id: artistJobData?.jobId || null,
  }).eq('id', jobId);

  // Auto-invocar para verificar próximo
  autoInvoke(supabase, jobId);
}

function autoInvoke(supabase, jobId) {
  // Usar EdgeRuntime.waitUntil para auto-invocação após resposta HTTP
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    EdgeRuntime.waitUntil(
      (async () => {
        await new Promise(resolve => setTimeout(resolve, AUTO_INVOKE_DELAY_MS));
        await supabase.functions.invoke('annotate-corpus', { body: { jobId } });
      })()
    );
  }
}
```

---

## Frontend - Hooks

### 1. useSemanticAnnotationJob.ts

**Localização:** `src/hooks/useSemanticAnnotationJob.ts`  
**Responsabilidade:** Gerenciar jobs de anotação semântica com polling e ETA

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useSemanticAnnotationJob');

interface SemanticAnnotationJob {
  id: string;
  artist_id: string;
  artist_name: string;
  status: string;
  total_songs: number;
  total_words: number;
  processed_words: number;
  cached_words: number;
  new_words: number;
  current_song_index: number;
  current_word_index: number;
  chunk_size: number;
  chunks_processed: number;
  last_chunk_at: string | null;
  tempo_inicio: string;
  tempo_fim: string | null;
  erro_mensagem: string | null;
}

interface UseSemanticAnnotationJobResult {
  job: SemanticAnnotationJob | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  progress: number;
  eta: string | null;
  wordsPerSecond: number | null;
  startJob: (artistName: string) => Promise<string | null>;
  cancelPolling: () => void;
  resumeJob: (jobId: string) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  checkExistingJob: (artistName: string) => Promise<SemanticAnnotationJob | null>;
  checkRecentlyCompleted: (artistName: string) => Promise<SemanticAnnotationJob | null>;
  isResuming: boolean;
}

export function useSemanticAnnotationJob(): UseSemanticAnnotationJobResult {
  const [job, setJob] = useState<SemanticAnnotationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<number | null>(null);

  const isProcessing = job?.status === 'iniciado' || job?.status === 'processando';
  const progress = job && job.total_words > 0 
    ? (job.processed_words / job.total_words) * 100 
    : 0;

  // Calcular velocidade e ETA
  const calculateETA = useCallback((): { eta: string | null; wordsPerSecond: number | null } => {
    if (!job || !isProcessing) return { eta: null, wordsPerSecond: null };

    const startTime = new Date(job.tempo_inicio).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;

    if (elapsedSeconds < 1 || job.processed_words === 0) {
      return { eta: null, wordsPerSecond: null };
    }

    const wordsPerSecond = job.processed_words / elapsedSeconds;
    const remainingWords = job.total_words - job.processed_words;
    const etaSeconds = remainingWords / wordsPerSecond;

    // Formatar ETA
    if (etaSeconds < 60) {
      return { eta: `~${Math.round(etaSeconds)}s`, wordsPerSecond };
    } else if (etaSeconds < 3600) {
      return { eta: `~${Math.round(etaSeconds / 60)}min`, wordsPerSecond };
    } else {
      const hours = Math.floor(etaSeconds / 3600);
      const mins = Math.round((etaSeconds % 3600) / 60);
      return { eta: `~${hours}h ${mins}min`, wordsPerSecond };
    }
  }, [job, isProcessing]);

  const { eta, wordsPerSecond } = calculateETA();

  const startJob = useCallback(async (artistName: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'annotate-artist-songs',
        { body: { artistName } }
      );

      if (invokeError) throw new Error(invokeError.message);
      if (!data.success || !data.jobId) throw new Error(data.error || 'Erro ao iniciar job');

      const jobId = data.jobId;
      await fetchJob(jobId);
      startPolling(jobId);

      return jobId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchJob = useCallback(async (jobId: string) => {
    const { data, error: fetchError } = await supabase
      .from('semantic_annotation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError) throw fetchError;

    setJob(data);

    // Se job terminou, parar polling
    if (data.status === 'concluido' || data.status === 'erro' || data.status === 'cancelado') {
      cancelPolling();
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    if (pollingIntervalId) clearInterval(pollingIntervalId);

    // Polling a cada 2 segundos
    const intervalId = window.setInterval(() => {
      fetchJob(jobId);
    }, 2000);

    setPollingIntervalId(intervalId);
  }, [pollingIntervalId, fetchJob]);

  const cancelPolling = useCallback(() => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  }, [pollingIntervalId]);
  
  const checkExistingJob = useCallback(async (artistName: string) => {
    const { data: activeJob } = await supabase
      .from('semantic_annotation_jobs')
      .select('*')
      .eq('artist_name', artistName)
      .in('status', ['processando', 'pausado'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return activeJob || null;
  }, []);
  
  const resumeJob = useCallback(async (jobId: string): Promise<void> => {
    if (isResuming) return;
    setIsResuming(true);
    
    try {
      const { data: jobData } = await supabase
        .from('semantic_annotation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (!jobData) throw new Error('Job não encontrado');
      
      // Definir last_chunk_at para 1 minuto atrás (passar na validação anti-duplicação)
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      await supabase
        .from('semantic_annotation_jobs')
        .update({ status: 'processando', last_chunk_at: oneMinuteAgo })
        .eq('id', jobId);
      
      setJob({ ...jobData, status: 'processando' });
      
      // Invocar Edge Function para continuar processamento
      await supabase.functions.invoke('annotate-artist-songs', {
        body: { 
          jobId,
          continueFrom: {
            songIndex: jobData.current_song_index,
            wordIndex: jobData.current_word_index,
          }
        }
      });
      
      startPolling(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao retomar job');
    } finally {
      setIsResuming(false);
    }
  }, [isResuming, startPolling]);
  
  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    await supabase
      .from('semantic_annotation_jobs')
      .update({ status: 'cancelado', tempo_fim: new Date().toISOString() })
      .eq('id', jobId);
    
    cancelPolling();
    setJob(null);
  }, [cancelPolling]);

  // Auto-resume ao montar se há job ativo salvo
  useEffect(() => {
    const savedJobId = localStorage.getItem('active-annotation-job-id');
    if (savedJobId && !job) {
      fetchJob(savedJobId);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
    };
  }, [pollingIntervalId]);

  return {
    job, isLoading, isProcessing, error, progress, eta, wordsPerSecond,
    startJob, cancelPolling, resumeJob, cancelJob, checkExistingJob,
    checkRecentlyCompleted, isResuming,
  };
}
```

---

### 2. useSemanticCoverage.ts

**Localização:** `src/hooks/useSemanticCoverage.ts`  
**Responsabilidade:** Buscar cobertura semântica via Materialized Views otimizadas

```typescript
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface CorpusCoverage {
  corpusId: string;
  corpusName: string;
  totalSongs: number;
  annotatedSongs: number;
  coveragePercent: number;
  totalWords: number;
  uniqueWords: number;
  avgConfidence: number;
}

export interface ArtistCoverage {
  artistId: string;
  artistName: string;
  corpusId: string | null;
  corpusName: string | null;
  totalSongs: number;
  annotatedSongs: number;
  coveragePercent: number;
  annotatedWords: number;
  ncCount: number;
  n2PlusCount: number;
  avgConfidence: number;
}

interface UseSemanticCoverageOptions {
  corpusFilter?: string;
  autoRefreshInterval?: number | false;
  enabled?: boolean;
}

export function useSemanticCoverage(options: UseSemanticCoverageOptions = {}) {
  const { corpusFilter, autoRefreshInterval = false, enabled = true } = options;
  const queryClient = useQueryClient();

  // Query 1: Cobertura por Corpus (3 linhas max)
  const corpusCoverageQuery = useQuery({
    queryKey: ['semantic-coverage-mv', 'corpus', corpusFilter],
    queryFn: async (): Promise<CorpusCoverage[]> => {
      const { data, error } = await supabase
        .from('semantic_coverage_by_corpus')
        .select('*')
        .order('corpus_name');
      
      if (error) throw error;
      
      return (data || []).map(row => ({
        corpusId: row.corpus_id,
        corpusName: row.corpus_name,
        totalSongs: row.total_songs,
        annotatedSongs: row.annotated_songs,
        coveragePercent: Number(row.coverage_percent),
        totalWords: row.total_words,
        uniqueWords: row.unique_words,
        avgConfidence: Number(row.avg_confidence),
      }));
    },
    enabled,
    refetchInterval: autoRefreshInterval || undefined,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Query 2: Cobertura por Artista (~900 linhas)
  const artistCoverageQuery = useQuery({
    queryKey: ['semantic-coverage-mv', 'artist', corpusFilter],
    queryFn: async (): Promise<ArtistCoverage[]> => {
      let query = supabase
        .from('semantic_coverage_by_artist')
        .select('*')
        .order('coverage_percent', { ascending: true });
      
      if (corpusFilter) {
        query = query.eq('corpus_id', corpusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(row => ({
        artistId: row.artist_id,
        artistName: row.artist_name,
        corpusId: row.corpus_id,
        corpusName: row.corpus_name,
        totalSongs: row.total_songs,
        annotatedSongs: row.annotated_songs,
        coveragePercent: Number(row.coverage_percent),
        annotatedWords: row.annotated_words,
        ncCount: row.nc_count,
        n2PlusCount: row.n2_plus_count,
        avgConfidence: Number(row.avg_confidence),
      }));
    },
    enabled,
    refetchInterval: autoRefreshInterval || undefined,
    staleTime: 60000,
  });

  // Query 3: Métricas de Qualidade (1 linha)
  const qualityMetricsQuery = useQuery({
    queryKey: ['semantic-coverage-mv', 'quality'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semantic_quality_metrics')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        return { totalCachedWords: 0, ncCount: 0, n2PlusCount: 0, n1OnlyCount: 0, avgConfidence: 0, highConfidencePercent: 0 };
      }
      
      return {
        totalCachedWords: data.total_cached_words,
        ncCount: data.nc_count,
        n2PlusCount: data.n2_plus_count,
        n1OnlyCount: data.n1_only_count,
        avgConfidence: Number(data.avg_confidence),
        highConfidencePercent: Number(data.high_confidence_percent),
      };
    },
    enabled,
    staleTime: 60000,
  });

  // Refresh local cache
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['semantic-coverage-mv'] });
  }, [queryClient]);

  // Refresh MVs no banco (via Edge Function)
  const refreshMVs = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('refresh-semantic-mvs');
      
      if (error || !data?.success) {
        queryClient.invalidateQueries({ queryKey: ['semantic-coverage-mv'] });
        toast.success('Cache atualizado (dados podem estar desatualizados)');
        return;
      }
      
      queryClient.invalidateQueries({ queryKey: ['semantic-coverage-mv'] });
      toast.success('Dados de cobertura atualizados');
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['semantic-coverage-mv'] });
      toast.success('Cache atualizado');
    }
  }, [queryClient]);

  // Global coverage
  const globalCoverage = corpusCoverageQuery.data?.reduce((acc, c) => {
    acc.totalSongs += c.totalSongs;
    acc.annotatedSongs += c.annotatedSongs;
    return acc;
  }, { totalSongs: 0, annotatedSongs: 0 });

  const globalCoveragePercent = globalCoverage?.totalSongs 
    ? Math.round((globalCoverage.annotatedSongs / globalCoverage.totalSongs) * 100 * 10) / 10
    : 0;

  return {
    corpusCoverage: corpusCoverageQuery.data || [],
    artistCoverage: artistCoverageQuery.data || [],
    qualityMetrics: qualityMetricsQuery.data,
    globalCoveragePercent,
    isLoading: corpusCoverageQuery.isLoading || artistCoverageQuery.isLoading,
    isRefreshing: corpusCoverageQuery.isFetching || artistCoverageQuery.isFetching,
    refresh,
    refreshMVs,
  };
}
```

---

### 3. useSemanticAnnotationStats.ts

**Localização:** `src/hooks/useSemanticAnnotationStats.ts`  
**Responsabilidade:** Estatísticas agregadas de jobs de anotação

```typescript
// Ver arquivo em src/hooks/useSemanticAnnotationStats.ts
// Resumo:
// - Busca jobs de semantic_annotation_jobs
// - Calcula contagens por status (processing, paused, completed, failed)
// - Calcula totalWordsAnnotated, totalWordsProcessed
// - Retorna activeJobs e recentJobs
// - Implementa real-time subscription para atualizações automáticas
```

---

## Frontend - Componentes

### 1. TabSemanticAnnotation.tsx

**Localização:** `src/components/music/catalog/TabSemanticAnnotation.tsx`

```tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, ChevronDown, RefreshCw, Loader2, FileText } from 'lucide-react';
import { useSemanticCoverage } from '@/hooks/useSemanticCoverage';
import { SemanticCoverageDashboard } from '../SemanticCoverageDashboard';
import { NCCurationPanel } from '@/components/admin/NCCurationPanel';
import { SemanticAnnotationJobsPanel } from './SemanticAnnotationJobsPanel';

interface TabSemanticAnnotationProps {
  isActive?: boolean;
}

export const TabSemanticAnnotation = React.memo(function TabSemanticAnnotation({
  isActive = true
}: TabSemanticAnnotationProps) {
  const [jobsOpen, setJobsOpen] = useState(true);
  const [coverageOpen, setCoverageOpen] = useState(true);
  const [ncOpen, setNcOpen] = useState(false);
  
  const { 
    globalCoveragePercent, 
    isLoading,
    isRefreshing,
    refresh,
    refreshMVs 
  } = useSemanticCoverage({ 
    enabled: isActive,
    autoRefreshInterval: false
  });

  if (!isActive) {
    return <div className="flex items-center justify-center py-8">
      <p className="text-muted-foreground">Selecione esta aba para ver a análise</p>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Botões de refresh */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar Cache
        </Button>
        <Button variant="default" size="sm" onClick={refreshMVs}>
          <Brain className="mr-2 h-4 w-4" />
          Recalcular Dados
        </Button>
      </div>

      {/* Painel de Jobs de Anotação Semântica */}
      <Collapsible open={jobsOpen} onOpenChange={setJobsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Jobs de Anotação Semântica</CardTitle>
                    <CardDescription>Gerencie e monitore jobs de anotação</CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${jobsOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <SemanticAnnotationJobsPanel isActive={isActive && jobsOpen} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dashboard de Cobertura Semântica */}
      <Collapsible open={coverageOpen} onOpenChange={setCoverageOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Cobertura Semântica</CardTitle>
                    <CardDescription>Visibilidade por corpus e artista</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isLoading && (
                    <Badge variant={globalCoveragePercent >= 50 ? 'default' : 'secondary'}>
                      {globalCoveragePercent}% anotado
                    </Badge>
                  )}
                  <ChevronDown className={`h-5 w-5 ${coverageOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <SemanticCoverageDashboard />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Painel de Curadoria NC */}
      <Collapsible open={ncOpen} onOpenChange={setNcOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <CardTitle className="text-lg">Curadoria de Palavras NC</CardTitle>
              <CardDescription>Revise e classifique palavras não categorizadas</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <NCCurationPanel />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
});
```

---

### 2. SemanticAnnotationJobsPanel.tsx

**Localização:** `src/components/music/catalog/SemanticAnnotationJobsPanel.tsx`

```tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Brain, Play, RefreshCw, Loader2, CheckCircle2, AlertCircle, Pause, Clock } from 'lucide-react';
import { useSemanticAnnotationStats } from '@/hooks/useSemanticAnnotationStats';
import { AnnotationJobsTable } from '@/components/admin/AnnotationJobsTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SemanticAnnotationJobsPanelProps {
  isActive?: boolean;
}

export function SemanticAnnotationJobsPanel({ isActive = true }: SemanticAnnotationJobsPanelProps) {
  const [selectedCorpus, setSelectedCorpus] = useState<string>('gaucho');
  const [isStartingAnnotation, setIsStartingAnnotation] = useState(false);

  const { stats, isLoading, isRefetching, refetch, lastUpdated } = useSemanticAnnotationStats({ 
    enabled: isActive,
    refetchInterval: 5000
  });

  const handleStartCorpusAnnotation = async () => {
    setIsStartingAnnotation(true);
    const toastId = toast.loading(`Iniciando anotação do corpus ${selectedCorpus}...`);

    try {
      const { data, error } = await supabase.functions.invoke('annotate-corpus', {
        body: { corpusName: selectedCorpus }
      });

      if (error) throw error;

      toast.success(`Anotação do corpus ${selectedCorpus} iniciada!`, { id: toastId });
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao iniciar anotação', { id: toastId });
    } finally {
      setIsStartingAnnotation(false);
    }
  };

  const globalProgress = stats.totalJobs > 0 
    ? Math.round((stats.completed / stats.totalJobs) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Jobs de Anotação Semântica</h3>
          <Badge variant="outline" className="text-xs">
            sync: {lastUpdated.toLocaleTimeString('pt-BR')}
          </Badge>
        </div>
        
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="col-span-2">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progresso Global</span>
              <span className="text-lg font-bold">{globalProgress}%</span>
            </div>
            <Progress value={globalProgress} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-2xl font-bold">{stats.processing}</span>
            </div>
            <p className="text-xs text-muted-foreground">Processando</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Pause className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold">{stats.paused}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pausados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold">{stats.failed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      {/* Controle de Iniciar Anotação por Corpus */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Iniciar Anotação por Corpus</CardTitle>
          <CardDescription>Processa sequencialmente todos os artistas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedCorpus} onValueChange={setSelectedCorpus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o corpus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaucho">🌾 Corpus Gaúcho</SelectItem>
                <SelectItem value="nordestino">🌵 Corpus Nordestino</SelectItem>
                <SelectItem value="sertanejo">🤠 Corpus Sertanejo</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleStartCorpusAnnotation} disabled={isStartingAnnotation || stats.processing > 0}>
              {isStartingAnnotation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Iniciar Anotação
            </Button>

            {stats.processing > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {stats.processing} job(s) em andamento
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Jobs Ativos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stats.activeJobs.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Jobs Ativos
              <Badge variant="default">{stats.activeJobs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnnotationJobsTable jobs={stats.activeJobs} onRefresh={refetch} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Nenhum job de anotação ativo no momento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Tabelas do Banco de Dados

### semantic_annotation_jobs

```sql
CREATE TABLE public.semantic_annotation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES artists(id),
  artist_name TEXT NOT NULL,
  status TEXT DEFAULT 'pendente', -- pendente, processando, pausado, concluido, erro, cancelado
  total_songs INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  processed_words INTEGER DEFAULT 0,
  cached_words INTEGER DEFAULT 0,
  new_words INTEGER DEFAULT 0,
  current_song_index INTEGER DEFAULT 0,
  current_word_index INTEGER DEFAULT 0,
  chunk_size INTEGER DEFAULT 100,
  chunks_processed INTEGER DEFAULT 0,
  last_chunk_at TIMESTAMPTZ,
  tempo_inicio TIMESTAMPTZ DEFAULT now(),
  tempo_fim TIMESTAMPTZ,
  erro_mensagem TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### corpus_annotation_jobs

```sql
CREATE TABLE public.corpus_annotation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  corpus_id UUID REFERENCES corpora(id),
  corpus_name TEXT NOT NULL,
  status TEXT DEFAULT 'pendente',
  total_artists INTEGER DEFAULT 0,
  processed_artists INTEGER DEFAULT 0,
  total_songs INTEGER DEFAULT 0,
  processed_songs INTEGER DEFAULT 0,
  total_words_estimated INTEGER DEFAULT 0,
  processed_words INTEGER DEFAULT 0,
  current_artist_id UUID REFERENCES artists(id),
  current_artist_name TEXT,
  current_artist_job_id UUID REFERENCES semantic_annotation_jobs(id),
  last_artist_at TIMESTAMPTZ,
  tempo_inicio TIMESTAMPTZ DEFAULT now(),
  tempo_fim TIMESTAMPTZ,
  erro_mensagem TEXT,
  is_cancelling BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### semantic_disambiguation_cache

```sql
CREATE TABLE public.semantic_disambiguation_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  palavra TEXT NOT NULL,
  contexto_hash TEXT,
  lema TEXT,
  pos TEXT,
  tagset_codigo TEXT,
  tagsets_alternativos TEXT[],
  is_polysemous BOOLEAN DEFAULT false,
  confianca NUMERIC(3,2),
  fonte TEXT, -- cache, gemini_flash, rule_based, mwe_rule, pos_based
  justificativa TEXT,
  hits_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  artist_id UUID,
  song_id UUID,
  insignias_culturais TEXT[],
  corpus_type TEXT,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(palavra, contexto_hash)
);
```

### Materialized Views

```sql
-- semantic_coverage_by_corpus (3 linhas)
-- semantic_coverage_by_artist (~900 linhas)
-- semantic_quality_metrics (1 linha)
```

---

## Notas para o Consultor

1. **Problema Principal:** Jobs de anotação semântica travam silenciosamente quando a auto-invocação falha. O job permanece em status "processando" indefinidamente.

2. **Pontos de Falha Identificados:**
   - `annotate-artist-songs/index.ts` linha ~880: retry 3x com exponential backoff, mas marca como "pausado" sem mecanismo de retry automático
   - Não há detecção de jobs "stuck" (parados há muito tempo)
   - `last_chunk_at` não é verificado para detectar abandono

3. **Soluções Sugeridas:**
   - Adicionar cron job ou trigger para detectar jobs em "processando" sem atividade por 30+ minutos
   - Implementar heartbeat durante processamento de chunks longos
   - Adicionar botão "Retomar" no frontend para jobs detectados como parados

4. **Métricas de Performance:**
   - CHUNK_SIZE: 100 palavras (4 min timeout Edge Function)
   - BATCH_SIZE: 15 palavras por chamada Gemini
   - Cache hit rate: ~60-80% (reduz chamadas Gemini)
   - Velocidade: ~2-10 palavras/segundo dependendo do cache
