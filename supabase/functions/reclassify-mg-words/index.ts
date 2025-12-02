/**
 * Edge Function: reclassify-mg-words (Refactored to support ALL domains)
 * Reclassifica palavras de N1 para níveis mais específicos (N2-N4)
 * usando Gemini ou GPT-5 com hierarquias carregadas dinamicamente do banco
 * 
 * Suporta TODOS os domínios semânticos (MG, NA, SE, SH, AB, etc.)
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

interface WordToReclassify {
  id: string;
  palavra: string;
  lema: string | null;
  pos: string | null;
  contexto_hash: string;
  song_id: string | null;
  tagset_codigo?: string; // Current domain code for context
}

interface ReclassificationResult {
  palavra: string;
  tagset_codigo: string;
  tagset_n1: string;
  tagset_n2: string | null;
  tagset_n3: string | null;
  tagset_n4: string | null;
  confianca: number;
  justificativa: string;
  tagset_codigo_validated?: string;
  was_corrected?: boolean;
}

interface TagsetHierarchy {
  codigo: string;
  nome: string;
  nivel_profundidade: number;
  categoria_pai: string | null;
  descricao: string | null;
}

/**
 * Extrai KWIC (Key Word In Context) de um texto
 */
function extractKWIC(text: string, palavra: string, windowSize = 50): string {
  if (!text || !palavra) return '';
  
  const lowerText = text.toLowerCase();
  const lowerPalavra = palavra.toLowerCase();
  
  // Try to find the exact word
  const wordRegex = new RegExp(`\\b${lowerPalavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const match = lowerText.match(wordRegex);
  
  let idx = match ? lowerText.indexOf(match[0]) : lowerText.indexOf(lowerPalavra);
  
  if (idx === -1) return '';
  
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + palavra.length + windowSize);
  
  let context = text.substring(start, end).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

interface WordWithKWIC extends WordToReclassify {
  kwic: string;
}

/**
 * Build hierarchy tree as text for prompt
 */
function buildHierarchyText(tagsets: TagsetHierarchy[], domainN1: string): string {
  const domainTagsets = tagsets.filter(t => 
    t.codigo === domainN1 || t.codigo.startsWith(`${domainN1}.`)
  ).sort((a, b) => a.codigo.localeCompare(b.codigo));

  if (domainTagsets.length === 0) {
    return `Domínio ${domainN1}: Sem hierarquia disponível no banco`;
  }

  // Build tree structure
  const lines: string[] = [];
  const levelNames = ['N1', 'N2', 'N3', 'N4'];
  
  domainTagsets.forEach(t => {
    const depth = t.codigo.split('.').length - 1;
    const indent = '  '.repeat(depth);
    const levelName = levelNames[depth] || `N${depth + 1}`;
    lines.push(`${indent}${t.codigo} - ${t.nome} (${levelName})`);
  });

  return lines.join('\n');
}

/**
 * Generate dynamic system prompt based on domains
 */
function generateSystemPrompt(hierarchyText: string, domainsIncluded: string[]): string {
  return `Você é um especialista em semântica lexical e classificação de domínios semânticos do português brasileiro.

Sua tarefa é classificar palavras no subnível mais específico possível da hierarquia fornecida.

HIERARQUIA DOS DOMÍNIOS SEMÂNTICOS:
${hierarchyText}

REGRAS DE CLASSIFICAÇÃO CRÍTICAS:

1. SEMPRE classifique no nível N4 quando disponível (mais específico)
2. Use o nível N3 se N4 não existir ou não for apropriado
3. Use o nível N2 se N3 não existir ou não for apropriado
4. Só mantenha N1 se realmente não houver subclassificação adequada

5. USE O CONTEXTO KWIC FORNECIDO para entender o significado da palavra:
   - O contexto mostra como a palavra é usada na frase
   - Isso é ESSENCIAL para desambiguar palavras polissêmicas
   - "bem" pode ser advérbio (MG.MOD.*) ou substantivo (diferente)
   - "se" pode ser pronome reflexivo ou conjunção condicional

6. RETORNE APENAS códigos que existem na hierarquia acima
7. Forneça confiança entre 0.70 e 1.00

EXEMPLOS DE CLASSIFICAÇÃO COM CONTEXTO:
- "eu te amo" → "te" = MG.DEI.PES.OBL (pronome oblíquo)
- "se tu quiser" → "se" = MG.CON.ORA.CND (conjunção condicional)
- "ele se machucou" → "se" = MG.DEI.PES.OBL (pronome reflexivo)
- "está muito bem" → "bem" = MG.MOD.CIR (advérbio de modo)

Responda APENAS com JSON válido no formato:
[
  {
    "palavra": "string",
    "tagset_codigo": "XX.YYY.ZZZ.WWW",
    "tagset_n1": "XX",
    "tagset_n2": "XX.YYY ou null",
    "tagset_n3": "XX.YYY.ZZZ ou null",
    "tagset_n4": "XX.YYY.ZZZ.WWW ou null",
    "confianca": 0.85,
    "justificativa": "breve explicação baseada no contexto"
  }
]`;
}

function buildPrompt(words: WordWithKWIC[]): string {
  const wordList = words.map(w => {
    const contextLine = w.kwic 
      ? `\n  Contexto: "${w.kwic}"`
      : ' [SEM CONTEXTO - classifique pelo uso mais comum]';
    const currentCode = w.tagset_codigo ? ` [atualmente: ${w.tagset_codigo}]` : '';
    return `- "${w.palavra}" (lema: ${w.lema || w.palavra}, POS: ${w.pos || 'desconhecido'})${currentCode}${contextLine}`;
  }).join('\n');
  
  return `Classifique as seguintes palavras no subnível mais específico da hierarquia fornecida.
ATENÇÃO: Use o contexto KWIC para desambiguar palavras polissêmicas.

${wordList}

Retorne um array JSON com a classificação de cada palavra.`;
}

function extractJsonFromText(text: string): any {
  // Helper to clean and fix common JSON issues
  const cleanJson = (str: string): string => {
    return str
      .replace(/,\s*]/g, ']')           // Remove trailing commas in arrays
      .replace(/,\s*}/g, '}')           // Remove trailing commas in objects
      .replace(/\n/g, ' ')              // Remove newlines
      .replace(/\t/g, ' ')              // Remove tabs
      .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
      .replace(/\\n/g, ' ')             // Replace escaped newlines
      .trim();
  };

  // Helper to attempt fixing truncated JSON arrays
  const fixTruncatedArray = (str: string): string => {
    let cleaned = cleanJson(str);
    
    // Count brackets to detect truncation
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    
    // If truncated, try to close it
    if (openBrackets > closeBrackets || openBraces > closeBraces) {
      // Find last complete object
      const lastCompleteObject = cleaned.lastIndexOf('}');
      if (lastCompleteObject > 0) {
        cleaned = cleaned.substring(0, lastCompleteObject + 1);
        // Add missing brackets
        for (let i = 0; i < openBraces - closeBraces; i++) cleaned += '}';
        for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += ']';
      }
    }
    
    return cleaned;
  };

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e1) {
    // Try extracting from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(cleanJson(jsonMatch[1]));
      } catch {
        try {
          return JSON.parse(fixTruncatedArray(jsonMatch[1]));
        } catch {}
      }
    }
    
    // Try extracting array pattern
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(cleanJson(arrayMatch[0]));
      } catch {
        try {
          return JSON.parse(fixTruncatedArray(arrayMatch[0]));
        } catch {}
      }
    }
    
    // Last resort: try to find and parse individual objects
    const objectMatches = text.match(/\{[^{}]*"palavra"[^{}]*\}/g);
    if (objectMatches && objectMatches.length > 0) {
      try {
        const parsed = objectMatches.map(obj => JSON.parse(cleanJson(obj)));
        console.log(`[refine-domain] Recovered ${parsed.length} objects from malformed JSON`);
        return parsed;
      } catch {}
    }
    
    console.error('[refine-domain] Failed to parse JSON. Raw text:', text.substring(0, 500));
    throw new Error('Could not extract valid JSON from AI response');
  }
}

/**
 * Validates and fixes the code returned by AI
 */
function validateAndFixCode(
  result: ReclassificationResult, 
  validCodes: Set<string>,
  originalDomainN1: string
): ReclassificationResult {
  let code = result.tagset_codigo;
  
  // 1. Check if already valid
  if (code && validCodes.has(code)) {
    return { ...result, tagset_codigo_validated: code, was_corrected: false };
  }
  
  // 2. If code is null/empty, fallback to N1
  if (!code) {
    console.log(`[refine-domain] Empty code, fallback to ${originalDomainN1}`);
    return {
      ...result,
      tagset_codigo: originalDomainN1,
      tagset_codigo_validated: originalDomainN1,
      tagset_n1: originalDomainN1,
      tagset_n2: null,
      tagset_n3: null,
      tagset_n4: null,
      was_corrected: true,
    };
  }

  // 3. Fallback to N3
  if (result.tagset_n3 && validCodes.has(result.tagset_n3)) {
    console.log(`[refine-domain] Fallback N4->N3: ${code} -> ${result.tagset_n3}`);
    return {
      ...result,
      tagset_codigo: result.tagset_n3,
      tagset_codigo_validated: result.tagset_n3,
      tagset_n4: null,
      was_corrected: true,
    };
  }
  
  // 4. Fallback to N2
  if (result.tagset_n2 && validCodes.has(result.tagset_n2)) {
    console.log(`[refine-domain] Fallback N4->N2: ${code} -> ${result.tagset_n2}`);
    return {
      ...result,
      tagset_codigo: result.tagset_n2,
      tagset_codigo_validated: result.tagset_n2,
      tagset_n3: null,
      tagset_n4: null,
      was_corrected: true,
    };
  }
  
  // 5. Last resort: keep original N1
  console.warn(`[refine-domain] Invalid code ${code}, fallback to ${originalDomainN1}`);
  return {
    ...result,
    tagset_codigo: originalDomainN1,
    tagset_codigo_validated: originalDomainN1,
    tagset_n2: null,
    tagset_n3: null,
    tagset_n4: null,
    was_corrected: true,
  };
}

async function reclassifyWithAI(
  words: WordWithKWIC[], 
  systemPrompt: string,
  model: 'gemini' | 'gpt5'
): Promise<ReclassificationResult[]> {
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
        { role: 'user', content: buildPrompt(words) }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from AI');
  }

  console.log(`[refine-domain] AI Response preview: ${content.substring(0, 200)}...`);
  
  return extractJsonFromText(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { words, model = 'gemini' } = await req.json() as { 
      words: WordToReclassify[]; 
      model?: 'gemini' | 'gpt5';
    };

    if (!words || !Array.isArray(words) || words.length === 0) {
      return new Response(
        JSON.stringify({ error: 'words array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[refine-domain] Processing ${words.length} words with ${model}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // STEP 1: Identify unique N1 domains from words
    const domainsN1 = [...new Set(words.map(w => {
      // Get N1 from tagset_codigo or infer from the code
      if (w.tagset_codigo) {
        return w.tagset_codigo.split('.')[0];
      }
      return 'NC'; // Not classified
    }).filter(d => d !== 'NC'))];

    console.log(`[refine-domain] Domains to process: ${domainsN1.join(', ')}`);

    // STEP 2: Fetch complete hierarchies for all domains from database
    const { data: allTagsets, error: tagsetError } = await supabase
      .from('semantic_tagset')
      .select('codigo, nome, nivel_profundidade, categoria_pai, descricao')
      .order('codigo');

    if (tagsetError) {
      console.error('[refine-domain] Error fetching tagsets:', tagsetError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tagset hierarchies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter tagsets for requested domains
    const relevantTagsets = (allTagsets || []).filter(t => 
      domainsN1.some(d => t.codigo === d || t.codigo.startsWith(`${d}.`))
    ) as TagsetHierarchy[];

    const validCodes = new Set(relevantTagsets.map(t => t.codigo));
    console.log(`[refine-domain] Loaded ${validCodes.size} valid codes for domains: ${domainsN1.join(', ')}`);

    // Build hierarchy text for each domain
    const hierarchyText = domainsN1.map(domain => 
      `\n=== DOMÍNIO ${domain} ===\n${buildHierarchyText(relevantTagsets, domain)}`
    ).join('\n');

    // STEP 3: Fetch song lyrics for KWIC extraction
    const songIds = [...new Set(words.filter(w => w.song_id).map(w => w.song_id!))];
    const songsMap = new Map<string, string>();
    
    if (songIds.length > 0) {
      console.log(`[refine-domain] Fetching lyrics for ${songIds.length} songs`);
      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select('id, lyrics')
        .in('id', songIds);
      
      if (!songsError && songs) {
        songs.forEach(s => {
          if (s.lyrics) songsMap.set(s.id, s.lyrics);
        });
        console.log(`[refine-domain] Loaded ${songsMap.size} song lyrics for KWIC`);
      } else {
        console.log(`[refine-domain] No lyrics found or error: ${songsError?.message}`);
      }
    }

    // STEP 4: Enrich words with KWIC context
    const wordsWithKWIC: WordWithKWIC[] = words.map(w => {
      let kwic = '';
      if (w.song_id && songsMap.has(w.song_id)) {
        const lyrics = songsMap.get(w.song_id)!;
        kwic = extractKWIC(lyrics, w.palavra);
      }
      return { ...w, kwic };
    });
    
    const wordsWithContext = wordsWithKWIC.filter(w => w.kwic).length;
    console.log(`[refine-domain] ${wordsWithContext}/${words.length} words have KWIC context`);

    // Log sample for debugging
    if (wordsWithKWIC.length > 0) {
      const sample = wordsWithKWIC[0];
      console.log(`[refine-domain] Sample word: "${sample.palavra}", song_id: ${sample.song_id}, KWIC: "${sample.kwic?.substring(0, 60) || 'NONE'}..."`);
    }

    // STEP 5: Generate dynamic system prompt
    const systemPrompt = generateSystemPrompt(hierarchyText, domainsN1);

    // STEP 6: Reclassify using selected model
    let results: ReclassificationResult[];
    try {
      results = await reclassifyWithAI(wordsWithKWIC, systemPrompt, model);
    } catch (aiError) {
      console.error(`[refine-domain] AI error:`, aiError);
      return new Response(
        JSON.stringify({ error: `AI classification failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 7: Validate and fix codes, then update database
    let updatedCount = 0;
    let correctedCount = 0;
    const finalResults: ReclassificationResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const originalWord = words.find(w => w.palavra === result.palavra);
      const originalDomainN1 = originalWord?.tagset_codigo?.split('.')[0] || 'NC';
      
      // Validate and fix the code
      const validatedResult = validateAndFixCode(result, validCodes, originalDomainN1);
      if (validatedResult.was_corrected) correctedCount++;

      finalResults.push(validatedResult);

      // Find matching word and update database
      if (originalWord) {
        const { error: updateError } = await supabase
          .from('semantic_disambiguation_cache')
          .update({
            tagset_codigo: validatedResult.tagset_codigo_validated,
            tagset_n1: validatedResult.tagset_n1,
            tagset_n2: validatedResult.tagset_n2,
            tagset_n3: validatedResult.tagset_n3,
            tagset_n4: validatedResult.tagset_n4,
            confianca: validatedResult.confianca,
            fonte: model === 'gpt5' ? 'gpt5_mg_refinement' : 'gemini_flash_mg_refinement',
            cached_at: new Date().toISOString(),
          })
          .eq('id', originalWord.id);

        if (updateError) {
          console.error(`[refine-domain] Failed to update ${result.palavra}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[refine-domain] Completed: ${updatedCount} updated, ${correctedCount} corrected, ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        updated: updatedCount,
        corrected: correctedCount,
        model,
        source: model === 'gpt5' ? 'gpt5_mg_refinement' : 'gemini_flash_mg_refinement',
        duration,
        results: finalResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[refine-domain] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
