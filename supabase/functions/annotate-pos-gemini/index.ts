import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { createHealthCheck } from "../_shared/health-check.ts";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface POSToken {
  palavra: string;
  pos?: string;
  lema?: string;
  confidence?: number;
}

interface GeminiPOSRequest {
  tokens: POSToken[];
  context?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('annotate-pos-gemini', requestId);

  // Health check
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.get('health') === 'true') {
    const health = await createHealthCheck('annotate-pos-gemini', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { tokens, context }: GeminiPOSRequest = await req.json();

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tokens provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Processing POS annotation with Gemini', { tokenCount: tokens.length });

    // Check cache first
    const wordsToAnnotate: POSToken[] = [];
    const cachedResults: POSToken[] = [];

    for (const token of tokens) {
      const contextHash = context ? btoa(context).slice(0, 16) : 'default';
      const { data: cached } = await supabaseClient
        .from('gemini_pos_cache')
        .select('*')
        .eq('palavra', token.palavra.toLowerCase())
        .eq('contexto_hash', contextHash)
        .single();

      if (cached) {
        cachedResults.push({
          palavra: token.palavra,
          pos: cached.pos || undefined,
          lema: cached.lema || undefined,
          confidence: cached.confianca || undefined,
        });
        log.debug('Cache hit', { palavra: token.palavra });
      } else {
        wordsToAnnotate.push(token);
      }
    }

    // Annotate uncached tokens with Gemini
    const geminiResults: POSToken[] = [];
    
    if (wordsToAnnotate.length > 0) {
      const prompt = `Você é um anotador linguístico especializado em POS tagging (Part-of-Speech) para português brasileiro, com foco em variações regionais gaúchas.

**Tarefa:** Para cada palavra abaixo, retorne o POS tag (classe gramatical) no formato Universal Dependencies (UD) e o lema (forma base).

**Contexto:** ${context || 'Sem contexto adicional'}

**Palavras:** ${wordsToAnnotate.map(t => t.palavra).join(', ')}

**Tags UD disponíveis:**
- VERB (verbo)
- NOUN (substantivo)
- ADJ (adjetivo)
- ADV (advérbio)
- PRON (pronome)
- DET (determinante)
- ADP (preposição)
- CONJ (conjunção)
- NUM (numeral)
- INTJ (interjeição)
- PROPN (nome próprio)
- PART (partícula)
- PUNCT (pontuação)
- SYM (símbolo)
- X (outros)

**Retorne JSON:**
{
  "annotations": [
    { "palavra": "exemplo", "pos": "NOUN", "lema": "exemplo", "confidence": 0.95 }
  ]
}`;

      const { data: aiResult, error: aiError } = await supabaseClient.functions.invoke('lovable-ai', {
        body: {
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é um especialista em anotação linguística POS tagging.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        },
      });

      if (aiError) throw aiError;

      const responseText = aiResult.choices?.[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const annotations = parsed.annotations || [];

        // Cache results
        const contextHash = context ? btoa(context).slice(0, 16) : 'default';
        
        for (const annotation of annotations) {
          geminiResults.push(annotation);
          
          // Save to cache
          await supabaseClient
            .from('gemini_pos_cache')
            .upsert({
              palavra: annotation.palavra.toLowerCase(),
              contexto_hash: contextHash,
              pos: annotation.pos,
              lema: annotation.lema,
              confianca: annotation.confidence,
              pos_detalhada: annotation.pos,
            }, {
              onConflict: 'palavra,contexto_hash'
            });
        }

        log.info('Gemini annotation complete', { 
          annotated: annotations.length,
          cached: cachedResults.length 
        });
      }
    }

    // Combine results
    const allResults = [...cachedResults, ...geminiResults];

    // Log API usage
    await supabaseClient
      .from('gemini_pos_api_usage')
      .insert({
        function_name: 'annotate-pos-gemini',
        tokens_input: prompt?.length || 0,
        tokens_output: geminiResults.length,
        tokens_annotated: wordsToAnnotate.length,
        cached_hits: cachedResults.length,
        cost_usd: (wordsToAnnotate.length * 0.001), // Estimated
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        annotations: allResults,
        stats: {
          total: tokens.length,
          cached: cachedResults.length,
          annotated: geminiResults.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    log.error('POS annotation error', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
