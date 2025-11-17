import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ SISTEMA DE DETECÇÃO DE LOCUÇÕES ============
const LOCUTIONS = [
  { pattern: ['a', 'fim', 'de'], unified: 'a_fim_de', tag: 'MG.CON.REL.FIN' },
  { pattern: ['por', 'causa', 'de'], unified: 'por_causa_de', tag: 'MG.CON.REL.CAU' },
  { pattern: ['à', 'medida', 'que'], unified: 'à_medida_que', tag: 'MG.CON.ORA.TEM.SIM' },
  { pattern: ['apesar', 'de'], unified: 'apesar_de', tag: 'MG.CON.ORA.OPO.CON' },
  { pattern: ['já', 'que'], unified: 'já_que', tag: 'MG.CON.ORA.CAU' },
  { pattern: ['para', 'que'], unified: 'para_que', tag: 'MG.CON.ORA.FIN' },
  { pattern: ['de', 'repente'], unified: 'de_repente', tag: 'MG.MOD.CIR.TEM' },
  { pattern: ['às', 'vezes'], unified: 'às_vezes', tag: 'MG.MOD.CIR.TEM' },
].sort((a, b) => b.pattern.length - a.pattern.length);

function detectLocutions(words: string[]): Map<number, {unified: string; tag: string; length: number}> {
  const locutionMap = new Map();
  for (let i = 0; i < words.length; i++) {
    for (const loc of LOCUTIONS) {
      if (i + loc.pattern.length <= words.length) {
        const match = loc.pattern.every((w, idx) => 
          words[i + idx]?.toLowerCase() === w.toLowerCase()
        );
        if (match) {
          locutionMap.set(i, {unified: loc.unified, tag: loc.tag, length: loc.pattern.length});
          i += loc.pattern.length - 1;
          break;
        }
      }
    }
  }
  return locutionMap;
}

function isProperName(word: string): boolean {
  return word.length > 0 && word[0] === word[0].toUpperCase();
}

function classifyProperName(word: string): string {
  const lw = word.toLowerCase();
  if (['deus', 'cristo', 'são', 'santa', 'virgem', 'senhor'].some(r => lw.includes(r))) return 'MG.NPR.REL';
  if (['brasil', 'rio', 'bahia', 'pampas', 'sertão', 'pampa', 'grande', 'sul'].some(p => lw.includes(p))) return 'MG.NPR.LOC';
  return 'MG.NPR.PES';
}

interface AnnotationRequest {
  corpus_type: 'gaucho' | 'nordestino' | 'marenco-verso';
  custom_text?: string;
  artist_filter?: string;
  start_line?: number;
  end_line?: number;
  demo_mode?: boolean;
}

