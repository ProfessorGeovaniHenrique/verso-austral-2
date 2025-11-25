/**
 * 🤖 LAYER 3: GEMINI FLASH POS ANNOTATOR
 * 
 * Fallback final para palavras não cobertas por VA Grammar + spaCy
 * Usa few-shot learning para anotação morfossintática
 */

import type { AnnotatedToken } from './hybrid-pos-annotator.ts';
import { createSupabaseClient } from './supabase.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GEMINI_MODEL = 'google/gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 15000; // 15s timeout

interface GeminiPOSResponse {
  palavra: string;
  lema: string;
  pos: string;
  posDetalhada: string;
  features: {
    tempo?: string;
    numero?: string;
    pessoa?: string;
    genero?: string;
    modo?: string;
  };
  confianca: number;
  justificativa: string;
}

/**
 * Prompt few-shot para Gemini Flash
 */
const GEMINI_POS_PROMPT = `Você é um especialista em anotação morfossintática de português brasileiro.

Dada uma palavra dentro de um contexto, retorne a análise POS detalhada em JSON.

EXEMPLOS:

Entrada: palavra="estava", contexto="eu estava caminhando no campo"
Saída: {
  "palavra": "estava",
  "lema": "estar",
  "pos": "AUX",
  "posDetalhada": "AUX",
  "features": { "tempo": "Imperf", "numero": "Sing", "pessoa": "1" },
  "confianca": 0.95,
  "justificativa": "Verbo auxiliar 'estar' no pretérito imperfeito, 1ª pessoa singular"
}

Entrada: palavra="tuitou", contexto="ela tuitou sobre o assunto ontem"
Saída: {
  "palavra": "tuitou",
  "lema": "tuitar",
  "pos": "VERB",
  "posDetalhada": "VERB",
  "features": { "tempo": "Perf", "numero": "Sing", "pessoa": "3" },
  "confianca": 0.90,
  "justificativa": "Neologismo derivado de 'Twitter', verbo regular terminação -ou (pretérito perfeito 3ª pessoa)"
}

Entrada: palavra="aquerenciou", contexto="o verso aquerenciou a saudade"
Saída: {
  "palavra": "aquerenciou",
  "lema": "aquerenciar",
  "pos": "VERB",
  "posDetalhada": "VERB",
  "features": { "tempo": "Perf", "numero": "Sing", "pessoa": "3" },
  "confianca": 0.92,
  "justificativa": "Verbo regional gaúcho derivado de 'querência', pretérito perfeito 3ª pessoa"
}

Entrada: palavra="cuia", contexto="tomou mate na cuia amarga"
Saída: {
  "palavra": "cuia",
  "lema": "cuia",
  "pos": "NOUN",
  "posDetalhada": "NOUN",
  "features": { "genero": "Fem", "numero": "Sing" },
  "confianca": 0.98,
  "justificativa": "Substantivo feminino singular, objeto cultural gaúcho para tomar mate"
}

TAGS POS UNIVERSAIS PERMITIDAS:
- VERB (verbo principal)
- AUX (verbo auxiliar)
- NOUN (substantivo)
- ADJ (adjetivo)
- ADV (advérbio)
- PRON (pronome)
- DET (determinante/artigo)
- ADP (preposição)
- CCONJ (conjunção coordenativa)
- SCONJ (conjunção subordinativa)
- NUM (numeral)
- PART (partícula)
- INTJ (interjeição)
- PROPN (nome próprio)
- PUNCT (pontuação)
- X (outros)

IMPORTANTE:
- Use lematização correta do português brasileiro
- Considere o contexto completo da sentença
- Para neologismos, identifique o radical e a terminação
- Para regionalismos, use o contexto cultural quando disponível
- Se não tiver certeza, use confiança < 0.80
- Retorne APENAS o JSON, sem texto adicional

Agora analise a palavra abaixo:`;

/**
 * Gera hash do contexto
 */
