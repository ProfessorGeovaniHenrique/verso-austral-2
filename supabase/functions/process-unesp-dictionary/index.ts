import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRetry } from "../_shared/retry.ts";
import { validateUNESPFile, logValidationResult } from "../_shared/validation.ts";
import { logJobStart, logJobProgress, logJobComplete, logJobError } from "../_shared/logging.ts";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 1000;
const TIMEOUT_MS = 90000; // 90 segundos

interface ProcessRequest {
  fileContent: string;
}

function validateRequest(data: any): ProcessRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { fileContent } = data;
  
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('fileContent deve ser uma string válida');
  }
  
  // ✅ Aumentado de 10MB para 20MB para acomodar overhead de serialização
  if (fileContent.length > 20_000_000) {
    throw new Error('fileContent excede tamanho máximo de 20MB');
  }
  
  return { fileContent };
}

interface UNESPEntry {
  palavra: string;
  pos: string;
  definicao: string;
  exemplos: string[];
  registro: string;
  variacao?: string;
  acepcao?: number;
}

/**
 * Pré-processador para limpar metadados de OCR/scan do arquivo UNESP
 * Remove: Notice, Page X, linhas vazias, marcadores de início de livro
 */
function cleanUNESPContent(rawContent: string): string {
  const lines = rawContent.split('\n');
  const cleanedLines: string[] = [];
  let skipUntilContent = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Pular linhas de metadados e estrutura do eBook
    if (
      line === '' ||
      line.startsWith('Notice') ||
      line.startsWith('Page ') ||
      line.startsWith('====') ||
      line.startsWith('***') ||
      line.includes('This eBook') ||
      line.includes('Project Gutenberg') ||
      line.includes('END OF THIS PROJECT') ||
      line.includes('START OF THIS PROJECT') ||
      line.includes('www.gutenberg') ||
      line.includes('Dicionário') ||
      line.includes('UNESP') ||
      line.includes('Editora') ||
      line.includes('ISBN') ||
      line.includes('Sumário') ||
      line.includes('Prefácio') ||
      line.includes('Apresentação') ||
      line.includes('Copyright') ||
      line.match(/^\d+$/) || // Números de página isolados
      line.match(/^[IVXLCDM]+\.?\s*$/) || // Numeração romana
      line.match(/^[A-Z\s]{10,}$/) // Linhas com só maiúsculas (títulos)
    ) {
      continue;
    }
    
    // Detectar início de conteúdo real (qualquer formato A, B ou C)
    if (skipUntilContent) {
      const hasFormatA = /^[A-ZÁÀÃÉÊÍÓÔÚÇ]{2,}\s+[a-záàãéêíóôúç\-:]+\s+(Vt|Vi|Adj|Sm|Sf|St|Adv)/i.test(line);
      const hasFormatB = /^[a-záàãéêíóôúç]+\s+[A-ZÁÀÃÉÊÍÓÔÚÇ]{2,}[a-záàãéêíóôúç\-:]+(Vt|Vi|Adj|Sm|Sf|St|Adv)/i.test(line);
      const hasFormatC = /^[A-ZÁÀÃÉÊÍÓÔÚÇ]{2,}\s/.test(line);
      
      if (hasFormatA || hasFormatB || hasFormatC) {
        skipUntilContent = false;
      }
    }
    
    if (!skipUntilContent) {
      cleanedLines.push(line);
    }
  }
  
  console.log(`✅ UNESP Parser: Linhas limpas: ${cleanedLines.length} de ${lines.length} originais`);
  console.log(`📝 Primeiras 5 linhas limpas:`, cleanedLines.slice(0, 5));
  
  return cleanedLines.join('\n');
}

/**
 * Normalizar classes gramaticais do formato UNESP
 */
function normalizePOS(pos: string): string {
  const posMap: Record<string, string> = {
    'Vt': 'v.t.',
    'Vi': 'v.i.',
    'Adj': 'adj.',
    'Adi': 'adj.',
    'Adv': 'adv.',
    'S.m.': 's.m.',
    'S.f.': 's.f.',
    'Sm': 's.m.',
    'Sf': 's.f.',
    'St': 's.m.',
    'Prep': 'prep.',
    'Conj': 'conj.',
    'Interj': 'interj.'
  };
  return posMap[pos] || pos.toLowerCase();
}

/**
 * 🔍 DETECTOR DE FORMATO MULTI-CAMADA
 * Identifica qual dos 3 formatos a entrada segue
 */
type FormatType = 'A' | 'B' | 'C' | null;

