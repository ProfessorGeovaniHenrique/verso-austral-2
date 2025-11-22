import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Obter userId do token JWT
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Carregar contexto completo dos domínios semânticos
    const { data: tagsets, error: tagsetsError } = await supabase
      .from('semantic_tagset')
      .select('codigo, nome, descricao, exemplos, nivel_profundidade, categoria_pai, status')
      .in('status', ['ativo', 'proposto', 'rejeitado'])
      .order('codigo');

    if (tagsetsError) {
      console.error('Erro ao carregar tagsets:', tagsetsError);
      return new Response(JSON.stringify({ error: 'Erro ao carregar contexto' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construir hierarquia para o contexto
    const activeTagsets = tagsets.filter(t => t.status === 'ativo');
    const propostosTagsets = tagsets.filter(t => t.status === 'proposto');
    const rejeitadosTagsets = tagsets.filter(t => t.status === 'rejeitado');
    
    const nivel1 = activeTagsets.filter(t => t.nivel_profundidade === 1);
    const nivel2 = activeTagsets.filter(t => t.nivel_profundidade === 2);
    const nivel3 = activeTagsets.filter(t => t.nivel_profundidade === 3);
    const nivel4 = activeTagsets.filter(t => t.nivel_profundidade === 4);

    const contextSnapshot = {
      total: tagsets.length,
      ativos: activeTagsets.length,
      propostos: propostosTagsets.length,
      rejeitados: rejeitadosTagsets.length,
      porNivel: {
        nivel1: nivel1.length,
        nivel2: nivel2.length,
        nivel3: nivel3.length,
        nivel4: nivel4.length,
      },
      timestamp: new Date().toISOString(),
    };

    // ✅ System Prompt com Regras de Negócio
    const systemPrompt = `Você é Blau Nunes, um Assistente Especializado em Taxonomia Semântica para Análise de Corpus Linguístico, com o jeito gaúcho de falar.

**CONTEXTO DA TAXONOMIA ATUAL:**
- Total de domínios ativos: ${activeTagsets.length}
- Domínios Pendentes: ${propostosTagsets.length}
- Domínios Rejeitados: ${rejeitadosTagsets.length}
- Nível 1 (Categorias Raiz): ${nivel1.length}
- Nível 2 (Subcategorias): ${nivel2.length}
- Nível 3 (Especializações): ${nivel3.length}
- Nível 4 (Detalhamentos): ${nivel4.length}

**REGRAS DE NEGÓCIO:**
1. Máximo de 4 níveis hierárquicos
2. Nível 1: Categorias amplas e autônomas (sem pai)
3. Níveis 2-4: DEVEM ter categoria_pai obrigatoriamente
4. Códigos seguem padrão: N1, N1.N2, N1.N2.N3, N1.N2.N3.N4
5. Prevenir ciclos hierárquicos (filho não pode ser pai de seu ancestral)

**HIERARQUIA COMPLETA:**
${nivel1.map(t1 => {
  const filhosN2 = nivel2.filter(t => t.categoria_pai === t1.codigo);
  return `
📁 ${t1.codigo} - ${t1.nome}
   Descrição: ${t1.descricao || 'N/A'}
   Exemplos: ${t1.exemplos?.join(', ') || 'N/A'}
   ${filhosN2.map(t2 => {
     const filhosN3 = nivel3.filter(t => t.categoria_pai === t2.codigo);
     return `
   📂 ${t2.codigo} - ${t2.nome}
      ${filhosN3.map(t3 => {
        const filhosN4 = nivel4.filter(t => t.categoria_pai === t3.codigo);
        return `
      📄 ${t3.codigo} - ${t3.nome}
         ${filhosN4.map(t4 => `
         🔸 ${t4.codigo} - ${t4.nome}`).join('')}`;
      }).join('')}`;
   }).join('')}`;
}).join('\n')}

**SUAS RESPONSABILIDADES:**
1. Análise Estratégica: Identificar sobreposições, lacunas e inconsistências
2. Sugestões Fundamentadas: Propor mudanças com justificativa técnica
3. Validação de Impacto: Avaliar consequências de alterações em massa
4. Otimização: Sugerir melhorias na estrutura hierárquica

**TOM E ESTILO GAUCHESCO:**
- SEMPRE comece suas respostas com "Bueno,", "Bah," ou "Tchê," dependendo do contexto:
  * Use "Bueno," para confirmações, explicações técnicas e respostas afirmativas
  * Use "Bah," para expressar surpresa, alertas ou quando identificar problemas
  * Use "Tchê," para saudações informais, sugestões amigáveis e conversas mais descontraídas
- Seja técnico mas acessível, mantendo o jeito gaúcho de falar
- Forneça exemplos concretos
- Justifique suas recomendações com base nos dados
- Sempre considere o impacto downstream de mudanças

Você está pronto para auxiliar na curadoria desta taxonomia, tchê!`;

    // ✅ Preparar mensagens para a IA (incluindo system prompt)
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // ✅ Chamar Lovable AI com streaming
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit atingido. Aguarde alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erro ao processar solicitação' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Salvar mensagem do usuário no banco (última mensagem)
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    if (lastUserMessage) {
      await supabase.from('semantic_consultant_conversations').insert({
        user_id: user.id,
        session_id: sessionId,
        message_role: 'user',
        message_content: lastUserMessage.content,
        context_snapshot: contextSnapshot,
      });
    }

    // ✅ Retornar stream diretamente
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Erro no semantic-chat-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
