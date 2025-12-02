/**
 * Edge Function: reclassify-mg-words
 * Reclassifica palavras MG (Marcadores Gramaticais) de N1 para níveis mais específicos (N2-N4)
 * usando Gemini ou GPT-5 com prompt especializado na hierarquia MG
 * 
 * IMPORTANTE: Inclui validação server-side para garantir que os códigos retornados
 * pela IA existem no banco de dados (evita FK violations)
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
  song_id: string | null; // NEW: for KWIC extraction
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
}

// Mapeamento de correções para códigos comuns que a IA pode inventar
const CODE_CORRECTIONS: Record<string, string> = {
  // Preposições - a IA pode usar códigos antigos/incorretos
  'MG.CON.REL.LOC': 'MG.CON.REL.LUG',
  'MG.CON.PRE.ESS': 'MG.CON.REL.LUG',
  'MG.CON.PRE.LOC': 'MG.CON.REL.LUG',
  'MG.CON.PRE.LUG': 'MG.CON.REL.LUG',
  'MG.CON.PRE.TEM': 'MG.CON.REL.TEM',
  'MG.CON.PRE.CAU': 'MG.CON.REL.CAU',
  'MG.CON.PRE.FIN': 'MG.CON.REL.FIN',
  'MG.CON.PRE.INS': 'MG.CON.REL.INS',
  'MG.CON.PRE.MOD': 'MG.CON.REL.MOD',
  
  // Artigos - formato antigo
  'MG.DET.ART.DEF': 'MG.ESP.DEF.ART',
  'MG.DET.ART.IND': 'MG.ESP.DEF.IND',
  'MG.ART.DEF': 'MG.ESP.DEF.ART',
  'MG.ART.IND': 'MG.ESP.DEF.IND',
  
  // Pronomes - formato antigo
  'MG.PRO.PES.RET': 'MG.DEI.PES.RET',
  'MG.PRO.PES.OBL': 'MG.DEI.PES.OBL',
  'MG.PRO.PES': 'MG.DEI.PES',
  'MG.PRO.DEM': 'MG.DEI.ESP.PRO',
  'MG.PRO.POS': 'MG.DEI.POS',
  
  // Advérbios - formato antigo
  'MG.ADV.NEG': 'MG.MOD.CIR.NEG',
  'MG.ADV.LUG': 'MG.MOD.CIR.LUG',
  'MG.ADV.TEM': 'MG.MOD.CIR.TEM',
  'MG.ADV.INT': 'MG.MOD.CIR.INT',
  'MG.ADV.MOD': 'MG.MOD.CIR',
  
  // Quantificadores
  'MG.QUA.IMP': 'MG.ESP.QUA.IMP',
  'MG.QUA.CAR': 'MG.ESP.QUA.CAR',
  'MG.QUA.ORD': 'MG.ESP.QUA.ORD',
};

// Hierarquia REAL de MG do banco de dados semantic_tagset
const MG_HIERARCHY = `
HIERARQUIA COMPLETA DE MARCADORES GRAMATICAIS (MG):

MG - Marcadores Gramaticais (N1)
├── MG.AUX - Auxiliar Verbal (N2)
│   ├── MG.AUX.TEM - Tempo Composto (N3): ter, haver + particípio
│   ├── MG.AUX.VOZ - Voz Passiva (N3): ser + particípio
│   └── MG.AUX.LOC - Locução Verbal (N3): ir, estar, poder + infinitivo/gerúndio
├── MG.CON - Conector (N2)
│   ├── MG.CON.ORA - Oracional (N3)
│   │   ├── MG.CON.ORA.ADI - Adição (N4): e, nem, também
│   │   ├── MG.CON.ORA.ADV - Adversativa (N4): mas, porém, contudo
│   │   ├── MG.CON.ORA.CAU - Causal (N4): porque, já que, visto que
│   │   ├── MG.CON.ORA.CND - Condicional (N4): se, caso, desde que
│   │   ├── MG.CON.ORA.CON - Concessiva (N4): embora, ainda que
│   │   ├── MG.CON.ORA.FIN - Final (N4): para que, a fim de que
│   │   └── MG.CON.ORA.TMP - Temporal (N4): quando, enquanto, assim que
│   └── MG.CON.REL - Relacional/Preposições (N3) *** IMPORTANTE: todas preposições aqui ***
│       ├── MG.CON.REL.CAU - Causa (N4): por (causa), por causa de
│       ├── MG.CON.REL.FIN - Finalidade (N4): para (fim), a fim de
│       ├── MG.CON.REL.INS - Instrumento (N4): com (instrumento), mediante
│       ├── MG.CON.REL.LUG - Lugar (N4): em, de, para, a (direção/localização)
│       ├── MG.CON.REL.MOD - Modo (N4): sem, conforme, segundo
│       └── MG.CON.REL.TEM - Tempo (N4): durante, desde, até
├── MG.DEI - Deíctico (N2) *** PRONOMES PESSOAIS, DEMONSTRATIVOS E POSSESSIVOS ***
│   ├── MG.DEI.ESP - Espacial/Demonstrativos (N3)
│   │   ├── MG.DEI.ESP.PRO - Proximidade (N4): este, esse, aquele, isto, isso, aquilo
│   │   └── MG.DEI.ESP.REL - Relativo (N4): onde, aonde
│   ├── MG.DEI.PES - Pessoal/Pronomes (N3) *** PRONOMES PESSOAIS ***
│   │   ├── MG.DEI.PES.RET - Reto (N4): eu, tu, ele, ela, nós, vós, eles, elas
│   │   └── MG.DEI.PES.OBL - Oblíquo (N4): me, te, se, lhe, nos, vos, lhes
│   └── MG.DEI.POS - Possessivo (N3)
│       ├── MG.DEI.POS.PRI - 1ª Pessoa (N4): meu, minha, nosso, nossa
│       └── MG.DEI.POS.TER - 3ª Pessoa (N4): seu, sua, dele, dela
├── MG.ESP - Especificador (N2) *** ARTIGOS E QUANTIFICADORES ***
│   ├── MG.ESP.DEF - Definidor/Artigos (N3)
│   │   ├── MG.ESP.DEF.ART - Artigo Definido (N4): o, a, os, as
│   │   └── MG.ESP.DEF.IND - Artigo Indefinido (N4): um, uma, uns, umas
│   └── MG.ESP.QUA - Quantificador (N3)
│       ├── MG.ESP.QUA.CAR - Cardinal (N4): um, dois, três, cem
│       ├── MG.ESP.QUA.IMP - Impreciso (N4): algum, nenhum, todo, qualquer, outro
│       └── MG.ESP.QUA.ORD - Ordinal (N4): primeiro, segundo, terceiro
├── MG.EXP - Expressivo/Interjeições (N2)
│   ├── MG.EXP.APE - Apelo (N3): psiu, ô, ei, alô
│   └── MG.EXP.EMO - Emoção (N3): ah, oh, ai, ui
├── MG.MOD - Modificador/Advérbios (N2) *** ADVÉRBIOS FUNCIONAIS ***
│   ├── MG.MOD.CIR - Circunstância (N3)
│   │   ├── MG.MOD.CIR.INT - Intensidade (N4): muito, pouco, bastante, mais, menos
│   │   ├── MG.MOD.CIR.LUG - Lugar (N4): aqui, ali, lá, cá, acolá
│   │   ├── MG.MOD.CIR.NEG - Negação (N4): não, nunca, jamais
│   │   └── MG.MOD.CIR.TEM - Tempo (N4): agora, hoje, ontem, amanhã, sempre
│   └── MG.MOD.FOC - Focalizador (N3)
│       ├── MG.MOD.FOC.INC - Inclusão (N4): também, ainda, até, inclusive
│       └── MG.MOD.FOC.RES - Restrição (N4): só, apenas, somente
├── MG.NPR - Nome Próprio (N2)
│   ├── MG.NPR.LOC - Lugar (N3): Porto Alegre, Brasil, Uruguai
│   ├── MG.NPR.PES - Pessoa (N3): João, Maria, Luiz Marenco
│   ├── MG.NPR.REL - Religioso (N3): Jesus, Nossa Senhora
│   └── MG.NPR.OUT - Outros (N3): outros nomes próprios
├── MG.NQ - Números e Quantificadores (N2): apenas N2, sem subníveis
└── MG.VRL - Verbo Relacional (N2)
    ├── MG.VRL.MUD - Mudança (N3): tornar-se, ficar, virar
    ├── MG.VRL.PER - Permanência (N3): continuar, permanecer
    └── MG.VRL.TRA - Trânsito (N3): andar, viver, parecer
`;

const SYSTEM_PROMPT = `Você é um especialista em gramática portuguesa com foco em classificação morfossintática.

Sua tarefa é classificar marcadores gramaticais (MG) no subnível mais específico possível da hierarquia fornecida.

${MG_HIERARCHY}

REGRAS DE CLASSIFICAÇÃO CRÍTICAS:

1. ARTIGOS:
   - o, a, os, as → MG.ESP.DEF.ART (artigo definido)
   - um, uma, uns, umas → MG.ESP.DEF.IND (artigo indefinido)

2. PRONOMES PESSOAIS:
   - eu, tu, ele, ela, nós, vós, eles, elas → MG.DEI.PES.RET (reto)
   - me, te, se, lhe, nos, vos, lhes → MG.DEI.PES.OBL (oblíquo)

3. PREPOSIÇÕES (todas vão em MG.CON.REL.*):
   - de, em, a, para (indicando lugar/direção) → MG.CON.REL.LUG
   - por (causa) → MG.CON.REL.CAU
   - para (finalidade) → MG.CON.REL.FIN
   - com (instrumento) → MG.CON.REL.INS
   - sem, conforme → MG.CON.REL.MOD
   - durante, desde, até → MG.CON.REL.TEM

4. CONTRAÇÕES:
   - do, da, dos, das = de + artigo → MG.CON.REL.LUG (pelo contexto mais comum)
   - no, na, nos, nas = em + artigo → MG.CON.REL.LUG
   - ao, à, aos, às = a + artigo → MG.CON.REL.LUG

5. ADVÉRBIOS:
   - não, nunca, jamais → MG.MOD.CIR.NEG
   - muito, pouco, mais, menos → MG.MOD.CIR.INT
   - aqui, ali, lá → MG.MOD.CIR.LUG
   - agora, hoje, sempre → MG.MOD.CIR.TEM

6. DEMONSTRATIVOS:
   - este, esse, aquele, isto, isso, aquilo → MG.DEI.ESP.PRO

7. POSSESSIVOS:
   - meu, minha, nosso, nossa → MG.DEI.POS.PRI
   - seu, sua, dele, dela → MG.DEI.POS.TER

8. QUANTIFICADORES:
   - algum, nenhum, todo, qualquer → MG.ESP.QUA.IMP

IMPORTANTE: 
- SEMPRE classifique no nível N4 quando disponível
- USE O CONTEXTO KWIC FORNECIDO para entender o uso da palavra
- Forneça confiança entre 0.70 e 1.00
- Use APENAS os códigos listados na hierarquia acima

Responda APENAS com JSON válido no formato:
[
  {
    "palavra": "string",
    "tagset_codigo": "MG.XXX.XXX.XXX",
    "tagset_n1": "MG",
    "tagset_n2": "MG.XXX",
    "tagset_n3": "MG.XXX.XXX ou null",
    "tagset_n4": "MG.XXX.XXX.XXX ou null",
    "confianca": 0.85,
    "justificativa": "breve explicação"
  }
]`;

/**
 * Extrai KWIC (Key Word In Context) de um texto
 */