function detectFormat(text: string): FormatType {
  // Formato A (ideal): MESOTERAPIA me-so-te-ra-pia Sf (Med) tratamento...
  if (/^[A-ZÁÀÃÉÊÍÓÔÚÇ]{2,}\s+[a-záàãéêíóôúç\-:]+\s+(Vt|Vi|Adj|Adi|Sm|Sf|St|Adv|Prep|Conj|Interj)/i.test(text)) {
    return 'A';
  }
  
  // Formato B (tokens grudados): abafar ABAFARataarVt 1 sufocar...
  if (/^[a-záàãéêíóôúç]+\s+[A-ZÁÀÃÉÊÍÓÔÚÇ]{2,}[a-záàãéêíóôúç\-:]+(Vt|Vi|Adj|Adi|Sm|Sf|St|Adv|Prep|Conj|Interj)/i.test(text)) {
    return 'B';
  }
  
  // Formato C (simplificado): ABAJUR abajur Sm peça que...
  if (/^[A-ZÁÀÃÉÊÍÓÔÚÇ]{2,}\s/.test(text)) {
    return 'C';
  }
  
  return null;
}

/**
 * 📖 PARSER FORMATO A (Ideal)
 * Exemplo: MESOTERAPIA me-so-te-ra-pia Sf (Med) tratamento...
 */
function parseFormatA(text: string): UNESPEntry | null {
  const match = text.match(
    /^([A-ZÁÀÃÉÊÍÓÔÚÇ][A-ZÁÀÃÉÊÍÓÔÚÇ\-]+)\s+([a-záàãéêíóôúç][a-záàãéêíóôúç:\-]+)\s+(Adj|Adi|S\.m\.|S\.f\.|Sm|Sf|St|Vt|Vi|Adv|Prep|Conj|Interj)\s+(.+)$/is
  );
  
  if (!match) return null;
  
  const palavraMaiuscula = match[1];
  const palavraSilabada = match[2];
  const pos = match[3].trim();
  const restoTexto = match[4].trim();
  
  // Extrair número de acepção
  const acepcaoMatch = restoTexto.match(/^(\d+)\s+/);
  const acepcao = acepcaoMatch ? parseInt(acepcaoMatch[1]) : 1;
  const definicaoRaw = acepcaoMatch ? restoTexto.substring(acepcaoMatch[0].length) : restoTexto;
  
  // Extrair exemplos (após dois-pontos)
  const exemploSplit = definicaoRaw.split(':');
  const definicao = exemploSplit[0].replace(/;/g, ',').trim();
  const exemplos = exemploSplit.length > 1 ? [exemploSplit.slice(1).join(':').trim()] : [];
  
  // Extrair registro de uso
  const registroMatch = definicaoRaw.match(/^\(([^)]+)\)/);
  const registro = registroMatch ? registroMatch[1].trim() : '';
  
  return {
    palavra: palavraMaiuscula.toLowerCase().trim(),
    pos: normalizePOS(pos),
    definicao,
    exemplos,
    registro,
    variacao: palavraSilabada,
    acepcao
  };
}

/**
 * 🔧 PARSER FORMATO B (Tokens Grudados - O PROBLEMA ATUAL)
 * Exemplo: abafar ABAFARataarVt 1 sufocar...
 * Estratégia: Separar bloco grudado "ABAFARataarVt" em componentes
 */
function parseFormatB(text: string): UNESPEntry | null {
  // Match: palavra_minuscula PALAVRA_MAIUSCULAsilabadaPOS resto
  const match = text.match(
    /^([a-záàãéêíóôúç]+)\s+([A-ZÁÀÃÉÊÍÓÔÚÇ]{2,})([a-záàãéêíóôúç\-:]+)(Vt|Vi|Adj|Adi|Sm|Sf|St|Adv|Prep|Conj|Interj)\s+(.+)$/i
  );
  
  if (!match) return null;
  
  const palavraMin = match[1];
  const palavraMai = match[2];
  const silabacao = match[3];
  const pos = match[4];
  const resto = match[5].trim();
  
  console.log(`🔧 [Formato B] Palavra: "${palavraMin}", Maiúscula: "${palavraMai}", Silabação: "${silabacao}", POS: "${pos}"`);
  
  // Extrair número de acepção
  const acepcaoMatch = resto.match(/^(\d+)\s+/);
  const acepcao = acepcaoMatch ? parseInt(acepcaoMatch[1]) : 1;
  const definicaoRaw = acepcaoMatch ? resto.substring(acepcaoMatch[0].length) : resto;
  
  // Extrair exemplos
  const exemploSplit = definicaoRaw.split(':');
  const definicao = exemploSplit[0].replace(/;/g, ',').trim();
  const exemplos = exemploSplit.length > 1 ? [exemploSplit.slice(1).join(':').trim()] : [];
  
  // Extrair registro
  const registroMatch = definicaoRaw.match(/^\(([^)]+)\)/);
  const registro = registroMatch ? registroMatch[1].trim() : '';
  
  return {
    palavra: palavraMin, // Usar minúscula como palavra principal
    pos: normalizePOS(pos),
    definicao,
    exemplos,
    registro,
    variacao: silabacao,
    acepcao
  };
}

