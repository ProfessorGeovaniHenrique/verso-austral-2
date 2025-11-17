import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface definitions
interface AnalysisSuggestion {
  id: string;
  priority: number;
  category: string;
  title: string;
  description: string;
  affectedFiles: string[];
  codeSnippet: string;
  testSuggestion?: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  creditsSaved: number;
  confidenceScore?: number;
  verificationStatus?: 'pending' | 'auto-verified' | 'false-positive';
}

interface AnalysisResult {
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

interface CodeSnapshot {
  features: {
    batching: { implemented: boolean; file: string; line: number };
    validation: { implemented: boolean; file: string; line: number };
    pagination: { implemented: boolean; file: string; line: number };
    caching: { implemented: boolean; file: string; line: number };
    retry: { implemented: boolean; file: string; line: number };
    notifications: { implemented: boolean; file: string; line: number };
    errorHandling: { implemented: boolean; file: string; line: number };
  };
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 📚 FASE 1: BUSCAR CONTEXTO HISTÓRICO
    console.log('📚 Buscando contexto histórico...');
    const { data: previousAnalyses } = await supabase
      .from('ai_analysis_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: resolvedSuggestions } = await supabase
      .from('ai_suggestion_status')
      .select('*')
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(20);

    const { data: feedbackHistory } = await supabase
      .from('ai_analysis_feedback')
      .select('*')
      .order('validated_at', { ascending: false })
      .limit(50);

    const previousBugIds = previousAnalyses?.flatMap(a => 
      (a.suggestions as any[]).map(s => s.id)
    ) || [];

    const resolvedBugIds = resolvedSuggestions?.map(s => s.suggestion_id) || [];
    const appliedFixes = previousAnalyses?.flatMap(a => a.applied_fixes || []) || [];
    const falsePositives = feedbackHistory?.filter(f => f.human_verdict === 'false_positive').map(f => f.suggestion_id) || [];
    const alreadyFixed = feedbackHistory?.filter(f => f.human_verdict === 'already_fixed').map(f => f.suggestion_id) || [];

    console.log(`📊 Contexto: ${previousBugIds.length} bugs anteriores, ${resolvedBugIds.length} resolvidos, ${appliedFixes.length} fixes aplicados, ${falsePositives.length} falsos positivos, ${alreadyFixed.length} já corrigidos`);

    // Snapshot do código atual implementado
    const codeSnapshot: CodeSnapshot = {
      features: {
        batching: { implemented: true, file: 'supabase/functions/process-dialectal-dictionary/index.ts', line: 9 },
        validation: { implemented: true, file: 'src/components/advanced/DictionaryImportInterface.tsx', line: 23 },
        pagination: { implemented: true, file: 'src/hooks/useAnnotationJobs.ts', line: 22 },
        caching: { implemented: true, file: 'src/hooks/useTagsets.ts', line: 47 },
        retry: { implemented: true, file: 'src/lib/retryUtils.ts', line: 1 },
        notifications: { implemented: true, file: 'src/lib/notifications.ts', line: 1 },
        errorHandling: { implemented: true, file: 'src/hooks/useAIAnalysisHistory.ts', line: 130 }
      }
    };

    console.log('Calling Lovable AI Gateway...');

    // 🔥 FASE 3: PROMPT REFATORADO COM REGRAS ABSOLUTAS
    const systemPrompt = `Você é um especialista em análise de código com foco em PRECISÃO e CONTEXTO.

⚠️ REGRAS ABSOLUTAS (NÃO NEGOCIÁVEIS):
═══════════════════════════════════════════════════════════════

1. Se um bug estava em previousBugs MAS o código mostra implementação → marque como RESOLVIDO (não reporte)
2. Se um problema está em resolvedBugs ou alreadyFixed → NÃO reporte novamente
3. Se um problema foi marcado como falso positivo → IGNORE completamente
4. Identifique APENAS problemas NOVOS que não estão no código atual

═══════════════════════════════════════════════════════════════

📋 CONTEXTO HISTÓRICO:
${previousBugIds.length > 0 ? `
Bugs anteriores (${previousBugIds.length}): ${previousBugIds.slice(0, 10).join(', ')}
` : ''}

🚫 BUGS JÁ RESOLVIDOS (PROIBIDO REPORTAR):
${resolvedBugIds.length > 0 ? resolvedBugIds.map(id => `- ${id}`).join('\n') : 'Nenhum'}

❌ FALSOS POSITIVOS CONHECIDOS (IGNORAR):
${falsePositives.length > 0 ? falsePositives.map(id => `- ${id}`).join('\n') : 'Nenhum'}

✅ JÁ CORRIGIDO (NÃO REPORTAR):
${alreadyFixed.length > 0 ? alreadyFixed.map(id => `- ${id}`).join('\n') : 'Nenhum'}

🔧 CÓDIGO ATUAL IMPLEMENTADO:
- Batching: BATCH_SIZE = 1000 (${codeSnapshot.features.batching.file}:${codeSnapshot.features.batching.line})
- Validação: fetch + .ok check (${codeSnapshot.features.validation.file}:${codeSnapshot.features.validation.line})
- Paginação: useAnnotationJobs(page, pageSize) (${codeSnapshot.features.pagination.file}:${codeSnapshot.features.pagination.line})
- Cache: staleTime: 30min (${codeSnapshot.features.caching.file}:${codeSnapshot.features.caching.line})
- Retry: retryWithBackoff implementado (${codeSnapshot.features.retry.file})
- Notifications: notifications.ts centralizado (${codeSnapshot.features.notifications.file})
- Error Handling: try/catch + notifications (${codeSnapshot.features.errorHandling.file})

⚠️ SE VOCÊ REPORTAR QUALQUER UM DESSES BUGS, VOCÊ ESTÁ ERRADO.

═══════════════════════════════════════════════════════════════

INSTRUÇÕES DE ANÁLISE:
1. Leia os logs CUIDADOSAMENTE
2. Compare com o código implementado acima
3. Identifique APENAS problemas NOVOS que não estão implementados
4. Cada sugestão deve ter um ID único: "BUG_YYYY_MM_DD_NNN"
5. Priorize por impacto real (1 = crítico, 5 = trivial)
6. Forneça snippets de código específicos e testáveis

Retorne um JSON com esta estrutura exata:
{
  "summary": {
    "totalIssues": number,
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  },
  "suggestions": [
    {
      "id": "BUG_YYYY_MM_DD_NNN",
      "priority": 1-5,
      "category": "security" | "performance" | "bugfix" | "optimization",
      "title": "Título curto",
      "description": "Descrição detalhada",
      "affectedFiles": ["caminho/arquivo.ts"],
      "codeSnippet": "código problemático",
      "testSuggestion": "como testar",
      "estimatedEffort": "low" | "medium" | "high",
      "creditsSaved": number (estimativa de créditos economizados ao corrigir)
    }
  ],
  "nextSteps": ["ação 1", "ação 2"]
}`;

    const userPrompt = `Analise os seguintes logs de ${logsType} e identifique problemas NOVOS:

${context}

Lembre-se: NÃO reporte bugs já resolvidos ou problemas já implementados listados acima.`;

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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded. Please try again in a few moments.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({
          error: 'Insufficient credits. Please add credits to your Lovable workspace.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const cleanedJson = jsonMatch[0]
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/,(\s*[}\]])/g, '$1');

