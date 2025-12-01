import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, currentQuestion } = await req.json();
    
    if (!questionId || !currentQuestion) {
      return new Response(
        JSON.stringify({ error: 'questionId e currentQuestion são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Construir prompt especializado
    const prompt = `Você é um especialista em pedagogia e design de avaliações educacionais focadas na cultura gaúcha e chamamé.

PERGUNTA ATUAL:
Tipo: ${currentQuestion.type}
Dificuldade: ${currentQuestion.difficulty}
Categoria: ${currentQuestion.category}
Pergunta: ${currentQuestion.question}
${currentQuestion.options ? `Opções: ${JSON.stringify(currentQuestion.options, null, 2)}` : ''}
${currentQuestion.matchingPairs ? `Pares: ${JSON.stringify(currentQuestion.matchingPairs, null, 2)}` : ''}
Respostas Corretas: ${JSON.stringify(currentQuestion.correctAnswers)}
Explicação: ${currentQuestion.explanation}

TAREFA:
Refine esta pergunta melhorando:
1. CLAREZA: Torne a pergunta mais clara e objetiva
2. LINGUAGEM: Use linguagem acessível mas precisa
3. OPÇÕES: Melhore as alternativas para serem mais plausíveis e desafiadoras
4. EXPLICAÇÃO: Enriqueça a explicação com mais contexto educacional

IMPORTANTE:
- Mantenha o tipo, dificuldade e categoria originais
- Preserve o significado essencial da pergunta
- Para matching: mantenha 4 pares
- Para checkbox: mantenha entre 4-6 opções
- Para objective: mantenha 4 opções
- A explicação deve ser didática e informativa

Retorne APENAS um objeto JSON válido com esta estrutura:
{
  "question": "pergunta refinada",
  "options": ["opção 1", "opção 2", ...] ou null,
  "correctAnswers": ["resposta 1", ...],
  "matchingPairs": [{"left": "...", "right": "..."}] ou null,
  "explanation": "explicação refinada e enriquecida"
}`;

    // Tentar GPT-5-mini primeiro
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em pedagogia e design instrucional. Retorne APENAS JSON válido, sem texto adicional.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.log('GPT-5-mini falhou, tentando Gemini Flash como fallback');
      // Fallback para Gemini Flash
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é um especialista em pedagogia e design instrucional. Retorne APENAS JSON válido, sem texto adicional.' },
            { role: 'user', content: prompt }
          ],
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const refinedText = aiResponse.choices[0].message.content.trim();
    
    // Parse JSON da resposta
    let refinedQuestion;
    try {
      // Remover markdown code blocks se existirem
      const jsonText = refinedText.replace(/```json\n?|\n?```/g, '').trim();
      refinedQuestion = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Erro ao parsear JSON da IA:', refinedText);
      throw new Error('IA retornou resposta inválida');
    }

    // Atualizar timestamp no banco
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('quiz_questions')
      .update({ last_ai_refinement: new Date().toISOString() })
      .eq('question_id', questionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        refinedQuestion,
        original: currentQuestion 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em refine-quiz-question:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
