// ✅ VERSÃO 2.0 - Filtros aprimorados contra texto introdutório (deploy forçado)
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
  tipoDicionario: string; // ✅ NOVO: Identificador do tipo de dicionário
  offsetInicial?: number; // ✅ NOVO: Suporte a retomada
  jobId?: string; // ✅ NOVO: ID do job existente (opcional)
}

function validateRequest(data: any): ProcessRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { fileContent, volumeNum, tipoDicionario, offsetInicial = 0, jobId } = data;
  
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
  
  if (!tipoDicionario || typeof tipoDicionario !== 'string') {
    throw new Error('tipoDicionario deve ser uma string válida');
  }
  
  return { fileContent, volumeNum, tipoDicionario, offsetInicial, jobId };
}

function normalizeWord(word: string): string {
  return word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * ✅ FASE 2: Extrai marcadores de uso estruturados
 * Remove colchetes e divide por barra ou espaço
 */
function extractMarkers(text: string | null): string[] {
  if (!text) return [];
  return text.replace(/[\[\]]/g, '').split(/[\/\s]+/).filter(m => m.length > 0);
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
function parseVerbete(verbeteRaw: string, volumeNum: string, tipoDicionario: string): any | null {
  try {
    // ✅ Sanitizar texto de entrada removendo null bytes
    const cleanText = sanitizeText(verbeteRaw) || '';
    
    // ✅ NOVO: Detectar sub-verbetes (verbetes derivados dentro do mesmo bloco)
    // Ex: dentro de "ABA" pode ter "ABAETADO", "ABAETAR" como sub-verbetes
    const subVerbetePattern = /\n([A-ZÁÀÃÉÊÍÓÔÚÇ\-]{2,})\s+\((?:BRAS|PLAT|CAST|QUER|PORT)\)/g;
    const subVerbetes = [...cleanText.matchAll(subVerbetePattern)];
    
    if (subVerbetes.length > 1) {
      // Múltiplos verbetes no mesmo bloco - processar apenas o primeiro
      // Os outros serão processados como blocos separados pelo split principal
      const firstSubEnd = subVerbetes[1].index!;
      const cleanedText = cleanText.substring(0, firstSubEnd).trim();
      console.log(`⚠️ Sub-verbetes detectados: ${subVerbetes.length}. Processando apenas primeiro verbete.`);
      const normalizedText = cleanedText.replace(/\s+/g, ' ').replace(/[-–—]/g, '-');
      return parseVerbeteSingle(normalizedText, volumeNum, tipoDicionario);
    }
    
    const normalizedText = cleanText.replace(/\s+/g, ' ').replace(/[-–—]/g, '-');
    return parseVerbeteSingle(normalizedText, volumeNum, tipoDicionario);
  } catch (error: any) {
    console.error(`❌ Erro no parseVerbete:`, error.message);
    return null;
  }
}

/**
 * ✅ Parser interno - extrai dados de um único verbete
 */
function parseVerbeteSingle(normalizedText: string, volumeNum: string, tipoDicionario: string): any | null {
  try {
    // ✅ FASE 2: REGEX REFINADA - Captura explícita de marcadores entre colchetes
    // Grupo 1: Verbete
    // Grupo 2: Origem (BRAS|PLAT...)
    // Grupo 3: Classe Gramatical (antes dos colchetes)
    // Grupo 4: Marcadores (dentro dos colchetes) - OPCIONAL
    // Grupo 5: Resto da Classe Gramatical (após colchetes) - OPCIONAL
    // Grupo 6: Definição (após hífen)
    const headerRegex = /^([A-ZÁÀÃÉÊÍÓÔÚÇ\-\(\)\s]+?)\s+\((BRAS|PLAT|CAST|QUER|BRAS\/PLAT|PORT)\s?\)\s+([^[\-]+?)(?:\[(.*?)\])?([^\-]*?)(?:\s+\-\s+|\n)(.+)$/s;
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
        
        const entry_type = verbete.trim().includes(' ') ? 'mwe' : 'word';
        
        const result = {
          verbete: verbete.trim(),
          verbete_normalizado: normalizeWord(verbete),
          tipo_dicionario: tipoDicionario, // ✅ NOVO CAMPO
          origem_primaria: origem.replace(/\s/g, ''),
          classe_gramatical: pos,
          marcacao_temporal: null,
          frequencia_uso: null,
          definicoes: [{ texto: definicao.trim(), acepcao: 1 }],
          remissoes: [],
          contextos_culturais: {},
          categorias_tematicas: [],
          entry_type,
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
        
        const entry_type = verbete.trim().includes(' ') ? 'mwe' : 'word';
        
        const result = {
          verbete: verbete.trim(),
          verbete_normalizado: normalizeWord(verbete),
          tipo_dicionario: tipoDicionario, // ✅ NOVO CAMPO
          origem_primaria: 'BRAS',
          classe_gramatical: null,
          marcacao_temporal: null,
          frequencia_uso: null,
          definicoes: [{ texto: conteudo.trim(), acepcao: 1 }],
          remissoes: [],
          contextos_culturais: {},
          categorias_tematicas: [],
          entry_type,
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
      
      console.error(`❌ Parse falhou completamente para: ${normalizedText.substring(0, 100)}`);
      return null;
    }
    
    // ✅ FASE 2: Parse com match bem-sucedido usando nova regex
    const [_, verbete, origem, classeGramPre, marcadoresRaw, classeGramPost, restoDefinicao] = match;
    
    // Combinar partes da classe gramatical e limpar
    const classeGramatical = (classeGramPre + (classeGramPost || '')).trim().replace(/\s+/g, ' ');
    
    // ✅ FASE 2: Extrair marcadores estruturados
    const marcadores = extractMarkers(marcadoresRaw);
    
    // Extrair marcação temporal das partes da classe gramatical
    const temANT = /\bANT\b/.test(classeGramatical);
    const temDES = /\bDES\b/.test(classeGramatical);
    const marcacao_temporal = temANT && temDES ? 'ANT/DES' : (temANT ? 'ANT' : (temDES ? 'DES' : null));
    
    // Remover marcações temporais da classe gramatical final
    const classeGram = classeGramatical.replace(/\b(ANT|DES|BRAS|PLAT)\b/g, '').trim();
    
    // Extrair frequência de uso da definição
    const freqMatch = restoDefinicao.match(/\[(r\/us|m\/us|n\/d)\]/);
    
    // Separar definições múltiplas por '//'
    const definicoesBrutas = restoDefinicao.split('//').map((d: string) => d.trim()).filter((d: string) => d.length > 0);
    const definicoes = definicoesBrutas.map((def: string, idx: number) => ({
      texto: def.replace(/\[(r\/us|m\/us|n\/d)\]/g, '').trim(),
      acepcao: idx + 1
    }));
    
    // Extrair remissões (V., Cf.)
    const remissoes: string[] = [];
    const remissoesRegex = /(?:V\.|Cf\.)\s+([A-ZÁÀÃÉÊÍÓÔÚÇ\-]+)/g;
    let remMatch;
    while ((remMatch = remissoesRegex.exec(restoDefinicao)) !== null) remissoes.push(remMatch[1].trim());
    
    const contextos_culturais = { autores_citados: [], regioes_mencionadas: [], notas: [] };
    const categorias = inferCategorias(verbete, definicoes, contextos_culturais);
    const entry_type = verbete.trim().includes(' ') ? 'mwe' : 'word';
    
    const result = {
      verbete: verbete.trim(),
      verbete_normalizado: normalizeWord(verbete),
      tipo_dicionario: tipoDicionario, // ✅ NOVO CAMPO
      origem_primaria: origem,
      classe_gramatical: classeGram || null,
      marcacao_temporal,
      frequencia_uso: freqMatch ? freqMatch[1] : null,
      marcadores_uso: marcadores.length > 0 ? marcadores : null, // ✅ FASE 2: NOVO CAMPO
      definicoes,
      remissoes: remissoes.length > 0 ? remissoes : null,
      contextos_culturais,
      categorias_tematicas: categorias.length > 0 ? categorias : null,
      entry_type,
      volume_fonte: volumeNum,
      pagina_fonte: null,
      confianca_extracao: 0.99, // ✅ FASE 2: Confiança aumentada com regex refinada
      validado_humanamente: false,
      variantes: [],
      sinonimos: [],
      termos_espanhol: [],
      influencia_platina: origem === 'PLAT'|| origem === 'BRAS/PLAT',
      origem_regionalista: [origem]
    };
    
    console.log(`✅ Verbete parseado: ${result.verbete} (Volume ${volumeNum}) - Marcadores: [${marcadores.join(', ')}]`);
    return sanitizeObject(result);
    
  } catch (error: any) {
    console.error(`❌ Erro crítico ao parsear verbete: ${error.message}`);
    return null;
  }
}

async function processInBackground(jobId: string, verbetes: string[], volumeNum: string, tipoDicionario: string, offsetInicial: number) {
  const MAX_PROCESSING_TIME = 30 * 60 * 1000;
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: 30 minutos excedidos')), MAX_PROCESSING_TIME)
  );

  try {
    await Promise.race([
      processVerbetesInternal(jobId, verbetes, volumeNum, tipoDicionario, offsetInicial),
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

async function processVerbetesInternal(jobId: string, verbetes: string[], volumeNum: string, tipoDicionario: string, offsetInicial: number) {
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

    // ✅ CONTADORES DE ERROS POR TIPO
    let parseErrors = {
      total: 0,
      regex_failed: 0,
      too_short: 0,
      null_bytes: 0
    };

    for (const verbeteRaw of batch) {
      const parsed = parseVerbete(verbeteRaw, volumeNum, tipoDicionario);
      if (!parsed) {
        erros++;
        parseErrors.total++;
        
        // Diagnóstico do tipo de erro
        if (verbeteRaw.length < 20) parseErrors.too_short++;
        else if (verbeteRaw.includes('\u0000')) parseErrors.null_bytes++;
        else parseErrors.regex_failed++;
        
        // Log de amostra (primeiros 10 ou 5% dos erros)
        if (parseErrors.total <= 10 || Math.random() < 0.05) {
          console.error(`❌ Parse falhou (amostra): "${verbeteRaw.substring(0, 80)}..."`);
        }
        
        continue;
      }
      
      // ✅ Verbete parseado com sucesso - apenas log periódico
      if (parsedBatch.length % 100 === 0 && parsedBatch.length > 0) {
        console.log(`✅ ${parsedBatch.length} verbetes parseados no batch atual`);
      }
      
      
      // ✅ VALIDATION: Double-check volume_fonte e tipo_dicionario
      if (!parsed.volume_fonte) {
        console.error(`⚠️ CRITICAL: volume_fonte missing, setting to ${volumeNum}`);
        parsed.volume_fonte = volumeNum;
      }
      if (!parsed.tipo_dicionario) {
        console.error(`⚠️ CRITICAL: tipo_dicionario missing, setting to ${tipoDicionario}`);
        parsed.tipo_dicionario = tipoDicionario;
      }
      
      // ✅ Sanitização adicional como double-check de segurança
      parsedBatch.push(sanitizeObject(parsed));
    }

    // ✅ LOG AGREGADO DE ERROS DE PARSING AO FINAL DO BATCH
    if (parseErrors.total > 0) {
      console.log(`\n⚠️ ERROS DE PARSING NO BATCH:`);
      console.log(`   - Total: ${parseErrors.total}`);
      console.log(`   - Regex falhou: ${parseErrors.regex_failed}`);
      console.log(`   - Muito curto: ${parseErrors.too_short}`);
      console.log(`   - Null bytes: ${parseErrors.null_bytes}`);
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
          .upsert(parsedBatch, { onConflict: 'verbete_normalizado,volume_fonte', ignoreDuplicates: true });
        
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
    const { fileContent, volumeNum, tipoDicionario, offsetInicial = 0, jobId } = validateRequest(rawBody);

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

    // ✅ LOG CONSOLIDADO DE ARQUIVO
    const totalLinhas = (fileContent.match(/\n/g) || []).length + 1;
    console.log(`📊 ARQUIVO RECEBIDO:`);
    console.log(`   - Volume: ${volumeNum}`);
    console.log(`   - Tamanho: ${fileContent.length.toLocaleString()} caracteres`);
    console.log(`   - Linhas totais: ${totalLinhas.toLocaleString()}`);
    console.log(`   - Offset inicial: ${offsetInicial}`);

    // 🔍 DEBUG: Análise da estrutura do arquivo
    console.log(`\n🔍 DEBUG - Primeiros 500 caracteres:`);
    console.log(fileContent.substring(0, 500));
    console.log(`🔍 DEBUG - Estrutura de quebras:`);
    console.log(`   - Contém \\n\\n: ${fileContent.includes('\n\n')}`);
    console.log(`   - Contém \\r\\n: ${fileContent.includes('\r\n')}`);
    console.log(`   - Total de \\n: ${(fileContent.match(/\n/g) || []).length}`);
    console.log(`   - Total de caracteres: ${fileContent.length}`);

    // ✅ ESTRATÉGIA CORRETA: Split com captura e reconstrução (port do Python)
    // Passo 1: Normalizar line breaks (Windows → Unix)
    const normalizedContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Passo 2: Split capturando o delimitador (SEM lookahead)
    // Regex captura: "palavra MAIÚSCULA + marcador de origem"
    const verbeteDelimiter = /\n([A-ZÁÀÃÉÊÍÓÔÚÇ\-]{2,}\s+\((?:BRAS|PLAT|CAST|QUER|PORT|BRAS\/PLAT|PLAT\/CAST)\))/g;
    const parts = normalizedContent.split(verbeteDelimiter);

    console.log(`🔍 Split resultou em ${parts.length} partes (esperado: ímpar)`);

    let allBlocks: string[] = [];

    if (parts.length > 3) {
      // Split funcionou - partes estão intercaladas: [conteúdo antes, cabeçalho1, corpo1, cabeçalho2, corpo2, ...]
      
      // Parte 0: conteúdo antes do primeiro verbete (introdução/lixo)
      const intro = parts[0].trim();
      if (intro.length > 100) {
        console.log(`📝 Ignorando ${intro.length} caracteres de introdução`);
      }
      
      // Partes ímpares: cabeçalhos de verbetes
      // Partes pares (exceto 0): corpos de verbetes
      // Reconstruir: juntar cabeçalho + corpo
      for (let i = 1; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
          const verbete = (parts[i] + parts[i + 1]).trim();
          if (verbete.length > 0) {
            allBlocks.push(verbete);
          }
        } else {
          // Último elemento (cabeçalho sem corpo) - adicionar sozinho
          const verbete = parts[i].trim();
          if (verbete.length > 0) {
            allBlocks.push(verbete);
          }
        }
      }
      
      console.log(`✅ Split por padrão de verbete: ${allBlocks.length} blocos`);
    } else {
      // FALLBACK: Split não funcionou - tentar por parágrafos
      console.warn(`⚠️ Split por padrão falhou (apenas ${parts.length} partes). Usando fallback por parágrafos.`);
      allBlocks = normalizedContent.split(/\n{2,}/).map(v => v.trim()).filter(v => v.length > 0);
      console.log(`⚠️ Fallback gerou ${allBlocks.length} blocos`);
    }

    // ✅ ESTATÍSTICAS DE SPLIT
    console.log(`\n📊 ESTATÍSTICAS DE SPLIT:`);
    console.log(`   - Total de blocos brutos: ${allBlocks.length}`);
    console.log(`   - Método usado: ${parts.length > 3 ? 'Regex de verbete' : 'Fallback por parágrafos'}`);
    console.log(`   - Blocos com < 20 chars: ${allBlocks.filter(b => b.length < 20).length}`);
    console.log(`   - Blocos com > 1000 chars: ${allBlocks.filter(b => b.length > 1000).length}`);

    // Log dos primeiros 3 blocos para validação manual
    console.log(`📋 Primeiros 3 blocos após split:`);
    allBlocks.slice(0, 3).forEach((bloco, i) => {
      const primeiraLinha = bloco.split('\n')[0];
      console.log(`   ${i + 1}. ${primeiraLinha.substring(0, 80)}...`);
    });

    // ✅ LOGS DE REJEIÇÃO AMOSTRADOS COM ESTATÍSTICAS COMPLETAS
    const rejeitados: { 
      index: number; 
      razao: string; 
      preview: string;
      posicaoRelativa: 'inicio' | 'meio' | 'fim';
    }[] = [];

    const verbetes = allBlocks.filter((v, index) => {
      const posicaoRelativa = 
        index < allBlocks.length * 0.33 ? 'inicio' :
        index < allBlocks.length * 0.66 ? 'meio' : 'fim';
        
      // Filtro 1: Muito curto
      if (v.length < 20) {
        // Amostragem: primeiros 10 ou 5% de chance
        if (rejeitados.length < 10 || Math.random() < 0.05) {
          rejeitados.push({ index, razao: 'muito curto', preview: v, posicaoRelativa });
        }
        return false;
      }
      
      // Filtro 2: Padrão não encontrado
      const verbetePattern = /^[A-ZÁÀÃÉÊÍÓÔÚÇ\-]{2,}\s+\((?:BRAS|PLAT|CAST|QUER|PORT|BRAS\/PLAT|PLAT\/CAST)\)/;
      if (!verbetePattern.test(v)) {
        if (rejeitados.length < 10 || Math.random() < 0.05) {
          rejeitados.push({ index, razao: 'padrão não encontrado', preview: v.substring(0, 60), posicaoRelativa });
        }
        return false;
      }
      
      // Filtro 3: Seções introdutórias
      if (/^(Prefácio|Metodologia|Introdução|PATROCÍNIO|PRODUÇÃO|FINANCIAMENTO|SUMÁRIO|ÍNDICE)/i.test(v)) {
        if (rejeitados.length < 10 || Math.random() < 0.05) {
          rejeitados.push({ index, razao: 'seção introdutória', preview: v.substring(0, 60), posicaoRelativa });
        }
        return false;
      }
      
      return true;
    });

    // Estatísticas agregadas de rejeições
    const rejeicoesPorRazao = rejeitados.reduce((acc, r) => {
      acc[r.razao] = (acc[r.razao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n📊 ESTATÍSTICAS DE REJEIÇÃO:`);
    console.log(`   - Total de blocos: ${allBlocks.length}`);
    console.log(`   - Verbetes aceitos: ${verbetes.length} (${((verbetes.length / allBlocks.length) * 100).toFixed(1)}%)`);
    console.log(`   - Blocos rejeitados: ${allBlocks.length - verbetes.length}`);
    console.log(`\n   Rejeições por razão:`);
    Object.entries(rejeicoesPorRazao).forEach(([razao, count]) => {
      console.log(`     - ${razao}: ${count}`);
    });

    // Amostra de rejeitados por posição no arquivo
    console.log(`\n❌ AMOSTRA DE BLOCOS REJEITADOS (máx 20):`);
    const amostrasRejeitados = rejeitados.slice(0, 20);
    amostrasRejeitados.forEach(({ index, razao, preview, posicaoRelativa }) => {
      console.log(`   [${posicaoRelativa.toUpperCase()}] Bloco ${index}: [${razao}]`);
      console.log(`      "${preview}..."`);
    });

    // Log dos aceitos
    console.log(`\n✅ Primeiros 5 verbetes ACEITOS:`);
    verbetes.slice(0, 5).forEach((v, i) => {
      const primeiraLinha = v.split('\n')[0];
      console.log(`   ${i + 1}. ${primeiraLinha}`);
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

    let jobData;

    // ✅ Se jobId foi passado, usar job existente
    if (jobId) {
      const { data: existingJob, error: fetchError } = await supabase
        .from('dictionary_import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (fetchError || !existingJob) {
        throw new Error(`Job ${jobId} não encontrado: ${fetchError?.message}`);
      }
      
      jobData = existingJob;
      
      console.log(`[JOB ${jobId}] Usando job existente - tipo: ${existingJob.tipo_dicionario}`);
      
      // Atualizar job com informações corretas
      const { error: updateError } = await supabase
        .from('dictionary_import_jobs')
        .update({
          tipo_dicionario: tipoDicionario, // ✅ Usar o tipo correto passado
          status: 'processando',
          total_verbetes: verbetes.length,
          verbetes_processados: offsetInicial,
          offset_inicial: offsetInicial,
          tempo_inicio: new Date().toISOString(),
          metadata: {
            ...(existingJob.metadata || {}),
            volume: volumeNum,
            offset: offsetInicial
          }
        })
        .eq('id', jobId);
      
      if (updateError) {
        console.error(`❌ Erro ao atualizar job: ${updateError.message}`);
        throw updateError;
      }
      
      console.log(`[JOB ${jobId}] Atualizado com tipo_dicionario: ${tipoDicionario}`);
    } else {
      // ✅ Apenas criar novo job se jobId NÃO foi passado
      const { data: newJob, error: jobError } = await supabase
        .from('dictionary_import_jobs')
        .insert({
          tipo_dicionario: tipoDicionario, // ✅ Usar parâmetro correto
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
      
      jobData = newJob;
      console.log(`[JOB ${newJob.id}] Criado novo job - tipo: ${tipoDicionario}`);
    }

    processInBackground(jobData.id, verbetes, volumeNum, tipoDicionario, offsetInicial);

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