    const parsed = JSON.parse(cleanedJson);
    console.log('Analysis complete:', { totalIssues: parsed.suggestions?.length || 0, suggestions: parsed.suggestions?.length });

    let result: AnalysisResult = {
      summary: parsed.summary || {
        totalIssues: parsed.suggestions?.length || 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      suggestions: parsed.suggestions || [],
      nextSteps: parsed.nextSteps || []
    };

    // 🔍 FASE 2: FILTRO DE VALIDAÇÃO PÓS-ANÁLISE
    console.log(`🔍 Aplicando filtro de validação em ${result.suggestions.length} sugestões...`);
    
    const filteredSuggestions = result.suggestions.filter(suggestion => {
      if (resolvedBugIds.includes(suggestion.id)) {
        console.log(`❌ Filtrado (já resolvido): ${suggestion.id}`);
        return false;
      }

      if (falsePositives.includes(suggestion.id)) {
        console.log(`❌ Filtrado (falso positivo): ${suggestion.id}`);
        return false;
      }

      if (alreadyFixed.includes(suggestion.id)) {
        console.log(`❌ Filtrado (já corrigido): ${suggestion.id}`);
        return false;
      }

      // 📊 FASE 4: CALCULAR CONFIDENCE SCORE
      let confidenceScore = 100;

      if (previousBugIds.includes(suggestion.id)) {
        confidenceScore -= 40;
      }

      const description = suggestion.description.toLowerCase();
      const title = suggestion.title.toLowerCase();
      const mentions = description + ' ' + title;

      if ((mentions.includes('batch') || mentions.includes('lote')) && codeSnapshot.features.batching.implemented) {
        confidenceScore -= 30;
      }
      if ((mentions.includes('validação') || mentions.includes('validation')) && codeSnapshot.features.validation.implemented) {
        confidenceScore -= 30;
      }
      if ((mentions.includes('paginação') || mentions.includes('pagination')) && codeSnapshot.features.pagination.implemented) {
        confidenceScore -= 30;
      }
      if ((mentions.includes('cache') || mentions.includes('caching')) && codeSnapshot.features.caching.implemented) {
        confidenceScore -= 30;
      }
      if ((mentions.includes('retry') || mentions.includes('tentativa')) && codeSnapshot.features.retry.implemented) {
        confidenceScore -= 30;
      }
      if ((mentions.includes('notificação') || mentions.includes('notification')) && codeSnapshot.features.notifications.implemented) {
        confidenceScore -= 30;
      }

      suggestion.confidenceScore = Math.max(0, Math.min(100, confidenceScore));
      suggestion.verificationStatus = confidenceScore >= 60 ? 'auto-verified' : 'pending';

      if (confidenceScore < 60) {
        console.log(`⚠️ Baixa confiança (${confidenceScore}%): ${suggestion.id} - ${suggestion.title}`);
        return false;
      }

      console.log(`✅ Aprovado (${confidenceScore}%): ${suggestion.id}`);
      return true;
    });

    const filteredCount = result.suggestions.length - filteredSuggestions.length;
    console.log(`📊 Filtrados: ${filteredCount} falsos positivos`);

    result = {
      ...result,
      suggestions: filteredSuggestions,
      summary: {
        ...result.summary,
        totalIssues: filteredSuggestions.length
      }
    };

    // Auto-resolver bugs que não aparecem mais
    const bugsToResolve = resolvedBugIds.filter(id => 
      !result.suggestions.some(s => s.id === id)
    );

    console.log(`✨ Auto-resolvendo ${bugsToResolve.length} bugs...`);
    
    // Salvar análise no banco
    const totalCredits = result.suggestions.reduce((sum, s) => sum + s.creditsSaved, 0);
    
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('ai_analysis_history')
      .insert({
        logs_type: logsType,
        total_issues: result.suggestions.length,
        suggestions: result.suggestions as any,
        estimated_credits_saved: totalCredits,
        context_used: {
          previousBugs: previousBugIds.length,
          resolvedBugs: resolvedBugIds.length,
          falsePositives: falsePositives.length,
          alreadyFixed: alreadyFixed.length
        },
        bugs_auto_resolved: bugsToResolve.length,
        false_positives_filtered: filteredCount,
        metadata: {
          timestamp: new Date().toISOString(),
          codeSnapshot: codeSnapshot
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar análise:', saveError);
      throw saveError;
    }

    console.log(`Saved analysis ${savedAnalysis.id} with ${result.suggestions.length} suggestions`);

    // Salvar status individual de cada sugestão
    for (const suggestion of result.suggestions) {
      await supabase
        .from('ai_suggestion_status')
        .insert({
          analysis_id: savedAnalysis.id,
          suggestion_id: suggestion.id,
          category: suggestion.category,
          severity: getPrioritySeverity(suggestion.priority),
          title: suggestion.title,
          estimated_effort: suggestion.estimatedEffort,
          estimated_credits_saved: suggestion.creditsSaved,
          confidence_score: suggestion.confidenceScore || 100,
          verification_status: suggestion.verificationStatus || 'pending',
          status: 'pending'
        });
    }

    // Auto-resolver bugs que desapareceram
    if (bugsToResolve.length > 0) {
      await supabase
        .from('ai_suggestion_status')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          implementation_notes: 'Auto-resolvido: bug não mais detectado em scan posterior'
        })
        .in('suggestion_id', bugsToResolve);
    }

    // 🚨 Enviar alerta crítico se necessário
    const criticalCount = result.suggestions.filter(s => s.priority === 1).length;
    const improvementPercentage = previousAnalyses && previousAnalyses.length > 0
      ? ((previousAnalyses[0].total_issues - result.suggestions.length) / previousAnalyses[0].total_issues) * 100
      : 0;

    if (criticalCount >= 3 || improvementPercentage < 10) {
      await supabase.functions.invoke('send-critical-alert', {
        body: {
          totalIssues: result.suggestions.length,
          criticalIssues: criticalCount,
          improvementPercentage,
          scanId: savedAnalysis.id
        }
      });
    }

    return new Response(JSON.stringify({
      ...result,
      analysisId: savedAnalysis.id,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in analyze-and-suggest-fixes:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getPrioritySeverity(priority: number): 'Crítico' | 'Alto' | 'Médio' | 'Baixo' {
  if (priority === 1) return 'Crítico';
  if (priority === 2) return 'Alto';
  if (priority === 3) return 'Médio';
  return 'Baixo';
}
