import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisSuggestion {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: 'security' | 'performance' | 'bugfix' | 'optimization';
  title: string;
  description: string;
  affectedFiles: string[];
  codeSnippet: string;
  testSuggestion?: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  creditsSaved: string;
}

interface AnalysisResult {
  timestamp: string;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  suggestions: AnalysisSuggestion[];
  nextSteps: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { logsType, context } = await req.json();
    console.log('Analyzing logs:', { logsType, contextLength: context?.length });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é um especialista em debugging e otimização de código React/TypeScript/Supabase.
Analise os logs fornecidos e sugira correções priorizadas.

DIRETRIZES OBRIGATÓRIAS:
1. Priorize bugs críticos de segurança e performance
2. Gere código completo e funcional, não fragmentos
3. Inclua validações e tratamento de erros
4. Estime economia de créditos realista baseada em complexidade
5. Forneça sugestões de testes quando aplicável
6. Use TypeScript e práticas modernas do React
7. Considere RLS policies para questões de segurança no Supabase

CATEGORIAS:
- security: Vulnerabilidades de segurança, SQL injection, XSS, etc.
- performance: Memory leaks, re-renders desnecessários, queries N+1
- bugfix: Bugs funcionais que causam erros
- optimization: Melhorias de código sem impacto crítico

PRIORIDADES:
1: Crítico - Quebra funcionalidade ou segurança grave
2: Alto - Impacto significativo em performance ou UX
3: Médio - Melhoria importante mas não urgente
4: Baixo - Refatoração desejável
5: Trivial - Nice-to-have

Retorne APENAS um JSON válido no formato especificado, sem texto adicional.`;

    const userPrompt = `Analise os seguintes logs do tipo "${logsType}" e gere sugestões de correção:

${context || 'Logs disponíveis para análise'}

Retorne um objeto JSON com esta estrutura exata:
{
  "timestamp": "ISO 8601 timestamp",
  "summary": {
    "totalIssues": number,
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  },
  "suggestions": [
    {
      "id": "unique-id",
      "priority": 1-5,
      "category": "security|performance|bugfix|optimization",
      "title": "Título curto",
      "description": "Descrição detalhada do problema e impacto",
      "affectedFiles": ["src/file1.tsx", "src/file2.ts"],
      "codeSnippet": "Código completo da solução",
      "testSuggestion": "Sugestão de teste (opcional)",
      "estimatedEffort": "low|medium|high",
      "creditsSaved": "~XX créditos/mês"
    }
  ],
  "nextSteps": ["Passo 1", "Passo 2"]
}`;

    console.log('Calling Lovable AI Gateway...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos no workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const aiContent = data.choices?.[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from AI response (remove markdown code blocks if present)
    let cleanJson = aiContent.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```\n?/g, '');
    }

    const analysisResult: AnalysisResult = JSON.parse(cleanJson);
    
    console.log('Analysis complete:', {
      totalIssues: analysisResult.summary.totalIssues,
      suggestions: analysisResult.suggestions.length
    });

    return new Response(
      JSON.stringify(analysisResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-and-suggest-fixes:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
