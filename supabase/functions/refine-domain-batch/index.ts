/**
 * Edge Function: refine-domain-batch
 * Job recursivo para refinamento semântico automático de palavras N1
 * Auto-invoca próximo chunk até completar ou ser cancelado
 * 
 * Sprint 4: Métricas de qualidade, priorização inteligente, prompt otimizado
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CHUNK_SIZE = 50;
const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 1500;
const KWIC_WINDOW_SIZE = 40;
const MAX_SAMPLES = 10;

interface RefinementJob {
  id: string;
  status: string;
  domain_filter: string | null;
  model: string;
  total_words: number;
  processed: number;
  refined: number;
  errors: number;
  current_offset: number;
  is_cancelling: boolean;
  priority_mode: string;
  n2_refined: number;
  n3_refined: number;
  n4_refined: number;
  sample_refinements: any[];
}

interface WordToProcess {
  id: string;
  palavra: string;
  lema: string | null;
  pos: string | null;
  tagset_codigo: string;
  song_id: string | null;
  hits_count: number;
  kwic?: string;
}

interface RefinementResult {
  palavra: string;
  oldCode: string;
  newCode: string;
  level: number;
  confianca: number;
  kwic?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { jobId, action, domain_filter, model = 'gemini', priority_mode = 'impact' } = body;

    // Handle job creation
    if (action === 'create') {
      return await createJob(supabase, domain_filter, model, priority_mode);
    }

    // Handle pause/resume/cancel
    if (action === 'pause') {
      return await updateJobStatus(supabase, jobId, 'pausado');
    }
    if (action === 'resume') {
      return await resumeJob(supabase, jobId);
    }
    if (action === 'cancel') {
      return await updateJobStatus(supabase, jobId, 'cancelado');
    }

    // Process next chunk
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId required for processing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from('semantic_refinement_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[refine-domain-batch] Job not found:', jobId);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if should process
    if (job.status !== 'processando' || job.is_cancelling) {
      console.log(`[refine-domain-batch] Job ${jobId} stopped: status=${job.status}, cancelling=${job.is_cancelling}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job not active', status: job.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process chunk
    const result = await processChunk(supabase, job as RefinementJob);

    // Check if completed
    if (result.completed || job.processed + result.processedCount >= job.total_words) {
      await supabase
        .from('semantic_refinement_jobs')
        .update({
          status: 'concluido',
          tempo_fim: new Date().toISOString(),
          processed: job.processed + result.processedCount,
          refined: job.refined + result.refinedCount,
          errors: job.errors + result.errorCount,
          n2_refined: (job.n2_refined || 0) + result.n2Count,
          n3_refined: (job.n3_refined || 0) + result.n3Count,
          n4_refined: (job.n4_refined || 0) + result.n4Count,
          sample_refinements: mergeSamples(job.sample_refinements || [], result.samples),
        })
        .eq('id', jobId);

      console.log(`[refine-domain-batch] Job ${jobId} completed!`);
      return new Response(
        JSON.stringify({ success: true, ...result, completed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update progress
    await supabase
      .from('semantic_refinement_jobs')
      .update({
        processed: job.processed + result.processedCount,
        refined: job.refined + result.refinedCount,
        errors: job.errors + result.errorCount,
        current_offset: job.current_offset + CHUNK_SIZE,
        last_chunk_at: new Date().toISOString(),
        n2_refined: (job.n2_refined || 0) + result.n2Count,
        n3_refined: (job.n3_refined || 0) + result.n3Count,
        n4_refined: (job.n4_refined || 0) + result.n4Count,
        sample_refinements: mergeSamples(job.sample_refinements || [], result.samples),
      })
      .eq('id', jobId);

    // Auto-invoke next chunk
    scheduleNextChunk(jobId).catch(err => console.error('[refine-domain-batch] Schedule error:', err));

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...result,
        processingTime: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[refine-domain-batch] Error:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mergeSamples(existing: any[], newSamples: RefinementResult[]): any[] {
  const combined = [...newSamples, ...existing];
  return combined.slice(0, MAX_SAMPLES);
}

async function createJob(supabase: any, domain_filter: string | null, model: string, priority_mode: string) {
  // Count total words to process
  let query = supabase
    .from('semantic_disambiguation_cache')
    .select('id', { count: 'exact', head: true })
    .is('tagset_n2', null)
    .neq('tagset_codigo', 'NC');

  if (domain_filter === 'MG') {
    query = query.eq('tagset_codigo', 'MG');
  } else if (domain_filter === 'DS') {
    query = query.neq('tagset_codigo', 'MG');
  }

  const { count, error: countError } = await query;

  if (countError) {
    throw new Error(`Failed to count words: ${countError.message}`);
  }

  // Cancel any existing active jobs
  await supabase
    .from('semantic_refinement_jobs')
    .update({ status: 'cancelado', is_cancelling: true })
    .in('status', ['pendente', 'processando', 'pausado']);

  // Create new job
  const { data: newJob, error: insertError } = await supabase
    .from('semantic_refinement_jobs')
    .insert({
      domain_filter,
      model,
      priority_mode,
      total_words: count || 0,
      status: 'processando',
      tempo_inicio: new Date().toISOString(),
      last_chunk_at: new Date().toISOString(),
      n2_refined: 0,
      n3_refined: 0,
      n4_refined: 0,
      sample_refinements: [],
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create job: ${insertError.message}`);
  }

  console.log(`[refine-domain-batch] Created job ${newJob.id} for ${count} words (filter: ${domain_filter}, model: ${model}, priority: ${priority_mode})`);

  // Start processing immediately
  scheduleNextChunk(newJob.id).catch(err => console.error('[refine-domain-batch] Initial schedule error:', err));

  return new Response(
    JSON.stringify({ success: true, job: newJob }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateJobStatus(supabase: any, jobId: string, status: string) {
  const updateData: any = { status };
  if (status === 'cancelado') {
    updateData.is_cancelling = true;
    updateData.tempo_fim = new Date().toISOString();
  }

  const { error } = await supabase
    .from('semantic_refinement_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to update job: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, status }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function resumeJob(supabase: any, jobId: string) {
  const { error } = await supabase
    .from('semantic_refinement_jobs')
    .update({ 
      status: 'processando',
      last_chunk_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to resume job: ${error.message}`);
  }

  scheduleNextChunk(jobId).catch(err => console.error('[refine-domain-batch] Resume schedule error:', err));

  return new Response(
    JSON.stringify({ success: true, status: 'processando' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function extractKWIC(lyrics: string, palavra: string, windowSize: number = KWIC_WINDOW_SIZE): string {
  if (!lyrics || !palavra) return '';
  
  const normalizedLyrics = lyrics.toLowerCase();
  const normalizedWord = palavra.toLowerCase();
  
  const idx = normalizedLyrics.indexOf(normalizedWord);
  if (idx === -1) {
    const wordPattern = new RegExp(`\\b${normalizedWord}\\b`, 'i');
    const match = lyrics.match(wordPattern);
    if (!match || match.index === undefined) return '';
    return extractContextAt(lyrics, match.index, palavra.length, windowSize);
  }
  
  return extractContextAt(lyrics, idx, palavra.length, windowSize);
}

function extractContextAt(text: string, idx: number, wordLength: number, windowSize: number): string {
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + wordLength + windowSize);
  
  let context = text.substring(start, end)
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

async function processChunk(supabase: any, job: RefinementJob) {
  console.log(`[refine-domain-batch] Processing chunk for job ${job.id}, offset ${job.current_offset}, priority: ${job.priority_mode}`);

  // Build query with priority ordering
  let query = supabase
    .from('semantic_disambiguation_cache')
    .select('id, palavra, lema, pos, tagset_codigo, song_id, hits_count')
    .is('tagset_n2', null)
    .neq('tagset_codigo', 'NC');

  if (job.domain_filter === 'MG') {
    query = query.eq('tagset_codigo', 'MG');
  } else if (job.domain_filter === 'DS') {
    query = query.neq('tagset_codigo', 'MG');
  }

  // Apply priority ordering
  if (job.priority_mode === 'impact') {
    query = query.order('hits_count', { ascending: false }).order('palavra');
  } else if (job.priority_mode === 'alphabetical') {
    query = query.order('palavra');
  } else {
    // random - use created_at as pseudo-random
    query = query.order('cached_at', { ascending: false });
  }

  query = query.range(job.current_offset, job.current_offset + CHUNK_SIZE - 1);

  const { data: words, error: fetchError } = await query;

  if (fetchError) {
    console.error('[refine-domain-batch] Error fetching words:', fetchError);
    return { processedCount: 0, refinedCount: 0, errorCount: 1, completed: false, n2Count: 0, n3Count: 0, n4Count: 0, samples: [] };
  }

  if (!words || words.length === 0) {
    console.log('[refine-domain-batch] No more words to process');
    return { processedCount: 0, refinedCount: 0, errorCount: 0, completed: true, n2Count: 0, n3Count: 0, n4Count: 0, samples: [] };
  }

  console.log(`[refine-domain-batch] Fetched ${words.length} words (priority: ${job.priority_mode})`);

  // Fetch lyrics for KWIC
  const songIds = [...new Set(words.map((w: WordToProcess) => w.song_id).filter(Boolean))] as string[];
  
  let songsMap = new Map<string, string>();
  
  if (songIds.length > 0) {
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, lyrics')
      .in('id', songIds);
    
    if (songsError) {
      console.warn('[refine-domain-batch] Error fetching songs:', songsError.message);
    } else if (songs) {
      songsMap = new Map(songs.map((s: { id: string; lyrics: string }) => [s.id, s.lyrics || '']));
    }
  }

  // Extract KWIC for each word
  const wordsWithContext: WordToProcess[] = words.map((w: WordToProcess) => {
    const lyrics = w.song_id ? songsMap.get(w.song_id) : null;
    const kwic = lyrics ? extractKWIC(lyrics, w.palavra) : '';
    return { ...w, kwic };
  });

  const withContext = wordsWithContext.filter(w => w.kwic).length;
  console.log(`[refine-domain-batch] KWIC: ${withContext}/${wordsWithContext.length} com contexto`);

  // Process in batches
  let processedCount = 0;
  let refinedCount = 0;
  let errorCount = 0;
  let n2Count = 0;
  let n3Count = 0;
  let n4Count = 0;
  const allSamples: RefinementResult[] = [];

  for (let i = 0; i < wordsWithContext.length; i += BATCH_SIZE) {
    const batch = wordsWithContext.slice(i, i + BATCH_SIZE);
    
    try {
      const result = await processBatchWithAI(supabase, batch, job.model, job.domain_filter);
      processedCount += batch.length;
      refinedCount += result.refined;
      errorCount += result.errors;
      n2Count += result.n2Count;
      n3Count += result.n3Count;
      n4Count += result.n4Count;
      allSamples.push(...result.samples);
    } catch (error) {
      console.error('[refine-domain-batch] Batch error:', error);
      errorCount += batch.length;
    }

    if (i + BATCH_SIZE < wordsWithContext.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return { 
    processedCount, 
    refinedCount, 
    errorCount, 
    completed: false,
    n2Count,
    n3Count,
    n4Count,
    samples: allSamples.slice(0, 5),
  };
}

// Domain-specific instructions for optimized prompt
const DOMAIN_INSTRUCTIONS: Record<string, string> = {
  MG: `PALAVRAS GRAMATICAIS (MG): Use contexto KWIC para distinguir:
- Preposições de lugar: "de casa", "do campo" → MG.PR.LOC
- Preposições de tempo: "de manhã", "de tarde" → MG.PR.TMP  
- Preposições causais: "de medo", "de alegria" → MG.PR.CAU
- Conjunções subordinativas: "que" integrante → MG.CJ.SUB
- Pronomes relativos: "que" como pronome → MG.PR.REL
- Advérbios temporais: "já", "ainda" → MG.AV.TMP
- Advérbios modais: "bem", "mal" → MG.AV.MOD`,

  NA: `NATUREZA (NA): Prefira subcategorias específicas:
- Flora gaúcha: tarumã, maçanilha → NA.FL.ARV ou NA.FL.PLA
- Fauna específica: quero-quero, tatu → NA.FA.AVE ou NA.FA.MAM
- Paisagem: coxilha, várzea → NA.PA.REL`,

  AH: `ATIVIDADES HUMANAS (AH): Distinguir por contexto:
- Trabalho no campo: tropeada, lida → AH.TR.RUR
- Artes: cantiga, poesia → AH.AR.MUS
- Culinária: churrasco, chimarrão → AH.AL.BEB ou AH.AL.COM`,

  SH: `SER HUMANO (SH): Subcategorias:
- Partes do corpo: olhos, mãos → SH.CO.MEM
- Relações: prenda, compadre → SH.RS.FAM
- Emoções: saudade, alegria → SH.EM.POS ou SH.EM.NEG`,
};

async function processBatchWithAI(supabase: any, words: WordToProcess[], model: string, domain_filter: string | null) {
  // Get unique domains
  const domains = [...new Set(words.map(w => w.tagset_codigo?.split('.')[0]).filter(Boolean))];
  
  // Fetch hierarchy
  const { data: tagsets } = await supabase
    .from('semantic_tagset')
    .select('codigo, nome, nivel_profundidade')
    .order('codigo');

  const validCodes = new Set((tagsets || []).map((t: any) => t.codigo));
  
  // Build hierarchy text
  const hierarchyLines: string[] = [];
  for (const domain of domains) {
    const domainTagsets = (tagsets || []).filter((t: any) => 
      t.codigo === domain || t.codigo.startsWith(`${domain}.`)
    );
    domainTagsets.forEach((t: any) => {
      const depth = t.codigo.split('.').length - 1;
      const indent = '  '.repeat(depth);
      hierarchyLines.push(`${indent}${t.codigo} - ${t.nome}`);
    });
  }

  const hierarchyText = hierarchyLines.join('\n');

  // Build domain-specific instructions
  const domainInstr = domains
    .map(d => DOMAIN_INSTRUCTIONS[d])
    .filter(Boolean)
    .join('\n\n');

  // Build word list with KWIC
  const wordList = words.map(w => {
    const contextLine = w.kwic 
      ? `\n    Contexto: "${w.kwic}"`
      : '\n    [Sem contexto disponível]';
    const freqInfo = w.hits_count > 1 ? ` [freq: ${w.hits_count}]` : '';
    return `- "${w.palavra}" (POS: ${w.pos || '?'}, atual: ${w.tagset_codigo})${freqInfo}${contextLine}`;
  }).join('\n');

  // Few-shot examples
  const fewShotExamples = `
EXEMPLOS DE REFINAMENTO CORRETO:
- "de" com contexto "...de manhã cedo..." → MG.PR.TMP (temporal, conf: 0.92)
- "que" com contexto "...disse que voltaria..." → MG.CJ.SUB (integrante, conf: 0.88)
- "campo" com contexto "...no campo verde..." → NA.PA.PL (paisagem, conf: 0.95)
- "cavalo" com contexto "...montou no cavalo..." → NA.FA.EQU (equino, conf: 0.98)
`;

  const systemPrompt = `Você é um especialista em classificação semântica do português brasileiro, especializado em textos gaúchos.
Seu objetivo é REFINAR palavras de nível N1 para o subnível mais específico possível (N4 > N3 > N2).

HIERARQUIA DISPONÍVEL:
${hierarchyText}

${domainInstr ? `INSTRUÇÕES POR DOMÍNIO:\n${domainInstr}\n` : ''}
${fewShotExamples}

REGRAS CRÍTICAS:
1. SEMPRE prefira o nível mais específico disponível (N4 > N3 > N2)
2. Retorne APENAS códigos que existem na hierarquia acima
3. O CONTEXTO KWIC é ESSENCIAL - use-o para desambiguar palavras polissêmicas
4. Sem contexto, use a classificação mais genérica segura
5. PENALIZAÇÃO: manter N1 quando N2+ existe reduz a confiança em 0.20
6. Confiança: 0.70-0.85 sem contexto, 0.85-0.98 com contexto claro

Responda APENAS com JSON válido:
[{"palavra": "x", "tagset_codigo": "XX.YY.ZZ", "confianca": 0.85}]`;

  const userPrompt = `Refine cada palavra para o nível mais específico possível:\n\n${wordList}`;

  const modelId = model === 'gpt5' ? 'openai/gpt-5-mini' : 'google/gemini-2.5-flash';
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  let results: any[];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    results = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    console.error('[refine-domain-batch] JSON parse error:', content.substring(0, 200));
    return { refined: 0, errors: words.length, n2Count: 0, n3Count: 0, n4Count: 0, samples: [] };
  }

  // Update database and track metrics
  let refined = 0;
  let errors = 0;
  let n2Count = 0;
  let n3Count = 0;
  let n4Count = 0;
  const samples: RefinementResult[] = [];

  for (const result of results) {
    const word = words.find(w => w.palavra.toLowerCase() === result.palavra?.toLowerCase());
    if (!word) continue;

    let code = result.tagset_codigo;
    if (!validCodes.has(code)) {
      code = word.tagset_codigo;
    }

    // Only update if refined (code has a dot = N2+)
    if (code && code.includes('.')) {
      const parts = code.split('.');
      const level = parts.length;
      
      const { error } = await supabase
        .from('semantic_disambiguation_cache')
        .update({
          tagset_codigo: code,
          tagset_n1: parts[0],
          tagset_n2: parts.length >= 2 ? parts.slice(0, 2).join('.') : null,
          tagset_n3: parts.length >= 3 ? parts.slice(0, 3).join('.') : null,
          tagset_n4: parts.length >= 4 ? code : null,
          confianca: result.confianca || 0.85,
          fonte: model === 'gpt5' ? 'gpt5_refinement' : 'gemini_refinement',
        })
        .eq('id', word.id);

      if (!error) {
        refined++;
        
        // Track by level
        if (level >= 2) n2Count++;
        if (level >= 3) n3Count++;
        if (level >= 4) n4Count++;
        
        // Collect sample
        if (samples.length < 3) {
          samples.push({
            palavra: word.palavra,
            oldCode: word.tagset_codigo,
            newCode: code,
            level,
            confianca: result.confianca || 0.85,
            kwic: word.kwic?.substring(0, 50),
          });
        }
      } else {
        errors++;
      }
    }
  }

  return { refined, errors, n2Count, n3Count, n4Count, samples };
}

async function scheduleNextChunk(jobId: string, retryCount: number = 0): Promise<void> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000;
  
  const delay = retryCount === 0 ? 500 : BASE_DELAY_MS * Math.pow(2, retryCount - 1);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/refine-domain-batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`[refine-domain-batch] Auto-invoke success for job ${jobId}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[refine-domain-batch] Auto-invoke attempt ${retryCount + 1}/${MAX_RETRIES} failed:`, errorMsg);
    
    if (retryCount < MAX_RETRIES - 1) {
      return scheduleNextChunk(jobId, retryCount + 1);
    } else {
      console.error(`[refine-domain-batch] All ${MAX_RETRIES} retries failed, pausing job ${jobId}`);
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase
        .from('semantic_refinement_jobs')
        .update({ 
          status: 'pausado',
          erro_mensagem: `Auto-invocação falhou após ${MAX_RETRIES} tentativas: ${errorMsg}`,
        })
        .eq('id', jobId);
    }
  }
}
