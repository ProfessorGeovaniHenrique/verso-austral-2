import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

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
  tagset_pai?: string;
}

interface AIRefinedSuggestion {
  paiRecomendado: string;
  nivelSugerido: number;
  confianca: number;
  justificativa: string;
  melhorias?: {
    descricao?: string;
    exemplosAdicionais?: string[];
    nomeSugerido?: string;
    codigoSugerido?: string;
    justificativaNome?: string;
  };
  alertas?: string[];
  alternativas?: Array<{
    codigo: string;
    nome: string;
    razao: string;
  }>;
}

interface PriorityScore {
  tagsetId: string;
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: {
    aiConfidence: number;
    hierarchicalImpact: number;
    semanticUrgency: number;
    complexity: number;
  };
  reasoning: string;
}

serve(withInstrumentation('calculate-priority-score', async (req) => {
  // Health check endpoint - verifica query parameter
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.get('health') === 'true') {
    const health = await createHealthCheck('calculate-priority-score', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tagsetsPendentes, aiSuggestions, tagsetsAtivos } = await req.json();

    if (!tagsetsPendentes || !Array.isArray(tagsetsPendentes)) {
      throw new Error('tagsetsPendentes deve ser um array');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const priorities: PriorityScore[] = [];

    for (const tagset of tagsetsPendentes) {
      const aiSuggestion = aiSuggestions?.[tagset.id] as AIRefinedSuggestion | undefined;
      
      // 1. AI Confidence Score (35 pontos)
      const confidenceScore = aiSuggestion?.confianca 
        ? (aiSuggestion.confianca / 100) * 35 
        : 15;

      // 2. Hierarchical Impact Score (30 pontos)
      const nivelSugerido = aiSuggestion?.nivelSugerido || tagset.nivel_profundidade || 2;
      const temFilhosPotenciais = tagsetsAtivos?.filter(
        (t: Tagset) => t.tagset_pai === tagset.codigo
      ).length > 0;
      const eTopLevel = nivelSugerido === 1;
      
      let hierarchicalScore = 0;
      if (eTopLevel) hierarchicalScore = 30;
      else if (temFilhosPotenciais) hierarchicalScore = 25;
      else if (nivelSugerido === 2) hierarchicalScore = 20;
      else hierarchicalScore = 10;

      // 3. Semantic Urgency Score (20 pontos)
      const numExemplos = tagset.exemplos?.length || 0;
      const temDescricao = !!tagset.descricao && tagset.descricao.length > 20;
      const temAlertas = aiSuggestion?.alertas && aiSuggestion.alertas.length > 0;
      
      let urgencyScore = 0;
      if (temAlertas) urgencyScore = 20;
      else if (!temDescricao) urgencyScore = 15;
      else if (numExemplos < 3) urgencyScore = 12;
      else urgencyScore = 8;

      // 4. Complexity Score (15 pontos)
      const temAlternativas = aiSuggestion?.alternativas && aiSuggestion.alternativas.length > 1;
      const precisaMelhorias = aiSuggestion?.melhorias && (
        aiSuggestion.melhorias.nomeSugerido || 
        aiSuggestion.melhorias.codigoSugerido ||
        aiSuggestion.melhorias.descricao
      );
      
      let complexityScore = 0;
      if (temAlternativas && precisaMelhorias) complexityScore = 15;
      else if (temAlternativas || precisaMelhorias) complexityScore = 10;
      else complexityScore = 5;

      const totalScore = confidenceScore + hierarchicalScore + urgencyScore + complexityScore;
      
      let level: 'high' | 'medium' | 'low';
      if (totalScore >= 70) level = 'high';
      else if (totalScore >= 45) level = 'medium';
      else level = 'low';

      const reasoning = [
        `Confiança IA: ${confidenceScore.toFixed(0)}/35`,
        `Impacto Hierárquico: ${hierarchicalScore}/30`,
        `Urgência Semântica: ${urgencyScore}/20`,
        `Complexidade: ${complexityScore}/15`,
      ].join(' | ');

      priorities.push({
        tagsetId: tagset.id,
        score: Math.round(totalScore),
        level,
        factors: {
          aiConfidence: Math.round(confidenceScore),
          hierarchicalImpact: hierarchicalScore,
          semanticUrgency: urgencyScore,
          complexity: complexityScore,
        },
        reasoning,
      });
    }

    // Ordenar por score (maior primeiro)
    priorities.sort((a, b) => b.score - a.score);

    console.log(`✅ Calculados ${priorities.length} scores de priorização`);

    return new Response(JSON.stringify({ priorities }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao calcular prioridades:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        priorities: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}));
