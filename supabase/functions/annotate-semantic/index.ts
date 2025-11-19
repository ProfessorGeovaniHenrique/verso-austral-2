import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RateLimiter, addRateLimitHeaders } from "../_shared/rateLimiter.ts";
import { EdgeFunctionLogger } from "../_shared/logger.ts";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

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
  let i = 0;
  
  while (i < words.length) {
    let foundLocution = false;
    
    for (const loc of LOCUTIONS) {
      if (i + loc.pattern.length <= words.length) {
        const match = loc.pattern.every((w, idx) => 
          words[i + idx]?.toLowerCase() === w.toLowerCase()
        );
        if (match) {
          locutionMap.set(i, {unified: loc.unified, tag: loc.tag, length: loc.pattern.length});
          i += loc.pattern.length;
          foundLocution = true;
          break;
        }
      }
    }
    
    if (!foundLocution) {
      i++;
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
  corpus_type: 'gaucho' | 'nordestino';
  custom_text?: string;
  artist_filter?: string;
  start_line?: number;
  end_line?: number;
  demo_mode?: boolean;
  reference_corpus?: {
    corpus_type: 'gaucho' | 'nordestino';
    artist_filter?: string;
    size_ratio?: number;
  };
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

interface ExtendedCorpusWord extends CorpusWord {
  isLocution?: boolean;
  locutionTag?: string;
  isProperName?: boolean;
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

// ============ FUNÇÃO DE SANITIZAÇÃO ============
function sanitizeText(text: string): string {
  return text.replace(/\u0000/g, '').trim();
}

// ============ FUNÇÃO DE EXTRAÇÃO DE USUÁRIO ============
function getUserFromAuthHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
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
  // Sanitizar texto para remover caracteres nulos
  corpusText = sanitizeText(corpusText);
  
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

      let j = 0;
      while (j < palavras.length) {
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
          } as ExtendedCorpusWord);
          j += locution.length; // Saltar locução completa
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
          } as ExtendedCorpusWord);
          j++;
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

// ============ FUNÇÕES ESTATÍSTICAS PARA ANÁLISE COMPARATIVA ============
function calculateLogLikelihood(o1: number, n1: number, o2: number, n2: number): number {
  // ✅ VALIDAÇÕES CRÍTICAS: prevenir divisão por zero e Math.log(0)
  if (n1 <= 0 || n2 <= 0 || (n1 + n2) === 0) {
    return 0;
  }
  
  const totalOccurrences = o1 + o2;
  if (totalOccurrences === 0) {
    return 0;
  }
  
  const total = n1 + n2;
  const e1 = n1 * totalOccurrences / total;
  const e2 = n2 * totalOccurrences / total;
  
  // Prevenir Math.log(0) ou divisão por zero
  if (e1 <= 0 || e2 <= 0) {
    return 0;
  }
  
  const ll = 2 * (
    (o1 > 0 ? o1 * Math.log(o1 / e1) : 0) + 
    (o2 > 0 ? o2 * Math.log(o2 / e2) : 0)
  );
  
  return Number.isFinite(ll) ? ll : 0;
}

function calculateMutualInformation(o1: number, n1: number, o2: number, n2: number): number {
  // Proteção contra divisão por zero
  if (n1 <= 0 || n2 <= 0) return 0;
  
  const p1 = o1 / n1;
  const pTotal = (o1 + o2) / (n1 + n2);
  
  // Proteção contra log(0)
  if (p1 === 0 || pTotal === 0) return 0;
  
  const mi = Math.log2(p1 / pTotal);
  return Number.isFinite(mi) ? mi : 0;
}

