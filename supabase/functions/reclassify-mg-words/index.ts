/**
 * Edge Function: reclassify-mg-words
 * Reclassifica palavras MG (Marcadores Gramaticais) de N1 para níveis mais específicos (N2-N4)
 * usando Gemini ou GPT-5 com prompt especializado na hierarquia MG
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

// Hierarquia completa de MG para o prompt
const MG_HIERARCHY = `
HIERARQUIA COMPLETA DE MARCADORES GRAMATICAIS (MG):

MG - Marcadores Gramaticais (N1)
├── MG.AUX - Auxiliar Verbal (N2)
│   ├── MG.AUX.TEM - Tempo Composto (N3): ter, haver + particípio
│   ├── MG.AUX.VOZ - Voz Passiva (N3): ser + particípio
│   └── MG.AUX.LOC - Locução Verbal (N3): ir, estar, poder + infinitivo/gerúndio
├── MG.CON - Conectores (N2)
│   ├── MG.CON.ORA - Oracionais (N3)
│   │   ├── MG.CON.ORA.ADI - Aditivos (N4): e, nem, também, além disso
│   │   ├── MG.CON.ORA.ADV - Adversativos (N4): mas, porém, contudo, todavia
│   │   ├── MG.CON.ORA.ALT - Alternativos (N4): ou, ora...ora, quer...quer
│   │   ├── MG.CON.ORA.CON - Conclusivos (N4): portanto, logo, assim, então
│   │   └── MG.CON.ORA.EXP - Explicativos (N4): pois, porque, que
│   ├── MG.CON.SUB - Subordinativos (N3)
│   │   ├── MG.CON.SUB.CAU - Causais (N4): porque, já que, visto que
│   │   ├── MG.CON.SUB.CON - Condicionais (N4): se, caso, desde que
│   │   ├── MG.CON.SUB.TEM - Temporais (N4): quando, enquanto, assim que
│   │   ├── MG.CON.SUB.FIN - Finais (N4): para que, a fim de que
│   │   └── MG.CON.SUB.CES - Concessivos (N4): embora, ainda que, mesmo que
│   └── MG.CON.PRE - Preposições (N3)
│       ├── MG.CON.PRE.ESS - Essenciais (N4): de, a, para, em, com, por, sem
│       └── MG.CON.PRE.ACI - Acidentais (N4): durante, mediante, conforme
├── MG.DET - Determinantes (N2)
│   ├── MG.DET.ART - Artigos (N3)
│   │   ├── MG.DET.ART.DEF - Definidos (N4): o, a, os, as
│   │   └── MG.DET.ART.IND - Indefinidos (N4): um, uma, uns, umas
│   ├── MG.DET.DEM - Demonstrativos (N3): este, esse, aquele, isto, isso
│   ├── MG.DET.POS - Possessivos (N3): meu, teu, seu, nosso, vosso
│   └── MG.DET.IND - Indefinidos (N3): algum, nenhum, todo, qualquer, outro
├── MG.PRO - Pronomes (N2)
│   ├── MG.PRO.PES - Pessoais (N3)
│   │   ├── MG.PRO.PES.RET - Retos (N4): eu, tu, ele, nós, vós, eles
│   │   └── MG.PRO.PES.OBL - Oblíquos (N4): me, te, se, lhe, nos, vos
│   ├── MG.PRO.REL - Relativos (N3): que, qual, quem, cujo, onde
│   ├── MG.PRO.INT - Interrogativos (N3): que, qual, quem, quanto
│   └── MG.PRO.IND - Indefinidos (N3): alguém, ninguém, tudo, nada, algo
├── MG.ADV - Advérbios Funcionais (N2)
│   ├── MG.ADV.NEG - Negação (N3): não, nunca, jamais
│   ├── MG.ADV.AFI - Afirmação (N3): sim, certamente, realmente
│   ├── MG.ADV.DUV - Dúvida (N3): talvez, possivelmente, provavelmente
│   └── MG.ADV.INT - Intensificadores (N3): muito, pouco, bastante, mais, menos
├── MG.NUM - Numerais (N2)
│   ├── MG.NUM.CAR - Cardinais (N3): um, dois, três, cem, mil
│   ├── MG.NUM.ORD - Ordinais (N3): primeiro, segundo, terceiro
│   └── MG.NUM.MUL - Multiplicativos (N3): dobro, triplo, quádruplo
└── MG.INT - Interjeições (N2)
    ├── MG.INT.EMO - Emoção (N3): ah, oh, ai, ui
    └── MG.INT.APE - Apelativas (N3): psiu, ô, ei, alô
`;

const SYSTEM_PROMPT = `Você é um especialista em gramática portuguesa com foco em classificação morfossintática.

Sua tarefa é classificar marcadores gramaticais (MG) no subnível mais específico possível da hierarquia fornecida.

${MG_HIERARCHY}

REGRAS DE CLASSIFICAÇÃO:
1. SEMPRE classifique no nível mais específico possível (prefira N4 sobre N3, N3 sobre N2)
2. Para palavras ambíguas, considere o contexto e POS tag fornecidos
3. Para contrações (do, da, no, na), classifique pela preposição + artigo (MG.CON.PRE.ESS + MG.DET.ART.DEF)
4. Se não houver subnível específico, use o nível mais granular disponível
5. Forneça confiança entre 0.70 e 1.00 baseado na certeza da classificação

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

function buildPrompt(words: WordToReclassify[]): string {
  const wordList = words.map(w => 
    `- "${w.palavra}" (lema: ${w.lema || w.palavra}, POS: ${w.pos || 'desconhecido'})`
  ).join('\n');
  
  return `Classifique os seguintes marcadores gramaticais no subnível mais específico:

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

async function reclassifyWithGemini(words: WordToReclassify[]): Promise<ReclassificationResult[]> {
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

async function reclassifyWithGPT5(words: WordToReclassify[]): Promise<ReclassificationResult[]> {
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

    // Reclassify using selected model
    let results: ReclassificationResult[];
    const sourceLabel = model === 'gpt5' ? 'gpt5_mg_refinement' : 'gemini_flash_mg_refinement';
    
    try {
      results = model === 'gpt5' 
        ? await reclassifyWithGPT5(words)
        : await reclassifyWithGemini(words);
    } catch (apiError) {
      console.error(`[reclassify-mg-words] ${model} failed, trying fallback:`, apiError);
      
      // Try fallback model
      results = model === 'gpt5'
        ? await reclassifyWithGemini(words)
        : await reclassifyWithGPT5(words);
    }

    console.log(`[reclassify-mg-words] Got ${results.length} classifications`);

    // Update semantic_disambiguation_cache
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let updated = 0;
    let errors: string[] = [];

    for (const result of results) {
      // Find the original word entry
      const originalWord = words.find(w => w.palavra === result.palavra);
      if (!originalWord) {
        errors.push(`Word not found: ${result.palavra}`);
        continue;
      }

      const { error } = await supabase
        .from('semantic_disambiguation_cache')
        .update({
          tagset_codigo: result.tagset_codigo,
          tagset_n1: result.tagset_n1,
          tagset_n2: result.tagset_n2,
          tagset_n3: result.tagset_n3,
          tagset_n4: result.tagset_n4,
          confianca: result.confianca,
          fonte: sourceLabel,
          cached_at: new Date().toISOString(),
        })
        .eq('id', originalWord.id);

      if (error) {
        errors.push(`Update failed for ${result.palavra}: ${error.message}`);
      } else {
        updated++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[reclassify-mg-words] Completed: ${updated}/${words.length} updated in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: words.length,
        updated,
        errors: errors.length > 0 ? errors : undefined,
        model: model,
        source: sourceLabel,
        duration,
        results,
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
