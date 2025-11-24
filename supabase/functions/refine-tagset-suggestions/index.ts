import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";
import { createEdgeLogger } from '../_shared/unified-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Tagset {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  exemplos: string[] | null;
  nivel_profundidade: number | null;
}

interface AIRefinedSuggestion {
  tagsetPaiRecomendado: {
    codigo: string;
    nome: string;
    confianca: number;
  };
  nivelSugerido: number;
  justificativa: string;
  melhorias: {
    descricaoSugerida?: string;
    exemplosAdicionais?: string[];
    alertas?: string[];
  };
  alternativas: Array<{
    codigo: string;
    nome: string;
    razao: string;
  }>;
}

serve(withInstrumentation('refine-tagset-suggestions', async (req) => {
  // Health check endpoint - verifica query parameter
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.get('health') === 'true') {
    const health = await createHealthCheck('refine-tagset-suggestions', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('refine-tagset-suggestions', requestId);
  
  try {
    const { tagsetPendente, tagsetsAtivos } = await req.json() as {
      tagsetPendente: Tagset;
      tagsetsAtivos: Tagset[];
    };

    log.info('Starting tagset curation analysis', { 
      pendingTagset: tagsetPendente.codigo, 
      activeTagsetsCount: tagsetsAtivos.length 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Construir prompt detalhado para o Gemini
    const tagsetsAtivosText = tagsetsAtivos
      .map(t => `  - [${t.codigo}] ${t.nome} (Nível ${t.nivel_profundidade || 'N/A'})
    Descrição: ${t.descricao || 'Sem descrição'}
    Exemplos: ${t.exemplos?.join(', ') || 'Sem exemplos'}`)
      .join('\n\n');

    const prompt = `Você é um especialista em taxonomia semântica e linguística de corpus. Sua tarefa é analisar um tagset pendente e sugerir sua melhor posição hierárquica.

TAGSET PENDENTE PARA ANÁLISE:
- Código: ${tagsetPendente.codigo}
- Nome: ${tagsetPendente.nome}
- Descrição: ${tagsetPendente.descricao || 'Sem descrição'}
- Exemplos: ${tagsetPendente.exemplos?.join(', ') || 'Sem exemplos'}

TAGSETS ATIVOS DISPONÍVEIS NA HIERARQUIA:
${tagsetsAtivosText}

TAREFA:
1. Analise profundamente a semântica do tagset pendente
2. Identifique o tagset pai MAIS apropriado hierarquicamente (considerando relações de hiperonímia/hiponímia)
3. Sugira o nível hierárquico ideal (1=categoria geral, 2=subcategoria, 3=específico, 4=muito específico)
4. Forneça justificativa detalhada baseada em análise semântica
5. Proponha melhorias na descrição ou exemplos se necessário
6. Identifique até 2 alternativas viáveis de posicionamento
7. Alerte sobre possíveis conflitos, sobreposições ou ambiguidades

IMPORTANTE:
- Use análise semântica profunda, não apenas palavras em comum
- Considere o contexto e significado implícito
- Priorize coerência hierárquica (específico deve estar sob geral)
- Se o tagset pendente parece ser de nível 1 (muito geral), recomende tagsetPai como null

Retorne APENAS um objeto JSON válido seguindo esta estrutura EXATA:
{
  "tagsetPaiRecomendado": {
    "codigo": "string (ou null se deve ser nível 1)",
    "nome": "string (ou null se deve ser nível 1)",
    "confianca": number (0-100)
  },
  "nivelSugerido": number (1-4),
  "justificativa": "string detalhada",
  "melhorias": {
    "descricaoSugerida": "string opcional",
    "exemplosAdicionais": ["string opcional"],
    "alertas": ["string opcional"]
  },
  "alternativas": [
    {
      "codigo": "string",
      "nome": "string",
      "razao": "string"
    }
  ]
}`;

    log.info('Calling Lovable AI with Gemini', { contextualizedTagsets: tagsetsAtivos.length });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em taxonomia semântica. Sempre retorne JSON válido conforme a estrutura solicitada."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.logApiCall('Lovable AI', '/v1/chat/completions', 'POST', response.status);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable AI workspace.");
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    log.logApiCall('Lovable AI', '/v1/chat/completions', 'POST', 200);
    log.info('AI response received', { tokensUsed: aiResponse.usage?.total_tokens || 0 });
    
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      log.error('Empty AI response', undefined, { aiResponse });
      throw new Error("No content in AI response");
    }

    // Extrair JSON da resposta (pode vir com markdown)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }

    const refinedSuggestion: AIRefinedSuggestion = JSON.parse(jsonContent);

    log.info('Curation analysis complete', {
      tagsetAnalyzed: tagsetPendente.codigo,
      recommendedParent: refinedSuggestion.tagsetPaiRecomendado?.codigo || 'null',
      suggestedLevel: refinedSuggestion.nivelSugerido,
      confidence: refinedSuggestion.tagsetPaiRecomendado?.confianca,
      alternativesCount: refinedSuggestion.alternativas?.length || 0
    });

    return new Response(
      JSON.stringify(refinedSuggestion),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    const log = createEdgeLogger('refine-tagset-suggestions', crypto.randomUUID());
    log.fatal('Curation analysis failed', error instanceof Error ? error : new Error(String(error)));
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}));
