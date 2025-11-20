import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRetry } from "../_shared/retry.ts";
import { validateDialectalFile, logValidationResult } from "../_shared/validation.ts";
import { logJobStart, logJobProgress, logJobComplete, logJobError } from "../_shared/logging.ts";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Remove null bytes e outros caracteres de controle problemáticos
 * que o PostgreSQL não consegue armazenar em campos TEXT
 */
function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return null;
  
  const original = text;
  const sanitized = text
    // Remove null bytes (\u0000)
    .replace(/\u0000/g, '')
    // Remove outros caracteres de controle problemáticos (0x00-0x1F exceto \t, \n, \r)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Remove caracteres de controle Unicode adicionais
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  
  // ✅ Log DETALHADO com índice do caractere problemático
  if (original !== sanitized) {
    const nullByteIndex = original.indexOf('\u0000');
    console.warn(`⚠️ Caracteres removidos no índice ${nullByteIndex}:`, {
      before: original.substring(0, 100),
      after: sanitized.substring(0, 100),
      length_before: original.length,
      length_after: sanitized.length
    });
  }
  
  return sanitized;
}

/**
 * Sanitiza recursivamente todos os campos de texto de um objeto
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

const BATCH_SIZE = 500; // ✅ FASE 3: Otimizado de 200 para 500 (priorizar velocidade)
const UPDATE_FREQUENCY = 10; // Atualizar progresso a cada 10 batches
const TIMEOUT_MS = 90000; // ✅ FASE 3: Padronizado para 90s

interface ProcessRequest {
  fileContent: string;
  volumeNum: string;
  offsetInicial?: number; // ✅ NOVO: Suporte a retomada
}

function validateRequest(data: any): ProcessRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { fileContent, volumeNum, offsetInicial = 0 } = data;
  
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('fileContent deve ser uma string válida');
  }
  
  // ✅ Aumentado de 10MB para 20MB para acomodar overhead de serialização
  if (fileContent.length > 20_000_000) {
    throw new Error('fileContent excede tamanho máximo de 20MB');
  }
  
  if (!volumeNum || !['I', 'II'].includes(volumeNum)) {
    throw new Error('volumeNum deve ser "I" ou "II"');
  }
  
  return { fileContent, volumeNum, offsetInicial };
}

function normalizeWord(word: string): string {
  return word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function inferCategorias(verbete: string, definicoes: any[], contextos: any): string[] {
  const categorias: Set<string> = new Set();
  const texto = `${verbete} ${JSON.stringify(definicoes)} ${JSON.stringify(contextos)}`.toLowerCase();
  
  if (/\b(cavalo|gado|tropeiro|peão|estância|campeiro|campo|laço)\b/.test(texto)) categorias.add('lida_campeira');
  if (/\b(animal|ave|pássaro|peixe|bicho)\b/.test(texto)) categorias.add('fauna');
  if (/\b(árvore|planta|flor|erva|mato|capim)\b/.test(texto)) categorias.add('flora');
  if (/\b(comida|prato|bebida|churrasco|mate|chimarrão)\b/.test(texto)) categorias.add('gastronomia');
  if (/\b(roupa|vestir|traje|bombacha|lenço|chapéu|poncho)\b/.test(texto)) categorias.add('vestimenta');
  if (/\b(música|dança|cantar|tocar|violão|gaita)\b/.test(texto)) categorias.add('musica_danca');
  if (/\b(lugar|região|pampa|coxilha|arroio|banhado|várzea)\b/.test(texto)) categorias.add('geografia');
  if (/\b(tradição|costume|festa|rodeio|querência|gaúcho)\b/.test(texto)) categorias.add('cultura_tradicoes');
  
  return Array.from(categorias);
}

/**
 * ✅ FASE 2: Parser melhorado com regex mais robusto
 * Suporta múltiplas variações de formato do Dialectal Volume II
 */