function extractKWIC(text: string, palavra: string, windowSize = 40): string {
  if (!text || !palavra) return '';
  
  const lowerText = text.toLowerCase();
  const lowerPalavra = palavra.toLowerCase();
  const idx = lowerText.indexOf(lowerPalavra);
  
  if (idx === -1) return '';
  
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + palavra.length + windowSize);
  
  let context = text.substring(start, end).replace(/\n/g, ' ').trim();
  
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

interface WordWithKWIC extends WordToReclassify {
  kwic: string;
}

function buildPrompt(words: WordWithKWIC[]): string {
  const wordList = words.map(w => {
    const contextLine = w.kwic 
      ? `\n  Contexto: "${w.kwic}"`
      : ' [sem contexto disponível]';
    return `- "${w.palavra}" (lema: ${w.lema || w.palavra}, POS: ${w.pos || 'desconhecido'})${contextLine}`;
  }).join('\n');
  
  return `Classifique os seguintes marcadores gramaticais no subnível mais específico, USANDO O CONTEXTO para desambiguar palavras polissêmicas:

${wordList}

Retorne um array JSON com a classificação de cada palavra.`;
}

function extractJsonFromText(text: string): any {
  // Try to parse directly
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try to find array in text
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    throw new Error('Could not extract JSON from response');
  }
}

