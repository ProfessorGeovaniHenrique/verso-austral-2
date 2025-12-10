import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";
import { getLexiconRule, GUTENBERG_POS_TO_DOMAIN } from "../_shared/semantic-rules-lexicon.ts";
import { propagateSemanticDomain, inheritDomainFromSynonyms } from "../_shared/synonym-propagation.ts";
import { getGutenbergPOS } from "../_shared/gutenberg-pos-lookup.ts";
import { classifySafeStopword, isContextDependent } from "../_shared/stopwords-classifier.ts";
import { getLexiconClassification, getLexiconBase } from "../_shared/semantic-lexicon-lookup.ts";
import { applyMorphologicalRules, hasMorphologicalPattern } from "../_shared/morphological-rules.ts";
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// ============= INTERFACES =============

interface AnnotationRequest {
  palavra: string;
  lema?: string;
  pos?: string;
  contexto_esquerdo?: string;
  contexto_direito?: string;
}

interface BatchAnnotationRequest {
  words: string[];
  context?: string;
}

interface SemanticDomainResult {
  tagset_codigo: string;
  confianca: number;
  fonte: 'cache' | 'gemini_flash' | 'rule_based';
  justificativa?: string;
}

interface SemanticAnnotation {
  palavra: string;
  tagset_primario: string;
  tagset_codigo: string;
  dominio_nome: string;
  cor: string;
  confianca: number;
  prosody: 'Positiva' | 'Negativa' | 'Neutra';
}

// ============= N1 COLORS (mirrors frontend) =============
const N1_COLORS: Record<string, string> = {
  'NA': '#268BC8', 'SE': '#8B5CF6', 'AB': '#A855F7',
  'AC': '#FF9500', 'AP': '#24A65B', 'CC': '#F59E0B',
  'EL': '#6366F1', 'EQ': '#EC4899', 'MG': '#64748B',
  'NC': '#94A3B8', 'OA': '#14B8A6', 'SB': '#10B981',
  'SH': '#DC2626', 'SP': '#8B5CF6'
};