function interpretLL(ll: number): 'Alta' | 'Média' | 'Baixa' {
  if (ll > 15.13) return 'Alta';
  if (ll > 6.63) return 'Média';
  return 'Baixa';
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Validação de entrada
function validateRequest(data: any): AnnotationRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { corpus_type, custom_text, artist_filter, start_line, end_line, reference_corpus } = data;
  
  if (!corpus_type || !['gaucho', 'nordestino'].includes(corpus_type)) {
    throw new Error('corpus_type deve ser: gaucho ou nordestino');
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

  // Validar reference_corpus se fornecido
  if (reference_corpus !== undefined) {
    if (typeof reference_corpus !== 'object' || reference_corpus === null) {
      throw new Error('reference_corpus deve ser um objeto');
    }

    if (!reference_corpus.corpus_type || !['gaucho', 'nordestino'].includes(reference_corpus.corpus_type)) {
      throw new Error('reference_corpus.corpus_type deve ser: gaucho ou nordestino');
    }

    if (reference_corpus.artist_filter !== undefined && typeof reference_corpus.artist_filter !== 'string') {
      throw new Error('reference_corpus.artist_filter deve ser string');
    }

    if (reference_corpus.size_ratio !== undefined) {
      if (typeof reference_corpus.size_ratio !== 'number' || reference_corpus.size_ratio < 0.1 || reference_corpus.size_ratio > 5.0) {
        throw new Error('reference_corpus.size_ratio deve estar entre 0.1 e 5.0');
      }
    }

    // Impedir CE = CR quando ambos são completos (sem filtros de artista)
    if (!artist_filter && !reference_corpus.artist_filter && corpus_type === reference_corpus.corpus_type) {
      throw new Error('Corpus de estudo e referência não podem ser iguais quando ambos são completos');
    }
  }
  
  return { corpus_type, custom_text, artist_filter, start_line, end_line, reference_corpus };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Inicializar logger
  const logger = new EdgeFunctionLogger('annotate-semantic');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Cliente com SERVICE_ROLE_KEY para operações privilegiadas (incluindo logging)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate Limiting
    const rateLimiter = new RateLimiter();
    const authHeaderForRateLimit = req.headers.get('Authorization');
    let userIdForRateLimit: string | undefined = undefined;
    let userRoleForRateLimit: string | undefined = undefined;
    let rateLimit;

    // Tentar obter usuário (se autenticado) para rate limiting
    if (authHeaderForRateLimit) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userIdForRateLimit = user?.id;
        
        if (userIdForRateLimit) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userIdForRateLimit)
            .single();
          userRoleForRateLimit = roles?.role || 'user';
          rateLimit = await rateLimiter.checkByUser(userIdForRateLimit, 50, 60);
        } else {
          rateLimit = await rateLimiter.checkByIP(req, 10, 60);
        }
      } catch (e) {
        // Ignorar erro de auth, tratar como anônimo
        rateLimit = await rateLimiter.checkByIP(req, 10, 60);
      }
    } else {
      // Anônimo: 10 req/min
      rateLimit = await rateLimiter.checkByIP(req, 10, 60);
    }

    // Bloquear se exceder limite
    if (!rateLimit.allowed) {
      await logger.logResponse(req, 429, {
        userId: userIdForRateLimit,
        userRole: userRoleForRateLimit,
        rateLimited: true,
        rateLimitRemaining: rateLimit.remaining
      });

      const errorResponse = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Limite de requisições excedido. Tente novamente em ${rateLimit.resetAt - Math.floor(Date.now() / 1000)} segundos.`,
          resetAt: rateLimit.resetAt
        }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );

      return addRateLimitHeaders(errorResponse, rateLimit);
    }

    // Log de início da requisição
    logger.logRequest(req, userIdForRateLimit, userRoleForRateLimit);
    
    // Parsing e logging do body recebido
    const rawBody = await req.json();
    
    // === SNIPPET: Support job_id invocations from process-pending-jobs ===
    if (rawBody && rawBody.job_id) {
      // Called as processor invocation — process existing job directly
      const jobId = rawBody.job_id;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      // run processing in background to avoid blocking request (but return immediately)
      // @ts-ignore
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            await processCorpusWithAI(jobId, rawBody.corpus_type || 'gaucho', Deno.env.get('SUPABASE_URL')!, supabaseServiceKey, rawBody.custom_text, rawBody.artist_filter, rawBody.start_line, rawBody.end_line, rawBody.reference_corpus);
          } catch (e) {
            console.error('[annotate-semantic] Error processing job invoked by process-pending-jobs:', e);
            const sup = createClient(Deno.env.get('SUPABASE_URL')!, supabaseServiceKey);
            const errorMsg = (e && (e as Error).message) || String(e);
            await sup.from('annotation_jobs').update({ status: 'erro', erro_mensagem: errorMsg, tempo_fim: new Date().toISOString() }).eq('id', jobId);
          }
        })()
      );
      return new Response(JSON.stringify({ message: 'Processing scheduled', job_id: jobId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // === END SNIPPET ===
    
    const requestStartTime = Date.now();
    const requestId = crypto.randomUUID();
    
    console.log('[annotate-semantic] 📥 Payload recebido:', {
      request_id: requestId,
      corpus_type: rawBody.corpus_type,
      demo_mode: rawBody.demo_mode,
      demo_mode_type: typeof rawBody.demo_mode,
      has_auth_header: !!req.headers.get('authorization')
    });
    
    const validatedRequest = validateRequest(rawBody);
    const { corpus_type, custom_text, artist_filter, start_line, end_line, reference_corpus } = validatedRequest;
    
    // VERIFICAR DEMO_MODE ANTES DE QUALQUER COISA
    const demo_mode = rawBody.demo_mode === true || rawBody.demo_mode === 'true';
    
    let userId: string;
    let authStatus: string;
    let responseStatus = 200;
    let responseData: any = null;
    let errorDetails: any = null;

    // Modo DEMO: não requer autenticação - PRIORIDADE MÁXIMA
    if (demo_mode) {
      userId = '00000000-0000-0000-0000-000000000000';
      authStatus = 'demo';
      console.log('[annotate-semantic] 🎭 MODO DEMO ATIVADO - Bypass de autenticação');
    } else {
    // Modo normal: REQUER autenticação válida
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    
    console.log('[annotate-semantic] 🔍 Verificando autenticação:', {
      has_auth_header: !!authHeader,
      header_preview: authHeader ? authHeader.substring(0, 20) + '...' : 'NONE'
    });
    
    if (!authHeader) {
      authStatus = 'unauthorized';
      responseStatus = 401;
      errorDetails = { 
        error: 'Autenticação necessária', 
        hint: 'Use demo_mode: true para testar sem login',
        details: 'Auth session missing!'
      };
      
      console.error('[annotate-semantic] ❌ No auth header found');
      
      // Registrar log de debug
      await supabase.from('annotation_debug_logs').insert({
        request_id: requestId,
        demo_mode,
        auth_status: authStatus,
        user_id: null,
        corpus_type,
        request_payload: rawBody,
        response_status: responseStatus,
        error_details: errorDetails,
        processing_time_ms: Date.now() - requestStartTime
      });
      
      return new Response(
        JSON.stringify(errorDetails),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userToken = authHeader.replace('Bearer ', '').replace('bearer ', '');
    console.log('[annotate-semantic] 🎫 Token extraído:', userToken.substring(0, 30) + '...');
    
    // Criar cliente com o token do usuário para validação
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      authStatus = 'invalid_token';
      responseStatus = 401;
      errorDetails = { 
        error: 'Token inválido ou expirado',
        details: authError?.message || 'Auth session missing!',
        hint: 'Faça login novamente ou use demo_mode: true'
      };
      
      console.error('[annotate-semantic] ❌ Auth error:', {
        error: authError?.message,
        has_user: !!user
      });
      
      // Registrar log de debug
      await supabase.from('annotation_debug_logs').insert({
        request_id: requestId,
        demo_mode,
        auth_status: authStatus,
        user_id: null,
        corpus_type,
        request_payload: rawBody,
        response_status: responseStatus,
        error_details: errorDetails,
        processing_time_ms: Date.now() - requestStartTime
      });
      
      return new Response(
        JSON.stringify(errorDetails),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;
    authStatus = 'authenticated';
    console.log(`[annotate-semantic] ✅ Usuário autenticado: ${userId}`);
    }

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
      Promise.race([
        processCorpusWithAI(job.id, corpus_type, supabaseUrl, supabaseServiceKey, custom_text, artist_filter, start_line, end_line, reference_corpus),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: processamento excedeu 30 minutos')), 30 * 60 * 1000)
        )
      ]).catch(async (error) => {
        console.error(`[annotate-semantic] Erro no processamento background do job ${job.id}:`, error);
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('annotation_jobs').update({
          status: 'erro',
          erro_mensagem: `Background error: ${error.message}`,
          tempo_fim: new Date().toISOString()
        }).eq('id', job.id);
      })
    );

    // Registrar log de debug de sucesso
    responseData = {
      job: job,
      message: 'Anotação iniciada em background'
    };
    
    await supabase.from('annotation_debug_logs').insert({
      request_id: requestId,
      demo_mode,
      auth_status: authStatus,
      user_id: userId,
      corpus_type,
      job_id: job.id,
      request_payload: rawBody,
      response_status: responseStatus,
      response_data: responseData,
      processing_time_ms: Date.now() - requestStartTime
    });

    // Log de sucesso para monitoramento
    await logger.logResponse(req, 200, {
      userId: userIdForRateLimit,
      userRole: userRoleForRateLimit,
      requestPayload: { corpus_type, demo_mode, artist_filter },
      responsePayload: { jobId: job.id },
      rateLimited: false,
      rateLimitRemaining: rateLimit.remaining
    });

    const successResponse = new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    return addRateLimitHeaders(successResponse, rateLimit);

  } catch (error: any) {
    console.error('[annotate-semantic] Error:', error);
    
    // Log de erro para monitoramento
    await logger.logResponse(req, 500, { error });
    
    // Registrar log de debug de erro
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from('annotation_debug_logs').insert({
        demo_mode: false,
        auth_status: 'error',
        user_id: null,
        corpus_type: 'unknown',
        request_payload: {},
        response_status: 500,
        error_details: { error: error.message || 'Erro interno' },
        processing_time_ms: 0
      });
    } catch (logError) {
      console.error('[annotate-semantic] Erro ao registrar log de erro:', logError);
    }
    
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
  endLine?: number,
  referenceCorpus?: { corpus_type: string; artist_filter?: string; size_ratio?: number }
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Cleanup de recursos
  let studyFreqMap = new Map<string, number>();
  let refFreqMap = new Map<string, number>();
  let refWords: CorpusWord[] = [];

  const cleanup = () => {
    studyFreqMap.clear();
    refFreqMap.clear();
    refWords = [];
  };

  try {
    console.log(`[processCorpusWithAI] Iniciando processamento do job ${jobId}`, {
      corpusType,
      hasCustomText: !!customText,
      artistFilter,
      startLine,
      endLine,
      hasReferenceCorpus: !!referenceCorpus,
      timestamp: new Date().toISOString()
    });

    // Atualizar status para processando com lock otimista
    const { data: updatedJob, error: updateError } = await supabase
      .from('annotation_jobs')
      .update({ 
        status: 'processando',
        tempo_inicio: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError || !updatedJob) {
      console.error(`[processCorpusWithAI] Job ${jobId} já está sendo processado ou não existe`);
      cleanup();
      throw new Error('Job já está sendo processado ou foi cancelado');
    }

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

    // ============ ANÁLISE COMPARATIVA: CARREGAR CORPUS DE REFERÊNCIA ============
    let culturalMarkersCount = 0;

    if (referenceCorpus) {
      console.log(`[processCorpusWithAI] 🔄 Carregando corpus de referência: ${referenceCorpus.corpus_type}`, {
        artist_filter: referenceCorpus.artist_filter,
        size_ratio: referenceCorpus.size_ratio || 1.0
      });

      try {
        const refCorpusText = await loadCorpusFile(referenceCorpus.corpus_type);
        const parsedRefCorpus = parseRealCorpus(refCorpusText, referenceCorpus.artist_filter);
        
        // ✅ VALIDAÇÃO CRÍTICA: verificar se corpus de referência é válido
        if (!parsedRefCorpus || parsedRefCorpus.length === 0) {
          console.warn(`[processCorpusWithAI] ⚠️ Corpus de referência vazio ou inválido`);
          refWords = [];
        } else {
          // Aplicar balanceamento por amostragem aleatória (Fisher-Yates shuffle)
          const sizeRatio = referenceCorpus.size_ratio || 1.0;
          const targetSize = Math.floor(words.length * sizeRatio);
          refWords = shuffleArray(parsedRefCorpus).slice(0, targetSize);

          console.log(`[processCorpusWithAI] ✅ Corpus de referência carregado:`, {
            total_parsed: parsedRefCorpus.length,
            target_size: targetSize,
            final_size: refWords.length,
            ratio_applied: sizeRatio
          });

          // Calcular mapas de frequência
          words.forEach(w => {
            const key = w.palavra.toLowerCase();
            studyFreqMap.set(key, (studyFreqMap.get(key) || 0) + 1);
          });

          refWords.forEach(w => {
            const key = w.palavra.toLowerCase();
            refFreqMap.set(key, (refFreqMap.get(key) || 0) + 1);
          });

          console.log(`[processCorpusWithAI] 📊 Frequências calculadas:`, {
            study_unique_words: studyFreqMap.size,
            ref_unique_words: refFreqMap.size,
            study_total_tokens: words.length,
            ref_total_tokens: refWords.length
          });
        }
      } catch (error) {
        console.error(`[processCorpusWithAI] ❌ Erro ao carregar corpus de referência:`, error);
        // Continuar sem análise comparativa
      }
    }

    // Atualizar job com total de palavras e metadata de referência
    await supabase
      .from('annotation_jobs')
      .update({
        total_palavras: words.length,
        palavras_processadas: 0,
        palavras_anotadas: 0,
        study_corpus_size: words.length,
        reference_corpus_size: refWords.length > 0 ? refWords.length : null,
        reference_corpus_type: referenceCorpus?.corpus_type || null,
        reference_artist_filter: referenceCorpus?.artist_filter || null,
        size_ratio: referenceCorpus?.size_ratio || null
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

      // Fase 3: Processar insígnias e montar registros finais com análise comparativa
      // ✅ OTIMIZAÇÃO: processar em sub-batches para evitar resource exhaustion
      const INSIGNIA_BATCH_SIZE = 10;
      const annotationsWithInsignias: any[] = [];

      for (let j = 0; j < batch.length; j += INSIGNIA_BATCH_SIZE) {
        const subBatch = batch.slice(j, j + INSIGNIA_BATCH_SIZE);
        
        const subResults = await Promise.all(
          subBatch.map(async (word, localIdx) => {
            const batchIdx = j + localIdx;
            const ann = preAnnotations[batchIdx];
            if (!ann) return null;

            const insignias = await inferCulturalInsignias(word.palavra, corpusType, supabase);
            
            // ============ CÁLCULO DE MÉTRICAS COMPARATIVAS ============
            const palavraLower = word.palavra.toLowerCase();
            const freqCE = studyFreqMap.get(palavraLower) || 0;
            const freqCR = refFreqMap.get(palavraLower) || 0;

            let llScore = null;
            let miScore = null;
            let isCulturalMarker = false;
            let significanceLevel = null;

            if (refWords.length > 0 && freqCE > 0) {
              const n1 = words.length;
              const n2 = refWords.length;
              
              llScore = calculateLogLikelihood(freqCE, n1, freqCR, n2);
              miScore = calculateMutualInformation(freqCE, n1, freqCR, n2);
              significanceLevel = interpretLL(llScore);
              
              // Marcador cultural: LL > 6.63 (p < 0.01) && MI > 1.0 && freq_CE > freq_CR
              isCulturalMarker = llScore > 6.63 && miScore > 1.0 && freqCE > freqCR;
              
              if (isCulturalMarker) {
                culturalMarkersCount++;
              }
            }
            
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
              freq_study_corpus: freqCE,
              freq_reference_corpus: freqCR,
              ll_score: llScore,
              mi_score: miScore,
              is_cultural_marker: isCulturalMarker,
              significance_level: significanceLevel,
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
        
        annotationsWithInsignias.push(...subResults.filter(Boolean));
      }
      
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
    
    cleanup();
  } catch (error: any) {
    console.error(`[processCorpusWithAI] Erro no job ${jobId}:`, error);
    
    cleanup();
    
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

// ============ CHUNKING DE IA ============
async function annotateBatchWithAI_chunked(
  words: CorpusWord[],
  tagsets: SemanticTagset[],
  supabase: any
): Promise<AIAnnotation[]> {
  const CHUNK_SIZE = 10;
  const allAnnotations: AIAnnotation[] = [];
  
  console.log(`[annotateBatchWithAI_chunked] Dividindo ${words.length} palavras em chunks de ${CHUNK_SIZE}`);
  
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunk = words.slice(i, Math.min(i + CHUNK_SIZE, words.length));
    try {
      const annotations = await annotateBatchWithAI(chunk, tagsets, supabase);
      allAnnotations.push(...annotations);
    } catch (error) {
      console.error(`[annotateBatchWithAI_chunked] Erro no chunk ${i}-${i + CHUNK_SIZE}:`, error);
      // Fallback para léxico para este chunk
      const fallbackAnnotations = await annotateBatchFromLexicon_safe(chunk, supabase);
      allAnnotations.push(...fallbackAnnotations);
    }
  }
  
  return allAnnotations;
}

// ============ FALLBACK SEGURO PARA LÉXICO ============
async function annotateBatchFromLexicon_safe(
  words: CorpusWord[],
  supabase: any
): Promise<AIAnnotation[]> {
  if (words.length === 0) {
    console.warn('[annotateBatchFromLexicon_safe] Array de palavras vazio');
    return [];
  }
  
  const cleanWords = words
    .map(w => w.palavra.toLowerCase())
    .filter(w => w && w.length > 0);
  
  if (cleanWords.length === 0) {
    console.warn('[annotateBatchFromLexicon_safe] Nenhuma palavra válida para consulta');
    return words.map(() => ({
      tagset_codigo: 'MG.GEN',
      prosody: 0,
      confianca: 0.3,
      justificativa: 'Palavra inválida ou vazia',
      is_new_category: false
    } as AIAnnotation));
  }
  
  const { data: lexiconEntries } = await supabase
    .from('semantic_lexicon')
    .select('palavra, tagset_codigo, prosody, confianca')
    .in('palavra', cleanWords);
  
  const lexiconMap = new Map(
    (lexiconEntries || []).map((entry: any) => [
      entry.palavra.toLowerCase(),
      {
        tagset_codigo: entry.tagset_codigo || 'MG.GEN',
        prosody: entry.prosody ?? 0,
        confianca: entry.confianca ?? 0.5,
        justificativa: 'Anotação do léxico semântico',
        is_new_category: false
      }
    ])
  );
  
  return words.map(w => {
    const annotation = lexiconMap.get(w.palavra.toLowerCase());
    if (annotation) {
      return annotation as AIAnnotation;
    }
    return {
      tagset_codigo: 'MG.GEN',
      prosody: 0,
      confianca: 0.3,
      justificativa: 'Palavra não encontrada no léxico',
      is_new_category: false
    } as AIAnnotation;
  });
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
  if (corpusType === 'gaucho') {
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
