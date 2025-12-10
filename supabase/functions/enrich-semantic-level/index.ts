import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRequest {
  palavras: Array<{
    palavra: string;
    tagset_n1: string;
    contexto: string;
  }>;
}

interface EnrichmentResult {
  palavra: string;
  tagset_n2: string;
  confianca: number;
  justificativa: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody: EnrichmentRequest = await req.json();
    const { palavras } = requestBody;

    console.log(`[enrich-semantic-level] Processando ${palavras.length} palavras para enriquecimento N2`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurado');
    }

    // Preparar prompt para batch de palavras N1 → N2
    const palavrasList = palavras.map((p, i) => {
      return `${i + 1}. Palavra: "${p.palavra}" | Domínio Atual: ${p.tagset_n1} | Contexto: "${p.contexto}"`;
    }).join('\n');

    const prompt = `Você é um especialista em análise semântica. Estas palavras foram classificadas em domínios N1 (genéricos). Sua tarefa é especificar qual SUBDOMÍNIO N2 melhor se aplica.

**SUBDOMÍNIOS N2 DISPONÍVEIS (CÓDIGOS ATUALIZADOS):**

**Ações e Processos (AC):**
- AC.MD (Movimento): andar, correr, pular, cavalgar, caminhar
- AC.MI (Manipulação): pegar, segurar, empurrar, abrir, fechar
- AC.TR (Transformação): construir, quebrar, criar, limpar, cortar
- AC.PS (Percepção): olhar, ver, escutar, cheirar, sentir, provar
- AC.EC (Expressão): falar, cantar, gritar, sussurrar, acenar

**Atividades e Práticas (AP):**
- AP.TRA (Trabalho/Economia): plantar, colher, tropeiro, peão, vender
- AP.ALI (Alimentação): chimarrão, churrasco, mate, cuia, cozinhar
- AP.VES (Vestuário): bombacha, bota, poncho, pilcha, vestir
- AP.LAZ (Lazer): festa, fandango, rodeio, dança, futebol
- AP.DES (Transporte): cavalgar, viajar, tropear, rota

**Cultura e Conhecimento (CC):**
- CC.ART (Arte): poesia, música, verso, canção, pintura
- CC.EDU (Educação): estudar, escola, professor, ensinar
- CC.REL (Religiosidade): Deus, fé, reza, alma, igreja
- CC.COM (Comunicação): conversa, mensagem, notícia, jornal

**Natureza (NA):**
- NA.FA (Fauna): cavalo, gado, pássaro, bagual, boi
- NA.FL (Flora): árvore, flor, erva, mato, planta
- NA.GE (Geografia): campo, pampa, coxilha, rio, várzea, serra
- NA.FN (Fenômenos Naturais): chuva, vento, tempestade, neve
- NA.EC (Elementos Celestes): sol, lua, estrela, céu

**Sentimentos (SE):**
- SE.ALE (Alegria): alegria, felicidade, esperança, contentamento
- SE.AMO (Amor): amor, paixão, carinho, afeto
- SE.TRI (Tristeza): tristeza, saudade, nostalgia, melancolia, dor
- SE.MED (Medo): medo, temor, receio, pavor
- SE.RAI (Raiva): raiva, ódio, ira, frustração

**Saúde e Bem-Estar (SB):**
- SB.DOE (Doenças): gripe, febre, dor física, ferida
- SB.TRA (Tratamentos): remédio, hospital, médico, cirurgia
- SB.BEM (Bem-Estar): exercício, dieta, descanso, higiene
- SB.MEN (Saúde Mental): depressão, ansiedade, memória

**Sociedade e Política (SP):**
- SP.GOV (Governo): democracia, ministério, eleição, imposto
- SP.LEI (Lei/Justiça): lei, crime, polícia, prisão, julgamento
- SP.POL (Processos Políticos): voto, protesto, cidadania

**Abstrações (AB):**
- AB.FIL (Filosofia/Ética): liberdade, justiça, verdade, virtude
- AB.SOC (Social/Político): poder, direito, paz, democracia
- AB.EXI (Existencial): destino, vida, morte, sonho, eternidade
- AB.LOG (Lógico): lógica, razão, proporção, infinito

**REGRA:** Se nenhum N2 se aplica claramente, retorne o código N1 original. Se N2 se aplica, retorne o código completo (ex: "SE.TRI", "NA.FA").

**PALAVRAS PARA ENRIQUECER:**
${palavrasList}

**RETORNE JSON ARRAY (ordem idêntica):**
[
  {"palavra": "palavra1", "tagset_n2": "XX.YY", "confianca": 0.95, "justificativa": "razão"},
  {"palavra": "palavra2", "tagset_n2": "ZZ", "confianca": 0.85, "justificativa": "razão"},
  ...
]`;

    // Chamar Gemini via Lovable AI
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[enrich-semantic-level] Erro na API Lovable:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    console.log('[enrich-semantic-level] Resposta bruta do Gemini:', content.substring(0, 500));

    // Limpar markdown code blocks se existirem
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Parse JSON array da resposta com múltiplas estratégias
    let results: EnrichmentResult[];
    
    // Estratégia 1: Regex para capturar array JSON
    const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      try {
        results = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('[enrich-semantic-level] Erro ao parsear JSON extraído:', parseError);
        throw new Error('Failed to parse extracted JSON array');
      }
    } else {
      // Estratégia 2: Tentar parsear o conteúdo completo (caso seja só JSON)
      try {
        const parsed = JSON.parse(content.trim());
        results = Array.isArray(parsed) ? parsed : [parsed];
      } catch (parseError) {
        console.error('[enrich-semantic-level] Resposta sem JSON válido. Conteúdo completo:', content);
        throw new Error('Invalid enrichment response format');
      }
    }

    // Atualizar cache com códigos N2 enriquecidos
    let updatedCount = 0;
    for (const result of results) {
      if (result.tagset_n2 && result.tagset_n2.includes('.')) {
        // Apenas atualizar se realmente mudou para N2
        const { error } = await supabaseClient
          .from('semantic_disambiguation_cache')
          .update({
            tagset_codigo: result.tagset_n2,
            confianca: result.confianca,
            justificativa: result.justificativa,
          })
          .eq('palavra', result.palavra.toLowerCase());

        if (!error) {
          updatedCount++;
        }
      }
    }

    console.log(`[enrich-semantic-level] Concluído: ${updatedCount}/${results.length} palavras enriquecidas para N2`);

    return new Response(
      JSON.stringify({
        success: true,
        resultados: results,
        updatedCount,
        processingTime: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error('[enrich-semantic-level] Erro:', errorObj.message);

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
