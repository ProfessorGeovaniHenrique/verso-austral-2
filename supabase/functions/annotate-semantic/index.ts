import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnotationRequest {
  corpus_type: 'gaucho' | 'nordestino' | 'marenco-verso';
  custom_text?: string;
}

interface SemanticTagset {
  codigo: string;
  nome: string;
  descricao: string;
  exemplos: string[];
}

interface AIAnnotation {
  tagset_codigo: string;
  prosody: number;
  confianca: number;
  justificativa: string;
  is_new_category: boolean;
  new_category_name?: string;
  new_category_description?: string;
  new_category_examples?: string[];
}

// Validação de entrada
function validateRequest(data: any): AnnotationRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { corpus_type, custom_text } = data;
  
  if (!corpus_type || !['gaucho', 'nordestino', 'marenco-verso'].includes(corpus_type)) {
    throw new Error('corpus_type deve ser: gaucho, nordestino ou marenco-verso');
  }
  
  if (custom_text !== undefined && (typeof custom_text !== 'string' || custom_text.length > 1000000)) {
    throw new Error('custom_text deve ser string com máximo 1MB');
  }
  
  return { corpus_type, custom_text };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ✅ SEGURANÇA: Autenticação real via JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[annotate-semantic] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ VALIDAÇÃO: Schema de entrada
    const rawBody = await req.json();
    const validatedRequest = validateRequest(rawBody);
    const { corpus_type, custom_text } = validatedRequest;

    console.log(`[annotate-semantic] Usuário ${user.id} iniciando anotação: ${corpus_type}`);

    const { data: job, error: jobError } = await supabase
      .from('annotation_jobs')
      .insert({
        user_id: user.id,
        corpus_type: corpus_type,
        status: 'pending',
        metadata: {
          started_at: new Date().toISOString(),
          corpus_type: corpus_type,
          use_ai: true,
          custom_text: custom_text ? true : false
        }
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[annotate-semantic] Error creating job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar job de anotação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[annotate-semantic] Job criado: ${job.id}`);

    // @ts-ignore
    EdgeRuntime.waitUntil(
      processCorpusWithAI(job.id, corpus_type, supabaseUrl, supabaseKey, custom_text)
    );

    return new Response(
      JSON.stringify({
        job: job,
        message: 'Anotação semântica iniciada com AI. Acompanhe o progresso em tempo real.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[annotate-semantic] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processCorpusWithAI(
  jobId: string,
  corpusType: string,
  supabaseUrl: string,
  supabaseKey: string,
  customText?: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    console.error('[processCorpusWithAI] LOVABLE_API_KEY not configured');
    await updateJobStatus(supabase, jobId, 'failed', 'LOVABLE_API_KEY não configurada');
    return;
  }

  try {
    console.log(`[processCorpusWithAI] Starting job ${jobId} for corpus ${corpusType}`);

    await supabase
      .from('annotation_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    const { data: tagsets, error: tagsetError } = await supabase
      .from('semantic_tagset')
      .select('*')
      .eq('status', 'ativo');

    if (tagsetError || !tagsets) {
      throw new Error('Erro ao carregar tagset');
    }

    console.log(`[processCorpusWithAI] Loaded ${tagsets.length} active tagsets`);

    // Se custom_text for fornecido, processar texto customizado
    let mockWords;
    if (customText) {
      const words = customText.split(/\s+/).filter(w => w.trim().length > 0);
      mockWords = words.map((palavra, idx) => ({
        palavra: palavra.replace(/[.,;!?]/g, ''),
        contexto: words.slice(Math.max(0, idx - 3), idx + 4).join(' '),
        pos: 'NOUN'
      }));
    } else {
      mockWords = await getMockCorpusWords(corpusType);
    }
    
    const totalWords = mockWords.length;

    await supabase
      .from('annotation_jobs')
      .update({ total_palavras: totalWords })
      .eq('id', jobId);

    let processedCount = 0;
    let annotatedCount = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < mockWords.length; i += BATCH_SIZE) {
      const batch = mockWords.slice(i, Math.min(i + BATCH_SIZE, mockWords.length));

      for (const wordData of batch) {
        try {
          const annotation = await annotateWordHybrid(
            wordData.palavra,
            wordData.contexto,
            wordData.pos || 'NOUN',
            tagsets,
            supabase,
            LOVABLE_API_KEY
          );

          if (annotation) {
            await supabase
              .from('annotated_corpus')
              .insert({
                job_id: jobId,
                palavra: wordData.palavra,
                lema: annotation.lema || wordData.palavra,
                pos: wordData.pos || 'NOUN',
                tagset_codigo: annotation.tagset_codigo,
                prosody: annotation.prosody,
                confianca: annotation.confianca,
                contexto_esquerdo: wordData.contextoEsquerdo || '',
                contexto_direito: wordData.contextoDireito || '',
                metadata: {
                  artista: wordData.artista,
                  musica: wordData.musica,
                  fonte: annotation.fonte
                },
                posicao_no_corpus: i
              });

            annotatedCount++;
          }

          processedCount++;

          if (processedCount % 10 === 0) {
            await supabase
              .from('annotation_jobs')
              .update({
                palavras_processadas: processedCount,
                palavras_anotadas: annotatedCount,
                progresso: processedCount / totalWords
              })
              .eq('id', jobId);
          }

        } catch (wordError) {
          console.error(`[processCorpusWithAI] Error annotating word "${wordData.palavra}":`, wordError);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await supabase
      .from('annotation_jobs')
      .update({
        status: 'completed',
        palavras_processadas: processedCount,
        palavras_anotadas: annotatedCount,
        progresso: 1.0,
        tempo_fim: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[processCorpusWithAI] Job ${jobId} completed: ${annotatedCount}/${totalWords} palavras anotadas`);

  } catch (error) {
    console.error(`[processCorpusWithAI] Error processing job ${jobId}:`, error);
    await updateJobStatus(supabase, jobId, 'failed', error instanceof Error ? error.message : 'Erro desconhecido');
  }
}