function parseVerbete(verbeteRaw: string, volumeNum: string): any | null {
  try {
    // ✅ Sanitizar texto de entrada removendo null bytes
    const cleanText = sanitizeText(verbeteRaw) || '';
    const normalizedText = cleanText.replace(/\s+/g, ' ').replace(/[-–—]/g, '-');
    
    // ✅ FASE 2: Regex principal melhorado para aceitar mais variações
    // Formato: PALAVRA (ORIGEM) POS MARCADORES - Definição
    const headerRegex = /^([A-ZÁÀÃÉÊÍÓÔÚÇ\-\(\)\s]+?)\s+\((BRAS|PLAT|CAST|QUER|BRAS\/PLAT|PORT)\s?\)\s+([^-]+?)(?:\s+-\s+|\n)(.+)$/s;
    const match = normalizedText.match(headerRegex);
    
    if (!match) {
      // ✅ FASE 2: Fallback 1 - Formato mais simples sem marcadores
      const simpleRegex = /^([A-ZÁÀÃÉÊÍÓÔÚÇ\-\(\)\s]+?)\s+\((BRAS|PLAT|CAST|QUER|PORT)\s?\)\s+(.+)$/s;
      const simpleMatch = normalizedText.match(simpleRegex);
      
      if (simpleMatch) {
        const [_, verbete, origem, restoConteudo] = simpleMatch;
        
        // Tentar extrair POS do resto do conteúdo
        const posMatch = restoConteudo.match(/^(S\.m\.|S\.f\.|Adj\.|V\.|Adv\.|Tr\.dir\.|Int\.)\s+(.+)$/i);
        const pos = posMatch ? posMatch[1] : null;
        const definicao = posMatch ? posMatch[2] : restoConteudo;
        
        const result = {
          verbete: verbete.trim(),
          verbete_normalizado: normalizeWord(verbete),
          origem_primaria: origem.replace(/\s/g, ''),
          classe_gramatical: pos,
          marcacao_temporal: null,
          frequencia_uso: null,
          definicoes: [{ texto: definicao.trim(), acepcao: 1 }],
          remissoes: [],
          contextos_culturais: {},
          categorias_tematicas: [],
          volume_fonte: volumeNum,
          pagina_fonte: null,
          confianca_extracao: 0.92, // Parsing parcial - agora elegível para validação
          validado_humanamente: false,
          variantes: [],
          sinonimos: [],
          termos_espanhol: [],
          influencia_platina: origem === 'PLAT',
          origem_regionalista: [origem]
        };
        
        return sanitizeObject(result);
      }
      
      // ✅ FASE 2: Fallback 2 - Formato ainda mais simples (última tentativa)
      console.log(`⚠️ Tentando último fallback para: ${normalizedText.substring(0, 80)}...`);
      
      const lastResortRegex = /^([A-ZÁÀÃÉÊÍÓÔÚÇ][A-ZÁÀÃÉÊÍÓÔÚÇ\-\(\)\s]+?)\s+(.+)$/s;
      const lastMatch = normalizedText.match(lastResortRegex);
      
      if (lastMatch) {
        const [_, verbete, conteudo] = lastMatch;
        
        const result = {
          verbete: verbete.trim(),
          verbete_normalizado: normalizeWord(verbete),
          origem_primaria: 'BRAS',
          classe_gramatical: null,
          marcacao_temporal: null,
          frequencia_uso: null,
          definicoes: [{ texto: conteudo.trim(), acepcao: 1 }],
          remissoes: [],
          contextos_culturais: {},
          categorias_tematicas: [],
          volume_fonte: volumeNum,
          pagina_fonte: null,
          confianca_extracao: 0.88, // Parsing simples - próximo ao threshold
          validado_humanamente: false,
          variantes: [],
          sinonimos: [],
          termos_espanhol: [],
          influencia_platina: false,
          origem_regionalista: ['BRAS']
        };
        
        return sanitizeObject(result);
      }
      
      console.error(`❌ Parse falhou completamente para: ${verbeteRaw.substring(0, 100)}`);
      return null;
    }
    
    // Parse com match bem-sucedido
    const [_, verbete, origem, classeGramBruta, restoDefinicao] = match;
    const classeGram = classeGramBruta.replace(/\b(ANT|DES|BRAS|PLAT)\b/g, '').trim();
    const temANT = /\bANT\b/.test(classeGramBruta);
    const temDES = /\bDES\b/.test(classeGramBruta);
    const marcacao_temporal = temANT && temDES ? 'ANT/DES' : (temANT ? 'ANT' : (temDES ? 'DES' : null));
    const freqMatch = restoDefinicao.match(/\[(r\/us|m\/us|n\/d)\]/);
    const definicoesBrutas = restoDefinicao.split('//').map((d: string) => d.trim()).filter((d: string) => d.length > 0);
    const definicoes = definicoesBrutas.map((def: string, idx: number) => ({
      texto: def.replace(/\[(r\/us|m\/us|n\/d)\]/g, '').trim(),
      acepcao: idx + 1
    }));
    
    const remissoes: string[] = [];
    const remissoesRegex = /(?:V\.|Cf\.)\s+([A-ZÁÀÃÉÊÍÓÔÚÇ\-]+)/g;
    let remMatch;
    while ((remMatch = remissoesRegex.exec(restoDefinicao)) !== null) remissoes.push(remMatch[1].trim());
    
    const contextos_culturais = { autores_citados: [], regioes_mencionadas: [], notas: [] };
    const categorias = inferCategorias(verbete, definicoes, contextos_culturais);
    
    const result = {
      verbete: verbete.trim(),
      verbete_normalizado: normalizeWord(verbete),
      origem_primaria: origem,
      classe_gramatical: classeGram || null,
      marcacao_temporal,
      frequencia_uso: freqMatch ? freqMatch[1] : null,
      definicoes,
      remissoes: remissoes.length > 0 ? remissoes : null,
      contextos_culturais,
      categorias_tematicas: categorias.length > 0 ? categorias : null,
      volume_fonte: volumeNum,
      pagina_fonte: null,
      confianca_extracao: 0.98, // Parsing completo - máxima confiança
      validado_humanamente: false,
      variantes: [],
      sinonimos: [],
      termos_espanhol: [],
      influencia_platina: origem === 'PLAT'|| origem === 'BRAS/PLAT',
      origem_regionalista: [origem]
    };
    
    console.log(`✅ Verbete parseado: ${result.verbete} (Volume ${volumeNum})`);
    return sanitizeObject(result);
    
  } catch (error: any) {
    console.error(`❌ Erro crítico ao parsear verbete: ${error.message}`);
    return null;
  }
}