function getColorForDomain(n1Code: string): string {
  return N1_COLORS[n1Code] || '#94A3B8';
}

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

    // 🆕 MODO BATCH: Detectar array de palavras
    if (Array.isArray(requestBody.words)) {
      return await handleBatchMode(requestBody as BatchAnnotationRequest, supabaseClient, logger, startTime);
    }

    // Modo singular existente continua funcionando
    const { palavra, lema, pos, contexto_esquerdo = '', contexto_direito = '' } = requestBody as AnnotationRequest;

    if (!palavra) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo "palavra" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Iniciando anotação semântica (modo singular)', { palavra, lema, pos });

    // 0️⃣ FASE 1: Verificar stopwords "safe" PRIMEIRO (0ms, confiança 0.99)
    const safeStopword = classifySafeStopword(palavra);
    if (safeStopword) {
      logger.info('Safe stopword matched', { palavra, tagset: safeStopword.tagset_codigo });
      
      // Salvar no cache e retornar
      const contextoHash = await hashContext(contexto_esquerdo, contexto_direito);
      await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, {
        tagset_codigo: safeStopword.tagset_codigo,
        confianca: safeStopword.confianca,
        fonte: 'rule_based',
        justificativa: safeStopword.justificativa,
      });

      return new Response(
        JSON.stringify({
          success: true,
          result: safeStopword,
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1️⃣ FASE 2: Cache de dois níveis
    const contextoHash = await hashContext(contexto_esquerdo, contexto_direito);
    
    // Nível 1: Cache primário (palavra apenas, alta confiança, não-polissêmica)
    const wordOnlyCache = await checkWordOnlyCache(supabaseClient, palavra);
    if (wordOnlyCache) {
      logger.info('Cache hit (word-only)', { palavra, tagset: wordOnlyCache.tagset_codigo });
      
      await supabaseClient.rpc('increment_semantic_cache_hit', { cache_id: wordOnlyCache.id });

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            tagset_codigo: wordOnlyCache.tagset_codigo,
            confianca: wordOnlyCache.confianca,
            fonte: 'cache',
            justificativa: wordOnlyCache.justificativa,
          },
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Nível 2: Cache secundário (palavra + contexto para polissêmicas)
    const contextCache = await checkSemanticCache(supabaseClient, palavra, contextoHash);
    if (contextCache) {
      logger.info('Cache hit (contexto)', { palavra, tagset: contextCache.tagset_codigo });
      
      await supabaseClient.rpc('increment_semantic_cache_hit', { cache_id: contextCache.id });

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            tagset_codigo: contextCache.tagset_codigo,
            confianca: contextCache.confianca,
            fonte: 'cache',
            justificativa: contextCache.justificativa,
          },
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2️⃣ NOVA CAMADA: Verificar semantic_lexicon (léxico pré-classificado)
    const lexiconResult = await getLexiconClassification(palavra.toLowerCase());
    if (lexiconResult) {
      logger.info('Semantic lexicon hit', {
        palavra,
        tagset: lexiconResult.tagset_n1,
        fonte: lexiconResult.fonte,
        confianca: lexiconResult.confianca
      });

      const result = {
        tagset_codigo: lexiconResult.tagset_n1,
        confianca: lexiconResult.confianca,
        fonte: 'rule_based' as const,
        justificativa: `Lexicon pré-classificado (${lexiconResult.fonte})`,
      };

      await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, result);

      return new Response(
        JSON.stringify({
          success: true,
          result,
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2.5️⃣ NOVA CAMADA: Aplicar regras morfológicas (zero-cost)
    if (hasMorphologicalPattern(palavra.toLowerCase())) {
      const morphResult = await applyMorphologicalRules(
        palavra.toLowerCase(),
        pos,
        getLexiconBase
      );

      if (morphResult) {
        logger.info('Morphological rule applied', {
          palavra,
          tagset: morphResult.tagset_n1,
          fonte: morphResult.fonte,
          rule: morphResult.rule_description
        });

        const result = {
          tagset_codigo: morphResult.tagset_n1,
          confianca: morphResult.confianca,
          fonte: 'rule_based' as const,
          justificativa: `Regra morfológica: ${morphResult.rule_description}`,
        };

        await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, result);

        return new Response(
          JSON.stringify({
            success: true,
            result,
            processingTime: Date.now() - startTime,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4️⃣ Verificar regras do léxico dialetal
    const lexiconRule = await getLexiconRule(palavra);
    if (lexiconRule) {
      logger.info('Lexicon rule matched', { palavra, tagset: lexiconRule.tagset_codigo });
      
      await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, {
        tagset_codigo: lexiconRule.tagset_codigo,
        confianca: lexiconRule.confianca,
        fonte: 'rule_based',
        justificativa: lexiconRule.justificativa,
      });

      // 🔄 FASE 2: Propagar domínio para sinônimos
      try {
        const propagationResult = await propagateSemanticDomain(
          palavra,
          lexiconRule.tagset_codigo,
          lexiconRule.confianca
        );
        logger.info('Synonym propagation', { 
          palavra, 
          propagated: propagationResult.propagated,
          synonyms: propagationResult.synonyms.length 
        });
      } catch (error) {
        logger.warn('Erro na propagação de sinônimos', { error: error instanceof Error ? error.message : String(error) });
      }

      return new Response(
        JSON.stringify({
          success: true,
          result: lexiconRule,
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4.5️⃣ Tentar herdar domínio de sinônimos
    const inheritedDomain = await inheritDomainFromSynonyms(palavra);
    if (inheritedDomain) {
      logger.info('Domain inherited from synonym', { 
        palavra, 
        tagset: inheritedDomain.tagset_codigo,
        synonymSource: inheritedDomain.synonymSource 
      });
      
      await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, inheritedDomain);

      return new Response(
        JSON.stringify({
          success: true,
          result: inheritedDomain,
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5️⃣ Aplicar regras contextuais (fallback rápido)
    const ruleBasedResult = applyContextualRules(palavra, lema, pos);
    if (ruleBasedResult) {
      logger.info('Rule-based classification', { palavra, tagset: ruleBasedResult.tagset_codigo });
      
      await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, ruleBasedResult);

      // 🔄 FASE 2: Propagar domínio para sinônimos
      try {
        const propagationResult = await propagateSemanticDomain(
          palavra,
          ruleBasedResult.tagset_codigo,
          ruleBasedResult.confianca
        );
        logger.info('Synonym propagation', { 
          palavra, 
          propagated: propagationResult.propagated 
        });
      } catch (error) {
        logger.warn('Erro na propagação de sinônimos', { error: error instanceof Error ? error.message : String(error) });
      }

      return new Response(
        JSON.stringify({
          success: true,
          result: ruleBasedResult,
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5.5️⃣ Tentar mapear via classe gramatical do Gutenberg
    const gutenbergPOS = await getGutenbergPOS(palavra);
    if (gutenbergPOS) {
      const gutenbergMapping = GUTENBERG_POS_TO_DOMAIN[gutenbergPOS.pos];
      
      if (gutenbergMapping) {
        logger.info('Gutenberg grammatical class mapped', { 
          palavra, 
          pos: gutenbergPOS.pos,
          tagset: gutenbergMapping.codigo 
        });
        
        const gutenbergResult: SemanticDomainResult = {
          tagset_codigo: gutenbergMapping.codigo,
          confianca: gutenbergMapping.confianca,
          fonte: 'rule_based',
          justificativa: `Mapeado via classe gramatical Gutenberg: ${gutenbergPOS.pos} → ${gutenbergMapping.codigo}`,
        };

        await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, gutenbergResult);

        return new Response(
          JSON.stringify({
            success: true,
            result: gutenbergResult,
            processingTime: Date.now() - startTime,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 6️⃣ Chamar Gemini Flash via Lovable AI Gateway (fallback final)
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

    // 5️⃣ Salvar resultado no cache
    await saveToCache(supabaseClient, palavra, contextoHash, lema, pos, geminiResult);

    // 🔄 FASE 2: Propagar domínio para sinônimos
    try {
      const propagationResult = await propagateSemanticDomain(
        palavra,
        geminiResult.tagset_codigo,
        geminiResult.confianca
      );
      logger.info('Synonym propagation after Gemini', { 
        palavra, 
        propagated: propagationResult.propagated 
      });
    } catch (error) {
      logger.warn('Erro na propagação de sinônimos', { error: error instanceof Error ? error.message : String(error) });
    }

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
 * Cache Nível 1: Busca por palavra apenas (alta confiança + não-polissêmica)
 */
async function checkWordOnlyCache(supabase: any, palavra: string) {
  const palavraNorm = palavra.toLowerCase();
  
  // Buscar entrada com maior confiança
  const { data: wordCache, error } = await supabase
    .from('semantic_disambiguation_cache')
    .select('id, tagset_codigo, confianca, justificativa')
    .eq('palavra', palavraNorm)
    .gte('confianca', 0.90)
    .order('confianca', { ascending: false })
    .limit(1)
    .single();

  if (error || !wordCache) return null;
  
  // Verificar se palavra é polissêmica (múltiplos domínios)
  const { count } = await supabase
    .from('semantic_disambiguation_cache')
    .select('*', { count: 'exact', head: true })
    .eq('palavra', palavraNorm)
    .neq('tagset_codigo', wordCache.tagset_codigo);
  
  // Se tem outros domínios, é polissêmica → não usar cache nível 1
  if (count && count > 0) {
    return null;
  }
  
  return wordCache;
}

/**
 * Cache Nível 2: Busca por palavra + contexto (fallback para polissêmicas)
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
 * Regras contextuais (fallback linguístico) com classificação N2
 * NOTA: Stopwords context-dependent (que, como, onde) NÃO passam por aqui - vão direto pro Gemini
 */
function applyContextualRules(palavra: string, lema?: string, pos?: string): SemanticDomainResult | null {
  const lemaNorm = (lema || palavra).toLowerCase();
  
  // Bloquear context-dependent stopwords (forçar Gemini)
  if (isContextDependent(lemaNorm)) {
    return null;
  }
  
  // Regra 1: Sentimentos específicos (N2) - CÓDIGOS ATUALIZADOS
  const sentimentosMap: Record<string, { codigo: string; justificativa: string }> = {
    'saudade': { codigo: 'SE.TRI', justificativa: 'Sentimento de saudade/nostalgia (tristeza)' },
    'nostalgia': { codigo: 'SE.TRI', justificativa: 'Sentimento nostálgico (tristeza)' },
    'amor': { codigo: 'SE.AMO', justificativa: 'Sentimento de amor/afeto' },
    'paixão': { codigo: 'SE.AMO', justificativa: 'Sentimento de amor/paixão' },
    'carinho': { codigo: 'SE.AMO', justificativa: 'Sentimento de carinho/afeto' },
    'alegria': { codigo: 'SE.ALE', justificativa: 'Sentimento de alegria (positivo)' },
    'felicidade': { codigo: 'SE.ALE', justificativa: 'Sentimento de felicidade (positivo)' },
    'esperança': { codigo: 'SE.ALE', justificativa: 'Sentimento de esperança (positivo)' },
    'dor': { codigo: 'SE.TRI', justificativa: 'Sentimento de dor emocional (tristeza)' },
    'tristeza': { codigo: 'SE.TRI', justificativa: 'Sentimento de tristeza' },
    'medo': { codigo: 'SE.MED', justificativa: 'Sentimento de medo' },
    'temor': { codigo: 'SE.MED', justificativa: 'Sentimento de temor/receio' },
    'raiva': { codigo: 'SE.RAI', justificativa: 'Sentimento de raiva/ira' },
    'ódio': { codigo: 'SE.RAI', justificativa: 'Sentimento de ódio' },
    'verso': { codigo: 'CC.ART', justificativa: 'Arte poética' },
    'sonho': { codigo: 'AB.EXI', justificativa: 'Conceito existencial' },
  };
  if (lemaNorm in sentimentosMap) {
    const mapping = sentimentosMap[lemaNorm];
    return {
      tagset_codigo: mapping.codigo,
      confianca: 0.98,
      fonte: 'rule_based',
      justificativa: mapping.justificativa,
    };
  }

  // Regra 2: Natureza específica (N2) - CÓDIGOS ATUALIZADOS
  const naturezaMap: Record<string, { codigo: string; justificativa: string }> = {
    // Fenômenos Naturais (NA.FN) e Elementos Celestes (NA.EC)
    'sol': { codigo: 'NA.EC', justificativa: 'Elemento celeste' },
    'lua': { codigo: 'NA.EC', justificativa: 'Elemento celeste' },
    'estrela': { codigo: 'NA.EC', justificativa: 'Elemento celeste' },
    'céu': { codigo: 'NA.EC', justificativa: 'Elemento celeste' },
    'chuva': { codigo: 'NA.FN', justificativa: 'Fenômeno natural' },
    'vento': { codigo: 'NA.FN', justificativa: 'Fenômeno natural' },
    'tempestade': { codigo: 'NA.FN', justificativa: 'Fenômeno natural' },
    'neve': { codigo: 'NA.FN', justificativa: 'Fenômeno natural' },
    // Geografia (NA.GE)
    'campo': { codigo: 'NA.GE', justificativa: 'Geografia/paisagem' },
    'rio': { codigo: 'NA.GE', justificativa: 'Geografia/hidrografia' },
    'pampa': { codigo: 'NA.GE', justificativa: 'Geografia regional' },
    'coxilha': { codigo: 'NA.GE', justificativa: 'Geografia regional gaúcha' },
    'várzea': { codigo: 'NA.GE', justificativa: 'Geografia/topografia' },
    'serra': { codigo: 'NA.GE', justificativa: 'Geografia/relevo' },
    'montanha': { codigo: 'NA.GE', justificativa: 'Geografia/relevo' },
    // Flora (NA.FL)
    'árvore': { codigo: 'NA.FL', justificativa: 'Flora' },
    'flor': { codigo: 'NA.FL', justificativa: 'Flora' },
    'planta': { codigo: 'NA.FL', justificativa: 'Flora' },
    'mato': { codigo: 'NA.FL', justificativa: 'Flora' },
    'erva': { codigo: 'NA.FL', justificativa: 'Flora' },
    // Fauna (NA.FA)
    'cavalo': { codigo: 'NA.FA', justificativa: 'Fauna doméstica' },
    'gado': { codigo: 'NA.FA', justificativa: 'Fauna doméstica' },
    'pássaro': { codigo: 'NA.FA', justificativa: 'Fauna' },
    'boi': { codigo: 'NA.FA', justificativa: 'Fauna doméstica' },
    'vaca': { codigo: 'NA.FA', justificativa: 'Fauna doméstica' },
  };
  if (lemaNorm in naturezaMap) {
    const mapping = naturezaMap[lemaNorm];
    return {
      tagset_codigo: mapping.codigo,
      confianca: 0.98,
      fonte: 'rule_based',
      justificativa: mapping.justificativa,
    };
  }

  // Regra 3: Palavras funcionais (mantém MG N1)
  if (pos && ['ADP', 'DET', 'CONJ', 'SCONJ', 'PRON'].includes(pos)) {
    return {
      tagset_codigo: 'MG',
      confianca: 0.99,
      fonte: 'rule_based',
      justificativa: 'Marcador gramatical identificado por POS tag',
    };
  }

  // Regra 4: Verbos → Ações e Processos (N2 quando possível)
  if (pos === 'VERB') {
    // Verbos de movimento
    const movimentoVerbs = ['andar', 'correr', 'pular', 'caminhar', 'voar', 'nadar'];
    if (movimentoVerbs.includes(lemaNorm)) {
      return {
        tagset_codigo: 'AC.MD',
        confianca: 0.95,
        fonte: 'rule_based',
        justificativa: 'Verbo de movimento',
      };
    }
    
    // Verbos de manipulação
    const manipulacaoVerbs = ['pegar', 'segurar', 'empurrar', 'puxar', 'abrir', 'fechar'];
    if (manipulacaoVerbs.includes(lemaNorm)) {
      return {
        tagset_codigo: 'AC.MI',
        confianca: 0.95,
        fonte: 'rule_based',
        justificativa: 'Verbo de manipulação',
      };
    }
    
    // Verbos de transformação
    const transformacaoVerbs = ['construir', 'quebrar', 'criar', 'destruir', 'cortar', 'limpar'];
    if (transformacaoVerbs.includes(lemaNorm)) {
      return {
        tagset_codigo: 'AC.TR',
        confianca: 0.95,
        fonte: 'rule_based',
        justificativa: 'Verbo de transformação',
      };
    }
    
    // Verbos de percepção
    const percepcaoVerbs = ['olhar', 'ver', 'escutar', 'ouvir', 'cheirar', 'sentir'];
    if (percepcaoVerbs.includes(lemaNorm)) {
      return {
        tagset_codigo: 'AC.PS',
        confianca: 0.95,
        fonte: 'rule_based',
        justificativa: 'Verbo de percepção sensorial',
      };
    }
    
    // Verbos de expressão
    const expressaoVerbs = ['falar', 'dizer', 'cantar', 'gritar', 'sussurrar'];
    if (expressaoVerbs.includes(lemaNorm)) {
      return {
        tagset_codigo: 'AC.EC',
        confianca: 0.95,
        fonte: 'rule_based',
        justificativa: 'Verbo de expressão/comunicação',
      };
    }
    
    // Fallback para AC genérico
    return {
      tagset_codigo: 'AC',
      confianca: 0.85,
      fonte: 'rule_based',
      justificativa: 'Verbo mapeado para Ações e Processos (genérico)',
    };
  }

  // Regra 5: Adjetivos → Estados e Qualidades
  if (pos === 'ADJ') {
    return {
      tagset_codigo: 'EQ',
      confianca: 0.85,
      fonte: 'rule_based',
      justificativa: 'Adjetivo mapeado para Estados e Qualidades',
    };
  }

  return null;
}

/**
 * FASE 3: Batch Classification com Gemini Flash
 * Processa até 15 palavras em uma única chamada
 */
async function batchClassifyWithGemini(
  palavras: Array<{ palavra: string; lema: string; pos: string; contextoEsquerdo: string; contextoDireito: string }>,
  logger: any
): Promise<Map<string, SemanticDomainResult>> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurado');
  }

  const palavrasList = palavras.map((p, i) => {
    const sentenca = `${p.contextoEsquerdo} **${p.palavra}** ${p.contextoDireito}`.trim();
    return `${i + 1}. Palavra: "${p.palavra}" | Lema: "${p.lema}" | POS: ${p.pos} | Contexto: "${sentenca}"`;
  }).join('\n');

  // Carrega domínios dinamicamente do banco de dados
  const { generateBatchClassificationPrompt } = await import('../_shared/tagset-loader.ts');
  const dynamicDomains = await generateBatchClassificationPrompt();

  const prompt = `Você é um especialista em análise semântica de texto. Classifique CADA palavra abaixo nos domínios semânticos listados.

**INSTRUÇÕES CRÍTICAS:**
1. **PRIORIZE códigos N2 ou superior (subcategorias) sempre que o contexto permitir**
2. Use códigos N1 APENAS quando a classificação for ambígua ou não houver N2 apropriado
3. Exemplo: "cavalgar" → AP.DES (Transporte), NÃO "AP" genérico
4. Exemplo: "saudade" → SE.TRI (Tristeza/Saudade), NÃO "SE" genérico
5. Exemplo: "chimarrão" → AP.ALI (Alimentação), NÃO "AP" genérico

**DOMÍNIOS SEMÂNTICOS (CARREGADOS DINAMICAMENTE):**
${dynamicDomains}

**IMPORTANTE - SAÚDE ANIMAL:**
Use SB.DOE ou SB.VET para termos veterinários relacionados à saúde de animais (veterinário, vermífugo, castração de animais, cinomose, raiva, febre aftosa).

**PALAVRAS A CLASSIFICAR:**
${palavrasList}

**RETORNE JSON ARRAY (ordem idêntica) COM CÓDIGOS N2+ SEMPRE QUE POSSÍVEL:**
[
  {"palavra": "palavra1", "tagset_codigo": "XX.YY", "confianca": 0.95, "justificativa": "razão"},
  {"palavra": "palavra2", "tagset_codigo": "ZZ.WW", "confianca": 0.90, "justificativa": "razão"},
  ...
]`;

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
          { role: 'system', content: 'Você é um classificador semântico preciso. Retorne APENAS JSON array válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    timer.end({ operation: 'gemini_batch_classify', count: palavras.length });

    if (response.status === 429) {
      logger.warn('Rate limit atingido (batch)', { count: palavras.length });
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    if (response.status === 402) {
      logger.warn('Créditos esgotados (batch)', { count: palavras.length });
      throw new Error('PAYMENT_REQUIRED');
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erro na API Lovable (batch)', { status: response.status, error: errorText });
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON array da resposta
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.error('Batch response sem JSON válido', { content });
      throw new Error('Invalid batch response format');
    }

    const results = JSON.parse(jsonMatch[0]);
    const resultMap = new Map<string, SemanticDomainResult>();

    // Validar e mapear resultados
    for (const r of results) {
      if (r.palavra && r.tagset_codigo && typeof r.confianca === 'number') {
        resultMap.set(r.palavra.toLowerCase(), {
          tagset_codigo: r.tagset_codigo,
          confianca: r.confianca,
          fonte: 'gemini_flash',
          justificativa: r.justificativa || 'Batch classification',
        });
      }
    }

    logger.info('Batch classification concluída', { 
      requested: palavras.length,
      returned: resultMap.size 
    });

    return resultMap;

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro em batch classify', errorObj);
    
    // Retornar map vazio para fallback individual
    return new Map();
  }
}

/**
 * Classificação individual com Gemini Flash (mantido para compatibilidade)
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

  const prompt = `Você é um especialista em análise semântica de texto. Classifique a palavra em destaque.

**INSTRUÇÕES CRÍTICAS:**
1. **PRIORIZE códigos N2 (subcategorias) sempre que o contexto permitir**
2. Use códigos N1 APENAS quando a classificação for ambígua ou não houver N2 apropriado
3. Exemplos: "cavalgar" → AP.DES, "saudade" → SE.SA, "chimarrão" → AP.ALI

**13 DOMÍNIOS N1:**
AB (Abstrações), AC (Ações/Processos), AP (Atividades), CC (Cultura), EL (Estruturas), EQ (Qualidades), MG (Marcadores), NA (Natureza), NC (Não Classificado), OA (Objetos), SB (Saúde), SE (Sentimentos), SH (Ser Humano), SP (Sociedade)

**SUBDOMÍNIOS N2 IMPORTANTES (USE ESTES):** 
AC.MD (Movimento), AC.MI (Manipulação), AC.TR (Transformação), AC.PS (Percepção), AC.EC (Expressão), AP.ALI (Alimentação), AP.DES (Transporte), AP.TRA (Trabalho), AP.LAZ (Lazer), NA.FAU (Fauna), NA.FLO (Flora), NA.GEO (Geografia), NA.CLI (Clima), SE.SA (Saudade), SE.AM (Amor), SE.PO (Positivos), SE.NE (Negativos), CC.ART (Arte), CC.EDU (Educação), CC.REL (Religiosidade), CC.COM (Comunicação), AB.FIL (Filosofia/Ética), AB.SOC (Social/Político), AB.EXI (Existencial), SB.DOE (Doenças), SB.TRA (Tratamentos), SP.GOV (Governo), SP.LEI (Lei/Justiça)

**CONTEXTO:** "${sentencaCompleta}"
Palavra: "${palavra}" | Lema: "${lema}" | POS: ${pos}

**RETORNE JSON COM CÓDIGO N2 SEMPRE QUE POSSÍVEL:**
{"tagset_codigo": "XX.YY", "confianca": 0.95, "justificativa": "razão"}`;

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
    if (pos === 'VERB') return { tagset_codigo: 'AP', confianca: 0.60, fonte: 'rule_based', justificativa: 'Fallback: verbo → Atividades' };
    if (pos === 'ADJ') return { tagset_codigo: 'EQ', confianca: 0.60, fonte: 'rule_based', justificativa: 'Fallback: adjetivo → Qualidades' };
    
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

// ============================================================================
// 🆕 BATCH MODE HANDLER - Processa array de palavras
// ============================================================================

/**
 * Busca informações do tagset (nome) do banco
 */
async function getTagsetInfo(supabase: any, codigo: string): Promise<{ nome: string } | null> {
  try {
    const { data, error } = await supabase
      .from('semantic_tagset')
      .select('nome')
      .eq('codigo', codigo)
      .eq('status', 'ativo')
      .maybeSingle();

    if (error || !data) {
      // Tentar buscar pelo N1 se N2 não encontrado
      const n1Code = codigo.split('.')[0];
      if (n1Code !== codigo) {
        const { data: n1Data } = await supabase
          .from('semantic_tagset')
          .select('nome')
          .eq('codigo', n1Code)
          .eq('status', 'ativo')
          .maybeSingle();
        return n1Data;
      }
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * 🆕 FASE 4.1: Batch Tagset Lookup - busca nomes em 1 query para N códigos
 */
async function getTagsetInfoBatch(
  supabase: any,
  codigos: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!codigos.length) return result;

  // Deduplica códigos e adiciona N1s
  const allCodigos = new Set<string>();
  for (const codigo of codigos) {
    allCodigos.add(codigo);
    const n1Code = codigo.split('.')[0];
    if (n1Code !== codigo) allCodigos.add(n1Code);
  }

  try {
    const { data, error } = await supabase
      .from('semantic_tagset')
      .select('codigo, nome')
      .in('codigo', Array.from(allCodigos))
      .eq('status', 'ativo');

    if (!error && data) {
      for (const tagset of data) {
        result.set(tagset.codigo, tagset.nome);
      }
    }
  } catch {
    // Silently fail, retornará map vazio
  }

  return result;
}

/**
 * 🆕 FASE 4.2: Batch Cache Insert - insere N resultados em 1 operação
 */
async function saveToCacheBatch(
  supabase: any,
  entries: Array<{
    palavra: string;
    contextoHash: string;
    result: SemanticDomainResult;
  }>
): Promise<void> {
  if (!entries.length) return;

  const rows = entries.map(e => ({
    palavra: e.palavra.toLowerCase(),
    contexto_hash: e.contextoHash,
    lema: null,
    pos: null,
    tagset_codigo: e.result.tagset_codigo,
    confianca: e.result.confianca,
    fonte: e.result.fonte,
    justificativa: e.result.justificativa,
  }));

  try {
    await supabase
      .from('semantic_disambiguation_cache')
      .upsert(rows, { 
        onConflict: 'palavra,contexto_hash',
        ignoreDuplicates: true 
      });
  } catch {
    // Silently fail batch insert, items podem já existir
  }
}

/**
 * 🆕 FASE 4.3: Processamento Paralelo Controlado
 * Processa palavras em paralelo com concurrency limite
 */
async function processWordsWithRulesParallel(
  supabase: any,
  words: string[],
  logger: any,
  concurrency: number = 5
): Promise<Map<string, SemanticDomainResult>> {
  const results = new Map<string, SemanticDomainResult>();

  for (let i = 0; i < words.length; i += concurrency) {
    const batch = words.slice(i, i + concurrency);
    
    const promises = batch.map(async (palavra) => {
      const palavraNorm = palavra.toLowerCase().trim();
      if (!palavraNorm) return { palavra: palavraNorm, result: null };
      
      const result = await processWordWithRules(supabase, palavraNorm, logger);
      return { palavra: palavraNorm, result };
    });

    const batchResults = await Promise.all(promises);
    
    for (const { palavra, result } of batchResults) {
      if (result) {
        results.set(palavra, result);
      }
    }
  }

  return results;
}

/**
 * Processa uma única palavra via pipeline rule-based (cache → lexicon → rules)
 * Retorna resultado ou null se precisa Gemini
 */
async function processWordWithRules(
  supabase: any,
  palavra: string,
  logger: any
): Promise<SemanticDomainResult | null> {
  const palavraNorm = palavra.toLowerCase();

  // 1. Verificar stopwords "safe" (0ms, confiança 0.99)
  const safeStopword = classifySafeStopword(palavraNorm);
  if (safeStopword) {
    return {
      tagset_codigo: safeStopword.tagset_codigo,
      confianca: safeStopword.confianca,
      fonte: 'rule_based',
      justificativa: safeStopword.justificativa,
    };
  }

  // 2. Cache Nível 1: palavra apenas (alta confiança)
  const wordOnlyCache = await checkWordOnlyCache(supabase, palavraNorm);
  if (wordOnlyCache) {
    await supabase.rpc('increment_semantic_cache_hit', { cache_id: wordOnlyCache.id });
    return {
      tagset_codigo: wordOnlyCache.tagset_codigo,
      confianca: wordOnlyCache.confianca,
      fonte: 'cache',
      justificativa: wordOnlyCache.justificativa,
    };
  }

  // 3. Semantic Lexicon (pré-classificado)
  const lexiconResult = await getLexiconClassification(palavraNorm);
  if (lexiconResult) {
    return {
      tagset_codigo: lexiconResult.tagset_n1,
      confianca: lexiconResult.confianca,
      fonte: 'rule_based',
      justificativa: `Lexicon pré-classificado (${lexiconResult.fonte})`,
    };
  }

  // 4. Regras morfológicas
  if (hasMorphologicalPattern(palavraNorm)) {
    const morphResult = await applyMorphologicalRules(palavraNorm, undefined, getLexiconBase);
    if (morphResult) {
      return {
        tagset_codigo: morphResult.tagset_n1,
        confianca: morphResult.confianca,
        fonte: 'rule_based',
        justificativa: `Regra morfológica: ${morphResult.rule_description}`,
      };
    }
  }

  // 5. Lexicon dialetal
  const lexiconRule = await getLexiconRule(palavraNorm);
  if (lexiconRule) {
    return {
      tagset_codigo: lexiconRule.tagset_codigo,
      confianca: lexiconRule.confianca,
      fonte: 'rule_based' as const,
      justificativa: lexiconRule.justificativa,
    };
  }

  // 6. Herança de sinônimos
  const inheritedDomain = await inheritDomainFromSynonyms(palavraNorm);
  if (inheritedDomain) {
    return {
      tagset_codigo: inheritedDomain.tagset_codigo,
      confianca: inheritedDomain.confianca,
      fonte: 'rule_based' as const,
      justificativa: inheritedDomain.justificativa,
    };
  }

  // 7. Regras contextuais (fallback rápido)
  const ruleBasedResult = applyContextualRules(palavraNorm, palavraNorm, undefined);
  if (ruleBasedResult) {
    return ruleBasedResult;
  }

  // 8. Gutenberg POS
  const gutenbergPOS = await getGutenbergPOS(palavraNorm);
  if (gutenbergPOS) {
    const gutenbergMapping = GUTENBERG_POS_TO_DOMAIN[gutenbergPOS.pos];
    if (gutenbergMapping) {
      return {
        tagset_codigo: gutenbergMapping.codigo,
        confianca: gutenbergMapping.confianca,
        fonte: 'rule_based',
        justificativa: `Mapeado via Gutenberg: ${gutenbergPOS.pos}`,
      };
    }
  }

  // Nenhuma regra aplicada → precisa Gemini
  return null;
}

/**
 * 🆕 BATCH MODE HANDLER (OTIMIZADO)
 * Processa array de palavras e retorna array de SemanticAnnotation
 * FASE 4 OTIMIZAÇÕES:
 * - 4.1: Batch tagset lookup (1 query para N códigos)
 * - 4.2: Batch cache insert (1 upsert para N resultados)
 * - 4.3: Processamento paralelo controlado (concurrency=5)
 */
async function handleBatchMode(
  requestBody: BatchAnnotationRequest,
  supabaseClient: any,
  logger: any,
  startTime: number
): Promise<Response> {
  const { words, context = '' } = requestBody;

  if (!words || words.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'Array "words" vazio ou ausente' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const perfStart = Date.now();
  logger.info('Iniciando anotação semântica (modo batch OTIMIZADO)', { 
    wordsCount: words.length,
    hasContext: !!context 
  });

  const annotations: SemanticAnnotation[] = [];
  const wordsNeedingGemini: string[] = [];
  const cacheEntries: Array<{ palavra: string; contextoHash: string; result: SemanticDomainResult }> = [];

  // ========== FASE 1: Processar palavras via pipeline rule-based (PARALELO) ==========
  const phase1Start = Date.now();
  
  // 🆕 4.3: Processamento paralelo com concurrency=5
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase().trim()).filter(Boolean))];
  const processedByRules = await processWordsWithRulesParallel(supabaseClient, uniqueWords, logger, 5);
  
  // Coletar códigos para batch lookup
  const codigosParaBuscar: string[] = [];
  const emptyContextHash = await hashContext('', '');
  
  for (const [palavraNorm, result] of processedByRules) {
    codigosParaBuscar.push(result.tagset_codigo);
    cacheEntries.push({ palavra: palavraNorm, contextoHash: emptyContextHash, result });
  }
  
  // Identificar palavras que precisam Gemini
  for (const palavra of uniqueWords) {
    if (!processedByRules.has(palavra)) {
      wordsNeedingGemini.push(palavra);
    }
  }

  const phase1Time = Date.now() - phase1Start;
  logger.info('Fase 1 (rules paralelo) completa', {
    processedByRules: processedByRules.size,
    needingGemini: wordsNeedingGemini.length,
    timeMs: phase1Time
  });

  // ========== FASE 2: Processar palavras restantes via Gemini Batch ==========
  const phase2Start = Date.now();
  const geminiResults = new Map<string, SemanticDomainResult>();
  
  if (wordsNeedingGemini.length > 0) {
    const BATCH_SIZE = 15;
    const contextHash = await hashContext(context, '');
    
    for (let i = 0; i < wordsNeedingGemini.length; i += BATCH_SIZE) {
      const batch = wordsNeedingGemini.slice(i, i + BATCH_SIZE);
      
      const batchPayload = batch.map(palavra => ({
        palavra,
        lema: palavra,
        pos: 'UNKNOWN',
        contextoEsquerdo: context,
        contextoDireito: ''
      }));

      try {
        const batchResults = await batchClassifyWithGemini(batchPayload, logger);
        
        for (const [palavra, result] of batchResults) {
          geminiResults.set(palavra, result);
          codigosParaBuscar.push(result.tagset_codigo);
          cacheEntries.push({ palavra, contextoHash: contextHash, result });
        }
        
        // Marcar palavras sem resultado como NC
        for (const palavra of batch) {
          if (!batchResults.has(palavra.toLowerCase())) {
            geminiResults.set(palavra.toLowerCase(), {
              tagset_codigo: 'NC',
              confianca: 0.5,
              fonte: 'rule_based',
              justificativa: 'Gemini não retornou classificação'
            });
          }
        }
      } catch (geminiError) {
        logger.warn('Gemini batch failed, using fallback', { 
          batch: batch.length,
          error: geminiError instanceof Error ? geminiError.message : String(geminiError)
        });
        
        // Fallback NC para todas do batch
        for (const palavra of batch) {
          geminiResults.set(palavra.toLowerCase(), {
            tagset_codigo: 'NC',
            confianca: 0.5,
            fonte: 'rule_based',
            justificativa: 'Fallback: erro no Gemini batch'
          });
        }
      }
      
      // Rate limiting delay entre batches Gemini
      if (i + BATCH_SIZE < wordsNeedingGemini.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  const phase2Time = Date.now() - phase2Start;
  logger.info('Fase 2 (Gemini) completa', {
    geminiProcessed: geminiResults.size,
    timeMs: phase2Time
  });

  // ========== FASE 3: Batch Tagset Lookup (1 query para todos os códigos) ==========
  const phase3Start = Date.now();
  
  // 🆕 4.1: Batch lookup de nomes de tagsets
  const tagsetNomes = await getTagsetInfoBatch(supabaseClient, codigosParaBuscar);

  const phase3Time = Date.now() - phase3Start;
  logger.info('Fase 3 (tagset batch lookup) completa', {
    codigosBuscados: codigosParaBuscar.length,
    nomesEncontrados: tagsetNomes.size,
    timeMs: phase3Time
  });

  // ========== FASE 4: Montar annotations ==========
  for (const palavra of uniqueWords) {
    const result = processedByRules.get(palavra) || geminiResults.get(palavra);
    
    if (result) {
      const n1Code = result.tagset_codigo.split('.')[0];
      const dominioNome = tagsetNomes.get(result.tagset_codigo) 
        || tagsetNomes.get(n1Code) 
        || result.tagset_codigo;

      annotations.push({
        palavra,
        tagset_primario: n1Code,
        tagset_codigo: result.tagset_codigo,
        dominio_nome: dominioNome,
        cor: getColorForDomain(n1Code),
        confianca: result.confianca,
        prosody: 'Neutra'
      });
    } else {
      // Fallback final NC
      annotations.push({
        palavra,
        tagset_primario: 'NC',
        tagset_codigo: 'NC',
        dominio_nome: 'Não Classificado',
        cor: getColorForDomain('NC'),
        confianca: 0.5,
        prosody: 'Neutra'
      });
    }
  }

  // ========== FASE 5: Batch Cache Insert (1 operação para todos) ==========
  const phase5Start = Date.now();
  
  // 🆕 4.2: Batch insert no cache
  await saveToCacheBatch(supabaseClient, cacheEntries);

  const phase5Time = Date.now() - phase5Start;
  logger.info('Fase 5 (batch cache insert) completa', {
    entriesSaved: cacheEntries.length,
    timeMs: phase5Time
  });

  // ========== RESULTADO FINAL ==========
  const totalTime = Date.now() - perfStart;
  const dominiosUnicos = new Set(annotations.map(a => a.tagset_primario));

  logger.info('Anotação semântica (modo batch OTIMIZADO) concluída', {
    totalPalavras: words.length,
    palavrasUnicas: uniqueWords.length,
    palavrasClassificadas: annotations.length,
    dominiosEncontrados: dominiosUnicos.size,
    processingTime: totalTime,
    performance: {
      phase1_rules_ms: phase1Time,
      phase2_gemini_ms: phase2Time,
      phase3_tagsets_ms: phase3Time,
      phase5_cache_ms: phase5Time,
      wordsPerSecond: Math.round((uniqueWords.length / totalTime) * 1000)
    }
  });

  return new Response(
    JSON.stringify({
      success: true,
      annotations,
      totalPalavras: words.length,
      palavrasClassificadas: annotations.length,
      dominiosEncontrados: dominiosUnicos.size,
      processingTime: totalTime
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