/**
 * Valida e corrige o código retornado pela IA
 * - Primeiro tenta correções conhecidas
 * - Depois faz fallback para níveis superiores se necessário
 */
function validateAndFixCode(
  result: ReclassificationResult, 
  validCodes: Set<string>
): ReclassificationResult {
  let code = result.tagset_codigo;
  
  // 1. Verificar se já é válido
  if (validCodes.has(code)) {
    return result;
  }
  
  // 2. Tentar correção conhecida
  if (CODE_CORRECTIONS[code]) {
    const correctedCode = CODE_CORRECTIONS[code];
    if (validCodes.has(correctedCode)) {
      console.log(`[reclassify-mg-words] Corrected: ${code} -> ${correctedCode}`);
      
      // Recalcular níveis baseado no código corrigido
      const parts = correctedCode.split('.');
      return {
        ...result,
        tagset_codigo: correctedCode,
        tagset_n1: parts[0] || 'MG',
        tagset_n2: parts.length >= 2 ? parts.slice(0, 2).join('.') : null,
        tagset_n3: parts.length >= 3 ? parts.slice(0, 3).join('.') : null,
        tagset_n4: parts.length >= 4 ? correctedCode : null,
      };
    }
  }
  
  // 3. Fallback para N3
  if (result.tagset_n3 && validCodes.has(result.tagset_n3)) {
    console.log(`[reclassify-mg-words] Fallback N4->N3: ${code} -> ${result.tagset_n3}`);
    return {
      ...result,
      tagset_codigo: result.tagset_n3,
      tagset_n4: null,
    };
  }
  
  // 4. Fallback para N2
  if (result.tagset_n2 && validCodes.has(result.tagset_n2)) {
    console.log(`[reclassify-mg-words] Fallback N4->N2: ${code} -> ${result.tagset_n2}`);
    return {
      ...result,
      tagset_codigo: result.tagset_n2,
      tagset_n3: null,
      tagset_n4: null,
    };
  }
  
  // 5. Último recurso: manter MG (N1)
  console.warn(`[reclassify-mg-words] Invalid code, fallback to MG: ${code}`);
  return {
    ...result,
    tagset_codigo: 'MG',
    tagset_n2: null,
    tagset_n3: null,
    tagset_n4: null,
  };
}

