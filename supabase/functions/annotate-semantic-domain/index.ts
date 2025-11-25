import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnotationRequest {
  palavra: string;
  lema?: string;
  pos?: string;
  contexto_esquerdo?: string;
  contexto_direito?: string;
}

interface SemanticDomainResult {
  tagset_codigo: string;
  confianca: number;
  fonte: 'cache' | 'gemini_flash' | 'rule_based';
  justificativa?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const logger = createEdgeLogger('annotate-semantic-domain', requestId);
  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody: AnnotationRequest = await req.json();
    const { palavra, lema, pos, contexto_esquerdo = '', contexto_direito = '' } = requestBody;

    logger.info('Iniciando anotação semântica', { palavra, lema, pos });

    // 1️⃣ Verificar cache primeiro
    const contextoHash = await hashContext(contexto_esquerdo, contexto_direito);
    const cachedResult = await checkSemanticCache(supabaseClient, palavra, contextoHash);

    if (cachedResult) {
      logger.info('Cache hit', { palavra, tagset: cachedResult.tagset_codigo });
      
      // Incrementar hit count
      await supabaseClient.rpc('increment_semantic_cache_hit', { cache_id: cachedResult.id });

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            tagset_codigo: cachedResult.tagset_codigo,
            confianca: cachedResult.confianca,
            fonte: 'cache',
            justificativa: cachedResult.justificativa,
          },
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2️⃣ Aplicar regras contextuais (fallback rápido)
    const ruleBasedResult = applyContextualRules(palavra, lema, pos);
    if (ruleBasedResult) {
      logger.info('Rule-based classification', { palavra, tagset: ruleBasedResult.tagset_codigo });
      
      // Salvar no cache
      await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, ruleBasedResult);