async function annotateWordHybrid(
  palavra: string,
  contexto: string,
  pos: string,
  tagsets: SemanticTagset[],
  supabase: any,
  lovableApiKey: string
): Promise<any> {
  
  const palavraLower = palavra.toLowerCase();

  // 1. Tentar lexicon existente primeiro (fast path)
  const { data: lexiconMatch } = await supabase
    .from('semantic_lexicon')
    .select('*')
    .or(`palavra.ilike.${palavraLower},lema.ilike.${palavraLower}`)
    .eq('validado', true)
    .order('confianca', { ascending: false })
    .limit(1)
    .single();

  if (lexiconMatch && lexiconMatch.confianca >= 0.85) {
    console.log(`[annotateWordHybrid] Fast path for "${palavra}" -> ${lexiconMatch.tagset_codigo}`);
    return {
      ...lexiconMatch,
      fonte: 'lexicon'
    };
  }

  console.log(`[annotateWordHybrid] AI path for "${palavra}"`);
  
  // 2. Enriquecer com dados dos dicionários
  const dictionaryContext = await enrichWithDictionaries(palavraLower, supabase);
  
  // 3. Chamar AI com contexto enriquecido
  const aiAnnotation = await queryAIForAnnotation(
    palavra,
    contexto,
    pos,
    tagsets,
    lovableApiKey,
    dictionaryContext
  );

  if (!aiAnnotation) {
    return null;
  }

  if (aiAnnotation.is_new_category && aiAnnotation.new_category_name) {
    await proposeNewTagset(
      aiAnnotation.new_category_name,
      aiAnnotation.new_category_description || '',
      aiAnnotation.new_category_examples || [palavra],
      supabase
    );
  }

  if (aiAnnotation.confianca >= 0.7) {
    await supabase
      .from('semantic_lexicon')
      .insert({
        palavra: palavraLower,
        lema: palavraLower,
        pos: pos,
        tagset_codigo: aiAnnotation.tagset_codigo,
        prosody: aiAnnotation.prosody,
        confianca: aiAnnotation.confianca,
        contexto_exemplo: contexto.substring(0, 200),
        fonte: 'ai',
        validado: aiAnnotation.confianca >= 0.85
      })
      .select()
      .single();
  }

  return {
    palavra: palavraLower,
    lema: palavraLower,
    tagset_codigo: aiAnnotation.tagset_codigo,
    prosody: aiAnnotation.prosody,
    confianca: aiAnnotation.confianca,
    fonte: 'ai'
  };
}

