import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createEdgeLogger } from "../_shared/unified-logger.ts";
import { getLexiconRule, GUTENBERG_POS_TO_DOMAIN } from "../_shared/semantic-rules-lexicon.ts";
import { propagateSemanticDomain, inheritDomainFromSynonyms } from "../_shared/synonym-propagation.ts";
import { getGutenbergPOS } from "../_shared/gutenberg-pos-lookup.ts";
import { classifySafeStopword, isContextDependent } from "../_shared/stopwords-classifier.ts";
import { getLexiconClassification, getLexiconBase } from "../_shared/semantic-lexicon-lookup.ts";
import { applyMorphologicalRules, hasMorphologicalPattern } from "../_shared/morphological-rules.ts";

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
  
  // Regra 1: Sentimentos específicos (N2)
  const sentimentosMap: Record<string, { codigo: string; justificativa: string }> = {
    'saudade': { codigo: 'SE.SA', justificativa: 'Saudade específica (sentimento nostálgico)' },
    'amor': { codigo: 'SE.AM', justificativa: 'Sentimento de amor/afeto' },
    'paixão': { codigo: 'SE.AM', justificativa: 'Sentimento de amor/paixão' },
    'alegria': { codigo: 'SE.PO', justificativa: 'Sentimento positivo' },
    'felicidade': { codigo: 'SE.PO', justificativa: 'Sentimento positivo' },
    'dor': { codigo: 'SE.NE', justificativa: 'Sentimento negativo' },
    'tristeza': { codigo: 'SE.NE', justificativa: 'Sentimento negativo' },
    'medo': { codigo: 'SE.NE', justificativa: 'Sentimento negativo' },
    'raiva': { codigo: 'SE.NE', justificativa: 'Sentimento negativo' },
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

  // Regra 2: Natureza específica (N2)
  const naturezaMap: Record<string, { codigo: string; justificativa: string }> = {
    'sol': { codigo: 'NA.CLI', justificativa: 'Elemento climático' },
    'lua': { codigo: 'NA.CLI', justificativa: 'Elemento celestial' },
    'estrela': { codigo: 'NA.CLI', justificativa: 'Elemento celestial' },
    'céu': { codigo: 'NA.CLI', justificativa: 'Elemento climático' },
    'chuva': { codigo: 'NA.CLI', justificativa: 'Fenômeno climático' },
    'vento': { codigo: 'NA.CLI', justificativa: 'Fenômeno climático' },
    'campo': { codigo: 'NA.GEO', justificativa: 'Geografia/paisagem' },
    'rio': { codigo: 'NA.GEO', justificativa: 'Geografia/hidrografia' },
    'pampa': { codigo: 'NA.GEO', justificativa: 'Geografia regional' },
    'coxilha': { codigo: 'NA.GEO', justificativa: 'Geografia regional gaúcha' },
    'várzea': { codigo: 'NA.GEO', justificativa: 'Geografia/topografia' },
    'árvore': { codigo: 'NA.FLO', justificativa: 'Flora' },
    'flor': { codigo: 'NA.FLO', justificativa: 'Flora' },
    'cavalo': { codigo: 'NA.FAU', justificativa: 'Fauna doméstica' },
    'gado': { codigo: 'NA.FAU', justificativa: 'Fauna doméstica' },
    'pássaro': { codigo: 'NA.FAU', justificativa: 'Fauna' },
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

  const prompt = `Você é um especialista em análise semântica de texto. Classifique CADA palavra abaixo em um dos 14 domínios semânticos.

**INSTRUÇÕES CRÍTICAS:**
1. **PRIORIZE códigos N2 (subcategorias) sempre que o contexto permitir**
2. Use códigos N1 APENAS quando a classificação for ambígua ou não houver N2 apropriado
3. Exemplo: "cavalgar" → AP.DES (Transporte), NÃO "AP" genérico
4. Exemplo: "saudade" → SE.SA (Saudade específica), NÃO "SE" genérico
5. Exemplo: "chimarrão" → AP.ALI (Alimentação), NÃO "AP" genérico

**14 DOMÍNIOS SEMÂNTICOS N1:**
- AB (Abstrações): ideias abstratas, conceitos filosóficos, valores morais
- AC (Ações e Processos): verbos de ação física concreta (andar, pegar, construir, olhar, falar)
- AP (Atividades e Práticas Sociais): trabalho, alimentação, vestuário, lazer, transporte
- CC (Cultura e Conhecimento): arte, educação, religião, ciência, comunicação
- EL (Estruturas e Lugares): construções, locais físicos, espaços arquitetônicos
- EQ (Estados, Qualidades e Medidas): adjetivos, características, tempo, dimensões
- MG (Marcadores Gramaticais): artigos, preposições, conjunções, palavras funcionais
- NA (Natureza e Paisagem): flora, fauna, clima, geografia, elementos naturais
- NC (Não Classificado): use apenas se nenhum domínio se aplica
- OA (Objetos e Artefatos): ferramentas, utensílios, equipamentos, vestimenta
- SB (Saúde e Bem-Estar): doenças humanas/animais, tratamentos, bem-estar, saúde mental
- SE (Sentimentos): amor, saudade, alegria, tristeza, emoções
- SH (Indivíduo): pessoa, corpo humano, características humanas, identidade
- SP (Sociedade e Organização Política): governo, lei, relações sociais, política

**SUBDOMÍNIOS IMPORTANTES N2 (USE ESTES PREFERENCIALMENTE):**
- AC.MD (Movimento): andar, correr, pular, sentar, virar, cavalgar
- AC.MI (Manipulação): pegar, segurar, empurrar, amarrar, abrir, fechar
- AC.TR (Transformação): construir, quebrar, cortar, limpar, escrever, criar
- AC.PS (Percepção): olhar, ver, escutar, cheirar, provar, sentir
- AC.EC (Expressão): falar, cantar, gritar, acenar, abraçar, sussurrar
- AB.FIL (Filosofia/Ética): liberdade, justiça, verdade, virtude, honra
- AB.SOC (Social/Político): poder, direito, democracia, cidadania, paz
- AB.EXI (Existencial/Metafísico): destino, vida, morte, eternidade, sorte, sonho
- AB.LOG (Lógico/Matemático): lógica, razão, infinito, proporção
- AP.TRA (Trabalho/Economia): plantar, colher, comprar, vender, médico, tropeiro
- AP.ALI (Alimentação/Culinária): cozinhar, churrasco, chimarrão, mate, cuia
- AP.VES (Vestuário/Moda): vestir, costurar, bombacha, bota, poncho
- AP.LAZ (Lazer/Esportes): festa, fandango, rodeio, futebol, dança
- AP.DES (Transporte/Deslocamento): cavalgar, viajar, rota, destino
- CC.ART (Arte/Expressão): poesia, música, pintura, dança, literatura, verso
- CC.EDU (Educação/Aprendizado): estudar, escola, professor, ensinar
- CC.REL (Religiosidade/Espiritualidade): Deus, fé, alma, reza, igreja
- CC.COM (Comunicação/Mídia): jornal, mensagem, conversa, notícia
- NA.FAU (Fauna): cavalo, gado, pássaro, peixe, animal
- NA.FLO (Flora): árvore, flor, planta, erva, mato
- NA.GEO (Geografia): campo, pampa, coxilha, rio, várzea, cerro
- NA.CLI (Clima): sol, lua, chuva, vento, estrela, céu
- SB.DOE (Doenças/Condições): gripe, diabetes, febre, dor, ferida
- SB.TRA (Tratamentos/Cuidados): remédio, cirurgia, hospital, médico, vacina
- SB.BEM (Bem-Estar/Estilo de Vida): dieta, exercício, higiene, descanso
- SB.MEN (Saúde Mental): depressão, ansiedade, memória, personalidade
- SB.05 (Saúde Animal - Veterinária): veterinário, castração animal, doenças animais
- SE.SA (Saudade): saudade, nostalgia, lembranças
- SE.AM (Amor): amor, paixão, carinho, afeto
- SE.PO (Positivos): alegria, felicidade, esperança
- SE.NE (Negativos): tristeza, dor, medo, raiva
- SP.GOV (Governo/Estado): democracia, ministério, imposto, eleição
- SP.LEI (Lei/Justiça): lei, julgamento, crime, polícia, prisão
- SP.GUE (Guerra/Conflito): guerra, batalha, atacar, defender
- SP.POL (Processos Políticos): voto, protesto, cidadania
- SP.EST (Estrutura Social): elite, classe, desigualdade

**IMPORTANTE - SAÚDE ANIMAL:**
Use SB ou SB.05 para termos veterinários relacionados à saúde de animais (veterinário, vermífugo, castração de animais, cinomose, raiva, febre aftosa).

**PALAVRAS A CLASSIFICAR:**
${palavrasList}

**RETORNE JSON ARRAY (ordem idêntica) COM CÓDIGOS N2 SEMPRE QUE POSSÍVEL:**
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