function hashContext(context: string): string {
  const normalized = context.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Verifica cache antes de chamar Gemini
 */
async function checkGeminiPOSCache(
  palavra: string,
  contextoHash: string
): Promise<GeminiPOSResponse | null> {
  try {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('gemini_pos_cache')
      .select('*')
      .eq('palavra', palavra.toLowerCase())
      .eq('contexto_hash', contextoHash)
      .single();

    if (error || !data) return null;

    // Incrementar hit count
    await supabase
      .from('gemini_pos_cache')
      .update({ hits_count: (data.hits_count || 0) + 1 })
      .eq('id', data.id);

    return {
      palavra: data.palavra,
      lema: data.lema || palavra,
      pos: data.pos || 'UNKNOWN',
      posDetalhada: data.pos_detalhada || 'UNKNOWN',
      features: data.features || {},
      confianca: data.confianca || 0,
      justificativa: data.justificativa || ''
    };
  } catch (error) {
    console.error('❌ Erro ao buscar cache:', error);
    return null;
  }
}

/**
 * Salva resultado no cache
 */
async function saveToGeminiPOSCache(
  palavra: string,
  contextoHash: string,
  result: GeminiPOSResponse
): Promise<void> {
  try {
    const supabase = createSupabaseClient();
    
    await supabase
      .from('gemini_pos_cache')
      .upsert({
        palavra: palavra.toLowerCase(),
        contexto_hash: contextoHash,
        lema: result.lema,
        pos: result.pos,
        pos_detalhada: result.posDetalhada,
        features: result.features,
        confianca: result.confianca,
        justificativa: result.justificativa,
        cached_at: new Date().toISOString(),
        hits_count: 0
      }, {
        onConflict: 'palavra,contexto_hash'
      });
  } catch (error) {
    console.error('❌ Erro ao salvar cache:', error);
  }
}

/**
 * Registra uso da API Gemini
 */
async function logGeminiAPIUsage(
  tokensAnnotated: number,
  tokensInput: number,
  tokensOutput: number,
  cachedHits: number,
  latencyMs: number
): Promise<void> {
  try {
    const supabase = createSupabaseClient();
    
    // Gemini Flash pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens
    const costUSD = (tokensInput * 0.075 / 1000000) + (tokensOutput * 0.30 / 1000000);
    
    await supabase
      .from('gemini_pos_api_usage')
      .insert({
        function_name: 'annotate-pos',
        tokens_annotated: tokensAnnotated,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        cost_usd: costUSD,
        cached_hits: cachedHits,
        latency_ms: latencyMs
      });
  } catch (error) {
    console.error('❌ Erro ao registrar API usage:', error);
  }
}

/**
 * Extrai sentença contendo a palavra
 */
function extractSentence(fullText: string, targetWord: string): string {
  const sentences = fullText.split(/[.!?]\s+/);
  const sentence = sentences.find(s => 
    s.toLowerCase().includes(targetWord.toLowerCase())
  );
  return sentence || fullText.substring(0, 250);
}

/**
 * Anota um único token usando Gemini Flash
 */
async function annotateTokenWithGemini(
  token: AnnotatedToken,
  fullText: string
): Promise<AnnotatedToken> {
  try {
    const sentenceContext = extractSentence(fullText, token.palavra);
    const contextoHash = hashContext(sentenceContext);
    
    // ✅ VERIFICAR CACHE PRIMEIRO
    const cached = await checkGeminiPOSCache(token.palavra, contextoHash);
    if (cached) {
      console.log(`💾 Cache hit: ${token.palavra}`);
      return {
        ...token,
        lema: cached.lema,
        pos: cached.pos,
        posDetalhada: cached.posDetalhada,
        features: cached.features,
        source: 'cache',
        confianca: cached.confianca
      };
    }
    
    // ✅ CHAMAR LOVABLE AI GATEWAY
    console.log(`🔮 Lovable AI (Gemini Flash) - Anotando: "${token.palavra}"`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    
    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [
            { role: 'system', content: GEMINI_POS_PROMPT },
            { role: 'user', content: `palavra="${token.palavra}"\ncontexto="${sentenceContext}"` }
          ],
          temperature: 0.1,
          max_tokens: 250,
        })
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Tratamento específico de erros Lovable AI
      if (response.status === 429) {
        console.warn(`⚠️ Rate limit Lovable AI excedido - token: ${token.palavra}`);
      } else if (response.status === 402) {
        console.error(`❌ Créditos Lovable AI esgotados - verifique Settings → Workspace → Usage`);
      } else {
        console.error(`❌ Lovable AI Gateway error: ${response.status}`, errorText);
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }
    
    const data = await response.json();
    const textResponse = data.choices?.[0]?.message?.content || '{}';
    
    // Parsear JSON (remover markdown se presente)
    const cleanedText = textResponse.replace(/```json\n?|```\n?/g, '').trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Gemini não retornou JSON válido');
    }
    
    const parsed: GeminiPOSResponse = JSON.parse(jsonMatch[0]);
    
    // ✅ SALVAR NO CACHE
    await saveToGeminiPOSCache(token.palavra, contextoHash, parsed);
    
    return {
      ...token,
      lema: parsed.lema,
      pos: parsed.pos,
      posDetalhada: parsed.posDetalhada,
      features: parsed.features || {},
      source: 'gemini',
      confianca: parsed.confianca
    };
    
  } catch (error) {
    console.error(`❌ Erro ao anotar "${token.palavra}" com Gemini:`, error);
    return token; // Retornar inalterado
  }
}

