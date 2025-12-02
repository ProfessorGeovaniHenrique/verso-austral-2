/**
 * Batch Seed Semantic Lexicon
 * 
 * Processa palavras candidatas em batches para popular semantic_lexicon:
 * 1. Aplica regras morfológicas (zero-cost)
 * 2. Processa restantes via Gemini em batches de 15
 * 3. Self-invoking pattern para evitar timeouts
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { applyMorphologicalRules, hasMorphologicalPattern } from '../_shared/morphological-rules.ts';
import { getLexiconBase, saveLexiconClassification, clearMemoryCache } from '../_shared/semantic-lexicon-lookup.ts';
import { classifyBatchWithGemini } from '../_shared/gemini-batch-classifier.ts';
import { classifyBatchWithGPT5 } from '../_shared/gpt5-batch-classifier.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchSeedRequest {
  mode?: 'analyze' | 'seed' | 'continue';
  limit?: number;
  offset?: number;
  source?: 'gutenberg' | 'dialectal' | 'all';
  job_id?: string;
}

interface BatchSeedingJob {
  id: string;
  status: string;
  source: string;
  total_candidates: number;
  processed_words: number;
  current_offset: number;
  morfologico_count: number;
  heranca_count: number;
  gemini_count: number;
  gpt5_count: number;
  failed_count: number;
}

const CHUNK_SIZE = 50; // Palavras por chunk
const GEMINI_BATCH_SIZE = 15; // Palavras por chamada Gemini
const DELAY_BETWEEN_BATCHES = 2000; // 2s entre batches Gemini

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const body: BatchSeedRequest = await req.json();
    const mode = body.mode || 'analyze';
    const limit = body.limit || CHUNK_SIZE;
    const offset = body.offset || 0;
    const source = body.source || 'all';

    console.log(`🚀 [batch-seed] INÍCIO - Mode: ${mode}, Limit: ${limit}, Offset: ${offset}, Source: ${source}`);

    // MODO ANALYZE: Identifica candidatos sem processar
    if (mode === 'analyze') {
      console.log(`🔍 [batch-seed] ANALYZE - Buscando candidatos...`);
      const candidates = await getCandidateWords(supabase, limit, offset, source);
      console.log(`✅ [batch-seed] ANALYZE - Encontrados ${candidates.length} candidatos`);
      
      return new Response(JSON.stringify({
        mode: 'analyze',
        total_candidates: candidates.length,
        candidates: candidates.slice(0, 20), // Sample
        next_offset: offset + limit,
        has_more: candidates.length === limit,
        recommendation: candidates.length > 0 ? 'use mode=seed to process' : 'no candidates found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // MODO SEED: Cria job e processa primeiro chunk
    if (mode === 'seed') {
      const startTime = Date.now();
      console.log(`⚙️ [batch-seed] SEED - Criando job...`);
      
      // Criar job no banco
      const { data: job, error: jobError } = await supabase
        .from('batch_seeding_jobs')
        .insert({
          status: 'processando',
          source,
          current_offset: 0,
          total_candidates: 0,
          processed_words: 0
        })
        .select()
        .single();
      
      if (jobError || !job) {
        console.error('❌ [batch-seed] Erro ao criar job:', jobError);
        throw new Error('Failed to create job');
      }
      
      console.log(`✅ [batch-seed] Job criado: ${job.id}`);
      
      const candidates = await getCandidateWords(supabase, limit, offset, source);
      console.log(`📥 [batch-seed] Candidatos obtidos: ${candidates.length}`);
      
      if (candidates.length === 0) {
        console.log(`🏁 [batch-seed] COMPLETE - Nenhum candidato`);
        await supabase
          .from('batch_seeding_jobs')
          .update({
            status: 'concluido',
            tempo_fim: new Date().toISOString()
          })
          .eq('id', job.id);
        
        clearMemoryCache();
        return new Response(JSON.stringify({
          mode: 'complete',
          job_id: job.id,
          message: 'No candidates to process',
          processing_time_ms: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Processar primeiro chunk
      console.log(`🔄 [batch-seed] Processando primeiro chunk...`);
      const results = await processWordsChunk(candidates, supabase);
      
      const morfologico = results.filter(r => r.fonte === 'morfologico').length;
      const heranca = results.filter(r => r.fonte === 'heranca').length;
      const gemini = results.filter(r => r.fonte === 'gemini_flash').length;
      const gpt5 = results.filter(r => r.fonte === 'gpt5').length;
      const failed = results.filter(r => !r.success).length;
      
      // Atualizar job com progresso
      await supabase
        .from('batch_seeding_jobs')
        .update({
          processed_words: candidates.length,
          current_offset: offset + candidates.length,
          morfologico_count: morfologico,
          heranca_count: heranca,
          gemini_count: gemini,
          gpt5_count: gpt5,
          failed_count: failed,
          last_chunk_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      console.log(`✅ [batch-seed] Primeiro chunk concluído: Morfológico=${morfologico}, Herança=${heranca}, Gemini=${gemini}, GPT-5=${gpt5}, Falhas=${failed}`);
      
      // Auto-invocar para próximo chunk
      const nextOffset = offset + candidates.length;
      const hasMore = candidates.length === limit;
      
      if (hasMore) {
        console.log(`🔁 [batch-seed] Auto-invocando próximo chunk: offset=${nextOffset}`);
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/batch-seed-semantic-lexicon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            mode: 'continue',
            limit,
            offset: nextOffset,
            source,
            job_id: job.id
          })
        }).catch(err => console.error('❌ [batch-seed] Auto-invoke failed:', err));
      } else {
        console.log(`🎉 [batch-seed] Único chunk processado, finalizando...`);
        await supabase
          .from('batch_seeding_jobs')
          .update({
            status: 'concluido',
            tempo_fim: new Date().toISOString()
          })
          .eq('id', job.id);
      }
      
      return new Response(JSON.stringify({
        mode: 'processing',
        job_id: job.id,
        chunk_processed: candidates.length,
        current_offset: offset,
        next_offset: nextOffset,
        has_more: hasMore,
        results: { morfologico, heranca, gemini, gpt5, failed },
        processing_time_ms: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // MODO CONTINUE: Processa chunk e auto-invoca para próximo
    if (mode === 'continue') {
      const startTime = Date.now();
      const job_id = body.job_id;
      
      if (!job_id) {
        throw new Error('job_id required for continue mode');
      }
      
      console.log(`⚙️ [batch-seed] CONTINUE - Job: ${job_id}, Offset: ${offset}, Limit: ${limit}`);
      
      const candidates = await getCandidateWords(supabase, limit, offset, source);
      console.log(`📥 [batch-seed] Candidatos obtidos: ${candidates.length}`);
      
      if (candidates.length === 0) {
        console.log(`🏁 [batch-seed] COMPLETE - Nenhum candidato restante`);
        
        // Marcar job como concluído
        await supabase
          .from('batch_seeding_jobs')
          .update({
            status: 'concluido',
            tempo_fim: new Date().toISOString()
          })
          .eq('id', job_id);
        
        clearMemoryCache();
        return new Response(JSON.stringify({
          mode: 'complete',
          job_id,
          message: 'All candidates processed',
          total_processed: offset,
          processing_time_ms: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Processar palavras
      console.log(`🔄 [batch-seed] Iniciando processamento de ${candidates.length} palavras...`);
      const results = await processWordsChunk(candidates, supabase);
      
      const morfologico = results.filter(r => r.fonte === 'morfologico').length;
      const heranca = results.filter(r => r.fonte === 'heranca').length;
      const gemini = results.filter(r => r.fonte === 'gemini_flash').length;
      const gpt5 = results.filter(r => r.fonte === 'gpt5').length;
      const failed = results.filter(r => !r.success).length;
      
      // Buscar dados atuais do job para somar
      const { data: currentJob } = await supabase
        .from('batch_seeding_jobs')
        .select('*')
        .eq('id', job_id)
        .single();
      
      if (currentJob) {
        // Atualizar job com progresso acumulado
        await supabase
          .from('batch_seeding_jobs')
          .update({
            processed_words: currentJob.processed_words + candidates.length,
            current_offset: offset + candidates.length,
            morfologico_count: currentJob.morfologico_count + morfologico,
            heranca_count: currentJob.heranca_count + heranca,
            gemini_count: currentJob.gemini_count + gemini,
            gpt5_count: currentJob.gpt5_count + gpt5,
            failed_count: currentJob.failed_count + failed,
            last_chunk_at: new Date().toISOString()
          })
          .eq('id', job_id);
      }
      
      console.log(`✅ [batch-seed] Chunk concluído: Morfológico=${morfologico}, Herança=${heranca}, Gemini=${gemini}, GPT-5=${gpt5}, Falhas=${failed}`);

      // Auto-invocar para próximo chunk
      const nextOffset = offset + candidates.length;
      const hasMore = candidates.length === limit;

      if (hasMore) {
        console.log(`🔁 [batch-seed] Auto-invocando próximo chunk: offset=${nextOffset}`);
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/batch-seed-semantic-lexicon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            mode: 'continue',
            limit,
            offset: nextOffset,
            source,
            job_id
          })
        }).catch(err => console.error('❌ [batch-seed] Auto-invoke failed:', err));
      } else {
        console.log(`🎉 [batch-seed] Último chunk processado, finalizando...`);
        await supabase
          .from('batch_seeding_jobs')
          .update({
            status: 'concluido',
            tempo_fim: new Date().toISOString()
          })
          .eq('id', job_id);
      }

      return new Response(JSON.stringify({
        mode: 'processing',
        job_id,
        chunk_processed: candidates.length,
        current_offset: offset,
        next_offset: nextOffset,
        has_more: hasMore,
        results: { morfologico, heranca, gemini, gpt5, failed },
        processing_time_ms: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid mode' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [batch-seed] ERRO FATAL:', error);
    console.error('❌ [batch-seed] Stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Se temos job_id, marcar como erro
    const body: BatchSeedRequest = await req.json().catch(() => ({}));
    if (body.job_id) {
      const supabase = createSupabaseClient();
      await supabase
        .from('batch_seeding_jobs')
        .update({
          status: 'erro',
          erro_mensagem: error instanceof Error ? error.message : 'Unknown error',
          tempo_fim: new Date().toISOString()
        })
        .eq('id', body.job_id);
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Busca palavras candidatas para seeding
 */
