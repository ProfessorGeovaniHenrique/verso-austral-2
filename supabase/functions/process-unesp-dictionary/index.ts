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
    line.match(/^\d+$/) || // Números de página isolados
    line.match(/^[IVXLCDM]+\.?\s/) // Numeração romana (I., II., III., etc)
  ) {
    continue;
  }
  
  // Detectar início de conteúdo real (simplificado para aceitar mais variações)
  if (skipUntilContent && /^[A-Z][a-z]+.*\s+(s\.|adj\.|v\.|adv\.)/i.test(line)) {
    skipUntilContent = false;
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
 * Parser para formato real do Dicionário UNESP
 * 
 * Formatos suportados:
 * 1. "Açafrão s.m. planta da família das iridáceas"
 * 2. "Palavra s.f. definição [exemplo; exemplo2] (Pop.)"
 * 3. "Termo adj. descrição (Fig.)"
 * 4. Entradas multi-linha com definições estendidas
 */
function parseUNESPEntry(text: string): UNESPEntry | null {
  try {
    const trimmed = text.trim();
    if (!trimmed) return null;
    
    // Regex principal: palavra POS definição [exemplos] (registro) - aceita mais variações
    const mainMatch = trimmed.match(/^([A-ZÁÀÃÉÊÍÓÔÚÇ][a-záàãéêíóôúç\-\s]+?)\s+(s\.m\.|s\.f\.|s\.|adj\.|v\.|adv\.|prep\.|conj\.|interj\.)\s+(.+)$/i);
    
    if (!mainMatch) {
      // Fallback: formato simplificado sem marcadores
      const simpleMatch = trimmed.match(/^([A-ZÁÀÃÉÊÍÓÔÚÇ][a-záàãéêíóôúç\-]+)\s+(.{3,})$/);
      if (!simpleMatch) return null;
      
      return {
        palavra: simpleMatch[1].toLowerCase().trim(),
        pos: 'indefinido',
        definicao: simpleMatch[2].trim(),
        exemplos: [],
        registro: ''
      };
    }
    
    const palavra = mainMatch[1].toLowerCase().trim();
    const pos = mainMatch[2].trim();
    const restContent = mainMatch[3].trim();
    
    // Extrair exemplos (entre colchetes)
    const exemplosMatch = restContent.match(/\[([^\]]+)\]/);
    const exemplos = exemplosMatch
      ? exemplosMatch[1].split(';').map(e => e.trim()).filter(e => e.length > 0)
      : [];
    
    // Extrair registro de uso (entre parênteses)
    const registroMatch = restContent.match(/\(([^)]+)\)/);
    const registro = registroMatch ? registroMatch[1].trim() : '';
    
    // Extrair definição (remover exemplos e registro)
    let definicao = restContent
      .replace(/\[([^\]]+)\]/g, '') // Remove exemplos
      .replace(/\(([^)]+)\)/g, '') // Remove registro
      .trim();
    
    // Se definição ficou vazia, usar o conteúdo completo
    if (!definicao) {
      definicao = restContent;
    }
    
    return {
      palavra,
      pos,
      definicao,
      exemplos,
      registro
    };
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
    
    // Dividir em entradas (cada linha que começa com maiúscula + POS)
    const entries = cleanedContent
      .split(/(?=^[A-ZÁÀÃÉÊÍÓÔÚÇ][a-záàãéêíóôúç\-]+\s+(?:s\.m\.|s\.f\.|adj\.|v\.|adv\.))/gm)
      .filter(e => e.trim().length > 0);

    console.log(`📊 [Job ${jobId}] Total de entradas detectadas: ${entries.length}`);

    await supabaseClient
      .from('dictionary_import_jobs')
      .update({ 
        status: 'processando',
        total_verbetes: entries.length
      })
      .eq('id', jobId);

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

        definitionBatches.push({
          palavra: entry.palavra,
          pos: entry.pos,
          definicao: entry.definicao,
          exemplos: entry.exemplos.length > 0 ? entry.exemplos : null,
          registro_uso: entry.registro || null,
          fonte: 'unesp'
        });

      } catch (err) {
        console.error(`❌ [Job ${jobId}] Erro processando entrada ${i}:`, err);
        errors++;
        if (errorLog.length < 10) {
          errorLog.push(`Entrada ${i}: ${err instanceof Error ? err.message : String(err)}`);
        }
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
