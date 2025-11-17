import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Buscar contexto histórico
    console.log('📚 Buscando contexto histórico...');
    const { data: previousAnalyses } = await supabaseClient
      .from('ai_analysis_history')
      .select('suggestions, applied_fixes, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: resolvedSuggestions } = await supabaseClient
      .from('ai_suggestion_status')
      .select('suggestion_id, title, resolved_at, category')
      .eq('status', 'resolved');

    const previousBugs = previousAnalyses?.flatMap(a => 
      Array.isArray(a.suggestions) ? a.suggestions.map((s: any) => ({
        id: s.id,
        title: s.title,
        category: s.category
      })) : []
    ) || [];

    const resolvedBugIds = resolvedSuggestions?.map(s => s.suggestion_id) || [];
    const appliedFixes = previousAnalyses?.flatMap(a => a.applied_fixes || []) || [];

    console.log(`📊 Contexto: ${previousBugs.length} bugs anteriores, ${resolvedBugIds.length} resolvidos, ${appliedFixes.length} fixes aplicados`);

    const systemPrompt = `Você é um especialista em debugging e otimização de código React/TypeScript/Supabase.

⚠️ CONTEXTO HISTÓRICO IMPORTANTE:
- Bugs identificados anteriormente: ${previousBugs.length}
- Bugs já resolvidos: ${resolvedBugIds.length}
- Fixes aplicados: ${appliedFixes.length}

🔍 INSTRUÇÕES CRÍTICAS DE ANÁLISE CONTEXTUAL:
1. NÃO reporte bugs que já foram RESOLVIDOS (IDs: ${resolvedBugIds.slice(0, 10).join(', ')})
2. Se um bug estava em análises anteriores mas não aparece mais, NÃO o inclua
3. Identifique APENAS problemas NOVOS ou que AINDA PERSISTEM
4. Compare o código atual com fixes aplicados
5. Priorize bugs NOVOS

📋 BUGS JÁ RESOLVIDOS (NÃO REPORTAR):
${resolvedSuggestions?.slice(0, 5).map(s => `- ${s.title} (${s.category})`).join('\n') || 'Nenhum'}

🔧 FIXES JÁ APLICADOS:
${appliedFixes.slice(0, 5).join('\n') || 'Nenhum'}

DIRETRIZES:
1. Priorize segurança e performance críticas
2. Gere código completo e funcional
3. Inclua validações e tratamento de erros
4. Estime economia de créditos realista
5. Sugira testes quando aplicável
6. Use TypeScript e práticas modernas do React
7. Considere RLS policies para Supabase

CATEGORIAS:
- security: Vulnerabilidades, SQL injection, XSS
- performance: Memory leaks, re-renders, queries N+1
- bugfix: Bugs funcionais que causam erros
- optimization: Melhorias sem impacto crítico

PRIORIDADES:
1: Crítico - Quebra funcionalidade ou segurança grave
2: Alto - Impacto significativo em performance ou UX
3: Médio - Melhoria importante mas não urgente
4: Baixo - Refatoração desejável
5: Trivial - Nice-to-have

Retorne APENAS um JSON válido no formato especificado, sem texto adicional.`;

    const userPrompt = `Analise os seguintes logs do tipo "${logsType}" e gere sugestões de correção:

${context || 'Logs disponíveis para análise'}

Retorne um objeto JSON com esta estrutura:
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
      "description": "Descrição detalhada",
      "affectedFiles": ["src/file.tsx"],
      "codeSnippet": "Código da solução",
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
        temperature: 0.7,
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

    let cleanJson = aiContent.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```\n?/g, '');
    }

    const result: AnalysisResult = JSON.parse(cleanJson);
    
    console.log('Analysis complete:', {
      totalIssues: result.summary.totalIssues,
      suggestions: result.suggestions.length
    });

    // Auto-resolução de bugs que sumiram
    const currentBugIds = result.suggestions.map(s => s.id);
    const previousBugIds = previousBugs.map((b: any) => b.id);
    const autoResolvedIds = previousBugIds.filter(id => !currentBugIds.includes(id));

    if (autoResolvedIds.length > 0) {
      console.log(`✨ Auto-resolvendo ${autoResolvedIds.length} bugs...`);
      
      await supabaseClient
        .from('ai_suggestion_status')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          implementation_notes: 'Auto-resolved: bug no longer detected'
        })
        .in('suggestion_id', autoResolvedIds)
        .eq('status', 'pending');
    }

    // Persistir análise
    const { data: savedAnalysis, error: saveError } = await supabaseClient
      .from('ai_analysis_history')
      .insert({
        logs_type: logsType,
        total_issues: result.summary.totalIssues,
        suggestions: result.suggestions,
        estimated_credits_saved: result.suggestions.reduce(
          (sum, s) => sum + parseInt(s.creditsSaved.match(/\d+/)?.[0] || '0'),
          0
        ),
        metadata: {
          summary: result.summary,
          nextSteps: result.nextSteps,
          contextLength: context?.length || 0,
          autoResolvedCount: autoResolvedIds.length,
          historicalContext: {
            previousBugs: previousBugs.length,
            resolvedBugs: resolvedBugIds.length,
            appliedFixes: appliedFixes.length
          }
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
    }

    if (savedAnalysis) {
      // Criar status para cada sugestão
      const statusInserts = result.suggestions.map(s => ({
        analysis_id: savedAnalysis.id,
        suggestion_id: s.id,
        category: s.category,
        severity: getPrioritySeverity(s.priority),
        title: s.title,
        estimated_effort: s.estimatedEffort,
        estimated_credits_saved: parseInt(s.creditsSaved.match(/\d+/)?.[0] || '0'),
      }));

      await supabaseClient
        .from('ai_suggestion_status')
        .insert(statusInserts);

      console.log(`Saved analysis ${savedAnalysis.id} with ${statusInserts.length} suggestions`);

      // Disparar alerta se necessário
      const criticalIssues = result.suggestions.filter(s => s.priority <= 2);
      
      const { data: latestScan } = await supabaseClient
        .from('code_scan_history')
        .select('id, improvement_percentage, total_issues, resolved_issues, new_issues, pending_issues')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const shouldAlert = criticalIssues.length > 5 || 
                         (latestScan && latestScan.improvement_percentage < 50);
      
      if (shouldAlert) {
        console.log(`🚨 Disparando alerta: ${criticalIssues.length} críticos`);
        
        try {
          await supabaseClient.functions.invoke('send-critical-alert', {
            body: {
              scanId: latestScan?.id || savedAnalysis.id,
              criticalCount: criticalIssues.length,
              improvementRate: latestScan?.improvement_percentage || 0,
              analysisDetails: {
                totalIssues: result.summary.totalIssues,
                resolvedIssues: latestScan?.resolved_issues || 0,
                newIssues: latestScan?.new_issues || 0,
                pendingIssues: latestScan?.pending_issues || 0,
                criticalIssues: criticalIssues.map(issue => ({
                  title: issue.title,
                  category: issue.category,
                  affectedFiles: issue.affectedFiles
                }))
              }
            }
          });
          
          console.log('✅ Alerta enviado com sucesso');
        } catch (alertErr) {
          console.error('⚠️ Erro ao enviar alerta:', alertErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        analysisId: savedAnalysis?.id
      }),
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

function getPrioritySeverity(priority: number): 'Crítico' | 'Alto' | 'Médio' | 'Baixo' {
  if (priority === 1) return 'Crítico';
  if (priority === 2) return 'Alto';
  if (priority === 3) return 'Médio';
  return 'Baixo';
}