async function getCandidateWords(
  supabase: any,
  limit: number,
  offset: number,
  source: string
): Promise<Array<{ palavra: string; lema?: string; pos?: string; origem: string; frequencia?: number }>> {
  
  const candidates: any[] = [];

  console.log(`[getCandidateWords] Starting with source=${source}, limit=${limit}, offset=${offset}`);

  // 1. Gutenberg (priorizar substantivos, verbos, adjetivos)
  if (source === 'gutenberg' || source === 'all') {
    // Buscar palavras que ainda não estão no semantic_lexicon
    const { data: existingWords } = await supabase
      .from('semantic_lexicon')
      .select('palavra');
    
    console.log(`[getCandidateWords] Existing words in lexicon: ${existingWords?.length || 0}`);
    
    const existingSet = new Set(existingWords?.map((w: { palavra: string }) => w.palavra) || []);
    
    const { data: allGutenbergWords } = await supabase
      .from('gutenberg_lexicon')
      .select('verbete, classe_gramatical')
      .not('classe_gramatical', 'is', null)
      .order('verbete')
      .limit(1000);
    
    console.log(`[getCandidateWords] Gutenberg words fetched: ${allGutenbergWords?.length || 0}`);
    
    // Filtrar por classes gramaticais relevantes (substantivos, verbos, adjetivos, advérbios)
    const gutenbergWords = allGutenbergWords
      ?.filter((w: any) => {
        const classe = w.classe_gramatical || '';
        // m. = masculino, f. = feminino (substantivos)
        // adj. = adjetivo
        // v. = verbo
        // adv. = advérbio
        return (
          classe.includes('m.') || classe.includes('f.') || 
          classe.includes('adj') || classe.includes('v.') || 
          classe.includes('adv')
        ) && !existingSet.has(w.verbete.toLowerCase().trim());
      })
      .slice(offset, offset + Math.floor(limit * 0.6));
    
    console.log(`[getCandidateWords] Gutenberg filtered: ${gutenbergWords?.length || 0}`);
    
    if (gutenbergWords) {
      candidates.push(...gutenbergWords.map((w: any) => ({
        palavra: w.verbete.toLowerCase().trim(),
        pos: mapPOSFromGutenberg(w.classe_gramatical),
        origem: 'gutenberg'
      })));
    }
  }

  // 2. Dialectal (todas categorias temáticas)
  if (source === 'dialectal' || source === 'all') {
    const { data: existingWords } = await supabase
      .from('semantic_lexicon')
      .select('palavra');
    
    const existingSet = new Set(existingWords?.map((w: { palavra: string }) => w.palavra) || []);
    
    const { data: allDialectalWords } = await supabase
      .from('dialectal_lexicon')
      .select('verbete, classe_gramatical')
      .order('verbete')
      .limit(1000);
    
    const dialectalWords = allDialectalWords
      ?.filter((w: any) => !existingSet.has(w.verbete.toLowerCase().trim()))
      .slice(offset, offset + Math.floor(limit * 0.4));
    
    if (dialectalWords) {
      candidates.push(...dialectalWords.map((w: any) => ({
        palavra: w.verbete.toLowerCase().trim(),
        pos: mapPOSFromDialectal(w.classe_gramatical),
        origem: 'dialectal'
      })));
    }
  }

  return candidates.slice(0, limit);
}