interface CorpusWord {
  palavra: string;
  artista: string;
  musica: string;
  linha_numero: number;
  verso_completo: string;
  contexto_esquerdo: string;
  contexto_direito: string;
  posicao_no_corpus: number;
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

const BATCH_SIZE = 200; // Aumentado de 50 para 200
const UPDATE_FREQUENCY = 10; // Atualizar a cada 10 batches

// Parser de corpus real
function parseRealCorpus(
  corpusText: string,
  artistFilter?: string,
  startLine?: number,
  endLine?: number
): CorpusWord[] {
  const lines = corpusText.split('\n');
  const words: CorpusWord[] = [];
  
  let currentArtista = '';
  let currentMusica = '';
  let linhaNumero = 0;
  let posicao = 0;
  let shouldInclude = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Pular linhas vazias e separadores
    if (!line || line === '---------------') {
      continue;
    }

    // Detectar artista (formato: "Artista - Álbum Ano")
    if (line.includes(' - ') && /\d{4}$/.test(line.split(' - ')[1])) {
      const parts = line.split(' - ');
      currentArtista = parts[0].trim();
      shouldInclude = !artistFilter || currentArtista === artistFilter;
      continue;
    }

    // Detectar música (formato: "Música_Ano")
    if (/_\d{4}$/.test(line)) {
      currentMusica = line.split('_')[0].trim();
      linhaNumero = 0;
      continue;
    }

    // Processar verso se tivermos contexto completo
    if (currentArtista && currentMusica && shouldInclude) {
      linhaNumero++;
      
      // Aplicar filtro de linhas se especificado
      if (startLine && linhaNumero < startLine) continue;
      if (endLine && linhaNumero > endLine) continue;

      // PRESERVAR CASE para nomes próprios
      const palavras = line
        .replace(/[.,!?;:()"""'…]/g, ' ')
        .split(/\s+/)
        .filter(p => p.length > 2);
      
      const locutionMap = detectLocutions(palavras);

      for (let j = 0; j < palavras.length; j++) {
        const locution = locutionMap.get(j);
        if (locution) {
          // LOCUÇÃO DETECTADA
          words.push({
            palavra: locution.unified,
            artista: currentArtista,
            musica: currentMusica,
            linha_numero: linhaNumero,
            verso_completo: line,
            contexto_esquerdo: palavras.slice(Math.max(0, j - 5), j).join(' '),
            contexto_direito: palavras.slice(j + locution.length, j + locution.length + 5).join(' '),
            posicao_no_corpus: posicao++,
            isLocution: true,
            locutionTag: locution.tag
          } as any);
          j += locution.length - 1;
        } else {
          // PALAVRA NORMAL (preservar case)
          const palavra = palavras[j];
          words.push({
            palavra: isProperName(palavra) ? palavra : palavra.toLowerCase(),
            artista: currentArtista,
            musica: currentMusica,
            linha_numero: linhaNumero,
            verso_completo: line,
            contexto_esquerdo: palavras.slice(Math.max(0, j - 5), j).join(' '),
            contexto_direito: palavras.slice(j + 1, Math.min(palavras.length, j + 6)).join(' '),
            posicao_no_corpus: posicao++,
            isProperName: isProperName(palavra)
          } as any);
        }
      }
    }
  }

  console.log(`[parseRealCorpus] Extraídas ${words.length} palavras do corpus`);
  return words;
}

// Carregar corpus do projeto
async function loadCorpusFile(corpusType: string): Promise<string> {
  const corpusMap: Record<string, string> = {
    'gaucho': 'https://raw.githubusercontent.com/lovable-dev/kywmhuubbsvclkorxrse/main/src/data/corpus/full-text/gaucho-completo.txt',
    'nordestino': 'https://raw.githubusercontent.com/lovable-dev/kywmhuubbsvclkorxrse/main/src/data/corpus/full-text/nordestino-parte-01.txt',
    'marenco-verso': 'https://raw.githubusercontent.com/lovable-dev/kywmhuubbsvclkorxrse/main/src/data/corpus/corpus-luiz-marenco-verso.txt'
  };

  const url = corpusMap[corpusType];
  if (!url) {
    throw new Error(`Corpus type não suportado: ${corpusType}`);
  }

  console.log(`[loadCorpusFile] Carregando corpus de: ${url}`);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Erro ao carregar corpus: ${response.statusText}`);
  }

  const text = await response.text();
  console.log(`[loadCorpusFile] Corpus carregado: ${text.length} caracteres`);
  return text;
}

// Validação de entrada
function validateRequest(data: any): AnnotationRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { corpus_type, custom_text, artist_filter, start_line, end_line } = data;
  
  if (!corpus_type || !['gaucho', 'nordestino', 'marenco-verso'].includes(corpus_type)) {
    throw new Error('corpus_type deve ser: gaucho, nordestino ou marenco-verso');
  }
  
  if (custom_text !== undefined && (typeof custom_text !== 'string' || custom_text.length > 1000000)) {
    throw new Error('custom_text deve ser string com máximo 1MB');
  }

  if (artist_filter !== undefined && typeof artist_filter !== 'string') {
    throw new Error('artist_filter deve ser string');
  }

  if (start_line !== undefined && (typeof start_line !== 'number' || start_line < 1)) {
    throw new Error('start_line deve ser número positivo');
  }

  if (end_line !== undefined && (typeof end_line !== 'number' || end_line < 1)) {
    throw new Error('end_line deve ser número positivo');
  }

  if (start_line && end_line && start_line > end_line) {
    throw new Error('start_line deve ser menor que end_line');
  }
  
  return { corpus_type, custom_text, artist_filter, start_line, end_line };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Validação do body primeiro para verificar demo_mode
    const rawBody = await req.json();
    const validatedRequest = validateRequest(rawBody);
    const { corpus_type, custom_text, artist_filter, start_line, end_line, demo_mode } = validatedRequest;

    let userId: string;

    // Modo DEMO: não requer autenticação - PRIORIDADE MÁXIMA
    if (demo_mode === true) {
      userId = '00000000-0000-0000-0000-000000000000';
      console.log('[annotate-semantic] 🎭 MODO DEMO ativado - processamento sem autenticação');
    } else {
      // Modo normal: REQUER autenticação válida
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader) {
        return new Response(
          JSON.stringify({ 
            error: 'Autenticação necessária',
            hint: 'Use demo_mode: true para testar sem login'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userToken = authHeader.replace('Bearer ', '');
      const supabaseUser = createClient(supabaseUrl, userToken);
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

      if (authError || !user) {
        console.error('[annotate-semantic] Auth error:', authError?.message || 'No user found');
        return new Response(
          JSON.stringify({ 
            error: 'Token inválido ou expirado',
            details: authError?.message,
            hint: 'Faça login novamente ou use demo_mode: true'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = user.id;
      console.log(`[annotate-semantic] ✅ Usuário autenticado: ${userId}`);
    }

    // Cliente com SERVICE_ROLE_KEY para operações privilegiadas
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[annotate-semantic] 🚀 Iniciando anotação: ${corpus_type}`, {
      userId,
      demo: demo_mode || false,
      artist_filter,
      start_line,
      end_line
    });

    const { data: job, error: jobError } = await supabase
      .from('annotation_jobs')
      .insert({
        user_id: userId,
        corpus_type: corpus_type,
        status: 'pending',
        metadata: {
          started_at: new Date().toISOString(),
          corpus_type: corpus_type,
          use_ai: true,
          demo_mode: demo_mode || false,
          custom_text: custom_text ? true : false,
          artist_filter: artist_filter || null,
          start_line: start_line || null,
          end_line: end_line || null
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
      processCorpusWithAI(job.id, corpus_type, supabaseUrl, supabaseServiceKey, custom_text, artist_filter, start_line, end_line)
    );

    return new Response(
      JSON.stringify({
        job: job,
        message: 'Anotação iniciada em background'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[annotate-semantic] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processCorpusWithAI(
  jobId: string,
  corpusType: string,
  supabaseUrl: string,
  supabaseKey: string,
  customText?: string,
  artistFilter?: string,
  startLine?: number,
  endLine?: number
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    await supabase
      .from('annotation_jobs')
      .update({ status: 'processando' })
      .eq('id', jobId);

    console.log(`[processCorpusWithAI] Iniciando processamento do job ${jobId}`);

    // Carregar tagsets aprovados
    const { data: tagsets, error: tagsetsError } = await supabase
      .from('semantic_tagset')
      .select('codigo, nome, descricao, exemplos')
      .eq('status', 'ativo')
      .not('aprovado_por', 'is', null);

    if (tagsetsError) throw tagsetsError;

    if (!tagsets || tagsets.length === 0) {
      throw new Error('Nenhum tagset aprovado encontrado. Execute o script de seed primeiro.');
    }

    console.log(`[processCorpusWithAI] ${tagsets.length} tagsets aprovados carregados`);

    // Extrair palavras do corpus
    let words: CorpusWord[];

    if (customText) {
      // Processar texto customizado
      words = parseRealCorpus(customText, artistFilter, startLine, endLine);
    } else {
      // Carregar corpus do projeto
      const corpusText = await loadCorpusFile(corpusType);
      words = parseRealCorpus(corpusText, artistFilter, startLine, endLine);
    }

    if (words.length === 0) {
      throw new Error('Nenhuma palavra encontrada no corpus com os filtros aplicados');
    }

    console.log(`[processCorpusWithAI] Total de palavras a processar: ${words.length}`);

    // Atualizar job com total de palavras
    await supabase
      .from('annotation_jobs')
      .update({
        total_palavras: words.length,
        palavras_processadas: 0,
        palavras_anotadas: 0
      })
      .eq('id', jobId);

    // Processar em batches
    const totalBatches = Math.ceil(words.length / BATCH_SIZE);
    let processedWords = 0;
    let annotatedWords = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batch = words.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      
      console.log(`[processCorpusWithAI] Processando batch ${i + 1}/${totalBatches} (${batch.length} palavras)`);

      // ANOTAR BATCH: Priorizar locuções/nomes próprios, depois IA/Lexicon
      const wordsNeedingAI: CorpusWord[] = [];
      const aiIndexMap: number[] = [];
      const preAnnotations: (AIAnnotation | null)[] = [];

      // Fase 1: Identificar o que precisa de IA
      for (let j = 0; j < batch.length; j++) {
        const word = batch[j];
        
        if ((word as any).isLocution) {
          // LOCUÇÃO: já tem tag
          preAnnotations.push({
            tagset_codigo: (word as any).locutionTag,
            prosody: 0,
            confianca: 1.0,
            justificativa: 'Locução gramatical',
            is_new_category: false
          });
        } else if ((word as any).isProperName) {
          // NOME PRÓPRIO: classificar
          preAnnotations.push({
            tagset_codigo: classifyProperName(word.palavra),
            prosody: 0,
            confianca: 0.95,
            justificativa: 'Nome próprio',
            is_new_category: false
          });
        } else {
          // PRECISA DE IA/LEXICON
          aiIndexMap.push(j);
          wordsNeedingAI.push(word);
          preAnnotations.push(null);
        }
      }

      // Fase 2: Anotar palavras restantes com IA
      if (wordsNeedingAI.length > 0) {
        const aiResults = await annotateBatchWithAI(wordsNeedingAI, tagsets, supabase);
        aiResults.forEach((ann, aiIdx) => {
          const batchIdx = aiIndexMap[aiIdx];
          preAnnotations[batchIdx] = ann;
        });
      }

      // Fase 3: Processar insígnias e montar registros finais
      const annotationsWithInsignias = await Promise.all(
        batch.map(async (word, idx) => {
          const ann = preAnnotations[idx];
          if (!ann) return null;

          const insignias = await inferCulturalInsignias(word.palavra, corpusType, supabase);
          
          return {
            job_id: jobId,
            palavra: word.palavra,
            lema: word.palavra,
            pos: null,
            tagset_codigo: ann.tagset_codigo,
            tagset_primario: ann.tagset_codigo.split('.')[0],
            tagsets: [ann.tagset_codigo],
            prosody: ann.prosody,
            confianca: ann.confianca,
            contexto_esquerdo: word.contexto_esquerdo,
            contexto_direito: word.contexto_direito,
            posicao_no_corpus: word.posicao_no_corpus,
            insignias_culturais: insignias,
            metadata: {
              artista: word.artista,
              musica: word.musica,
              linha_numero: word.linha_numero,
              verso_completo: word.verso_completo,
              justificativa: ann.justificativa
            }
          };
        })
      );
      
      // Inserir anotações no banco (filtrar nulls)
      const validAnnotations = annotationsWithInsignias.filter(a => a !== null);
      if (validAnnotations.length > 0) {
        const { error: insertError } = await supabase
          .from('annotated_corpus')
          .insert(validAnnotations);

        if (insertError) {
          console.error('[processCorpusWithAI] Erro ao inserir batch:', insertError);
        } else {
          annotatedWords += validAnnotations.length;
        }
      }

      processedWords += batch.length;

      // Atualizar progresso a cada UPDATE_FREQUENCY batches
      if ((i + 1) % UPDATE_FREQUENCY === 0 || i === totalBatches - 1) {
        const progresso = Math.round((processedWords / words.length) * 100);
        
        await supabase
          .from('annotation_jobs')
          .update({
            palavras_processadas: processedWords,
            palavras_anotadas: annotatedWords,
            progresso: progresso
          })
          .eq('id', jobId);

        console.log(`[processCorpusWithAI] Progresso: ${progresso}% (${processedWords}/${words.length})`);
      }
    }

    // Finalizar job
    await supabase
      .from('annotation_jobs')
      .update({
        status: 'concluido',
        tempo_fim: new Date().toISOString(),
        palavras_processadas: words.length,
        palavras_anotadas: annotatedWords,
        progresso: 100
      })
      .eq('id', jobId);

    console.log(`[processCorpusWithAI] Job ${jobId} concluído: ${annotatedWords}/${words.length} palavras anotadas`);

  } catch (error: any) {
    console.error(`[processCorpusWithAI] Erro no job ${jobId}:`, error);
    
    await supabase
      .from('annotation_jobs')
      .update({
        status: 'erro',
        erro_mensagem: error.message || 'Erro desconhecido',
        tempo_fim: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

async function annotateBatchWithAI(
  words: CorpusWord[],
  tagsets: SemanticTagset[],
  supabase: any
): Promise<AIAnnotation[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.warn('[annotateBatchWithAI] LOVABLE_API_KEY não configurada, usando léxico');
    return annotateBatchFromLexicon(words, supabase);
  }

  try {
    const tagsetsSummary = tagsets.map(t => `${t.codigo} (${t.nome}): ${t.descricao}`).join('\n');
    
    const prompt = `Você é um anotador semântico especializado em análise linguística de corpus brasileiros (gaúcho e nordestino).

**TAXONOMIA DISPONÍVEL:**
${tagsetsSummary}

**PALAVRAS PARA ANOTAR:**
${words.map(w => `"${w.palavra}" (contexto: "${w.contexto_esquerdo} [${w.palavra}] ${w.contexto_direito}")`).join('\n')}

**INSTRUÇÕES:**
1. Para cada palavra, atribua o código do domínio semântico mais apropriado
2. Atribua prosódia: -1 (negativa), 0 (neutra), 1 (positiva)
3. Forneça confiança de 0.0 a 1.0
4. Use o contexto para desambiguar sentidos
5. Considere a cultura regional (gaúcha/nordestina)

Retorne um array JSON com exatamente ${words.length} anotações.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um linguista computacional especializado em análise semântica.' },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'annotate_words',
            description: 'Anotar palavras com domínios semânticos e prosódia',
            parameters: {
              type: 'object',
              properties: {
                annotations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tagset_codigo: { type: 'string' },
                      prosody: { type: 'number', enum: [-1, 0, 1] },
                      confianca: { type: 'number', minimum: 0, maximum: 1 },
                      justificativa: { type: 'string' }
                    },
                    required: ['tagset_codigo', 'prosody', 'confianca', 'justificativa']
                  }
                }
              },
              required: ['annotations']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'annotate_words' } }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return result.annotations.map((ann: any) => ({
        ...ann,
        is_new_category: false
      }));
    }

    throw new Error('Resposta da IA inválida');

  } catch (error) {
    console.error('[annotateBatchWithAI] Erro com IA, fallback para léxico:', error);
    return annotateBatchFromLexicon(words, supabase);
  }
}

/**
 * Infere insígnias culturais para uma palavra baseado em:
 * 1. Corpus de origem (primária)
 * 2. Léxico dialectal (secundárias)
 */
async function inferCulturalInsignias(
  palavra: string,
  corpusType: string,
  supabase: any
): Promise<string[]> {
  const insignias: string[] = [];
  
  // Insígnia primária baseada no corpus
  if (corpusType === 'gaucho' || corpusType === 'marenco-verso') {
    insignias.push('Gaúcho');
  } else if (corpusType === 'nordestino') {
    insignias.push('Nordestino');
  }
  
  // Buscar insígnias secundárias no léxico dialectal
  const { data: dialectalEntry } = await supabase
    .from('dialectal_lexicon')
    .select('origem_regionalista, influencia_platina, contextos_culturais')
    .eq('verbete_normalizado', palavra.toLowerCase())
    .maybeSingle();
  
  if (dialectalEntry) {
    // Adicionar origens regionalistas
    if (dialectalEntry.origem_regionalista) {
      dialectalEntry.origem_regionalista.forEach((origem: string) => {
        if (origem.toLowerCase().includes('gaúcho') || origem.toLowerCase().includes('rio grande do sul')) {
          if (!insignias.includes('Gaúcho')) insignias.push('Gaúcho');
        }
        if (origem.toLowerCase().includes('nordest')) {
          if (!insignias.includes('Nordestino')) insignias.push('Nordestino');
        }
      });
    }
    
    // Adicionar influência platina
    if (dialectalEntry.influencia_platina) {
      insignias.push('Platino');
    }
    
    // Verificar contextos culturais para outras insígnias
    if (dialectalEntry.contextos_culturais) {
      const contextosStr = JSON.stringify(dialectalEntry.contextos_culturais).toLowerCase();
      if (contextosStr.includes('indígena') || contextosStr.includes('guarani')) {
        insignias.push('Indígena');
      }
      if (contextosStr.includes('afro') || contextosStr.includes('africano')) {
        insignias.push('Afro-Brasileiro');
      }
      if (contextosStr.includes('caipira') || contextosStr.includes('interior')) {
        insignias.push('Caipira');
      }
    }
  }
  
  // Remover duplicatas
  return [...new Set(insignias)];
}

async function annotateBatchFromLexicon(
  words: CorpusWord[],
  supabase: any
): Promise<AIAnnotation[]> {
  const { data: lexicon } = await supabase
    .from('semantic_lexicon')
    .select('palavra, tagset_codigo, prosody, confianca')
    .in('palavra', words.map(w => w.palavra));

  const lexiconMap = new Map(
    (lexicon || []).map((entry: any) => [entry.palavra, entry])
  );

  return words.map(word => {
    const entry: any = lexiconMap.get(word.palavra);
    
    return {
      tagset_codigo: entry?.tagset_codigo || '06',
      prosody: entry?.prosody || 0,
      confianca: entry?.confianca || 0.3,
      justificativa: entry ? 'Anotação do léxico semântico' : 'Palavra não encontrada no léxico',
      is_new_category: false
    };
  });
}
