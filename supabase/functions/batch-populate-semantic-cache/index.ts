/**
 * 🚀 BATCH POPULATE SEMANTIC CACHE
 * 
 * FASE 4: Pré-processa palavras de alta frequência para popular o cache semântico
 * Objetivo: Cache pré-aquecido com 2000+ palavras, reduz latência em anotações futuras
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchProgress {
  totalWords: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  currentWord: string;
  status: 'processing' | 'completed' | 'error';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const logger = createEdgeLogger('batch-populate-semantic-cache', requestId);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { limit = 2000, startOffset = 0 } = await req.json();

    logger.info('Iniciando batch processing', { limit, startOffset });

    // 1️⃣ Buscar top palavras do dialectal_lexicon (ordenadas por relevância)
    const { data: dialectalWords, error: dialectalError } = await supabaseClient
      .from('dialectal_lexicon')
      .select('verbete_normalizado, classe_gramatical')
      .not('verbete_normalizado', 'is', null)
      .order('confianca_extracao', { ascending: false })
      .range(startOffset, startOffset + Math.floor(limit / 2) - 1);

    if (dialectalError) {
      throw new Error(`Erro ao buscar dialectal_lexicon: ${dialectalError.message}`);
    }

    // 2️⃣ Buscar top palavras do gutenberg_lexicon
    const { data: gutenbergWords, error: gutenbergError } = await supabaseClient
      .from('gutenberg_lexicon')
      .select('verbete_normalizado, classe_gramatical')
      .not('verbete_normalizado', 'is', null)
      .order('verbete_normalizado')
      .range(startOffset, startOffset + Math.floor(limit / 2) - 1);

    if (gutenbergError) {
      throw new Error(`Erro ao buscar gutenberg_lexicon: ${gutenbergError.message}`);
    }

    // Combinar e deduplicate
    const allWords = [
      ...(dialectalWords || []),
      ...(gutenbergWords || []),
    ];

    const uniqueWords = Array.from(
      new Map(allWords.map(w => [w.verbete_normalizado.toLowerCase(), w])).values()
    );

    logger.info('Palavras carregadas', { 
      dialectal: dialectalWords?.length || 0,
      gutenberg: gutenbergWords?.length || 0,
      unique: uniqueWords.length 
    });

    // 3️⃣ Processar cada palavra
    const progress: BatchProgress = {
      totalWords: uniqueWords.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      currentWord: '',
      status: 'processing',
    };

    const BATCH_SIZE = 50;
    const RATE_LIMIT_DELAY_MS = 200; // 5 req/s

    for (let i = 0; i < uniqueWords.length; i += BATCH_SIZE) {
      const batch = uniqueWords.slice(i, i + BATCH_SIZE);

      for (const wordEntry of batch) {
        const palavra = wordEntry.verbete_normalizado.toLowerCase();
        progress.currentWord = palavra;

        try {
          // Verificar se já está no cache
          const { data: existing } = await supabaseClient
            .from('semantic_disambiguation_cache')
            .select('id')
            .eq('palavra', palavra)
            .maybeSingle();

          if (existing) {
            progress.skipped++;
            progress.processed++;
            console.log(`⏭️  [${progress.processed}/${progress.totalWords}] "${palavra}" já no cache`);
            continue;
          }

          // Chamar annotate-semantic-domain
          const annotationResponse = await supabaseClient.functions.invoke('annotate-semantic-domain', {
            body: {
              palavra,
              lema: palavra,
              pos: null,
              contexto_esquerdo: '',
              contexto_direito: '',
            },
          });

          if (annotationResponse.error) {
            throw new Error(annotationResponse.error.message);
          }

          progress.successful++;
          console.log(`✅ [${progress.processed + 1}/${progress.totalWords}] "${palavra}" → ${annotationResponse.data.result.tagset_codigo}`);

        } catch (error) {
          progress.failed++;
          logger.warn('Falha ao processar palavra', { 
            palavra, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }

        progress.processed++;

        // Rate limiting
        if (progress.processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        }
      }

      // Log de progresso a cada batch
      logger.info('Batch progress', {
        processed: progress.processed,
        successful: progress.successful,
        failed: progress.failed,
        skipped: progress.skipped,
        percentComplete: ((progress.processed / progress.totalWords) * 100).toFixed(1),
      });
    }

    progress.status = 'completed';
    progress.currentWord = '';

    logger.info('Batch processing concluído', {
      totalWords: progress.totalWords,
      successful: progress.successful,
      failed: progress.failed,
      skipped: progress.skipped,
    });

    return new Response(
      JSON.stringify({
        success: true,
        progress,
        message: `Processamento concluído: ${progress.successful} palavras anotadas, ${progress.skipped} já no cache, ${progress.failed} falhas`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro no batch processing', errorObj);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorObj.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
