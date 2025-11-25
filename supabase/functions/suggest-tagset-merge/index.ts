/**
 * Suggest Tagset Merge Edge Function
 * Analisa pares de tagsets com sobreposição e sugere ação (merge, split, keep, reorganize)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Tagset {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  exemplos?: string[];
  nivel_profundidade?: number;
  categoria_pai?: string | null;
  status: string;
}

interface MergeSuggestionRequest {
  tagsetA: Tagset;
  tagsetB: Tagset;
  similarity: number;
  allTagsets: Tagset[];
}

interface MergeStrategy {
  survivorTagset: 'A' | 'B' | 'new';
  mergedName: string;
  mergedCodigo: string;
  mergedDescricao: string;
  mergedExemplos: string[];
  mergedNivel: number;
  mergedPai: string | null;
}

interface SplitStrategy {
  targetTagset: 'A' | 'B';
  splitIntoTagsets: Array<{
    name: string;
    codigo: string;
    description: string;
    examples: string[];
    nivel: number;
    pai: string | null;
  }>;
  reasoning: string;
}

interface ReorganizeStrategy {
  tagsetA_newParent: string | null;
  tagsetB_newParent: string | null;
  reasoning: string;
}

interface MergeSuggestion {
  recommendation: 'merge' | 'keep_separate' | 'reorganize' | 'split';
  confidence: number;
  justification: string;
  mergeStrategy?: MergeStrategy;
  splitStrategy?: SplitStrategy;
  reorganizeStrategy?: ReorganizeStrategy;
  warnings: string[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tagsetA, tagsetB, similarity, allTagsets }: MergeSuggestionRequest = await req.json();

    // Validar entrada
    if (!tagsetA || !tagsetB || typeof similarity !== 'number') {
      return new Response(
        JSON.stringify({ error: 'tagsetA, tagsetB e similarity são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Construir contexto hierárquico
    const hierarchyContext = allTagsets
      .filter(t => t.status === 'ativo')
      .slice(0, 20)
      .map(t => `- ${t.codigo}: ${t.nome} (Nível ${t.nivel_profundidade || 1})`)
      .join('\n');

    // Prompt para Gemini
    const prompt = `Você é um especialista em taxonomia semântica. Analise dois domínios semânticos (tagsets) que apresentam sobreposição e recomende a melhor ação.

**TAGSET A:**
- Código: ${tagsetA.codigo}
- Nome: ${tagsetA.nome}
- Nível: ${tagsetA.nivel_profundidade || 1}
- Pai: ${tagsetA.categoria_pai || 'Nenhum (raiz)'}
- Descrição: ${tagsetA.descricao || 'Não fornecida'}
- Exemplos: ${tagsetA.exemplos?.join(', ') || 'Nenhum'}

**TAGSET B:**
- Código: ${tagsetB.codigo}
- Nome: ${tagsetB.nome}
- Nível: ${tagsetB.nivel_profundidade || 1}
- Pai: ${tagsetB.categoria_pai || 'Nenhum (raiz)'}
- Descrição: ${tagsetB.descricao || 'Não fornecida'}
- Exemplos: ${tagsetB.exemplos?.join(', ') || 'Nenhum'}

**SIMILARIDADE JACCARD:** ${(similarity * 100).toFixed(1)}%

**HIERARQUIA ATUAL (CONTEXTO):**
${hierarchyContext}

**OPÇÕES DE RECOMENDAÇÃO:**

1. **MERGE** - Mesclar em um único tagset (se redundantes ou muito sobrepostos)
2. **SPLIT** - Dividir um dos tagsets em 2+ subtags mais específicos (se muito amplo e ambíguo)
3. **KEEP_SEPARATE** - Manter separados (se semanticamente distintos apesar da sobreposição)
4. **REORGANIZE** - Reorganizar hierarquicamente (se um é subcategoria do outro)

**CONSIDERAÇÕES:**
- Sobreposição de exemplos e descrições
- Diferenças semânticas sutis
- Coerência hierárquica
- Granularidade adequada para análise de corpus musical gaúcho
- Impacto em anotações existentes

**INSTRUÇÕES:**
1. Escolha UMA recomendação (merge, split, keep_separate, ou reorganize)
2. Forneça confiança (0-100%)
3. Justifique sua escolha considerando o contexto gaúcho
4. Se merge: defina tagset resultante completo
5. Se split: especifique em quantos tagsets dividir e quais
6. Se reorganize: defina nova hierarquia
7. Liste avisos (impactos, riscos)

Retorne JSON válido no seguinte formato:
{
  "recommendation": "merge" | "split" | "keep_separate" | "reorganize",
  "confidence": 85,
  "justification": "Explicação detalhada...",
  "mergeStrategy": {
    "survivorTagset": "A" | "B" | "new",
    "mergedName": "Nome do Tagset Mesclado",
    "mergedCodigo": "CODIGO",
    "mergedDescricao": "Descrição completa",
    "mergedExemplos": ["exemplo1", "exemplo2"],
    "mergedNivel": 2,
    "mergedPai": "CODIGO_PAI ou null"
  },
  "splitStrategy": {
    "targetTagset": "A" | "B",
    "splitIntoTagsets": [
      {
        "name": "Nome Subtag 1",
        "codigo": "SUB1",
        "description": "Descrição",
        "examples": ["ex1", "ex2"],
        "nivel": 2,
        "pai": "PAI_CODIGO"
      }
    ],
    "reasoning": "Razão do split"
  },
  "reorganizeStrategy": {
    "tagsetA_newParent": "NOVO_PAI_A ou null",
    "tagsetB_newParent": "NOVO_PAI_B ou null",
    "reasoning": "Razão da reorganização"
  },
  "warnings": ["Aviso 1", "Aviso 2"]
}`;

    // Chamar Lovable AI (Gemini Flash)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em taxonomia semântica e análise linguística. Retorne sempre JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Aguarde alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    const suggestion: MergeSuggestion = JSON.parse(jsonMatch[0]);

    // Log da sugestão para auditoria
    const supabase = createSupabaseClient();
    await supabase.from('gemini_api_usage').insert({
      function_name: 'suggest-tagset-merge',
      request_type: 'tagset_merge_suggestion',
      model_used: 'google/gemini-2.5-flash',
      success: true,
      tokens_input: prompt.length,
      tokens_output: content.length,
      metadata: {
        tagsetA_codigo: tagsetA.codigo,
        tagsetB_codigo: tagsetB.codigo,
        similarity: similarity,
        recommendation: suggestion.recommendation
      }
    });

    return new Response(
      JSON.stringify(suggestion),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in suggest-tagset-merge:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