/**
 * 📄 PARSER FORMATO C (Simplificado - Fallback)
 * Exemplo: ABAJUR abajur Sm peça que...
 */
function parseFormatC(text: string): UNESPEntry | null {
  const match = text.match(/^([A-ZÁÀÃÉÊÍÓÔÚÇ][A-ZÁÀÃÉÊÍÓÔÚÇ\-]+)\s+(.+)$/);
  if (!match) return null;
  
  const palavraMaiuscula = match[1];
  const resto = match[2].trim();
  
  // Tentar extrair POS se houver
  const posMatch = resto.match(/^([a-záàãéêíóôúç\-:]+)\s+(Vt|Vi|Adj|Adi|Sm|Sf|St|Adv|Prep|Conj|Interj)\s+(.+)$/i);
  
  if (posMatch) {
    const silabacao = posMatch[1];
    const pos = posMatch[2];
    const definicao = posMatch[3].trim();
    
    return {
      palavra: palavraMaiuscula.toLowerCase().trim(),
      pos: normalizePOS(pos),
      definicao,
      exemplos: [],
      registro: '',
      variacao: silabacao
    };
  }
  
  // Fallback total: apenas palavra + resto como definição
  return {
    palavra: palavraMaiuscula.toLowerCase().trim(),
    pos: 'indefinido',
    definicao: resto,
    exemplos: [],
    registro: ''
  };
}

/**
 * 🎯 PARSER PRINCIPAL - ESTRATÉGIA MULTI-CAMADA
 * Detecta formato e delega para parser específico
 */