/**
 * Anota tokens desconhecidos usando Gemini Flash
 */
export async function annotateWithGemini(
  unknownTokens: AnnotatedToken[],
  fullText: string
): Promise<{ annotations: AnnotatedToken[]; metrics: { cachedHits: number; apiCalls: number; tokensInput: number; tokensOutput: number; latency: number } }> {
  if (!LOVABLE_API_KEY) {
    console.warn('⚠️ LOVABLE_API_KEY não configurado - pulando Layer 3 (Gemini)');
    return {
      annotations: unknownTokens,
      metrics: { cachedHits: 0, apiCalls: 0, tokensInput: 0, tokensOutput: 0, latency: 0 }
    };
  }

  if (unknownTokens.length === 0) {
    return {
      annotations: [],
      metrics: { cachedHits: 0, apiCalls: 0, tokensInput: 0, tokensOutput: 0, latency: 0 }
    };
  }

  console.log(`✨ Layer 3 (Gemini): processando ${unknownTokens.length} tokens...`);
  
  const startTime = Date.now();
  const annotatedResults: AnnotatedToken[] = [];
  let cachedHits = 0;
  let apiCalls = 0;
  let tokensInput = 0;
  let tokensOutput = 0;

  // Processar em batches de 3 para otimizar custo/latência
  const BATCH_SIZE = 3;
  for (let i = 0; i < unknownTokens.length; i += BATCH_SIZE) {
    const batch = unknownTokens.slice(i, i + BATCH_SIZE);
    
    try {
      const batchPromises = batch.map(async token => {
        const result = await annotateTokenWithGemini(token, fullText);
        
        // Contar métricas
        if (result.source === 'cache') {
          cachedHits++;
        } else if (result.source === 'gemini') {
          apiCalls++;
          // Estimativa de tokens (palavra + contexto ≈ 50-100 tokens input)
          tokensInput += 100;
          tokensOutput += 50; // Resposta JSON ≈ 50 tokens
        }
        
        return result;
      });
      
      const batchResults = await Promise.all(batchPromises);
      annotatedResults.push(...batchResults);
      
    } catch (error) {
      console.error(`❌ Erro no batch ${i}-${i + BATCH_SIZE}:`, error);
      annotatedResults.push(...batch);
    }
  }

  const latency = Date.now() - startTime;
  const geminiCovered = annotatedResults.filter(t => t.pos !== 'UNKNOWN').length;
  console.log(`✅ Layer 3 (Gemini): ${geminiCovered}/${unknownTokens.length} cobertos | Cache: ${cachedHits} | API: ${apiCalls} (${latency}ms)`);

  // Registrar uso da API
  if (apiCalls > 0 || cachedHits > 0) {
    await logGeminiAPIUsage(unknownTokens.length, tokensInput, tokensOutput, cachedHits, latency);
  }

  return {
    annotations: annotatedResults,
    metrics: { cachedHits, apiCalls, tokensInput, tokensOutput, latency }
  };
}

/**
 * Limpa cache expirado (>30 dias)
 */
export async function cleanExpiredGeminiCache(): Promise<number> {
  try {
    const supabase = createSupabaseClient();
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data, error } = await supabase
      .from('gemini_pos_cache')
      .delete()
      .lt('cached_at', thirtyDaysAgo.toISOString())
      .select('id');

    if (error) throw error;
    
    return data?.length || 0;
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
    return 0;
  }
}