async function processInBackground(jobId: string, verbetes: string[], volumeNum: string, offsetInicial: number) {
  const MAX_PROCESSING_TIME = 30 * 60 * 1000;
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: 30 minutos excedidos')), MAX_PROCESSING_TIME)
  );

  try {
    await Promise.race([
      processVerbetesInternal(jobId, verbetes, volumeNum, offsetInicial),
      timeoutPromise
    ]);
  } catch (error: any) {
    console.error(`[JOB ${jobId}] Erro fatal:`, error);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: 'erro',
        erro_mensagem: error.message,
        tempo_fim: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

/**
 * ✅ FASE 3 - BLOCO 1: Detectar cancelamento de job
 */
async function checkCancellation(jobId: string, supabaseClient: any) {
  const { data: job } = await supabaseClient
    .from('dictionary_import_jobs')
    .select('is_cancelling')
    .eq('id', jobId)
    .single();

  if (job?.is_cancelling) {
    console.log('🛑 Cancelamento detectado! Interrompendo processamento...');
    
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        status: 'cancelado',
        cancelled_at: new Date().toISOString(),
        tempo_fim: new Date().toISOString(),
        erro_mensagem: 'Job cancelado pelo usuário'
      })
      .eq('id', jobId);

    throw new Error('JOB_CANCELLED');
  }
}