function parseUNESPEntry(text: string): UNESPEntry | null {
  try {
    const trimmed = text.trim();
    if (!trimmed) return null;
    
    const format = detectFormat(trimmed);
    
    if (!format) {
      console.warn('⚠️ Formato não reconhecido:', trimmed.substring(0, 100));
      return null;
    }
    
    console.log(`🔍 Formato detectado: ${format} para entrada: ${trimmed.substring(0, 80)}...`);
    
    let result: UNESPEntry | null = null;
    
    switch (format) {
      case 'A':
        result = parseFormatA(trimmed);
        break;
      case 'B':
        result = parseFormatB(trimmed);
        break;
      case 'C':
        result = parseFormatC(trimmed);
        break;
    }
    
    if (result) {
      console.log(`✅ Palavra extraída: "${result.palavra}", POS: "${result.pos}", Acepção: ${result.acepcao || 1}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao parsear entrada UNESP:', error);
    return null;
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

async function processInBackground(
  jobId: string,
  rawContent: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  const errorLog: string[] = [];
  const definitionBatches: any[] = [];

  console.log(`📚 [Job ${jobId}] Iniciando pré-processamento do UNESP...`);

  try {
    // PRÉ-PROCESSAMENTO: Limpar metadados
    const cleanedContent = cleanUNESPContent(rawContent);
    console.log(`🧹 Conteúdo limpo. Tamanho original: ${rawContent.length}, limpo: ${cleanedContent.length}`);
    
    // Dividir em entradas (suporta formatos A, B e C)
    const entries = cleanedContent
      .split(/(?=^(?:[A-ZÁÀÃÉÊÍÓÔÚÇ]{2,}\s+[a-záàãéêíóôúç\-:]|[a-záàãéêíóôúç]+\s+[A-ZÁÀÃÉÊÍÓÔÚÇ]{2,}))/gm)
      .filter(e => e.trim().length > 0);

    console.log(`📊 [Job ${jobId}] Total de entradas detectadas: ${entries.length}`);

    await supabaseClient
      .from('dictionary_import_jobs')
      .update({ 
        status: 'processando',
        total_verbetes: entries.length
      })
      .eq('id', jobId);

    // Consolidar entradas (agrupar múltiplas acepções)
    const consolidatedMap = new Map<string, any>();

    // Processar entradas
    for (let i = 0; i < entries.length; i++) {
      const entryText = entries[i];
      
      try {
        const entry = parseUNESPEntry(entryText);
        if (!entry) {
          errors++;
          if (errors <= 10) {
            errorLog.push(`Entrada ${i}: Falha no parse`);
          }
          continue;
        }

        processed++;

        // Consolidar acepções do mesmo verbete
        const verbeteKey = `${entry.palavra}_${entry.pos}`;

        if (!consolidatedMap.has(verbeteKey)) {
          consolidatedMap.set(verbeteKey, {
            palavra: entry.palavra,
            pos: entry.pos,
            definicao: entry.definicao,
            exemplos: entry.exemplos || [],
            registro_uso: entry.registro || null,
            fonte: 'unesp'
          });
        } else {
          // Acepção adicional - concatenar definição
          const existing = consolidatedMap.get(verbeteKey);
          existing.definicao += ` | ${entry.definicao}`;
          if (entry.exemplos && entry.exemplos.length > 0) {
            existing.exemplos.push(...entry.exemplos);
          }
        }

      } catch (err) {
        console.error(`❌ [Job ${jobId}] Erro processando entrada ${i}:`, err);
        errors++;
        if (errorLog.length < 10) {
          errorLog.push(`Entrada ${i}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Adicionar verbete consolidado ao batch
      if (consolidatedMap.size > 0 && i % 100 === 0) {
        // A cada 100 entradas, inserir batch de consolidados
        const batchData = Array.from(consolidatedMap.values());
        
        for (const item of batchData) {
          definitionBatches.push(item);
        }
        
        consolidatedMap.clear();
      }

      // Inserir batch quando atingir tamanho
      if (definitionBatches.length >= BATCH_SIZE) {
        // ✅ FASE 3 - BLOCO 1: Verificar cancelamento antes de inserir batch
        await checkCancellation(jobId, supabaseClient);
        
        console.log(`💾 Inserindo batch de ${definitionBatches.length} definições...`);
        
        await withRetry(async () => {
          const { error } = await supabaseClient
            .from('lexical_definitions')
            .insert(definitionBatches);
          
          if (error) throw error;
        }, 3, 2000);
        
        inserted += definitionBatches.length;
        definitionBatches.length = 0;

        // Atualizar progresso
        await supabaseClient
          .from('dictionary_import_jobs')
          .update({
            verbetes_processados: processed,
            verbetes_inseridos: inserted,
            erros: errors
          })
          .eq('id', jobId);
      }
    }

    // Adicionar últimas entradas consolidadas ao batch final
    if (consolidatedMap.size > 0) {
      const finalBatchData = Array.from(consolidatedMap.values());
      for (const item of finalBatchData) {
        definitionBatches.push(item);
      }
      consolidatedMap.clear();
    }

    // Inserir batch final
    if (definitionBatches.length > 0) {
      console.log(`💾 Inserindo batch final de ${definitionBatches.length} definições...`);
      
      await withRetry(async () => {
        const { error } = await supabaseClient
          .from('lexical_definitions')
          .insert(definitionBatches);
        
        if (error) throw error;
      }, 3, 2000);
      
      inserted += definitionBatches.length;
    }

    // Finalizar job
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        status: 'concluido',
        verbetes_processados: processed,
        verbetes_inseridos: inserted,
        erros: errors,
        erro_mensagem: errorLog.length > 0 ? errorLog.join('\n') : null
      })
      .eq('id', jobId);

    console.log(`✅ [Job ${jobId}] Concluído! Processados: ${processed}, Inseridos: ${inserted}, Erros: ${errors}`);

  } catch (error) {
    console.error(`❌ [Job ${jobId}] Erro crítico:`, error);
    
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        status: 'erro',
        erro_mensagem: error instanceof Error ? error.message : String(error)
      })
      .eq('id', jobId);
  }
}

serve(withInstrumentation('process-unesp-dictionary', async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await createHealthCheck('process-unesp-dictionary', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    console.log('📥 Recebendo requisição para processar Dicionário UNESP...');

    const json = await req.json();
    const { fileContent } = validateRequest(json);

    // ✅ FASE 3 - BLOCO 2: Validação pré-importação
    const validation = validateUNESPFile(fileContent);
    logValidationResult('UNESP', validation);
    
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

    console.log(`📊 Tamanho do arquivo: ${fileContent.length} caracteres`);

    // Criar job
    const { data: job, error: jobError } = await supabaseClient
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'unesp',
        status: 'iniciado',
        total_verbetes: 0, // Será atualizado após pré-processamento
        verbetes_processados: 0,
        verbetes_inseridos: 0,
        erros: 0
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error(`Erro ao criar job: ${jobError?.message}`);
    }

    console.log(`✅ Job criado: ${job.id}`);

    // Processar em background (não esperar)
    processInBackground(job.id, fileContent, supabaseUrl, supabaseKey)
      .catch(err => console.error('Erro no processamento em background:', err));

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: `Importação UNESP iniciada. O arquivo será pré-processado e as entradas válidas serão inseridas.`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
}));