async function enrichWithDictionaries(palavra: string, supabase: any): Promise<string> {
  const normalizedWord = palavra.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  let enrichedContext = '';
  
  // Dicionário Dialectal (Cultura Pampeana)
  const { data: dialectalData } = await supabase
    .from('dialectal_lexicon')
    .select('*')
    .eq('verbete_normalizado', normalizedWord)
    .maybeSingle();
  
  if (dialectalData) {
    enrichedContext += `\n\n🌾 CONTEXTO REGIONALISTA GAÚCHO/PAMPEANO:
Palavra: ${dialectalData.verbete}
Origem: ${dialectalData.origem_primaria} ${dialectalData.influencia_platina ? '(Influência Platina)' : ''}
Status: ${dialectalData.marcacao_temporal || 'Contemporâneo'} | Frequência: ${dialectalData.frequencia_uso}
Classe: ${dialectalData.classe_gramatical || 'N/A'}

Definições:
${dialectalData.definicoes.map((d: any, i: number) => 
  `${i + 1}. ${d.texto}${d.contexto ? ` (${d.contexto})` : ''}`
).join('\n')}

${dialectalData.sinonimos?.length > 0 ? `Sinônimos regionais: ${dialectalData.sinonimos.join(', ')}` : ''}
${dialectalData.contextos_culturais?.fraseologias?.length > 0 ? 
  `Fraseologias típicas: ${dialectalData.contextos_culturais.fraseologias.join('; ')}` : ''}
${dialectalData.categorias_tematicas?.length > 0 ? 
  `Categorias culturais: ${dialectalData.categorias_tematicas.join(', ')}` : ''}

⚠️ IMPORTANTE: Esta palavra tem forte carga regionalista gaúcha/pampeana.
Considere sua especificidade cultural ao anotar os domínios semânticos.`;
  }
  
  // Dicionário Gutenberg (Português Geral)
  const { data: gutenbergData } = await supabase
    .from('gutenberg_lexicon')
    .select('*')
    .eq('verbete_normalizado', normalizedWord)
    .maybeSingle();
  
  if (gutenbergData) {
    enrichedContext += `\n\n📚 CONTEXTO LEXICAL PORTUGUÊS (Cândido de Figueiredo):
Verbete: ${gutenbergData.verbete}
Classe: ${gutenbergData.classe_gramatical || 'N/A'} ${gutenbergData.genero ? `(${gutenbergData.genero})` : ''}
${gutenbergData.etimologia ? `Etimologia: ${gutenbergData.etimologia}` : ''}
${gutenbergData.origem_lingua ? `Origem: ${gutenbergData.origem_lingua}` : ''}

Definições:
${gutenbergData.definicoes.map((d: any, i: number) => 
  `${i + 1}. ${d.texto}`
).join('\n')}

${gutenbergData.arcaico ? '⚠️ Termo ARCAICO' : ''}
${gutenbergData.regional ? '⚠️ Termo REGIONAL' : ''}
${gutenbergData.figurado ? '⚠️ Sentido FIGURADO' : ''}
${gutenbergData.popular ? '⚠️ Uso POPULAR' : ''}`;
  }
  
  // Dicionário Houaiss (Sinônimos)
  const { data: houaissData } = await supabase
    .from('lexical_synonyms')
    .select('*')
    .eq('palavra', palavra)
    .limit(1)
    .maybeSingle();
  
  if (houaissData && houaissData.sinonimos?.length > 0) {
    enrichedContext += `\n\n🔗 SINÔNIMOS (Houaiss):
${houaissData.sinonimos.join(', ')}
${houaissData.acepcao_descricao ? `\nAcepção: ${houaissData.acepcao_descricao}` : ''}`;
  }
  
  // Dicionário UNESP (Definições)
  const { data: unespData } = await supabase
    .from('lexical_definitions')
    .select('*')
    .eq('palavra', palavra)
    .limit(1)
    .maybeSingle();
  
  if (unespData) {
    enrichedContext += `\n\n📖 DEFINIÇÃO ACADÊMICA (UNESP):
${unespData.definicao}
${unespData.exemplos?.length > 0 ? `\nExemplos: ${unespData.exemplos.join('; ')}` : ''}
${unespData.registro_uso ? `\nRegistro de uso: ${unespData.registro_uso}` : ''}`;
  }
  
  return enrichedContext;
}