async function processVerbetesInternal(jobId: string, verbetes: string[], volumeNum: string, offsetInicial: number) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const startTime = Date.now();
  let processados = offsetInicial;
  let inseridos = 0;
  let erros = 0;
  let batchCount = 0;

  logJobStart({
    fonte: `Dialectal Vol.${volumeNum}`,
    jobId,
    totalEntries: verbetes.length,
    batchSize: BATCH_SIZE,
    timeoutMs: TIMEOUT_MS,
    maxRetries: 3
  });

  for (let i = offsetInicial; i < verbetes.length; i += BATCH_SIZE) {
    const batch = verbetes.slice(i, i + BATCH_SIZE);
    const parsedBatch: any[] = [];

    for (const verbeteRaw of batch) {
      const parsed = parseVerbete(verbeteRaw, volumeNum);
      if (!parsed) {
        erros++;
        
        // ✅ Log detalhado apenas para primeiros 5 erros (evitar spam)
        if (erros <= 5) {
          console.error(`❌ Parse falhou para verbete #${erros}: ${verbeteRaw.substring(0, 100)}`);
        }
        
        // ✅ Não logar no banco (economizar recursos)
        continue;
      }
      
      // ✅ Verbete parseado com sucesso - apenas log periódico
      if (parsedBatch.length % 100 === 0 && parsedBatch.length > 0) {
        console.log(`✅ ${parsedBatch.length} verbetes parseados no batch atual`);
      }
      
      
      // ✅ VALIDATION: Double-check volume_fonte
      if (!parsed.volume_fonte) {
        console.error(`⚠️ CRITICAL: volume_fonte missing, setting to ${volumeNum}`);
        parsed.volume_fonte = volumeNum;
      }
      
      // ✅ Sanitização adicional como double-check de segurança
      parsedBatch.push(sanitizeObject(parsed));
    }

    if (parsedBatch.length > 0) {
      // ✅ VALIDAÇÃO: Detectar null bytes antes do upsert
      const batchJSON = JSON.stringify(parsedBatch);
      if (batchJSON.includes('\\u0000')) {
        console.error('🚨 CRITICAL: Null bytes ainda presentes no batch!');
        console.error('Primeiro item com problema:', 
          parsedBatch.find(item => JSON.stringify(item).includes('\\u0000'))
        );
        throw new Error('Null bytes detectados no batch sanitizado');
      }
      
      await withRetry(async () => {
        const { error: insertError } = await supabase
          .from('dialectal_lexicon')
          .upsert(parsedBatch, { onConflict: 'verbete_normalizado,origem_primaria', ignoreDuplicates: true });
        
        if (insertError) {
          console.error(`[JOB ${jobId}] ❌ Erro ao inserir batch:`, insertError);
          throw insertError;
        }
      }, 3, 2000, 2);

      inseridos += parsedBatch.length;
      console.log(`[JOB ${jobId}] ✅ Batch de ${parsedBatch.length} verbetes inserido com sucesso`);
    }

    processados += batch.length;
    batchCount++;

    // ✅ FASE 3 - BLOCO 1: Verificar cancelamento a cada 5 batches
    // ✅ OTIMIZADO: Atualizar progresso a cada 5 batches (reduz escritas)
    if (batchCount % 5 === 0 || processados >= verbetes.length) {
      // Checar se job foi cancelado
      await checkCancellation(jobId, supabase);
      
      const progressPercent = Math.round((processados / verbetes.length) * 100);
      
      await withRetry(async () => {
        const { error } = await supabase
          .from('dictionary_import_jobs')
          .update({
            verbetes_processados: processados,
            verbetes_inseridos: inseridos,
            erros: erros,
            progresso: progressPercent,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', jobId);
        
        if (error) throw error;
      }, 2, 1000, 1);

      logJobProgress({
        jobId,
        processed: processados,
        totalEntries: verbetes.length,
        inserted: inseridos,
        errors: erros,
        startTime
      });
    }
  }

  const totalTime = Date.now() - startTime;
  
  await supabase
    .from('dictionary_import_jobs')
    .update({
      status: 'concluido',
      verbetes_processados: processados,
      verbetes_inseridos: inseridos,
      erros: erros,
      progresso: 100,
      tempo_fim: new Date().toISOString()
    })
    .eq('id', jobId);

  logJobComplete({
    fonte: `Dialectal Vol.${volumeNum}`,
    jobId,
    processed: processados,
    totalEntries: verbetes.length,
    inserted: inseridos,
    errors: erros,
    totalTime
  });
}

serve(withInstrumentation('process-dialectal-dictionary', async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await createHealthCheck('process-dialectal-dictionary', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const { fileContent, volumeNum, offsetInicial = 0 } = validateRequest(rawBody);

    // ✅ FASE 3 - BLOCO 2: Validação pré-importação
    const validation = validateDialectalFile(fileContent, volumeNum);
    logValidationResult(`Dialectal Vol.${volumeNum}`, validation);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Validação falhou', 
          details: validation.errors,
          warnings: validation.warnings,
          metadata: validation.metadata
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`[VOLUME ${volumeNum}] Recebendo ${fileContent.length} caracteres (offset: ${offsetInicial})`);

    // ✅ FASE 1: Split e pré-processamento
    const allBlocks = fileContent.split(/\n{2,}/).map(v => v.trim());
    
    // ✅ FASE 2: Filtros aprimorados para remover ruído
    const verbetes = allBlocks.filter(v => {
      // Filtro 1: Mínimo 10 caracteres
      if (v.length < 10) return false;
      
      // Filtro 2: Remover separadores de página (linhas de ====)
      if (/^[=\-_]{10,}$/.test(v)) return false;
      
      // Filtro 3: Remover marcadores de página
      if (/^PÁGINA\s+\d+\s+de\s+\d+/i.test(v)) return false;
      
      // Filtro 4: Remover linhas que são apenas números
      if (/^\d+$/.test(v)) return false;
      
      // Filtro 5: Verbete válido deve começar com letra maiúscula
      if (!/^[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ]/.test(v)) return false;
      
      // Filtro 6: Remover linhas muito curtas mesmo após trim
      if (v.replace(/\s+/g, '').length < 5) return false;
      
      // ✅ FILTRO 7: Remover seções introdutórias (prefácio, metodologia, etc.)
      const secaoIntro = /^(Prefácio|Agradecimentos?|Metodologia|Objetivos?|Introdução|Apresentação|Justificativ|Formação|Trecho|Autores?|Dicionário|Enquadramento|Recolhe|Abonação|Caracteriza-se|Uma questão|Foi necessário|Com isso|O leitor|A leitura|Alterações|PATROCÍNIO|PRODUÇÃO|FINANCIAMENTO|Composto com|Este dicionário|Neste|O presente|Nossa|A obra|O trabalho|Cabe destacar|É importante|Considerando|Conforme|Segundo|De acordo)/i;
      if (secaoIntro.test(v)) return false;
      
      // ✅ FILTRO 8: CRÍTICO - Verbete dialectal DEVE ter marcador de origem nos primeiros 200 caracteres
      // Verbetes sempre têm (BRAS), (PLAT), (CAST), (QUER), (PORT), etc.
      const temOrigem = /\((?:BRAS|PLAT|CAST|QUER|PORT|BRAS\/PLAT|PLAT\/CAST)\s?\)/;
      if (!temOrigem.test(v.substring(0, 200))) return false;
      
      return true;
    });

    // ✅ FASE 3: Estatísticas de pré-processamento
    const filteredOut = allBlocks.length - verbetes.length;
    const filterRate = ((filteredOut / allBlocks.length) * 100).toFixed(1);
    
    console.log(`📊 Estatísticas de pré-processamento:`);
    console.log(`  - Total de blocos: ${allBlocks.length}`);
    console.log(`  - Verbetes válidos: ${verbetes.length}`);
    console.log(`  - Blocos filtrados: ${filteredOut}`);
    console.log(`  - Taxa de filtro: ${filterRate}%`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: jobData, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: `dialectal_${volumeNum}`,
        status: 'iniciado',
        total_verbetes: verbetes.length,
        verbetes_processados: offsetInicial,
        offset_inicial: offsetInicial,
        tempo_inicio: new Date().toISOString(),
        metadata: { volume: volumeNum, offset: offsetInicial }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    console.log(`[JOB ${jobData.id}] Criado para Volume ${volumeNum}`);

    processInBackground(jobData.id, verbetes, volumeNum, offsetInicial);

    return new Response(
      JSON.stringify({ 
        jobId: jobData.id, 
        message: 'Processamento iniciado em background',
        totalVerbetes: verbetes.length,
        offsetInicial
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