async function reclassifyWithGemini(words: WordWithKWIC[]): Promise<ReclassificationResult[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(words) }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from Gemini');
  }

  return extractJsonFromText(content);
}

async function reclassifyWithGPT5(words: WordWithKWIC[]): Promise<ReclassificationResult[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(words) }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GPT-5 API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from GPT-5');
  }

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

    console.log(`[reclassify-mg-words] Processing ${words.length} words with ${model}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // STEP 1: Fetch all valid MG codes from database
    const { data: validTagsets, error: tagsetError } = await supabase
      .from('semantic_tagset')
      .select('codigo')
      .like('codigo', 'MG%');

    if (tagsetError) {
      console.error('[reclassify-mg-words] Error fetching tagsets:', tagsetError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch valid tagsets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validCodes = new Set(validTagsets?.map(t => t.codigo) || []);
    console.log(`[reclassify-mg-words] Loaded ${validCodes.size} valid MG codes from database`);

    // STEP 2: Fetch song lyrics for KWIC extraction
    const songIds = [...new Set(words.filter(w => w.song_id).map(w => w.song_id!))];
    const songsMap = new Map<string, string>();
    
    if (songIds.length > 0) {
      console.log(`[reclassify-mg-words] Fetching lyrics for ${songIds.length} songs`);
      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select('id, letra')
        .in('id', songIds);
      
      if (!songsError && songs) {
        songs.forEach(s => {
          if (s.letra) songsMap.set(s.id, s.letra);
        });
        console.log(`[reclassify-mg-words] Loaded ${songsMap.size} song lyrics for KWIC`);
      }
    }

    // STEP 3: Enrich words with KWIC context
    const wordsWithKWIC: WordWithKWIC[] = words.map(w => {
      let kwic = '';
      if (w.song_id && songsMap.has(w.song_id)) {
        const letra = songsMap.get(w.song_id)!;
        kwic = extractKWIC(letra, w.palavra);
      }
      return { ...w, kwic };
    });
    
    const wordsWithContext = wordsWithKWIC.filter(w => w.kwic).length;
    console.log(`[reclassify-mg-words] ${wordsWithContext}/${words.length} words have KWIC context`);

    // STEP 4: Reclassify using selected model
    let results: ReclassificationResult[];
    const sourceLabel = model === 'gpt5' ? 'gpt5_mg_refinement' : 'gemini_flash_mg_refinement';
    
    try {
      results = model === 'gpt5' 
        ? await reclassifyWithGPT5(wordsWithKWIC)
        : await reclassifyWithGemini(wordsWithKWIC);
    } catch (apiError) {
      console.error(`[reclassify-mg-words] ${model} failed, trying fallback:`, apiError);
      
      // Try fallback model
      results = model === 'gpt5'
        ? await reclassifyWithGemini(wordsWithKWIC)
        : await reclassifyWithGPT5(wordsWithKWIC);
    }

    console.log(`[reclassify-mg-words] Got ${results.length} classifications from AI`);

    // STEP 3: Validate and fix each result
    let updated = 0;
    let corrected = 0;
    let errors: string[] = [];

    for (const result of results) {
      // Find the original word entry
      const originalWord = words.find(w => w.palavra === result.palavra);
      if (!originalWord) {
        errors.push(`Word not found: ${result.palavra}`);
        continue;
      }

      // Validate and fix the code
      const originalCode = result.tagset_codigo;
      const validatedResult = validateAndFixCode(result, validCodes);
      
      if (validatedResult.tagset_codigo !== originalCode) {
        corrected++;
      }

      // Update the database with validated code
      const { error } = await supabase
        .from('semantic_disambiguation_cache')
        .update({
          tagset_codigo: validatedResult.tagset_codigo,
          tagset_n1: validatedResult.tagset_n1,
          tagset_n2: validatedResult.tagset_n2,
          tagset_n3: validatedResult.tagset_n3,
          tagset_n4: validatedResult.tagset_n4,
          confianca: validatedResult.confianca,
          fonte: sourceLabel,
          cached_at: new Date().toISOString(),
        })
        .eq('id', originalWord.id);

      if (error) {
        errors.push(`Update failed for ${result.palavra}: ${error.message}`);
        console.error(`[reclassify-mg-words] DB update error for "${result.palavra}":`, error);
      } else {
        updated++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[reclassify-mg-words] Completed: ${updated}/${words.length} updated (${corrected} corrected) in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: words.length,
        updated,
        corrected,
        errors: errors.length > 0 ? errors : undefined,
        model: model,
        source: sourceLabel,
        duration,
        results: results.map(r => {
          const validated = validateAndFixCode(r, validCodes);
          return {
            ...r,
            tagset_codigo_validated: validated.tagset_codigo,
            was_corrected: r.tagset_codigo !== validated.tagset_codigo,
          };
        }),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reclassify-mg-words] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
