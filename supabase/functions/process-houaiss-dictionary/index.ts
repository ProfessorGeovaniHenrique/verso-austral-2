import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRetry } from "../_shared/retry.ts";
import { validateHouaissFile, logValidationResult } from "../_shared/validation.ts";
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
  
  if (fileContent.length > 10000000) {
    throw new Error('fileContent excede tamanho máximo de 10MB');
  }
  
  return { fileContent };
}

interface HouaissEntry {
  palavra: string;
  pos: string;
  acepcao_numero: number;
  acepcao_descricao: string;
  sinonimos: string[];
  antonimos: string[];
  contexto?: string;
}

/**
 * Parser para formato real do Dicionário Houaiss
 * 
 * Formatos suportados:
 * 1. "aarônico = «lj. (s.m1.) ver MONTANHÊS"
 * 2. "aba « s,/. 1 adjacência: arrabalde, arredor, cercania > afastamento, distância"
 * 3. "palavra « adj. definição: sinônimo1, sinônimo2 > antônimo1"
 * 4. "palavra « pos » acepcao: descricao : sin1, sin2 > ant1, ant2"
 */
function parseHouaissLine(line: string): HouaissEntry | null {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;
    
    // Formato 1: palavra = « ou palavra «
    const wordMatch = trimmed.match(/^(\S+)\s*=?\s*«\s*([^»]+)(?:»|$)/);
    if (!wordMatch) {
      console.log(`⚠️ Linha não corresponde ao formato esperado: ${trimmed.substring(0, 100)}`);
      return null;
    }
    
    const palavra = wordMatch[1].toLowerCase().trim();
    const posRaw = wordMatch[2].trim();
    
    // Extrair POS (remover parênteses e detalhes)
    // Exemplos: "lj. (s.m1.)" -> "lj.", "s,/." -> "s.f.", "adj." -> "adj."
    const posClean = posRaw
      .replace(/\([^)]*\)/g, '') // Remove parênteses
      .replace(/[,\/]/g, '.') // Normaliza separadores
      .trim();
    
    const pos = posClean || posRaw.substring(0, 10);
    
    // Extrair resto da linha (depois do POS)
    const restMatch = trimmed.match(/»\s*(.+)$/);
    const restContent = restMatch ? restMatch[1].trim() : '';
    
    // Se não há conteúdo após POS, retornar entrada básica
    if (!restContent) {
      return {
        palavra,
        pos,
        acepcao_numero: 1,
        acepcao_descricao: posRaw,
        sinonimos: [],
        antonimos: []
      };
    }
    
    // Extrair número de acepção (opcional)
    const acepcaoNumMatch = restContent.match(/^(\d+)\s+/);
    const acepcao_numero = acepcaoNumMatch ? parseInt(acepcaoNumMatch[1]) : 1;
    
    // Remover número de acepção do conteúdo
    const contentWithoutNum = acepcaoNumMatch 
      ? restContent.substring(acepcaoNumMatch[0].length)
      : restContent;
    
    // Dividir em partes: definição : sinônimos > antônimos
    const parts = contentWithoutNum.split(/[>:]/);
    
    let acepcao_descricao = '';
    let sinonimos: string[] = [];
    let antonimos: string[] = [];
    
    if (parts.length === 1) {
      // Apenas definição
      acepcao_descricao = parts[0].trim();
    } else if (parts.length === 2) {
      // Definição + sinônimos OU definição + antônimos
      acepcao_descricao = parts[0].trim();
      const secondPart = parts[1].trim();
      
      // Se tem ">", é antônimo; se tem ":", é sinônimo
      if (contentWithoutNum.includes('>')) {
        antonimos = secondPart.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else {
        sinonimos = secondPart.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    } else if (parts.length >= 3) {
      // Definição : sinônimos > antônimos
      acepcao_descricao = parts[0].trim();
      sinonimos = parts[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
      antonimos = parts[2].split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    
    // Detectar contexto de uso
    const contextoMatch = acepcao_descricao.match(/\b(fig\.|infrm\.|coloq\.|pop\.|fam\.|ver\s+\w+)\b/i);
    const contexto = contextoMatch ? contextoMatch[1] : undefined;
    
    return {
      palavra,
      pos,
      acepcao_numero,
      acepcao_descricao: acepcao_descricao || posRaw,
      sinonimos,
      antonimos,
      contexto
    };
  } catch (error) {
    console.error('❌ Erro ao parsear linha Houaiss:', line.substring(0, 150), error);
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
  lines: string[],
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  const errorLog: string[] = [];
  
  const synonymBatches: any[] = [];
  const networkBatches: any[] = [];

  console.log(`📚 [Job ${jobId}] Processando ${lines.length} linhas do Houaiss...`);

  try {
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({ status: 'processando' })
      .eq('id', jobId);

    // Processar linhas e coletar em batches
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      try {
        const entry = parseHouaissLine(line);
        if (!entry) {
          errors++;
          if (errors <= 10) {
            errorLog.push(`Linha ${i}: Falha no parse`);
          }
          continue;
        }

        processed++;

        // Adicionar ao batch de sinônimos
        synonymBatches.push({
          palavra: entry.palavra,
          pos: entry.pos,
          acepcao_numero: entry.acepcao_numero,
          acepcao_descricao: entry.acepcao_descricao,
          sinonimos: entry.sinonimos.length > 0 ? entry.sinonimos : null,
          antonimos: entry.antonimos.length > 0 ? entry.antonimos : null,
          contexto_uso: entry.contexto || null,
          fonte: 'houaiss'
        });

        // Criar redes semânticas (sinônimos)
        for (const sinonimo of entry.sinonimos) {
          networkBatches.push({
            palavra_origem: entry.palavra,
            palavra_destino: sinonimo.toLowerCase(),
            tipo_relacao: 'sinonimo',
            peso_relacao: 1.0,
            fonte: 'houaiss',
            contexto: entry.acepcao_descricao
          });
        }

        // Criar redes semânticas (antônimos)
        for (const antonimo of entry.antonimos) {
          networkBatches.push({
            palavra_origem: entry.palavra,
            palavra_destino: antonimo.toLowerCase(),
            tipo_relacao: 'antonimo',
            peso_relacao: 1.0,
            fonte: 'houaiss',
            contexto: entry.acepcao_descricao
          });
        }

      } catch (err) {
        console.error(`❌ [Job ${jobId}] Erro processando linha ${i}:`, err);
        errors++;
        if (errorLog.length < 10) {
          errorLog.push(`Linha ${i}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Inserir batch quando atingir tamanho
      if (synonymBatches.length >= BATCH_SIZE) {
        // ✅ FASE 3 - BLOCO 1: Verificar cancelamento antes de inserir batch
        await checkCancellation(jobId, supabaseClient);
        
        console.log(`💾 Inserindo batch de ${synonymBatches.length} sinônimos...`);
        
        const insertResult = await withRetry(async () => {
          const { error } = await supabaseClient
            .from('lexical_synonyms')
            .insert(synonymBatches);
          
          if (error) throw error;
          return { success: true };
        }, 3, 2000);
        
        inserted += synonymBatches.length;
        synonymBatches.length = 0;

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

    // Inserir batch final de sinônimos
    if (synonymBatches.length > 0) {
      console.log(`💾 Inserindo batch final de ${synonymBatches.length} sinônimos...`);
      
      await withRetry(async () => {
        const { error } = await supabaseClient
          .from('lexical_synonyms')
          .insert(synonymBatches);
        
        if (error) throw error;
      }, 3, 2000);
      
      inserted += synonymBatches.length;
      synonymBatches.length = 0;
    }

    // Inserir redes semânticas em batches
    console.log(`🕸️ Inserindo ${networkBatches.length} relações de rede semântica...`);
    for (let i = 0; i < networkBatches.length; i += BATCH_SIZE) {
      const batch = networkBatches.slice(i, i + BATCH_SIZE);
      
      await withRetry(async () => {
        const { error } = await supabaseClient
          .from('semantic_networks')
          .upsert(batch, { 
            onConflict: 'palavra_origem,palavra_destino,tipo_relacao',
            ignoreDuplicates: false 
          });
        
        if (error) throw error;
      }, 3, 2000);
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

serve(withInstrumentation('process-houaiss-dictionary', async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await createHealthCheck('process-houaiss-dictionary', '1.0.0');
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

    console.log('📥 Recebendo requisição para processar Dicionário Houaiss...');

    const json = await req.json();
    const { fileContent } = validateRequest(json);

    // ✅ FASE 3 - BLOCO 2: Validação pré-importação
    const validation = validateHouaissFile(fileContent);
    logValidationResult('Houaiss', validation);
    
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

    const lines = fileContent
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));

    console.log(`📊 Total de linhas válidas: ${lines.length}`);

    // Criar job
    const { data: job, error: jobError } = await supabaseClient
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'houaiss',
        status: 'iniciado',
        total_verbetes: lines.length,
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
    processInBackground(job.id, lines, supabaseUrl, supabaseKey)
      .catch(err => console.error('Erro no processamento em background:', err));

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: `Importação Houaiss iniciada. ${lines.length} linhas serão processadas.`
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
