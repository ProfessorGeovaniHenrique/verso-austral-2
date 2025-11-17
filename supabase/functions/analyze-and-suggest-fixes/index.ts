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

    // ✅ CRIAR CLIENTE SUPABASE PARA PERSISTÊNCIA
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // ✅ BUSCAR CONTEXTO HISTÓRICO ANTES DA ANÁLISE
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

    // Construir contexto histórico
    const previousBugs = previousAnalyses?.flatMap(a => 
      Array.isArray(a.suggestions) ? a.suggestions.map(s => ({
        id: s.id,
        title: s.title,
        category: s.category
      })) : []
    ) || [];

    const resolvedBugIds = resolvedSuggestions?.map(s => s.suggestion_id) || [];
    const appliedFixes = previousAnalyses?.flatMap(a => a.applied_fixes || []) || [];

    console.log(`📊 Contexto: ${previousBugs.length} bugs anteriores, ${resolvedBugIds.length} resolvidos, ${appliedFixes.length} fixes aplicados`);

    const systemPrompt = `Você é um especialista em debugging e otimização de código React/TypeScript/Supabase.
Analise os logs fornecidos e sugira correções priorizadas.

⚠️ CONTEXTO HISTÓRICO IMPORTANTE:
- Bugs já identificados anteriormente: ${previousBugs.length}
- Bugs já resolvidos: ${resolvedBugIds.length}
- Fixes aplicados: ${appliedFixes.length}

🔍 INSTRUÇÕES CRÍTICAS DE ANÁLISE CONTEXTUAL:
1. NÃO reporte bugs que já foram RESOLVIDOS (IDs: ${resolvedBugIds.slice(0, 10).join(', ')})
2. Se um bug estava em análises anteriores mas não aparece mais no código atual, marque-o como "Corrigido recentemente" e NÃO o inclua nas sugestões
3. Identifique APENAS problemas NOVOS ou problemas que AINDA PERSISTEM
4. Compare o código atual com os fixes aplicados para validar implementações
5. Priorize bugs NOVOS sobre os que já foram identificados anteriormente

📋 BUGS JÁ RESOLVIDOS (NÃO REPORTAR):
${resolvedSuggestions?.slice(0, 5).map(s => `- ${s.title} (${s.category})`).join('\n') || 'Nenhum'}

🔧 FIXES JÁ APLICADOS:
${appliedFixes.slice(0, 5).join('\n') || 'Nenhum'}
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

    // ✅ AUTO-RESOLUÇÃO: Detectar bugs que sumiram
    const currentBugIds = analysisResult.suggestions.map(s => s.id);
    const previousBugIds = previousBugs.map(b => b.id);
    const autoResolvedIds = previousBugIds.filter(id => !currentBugIds.includes(id));

    if (autoResolvedIds.length > 0) {
      console.log(`✨ Auto-resolvendo ${autoResolvedIds.length} bugs que não aparecem mais...`);
      
      const { error: autoResolveError } = await supabaseClient
        .from('ai_suggestion_status')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          implementation_notes: 'Auto-resolved: bug no longer detected in latest scan'
        })
        .in('suggestion_id', autoResolvedIds)
        .eq('status', 'pending');

      if (!autoResolveError) {
        console.log(`✅ ${autoResolvedIds.length} bugs auto-resolvidos com sucesso`);
      }
    }

    // ✅ PERSISTIR ANÁLISE NO BANCO
    const { data: savedAnalysis, error: saveError } = await supabaseClient
      .from('ai_analysis_history')
      .insert({
        logs_type: logsType,
        total_issues: analysisResult.summary.totalIssues,
        suggestions: analysisResult.suggestions,
        estimated_credits_saved: analysisResult.suggestions.reduce(
          (sum, s) => sum + parseInt(s.creditsSaved.match(/\d+/)?.[0] || '0'),
          0
        ),
        metadata: {
          summary: analysisResult.summary,
          nextSteps: analysisResult.nextSteps,
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
    } else if (savedAnalysis) {
      // ✅ CRIAR STATUS INDIVIDUAL PARA CADA SUGESTÃO
      const statusInserts = analysisResult.suggestions.map(s => ({
        analysis_id: savedAnalysis.id,
        suggestion_id: s.id,
        category: s.category,
        severity: getPrioritySeverity(s.priority),
        title: s.title,
        estimated_effort: s.estimatedEffort,
        estimated_credits_saved: parseInt(s.creditsSaved.match(/\d+/)?.[0] || '0'),
      }));

      const { error: statusError } = await supabaseClient
        .from('ai_suggestion_status')
        .insert(statusInserts);

      if (statusError) {
        console.error('Error saving suggestion statuses:', statusError);
      }

      console.log(`Saved analysis ${savedAnalysis.id} with ${statusInserts.length} suggestions`);
    }

    // ✅ DISPARAR ALERTA CRÍTICO SE NECESSÁRIO
    const criticalIssues = analysisResult.suggestions.filter(
      (s: AnalysisSuggestion) => s.priority <= 2
    );

    if (criticalIssues.length > 0) {
      console.log(`🚨 ${criticalIssues.length} problemas críticos detectados, enviando alerta...`);
      
      try {
        // Buscar último scan para enviar contexto completo
        const { data: latestScan } = await supabaseClient
          .from('code_scan_history')
          .select('id, improvement_percentage, total_issues, resolved_issues, new_issues, pending_issues')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const alertPayload = {
          scanId: latestScan?.id || savedAnalysis.id,
          criticalCount: criticalIssues.length,
          improvementRate: latestScan?.improvement_percentage || 0,
          analysisDetails: {
            totalIssues: analysisResult.summary.totalIssues,
            resolvedIssues: latestScan?.resolved_issues || 0,
            newIssues: latestScan?.new_issues || 0,
            pendingIssues: latestScan?.pending_issues || 0,
            criticalIssues: criticalIssues.map(issue => ({
              title: issue.title,
              category: issue.category,
              affectedFiles: issue.affectedFiles
            }))
          }
        };

        const { error: alertError } = await supabaseClient.functions.invoke('send-critical-alert', {
          body: alertPayload
        });

        if (alertError) {
          console.error('⚠️ Erro ao enviar alerta (não crítico):', alertError);
        } else {
          console.log('✅ Alerta enviado com sucesso');
        }
      } catch (alertErr) {
        console.error('⚠️ Erro ao processar alerta:', alertErr);
      }
    }
        const alertResponse = await supabaseClient.functions.invoke(
          'send-critical-alert',
          {
            body: {
              analysisId: savedAnalysis?.id || 'unknown',
              logsType: logsType,
              criticalCount: criticalIssues.length,
              summary: analysisResult.summary,
              criticalIssues: criticalIssues,
              timestamp: new Date().toISOString(),
            }
          }
        );
        
        if (alertResponse.error) {
          console.error('❌ Erro ao enviar alerta:', alertResponse.error);
        } else {
          console.log('✅ Alerta enviado com sucesso para geovani.henrique@ifsc.edu.br');
        }
      } catch (emailError) {
        console.error('❌ Falha ao invocar send-critical-alert:', emailError);
        // ⚠️ NÃO falhar a análise se o email falhar
      }
    } else {
      console.log('ℹ️ Nenhum problema crítico detectado, email não enviado');
    }

    return new Response(
      JSON.stringify({
        ...analysisResult,
        analysisId: savedAnalysis?.id // Incluir ID da análise no response
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