async function queryAIForAnnotation(
  palavra: string,
  contexto: string,
  pos: string,
  tagsets: SemanticTagset[],
  lovableApiKey: string,
  dictionaryContext?: string
): Promise<AIAnnotation | null> {
  
  const tagsetList = tagsets.map(t => 
    `${t.codigo} - ${t.nome}: ${t.descricao}\n  Exemplos: ${t.exemplos.slice(0, 5).join(', ')}`
  ).join('\n\n');

  const systemPrompt = `Você é um especialista em anotação semântica de corpus linguísticos brasileiros.
Sua tarefa é classificar palavras em Domínios Semânticos (DS) contextuais com foco em cultura gaúcha e nordestina.

IMPORTANTE:
- Analise o CONTEXTO completo, não apenas a palavra isolada
- Considere variações regionais e culturais do português brasileiro
- Seja preciso na atribuição de prosódia semântica
- Sugira novos domínios quando a palavra não se encaixa bem nos existentes`;

  const userPrompt = `TAGSET DISPONÍVEL:
${tagsetList}

PALAVRA: "${palavra}"
POS TAG: ${pos}
CONTEXTO: "${contexto}"
${dictionaryContext ? `\n${dictionaryContext}` : ''}

INSTRUÇÕES:
1. Analise o CONTEXTO cuidadosamente (a palavra pode ter sentido diferente do usual)
2. Se a palavra se encaixa claramente em um DS existente → retorne o código
3. Se NÃO se encaixa bem em nenhum DS → sugira um NOVO DS com justificativa
4. Atribua prosódia de -3 (extremamente negativa) a +3 (extremamente positiva)
5. Indique seu nível de confiança (0.0 a 1.0)

ATENÇÃO À PROSÓDIA:
-3: Extremamente negativo (morte, sofrimento, desespero)
-2: Fortemente negativo (tristeza, saudade, dor)
-1: Levemente negativo (nostalgia, melancolia)
 0: Neutro (descritivo, sem carga emocional)
+1: Levemente positivo (contentamento, serenidade)
+2: Fortemente positivo (alegria, amor, felicidade)
+3: Extremamente positivo (êxtase, liberdade, vida)

Use o tool calling para retornar a anotação estruturada.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'annotate_semantic',
            description: 'Anotar palavra com domínio semântico e prosódia',
            parameters: {
              type: 'object',
              properties: {
                tagset_codigo: {
                  type: 'string',
                  description: 'Código do DS (ex: CG.01) ou "NOVO" se precisar criar'
                },
                prosody: {
                  type: 'integer',
                  description: 'Prosódia de -3 a +3',
                  minimum: -3,
                  maximum: 3
                },
                confianca: {
                  type: 'number',
                  description: 'Confiança de 0.0 a 1.0',
                  minimum: 0,
                  maximum: 1
                },
                justificativa: {
                  type: 'string',
                  description: 'Explicação da classificação'
                },
                is_new_category: {
                  type: 'boolean',
                  description: 'Se true, está propondo novo DS'
                },
                new_category_name: {
                  type: 'string',
                  description: 'Nome do novo DS (se is_new_category=true)'
                },
                new_category_description: {
                  type: 'string',
                  description: 'Descrição do novo DS'
                },
                new_category_examples: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Exemplos de palavras do novo DS'
                }
              },
              required: ['tagset_codigo', 'prosody', 'confianca', 'justificativa', 'is_new_category']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'annotate_semantic' } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[queryAIForAnnotation] AI Gateway error: ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error('[queryAIForAnnotation] No tool call in response');
      return null;
    }

    const annotation = JSON.parse(toolCall.function.arguments);
    console.log(`[queryAIForAnnotation] AI annotation for "${palavra}":`, annotation);

    return annotation as AIAnnotation;

  } catch (error) {
    console.error('[queryAIForAnnotation] Error calling AI:', error);
    return null;
  }
}

async function proposeNewTagset(
  nome: string,
  descricao: string,
  exemplos: string[],
  supabase: any
): Promise<void> {
  try {
    const initials = nome.split(' ')
      .map(w => w[0].toUpperCase())
      .join('');
    const codigo = `${initials}.01`;

    const { data: existing } = await supabase
      .from('semantic_tagset')
      .select('codigo')
      .eq('codigo', codigo)
      .single();

    if (existing) {
      console.log(`[proposeNewTagset] Tagset ${codigo} already exists`);
      return;
    }

    await supabase
      .from('semantic_tagset')
      .insert({
        codigo: codigo,
        nome: nome,
        descricao: descricao,
        categoria_pai: initials,
        exemplos: exemplos,
        status: 'proposto',
        validacoes_humanas: 0
      });

    console.log(`[proposeNewTagset] New tagset proposed: ${codigo} - ${nome}`);

  } catch (error) {
    console.error('[proposeNewTagset] Error:', error);
  }
}

async function getMockCorpusWords(corpusType: string): Promise<any[]> {
  const mockData = {
    gaucho: [
      { palavra: 'querência', contexto: 'Sinto saudade da minha querência', pos: 'NOUN', artista: 'Teste', musica: 'Mock' },
      { palavra: 'galpão', contexto: 'No galpão da estância', pos: 'NOUN', artista: 'Teste', musica: 'Mock' },
      { palavra: 'mate', contexto: 'Tomando um mate com os amigos', pos: 'NOUN', artista: 'Teste', musica: 'Mock' },
      { palavra: 'pampa', contexto: 'Os campos do pampa gaúcho', pos: 'NOUN', artista: 'Teste', musica: 'Mock' },
      { palavra: 'saudade', contexto: 'Tenho saudade do meu pago', pos: 'NOUN', artista: 'Teste', musica: 'Mock' }
    ],
    nordestino: [
      { palavra: 'forró', contexto: 'Dançando forró no arrasta-pé', pos: 'NOUN', artista: 'Teste', musica: 'Mock' },
      { palavra: 'sertão', contexto: 'Pelo sertão nordestino', pos: 'NOUN', artista: 'Teste', musica: 'Mock' }
    ],
    'marenco-verso': [
      { palavra: 'verso', contexto: 'Quando o verso vem pras casa', pos: 'NOUN', artista: 'Luiz Marenco', musica: 'Verso' }
    ]
  };

  return mockData[corpusType as keyof typeof mockData] || mockData.gaucho;
}

async function updateJobStatus(supabase: any, jobId: string, status: string, errorMessage?: string) {
  await supabase
    .from('annotation_jobs')
    .update({
      status: status,
      erro_mensagem: errorMessage,
      tempo_fim: new Date().toISOString()
    })
    .eq('id', jobId);
}