/**
 * Processa chunk de palavras
 */
async function processWordsChunk(
  words: Array<{ palavra: string; lema?: string; pos?: string; origem: string }>,
  supabase: any
): Promise<Array<{ palavra: string; success: boolean; fonte: string; tagset_n1?: string }>> {
  
  const results: any[] = [];
  const wordsForGemini: typeof words = [];

  // Fase 1: Regras morfológicas
  for (const word of words) {
    if (hasMorphologicalPattern(word.palavra)) {
      const morphResult = await applyMorphologicalRules(
        word.palavra,
        word.pos,
        getLexiconBase
      );

      if (morphResult) {
        const saved = await saveLexiconClassification(word.palavra, {
          lema: word.lema,
          pos: word.pos,
          tagset_n1: morphResult.tagset_n1,
          tagset_n2: morphResult.tagset_n2,
          confianca: morphResult.confianca,
          fonte: morphResult.fonte,
          origem_lexicon: word.origem as any
        });

        results.push({
          palavra: word.palavra,
          success: saved,
          fonte: morphResult.fonte,
          tagset_n1: morphResult.tagset_n1
        });
        continue;
      }
    }

    // Não classificada por morfologia, vai para Gemini
    wordsForGemini.push(word);
  }

  // Fase 2: Gemini batch (batches de 15)
  const geminiFailures: typeof wordsForGemini = [];
  
  for (let i = 0; i < wordsForGemini.length; i += GEMINI_BATCH_SIZE) {
    const batch = wordsForGemini.slice(i, i + GEMINI_BATCH_SIZE);
    
    try {
      const geminiResults = await classifyBatchWithGemini(
        batch.map(w => ({ palavra: w.palavra, lema: w.lema, pos: w.pos })),
        { info: () => {}, error: () => {} } // Simple logger
      );

      for (let j = 0; j < batch.length; j++) {
        const word = batch[j];
        const geminiResult = geminiResults[j];

        if (geminiResult && geminiResult.tagset_codigo !== 'NC') {
          const saved = await saveLexiconClassification(word.palavra, {
            lema: word.lema,
            pos: word.pos,
            tagset_n1: geminiResult.tagset_codigo,
            confianca: geminiResult.confianca,
            fonte: 'gemini_flash',
            origem_lexicon: word.origem as any
          });

          results.push({
            palavra: word.palavra,
            success: saved,
            fonte: 'gemini_flash',
            tagset_n1: geminiResult.tagset_codigo
          });
        } else {
          // Falha do Gemini - tentar GPT-5 depois
          geminiFailures.push(word);
        }
      }

      // Delay entre batches Gemini
      if (i + GEMINI_BATCH_SIZE < wordsForGemini.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }

    } catch (error) {
      console.error('[batch-seed] Gemini batch error:', error);
      // Adicionar batch inteiro para tentar com GPT-5
      geminiFailures.push(...batch);
    }
  }

  // Fase 3: GPT-5 fallback para falhas do Gemini
  if (geminiFailures.length > 0) {
    console.log(`🔄 [batch-seed] GPT-5 fallback: ${geminiFailures.length} palavras`);
    
    for (let i = 0; i < geminiFailures.length; i += GEMINI_BATCH_SIZE) {
      const batch = geminiFailures.slice(i, i + GEMINI_BATCH_SIZE);
      
      try {
        const gpt5Results = await classifyBatchWithGPT5(
          batch.map(w => ({ palavra: w.palavra, lema: w.lema, pos: w.pos })),
          { info: () => {}, error: () => {} }
        );

        for (let j = 0; j < batch.length; j++) {
          const word = batch[j];
          const gpt5Result = gpt5Results[j];

          if (gpt5Result && gpt5Result.tagset_codigo !== 'NC') {
            const saved = await saveLexiconClassification(word.palavra, {
              lema: word.lema,
              pos: word.pos,
              tagset_n1: gpt5Result.tagset_codigo,
              confianca: gpt5Result.confianca,
              fonte: 'gpt5',
              origem_lexicon: word.origem as any
            });

            results.push({
              palavra: word.palavra,
              success: saved,
              fonte: 'gpt5',
              tagset_n1: gpt5Result.tagset_codigo
            });
          } else {
            results.push({
              palavra: word.palavra,
              success: false,
              fonte: 'gpt5',
              tagset_n1: 'NC'
            });
          }
        }

        // Delay entre batches GPT-5
        if (i + GEMINI_BATCH_SIZE < geminiFailures.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }

      } catch (error) {
        console.error('[batch-seed] GPT-5 batch error:', error);
        batch.forEach(word => {
          results.push({
            palavra: word.palavra,
            success: false,
            fonte: 'gpt5',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }
    }
  }

  return results;
}

function mapPOSFromGutenberg(classe: string): string | undefined {
  if (!classe) return undefined;
  
  // Normalizar classe gramatical do Gutenberg
  const classeNorm = classe.toLowerCase();
  
  if (classeNorm.includes('m.') || classeNorm.includes('f.') || 
      classeNorm.includes('s.') || classeNorm.includes('subst')) {
    return 'NOUN';
  }
  if (classeNorm.includes('v.')) return 'VERB';
  if (classeNorm.includes('adj')) return 'ADJ';
  if (classeNorm.includes('adv')) return 'ADV';
  
  return undefined;
}

function mapPOSFromDialectal(classe: string): string | undefined {
  return mapPOSFromGutenberg(classe);
}