      return new Response(
        JSON.stringify({
          success: true,
          result: ruleBasedResult,
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3️⃣ Chamar Gemini Flash via Lovable AI Gateway
    const geminiResult = await classifyWithGemini(
      palavra,
      lema || palavra,
      pos || 'UNKNOWN',
      contexto_esquerdo,
      contexto_direito,
      logger
    );

    if (!geminiResult) {
      throw new Error('Gemini classification failed');
    }

    // 4️⃣ Salvar resultado no cache
    await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, geminiResult);

    logger.info('Anotação semântica concluída', {
      palavra,
      tagset: geminiResult.tagset_codigo,
      fonte: geminiResult.fonte,
      processingTime: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        result: geminiResult,
        processingTime: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro na anotação semântica', errorObj);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorObj.message,
        processingTime: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Hash simples do contexto
 */
async function hashContext(left: string, right: string): Promise<string> {
  const combined = `${left}|${right}`.toLowerCase();
  const msgUint8 = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Verificar cache
 */
async function checkSemanticCache(supabase: any, palavra: string, contextoHash: string) {
  const { data, error } = await supabase
    .from('semantic_disambiguation_cache')
    .select('*')
    .eq('palavra', palavra.toLowerCase())
    .eq('contexto_hash', contextoHash)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Regras contextuais (fallback linguístico)
 */
function applyContextualRules(palavra: string, lema?: string, pos?: string): SemanticDomainResult | null {
  const lemaNorm = (lema || palavra).toLowerCase();
  
  // Regra 1: Sentimentos conhecidos
  const sentimentos = ['saudade', 'amor', 'paixão', 'dor', 'alegria', 'tristeza', 'verso', 'sonho'];
  if (sentimentos.includes(lemaNorm)) {
    return {
      tagset_codigo: 'SE',
      confianca: 0.98,
      fonte: 'rule_based',
      justificativa: 'Sentimento universal identificado por regra linguística',
    };
  }

  // Regra 2: Natureza conhecida
  const natureza = ['sol', 'lua', 'estrela', 'céu', 'campo', 'rio', 'vento', 'chuva', 'pampa', 'coxilha', 'várzea'];
  if (natureza.includes(lemaNorm)) {
    return {
      tagset_codigo: 'NA',
      confianca: 0.98,
      fonte: 'rule_based',
      justificativa: 'Elemento natural identificado por regra linguística',
    };
  }

  // Regra 3: Palavras funcionais (POS-based)
  if (pos && ['ADP', 'DET', 'CONJ', 'SCONJ', 'PRON'].includes(pos)) {
    return {
      tagset_codigo: 'PF',
      confianca: 0.99,
      fonte: 'rule_based',
      justificativa: 'Palavra funcional identificada por POS tag',
    };
  }

  // Regra 4: Verbos → Ações
  if (pos === 'VERB') {
    return {
      tagset_codigo: 'AV',
      confianca: 0.90,
      fonte: 'rule_based',
      justificativa: 'Verbo mapeado para domínio de Ações',
    };
  }

  // Regra 5: Adjetivos → Qualidades
  if (pos === 'ADJ') {
    return {
      tagset_codigo: 'QE',
      confianca: 0.85,
      fonte: 'rule_based',
      justificativa: 'Adjetivo mapeado para domínio de Qualidades',
    };
  }

  return null;
}

/**
 * Classificação com Gemini Flash via Lovable AI Gateway
 */
async function classifyWithGemini(
  palavra: string,
  lema: string,
  pos: string,
  contextoEsquerdo: string,
  contextoDireito: string,
  logger: any
): Promise<SemanticDomainResult | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurado');
  }

  const sentencaCompleta = `${contextoEsquerdo} **${palavra}** ${contextoDireito}`.trim();

  const prompt = `Você é um especialista em análise semântica de texto. Sua tarefa é classificar a palavra em destaque em um dos 18 domínios semânticos abaixo.

**18 DOMÍNIOS SEMÂNTICOS:**
- NA (Natureza e Paisagem): flora, fauna, elementos naturais, geografia
- CL (Cultura e Lida Gaúcha): artefatos culturais, tradições gaúchas, lida campeira
- SE (Sentimentos e Abstrações): emoções, estados mentais, conceitos abstratos
- AV (Ações e Processos): verbos de ação, processos, eventos
- QE (Qualidades e Estados): adjetivos descritivos, estados físicos/mentais
- CV (Corpo e Seres Vivos): partes do corpo, animais, seres vivos
- PF (Palavras Funcionais): artigos, preposições, conjunções
- AL (Alimentação e Bebidas): comidas, bebidas, erva-mate
- VR (Vestimentas e Arreios): roupas, pilchas, equipamentos de montaria
- LU (Lugares e Estruturas): locais físicos, construções
- TE (Tempo e Cronologia): períodos, estações, momentos
- MU (Música e Poesia): instrumentos, gêneros musicais
- SO (Relações Sociais): família, amizade, comunidade
- TR (Trabalho e Ferramentas): lida campeira, ferramentas
- AN (Animais e Pecuária): cavalos, gado, animais domésticos
- CO (Comércio e Economia): trocas, valores comerciais
- RE (Religiosidade e Crenças): fé, santos, crenças
- FE (Festas e Celebrações): rodeios, fandangos, celebrações

**CONTEXTO:**
Sentença: "${sentencaCompleta}"
Palavra: "${palavra}"
Lema: "${lema}"
POS: ${pos}

**EXEMPLOS:**
- "mate amargo" em "Cevou um mate pura-folha" → AL (Alimentação)
- "galpão" em "pelos cantos do galpão" → LU (Lugares)
- "saudade" em "saudade redomona" → SE (Sentimentos)
- "gateado" em "lombo de uma gateada" → AN (Animais)

**TAREFA:**
Retorne APENAS um JSON válido no formato:
{
  "tagset_codigo": "XX",
  "confianca": 0.95,
  "justificativa": "Breve explicação contextual"
}`;

  try {
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
          { role: 'system', content: 'Você é um classificador semântico preciso. Retorne APENAS JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    timer.end({ operation: 'gemini_classify', palavra });

    if (response.status === 429) {
      logger.warn('Rate limit atingido', { palavra });
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    if (response.status === 402) {
      logger.warn('Créditos esgotados', { palavra });
      throw new Error('PAYMENT_REQUIRED');
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erro na API Lovable', { status: response.status, error: errorText });
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('Resposta sem JSON válido', { content });
      throw new Error('Invalid Gemini response format');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validar campos obrigatórios
    if (!result.tagset_codigo || typeof result.confianca !== 'number') {
      throw new Error('Resposta Gemini incompleta');
    }

    logger.info('Classificação Gemini concluída', { 
      palavra, 
      tagset: result.tagset_codigo, 
      confianca: result.confianca 
    });

    return {
      tagset_codigo: result.tagset_codigo,
      confianca: result.confianca,
      fonte: 'gemini_flash',
      justificativa: result.justificativa || 'Classificação via Gemini Flash',
    };

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao classificar com Gemini', errorObj);
    
    // Fallback para domínio genérico baseado em POS
    if (pos === 'NOUN') return { tagset_codigo: 'NA', confianca: 0.60, fonte: 'rule_based', justificativa: 'Fallback: substantivo → Natureza' };
    if (pos === 'VERB') return { tagset_codigo: 'AV', confianca: 0.60, fonte: 'rule_based', justificativa: 'Fallback: verbo → Ações' };
    if (pos === 'ADJ') return { tagset_codigo: 'QE', confianca: 0.60, fonte: 'rule_based', justificativa: 'Fallback: adjetivo → Qualidades' };
    
    // Fallback final
    return { tagset_codigo: 'SE', confianca: 0.50, fonte: 'rule_based', justificativa: 'Fallback genérico' };
  }
}

/**
 * Salvar resultado no cache
 */
async function saveToCache(
  supabase: any,
  palavra: string,
  contextoHash: string,
  lema: string | undefined,
  pos: string | undefined,
  result: SemanticDomainResult
): Promise<void> {
  await supabase.from('semantic_disambiguation_cache').insert({
    palavra: palavra.toLowerCase(),
    contexto_hash: contextoHash,
    lema: lema || null,
    pos: pos || null,
    tagset_codigo: result.tagset_codigo,
    confianca: result.confianca,
    fonte: result.fonte,
    justificativa: result.justificativa,
  });
}
