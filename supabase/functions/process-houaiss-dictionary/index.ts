import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 1000;
const TIMEOUT_MS = 50000;

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

function parseHouaissLine(line: string): HouaissEntry | null {
  try {
    // Formato esperado: palavra « pos » acepcao: descricao : sin1, sin2 > ant1, ant2
    // Exemplo: alegre « adj. » 1 feliz, contente: festivo, jovial > triste, melancólico
    
    const wordMatch = line.match(/^(\S+)\s+«\s*([^»]+)\s*»/);
    if (!wordMatch) return null;
    
    const palavra = wordMatch[1].toLowerCase();
    const pos = wordMatch[2].trim();
    
    // Extrair número da acepção
    const acepcaoMatch = line.match(/»\s*(\d+)\s+([^:]+):/);
    if (!acepcaoMatch) return null;
    
    const acepcao_numero = parseInt(acepcaoMatch[1]);
    const acepcao_descricao = acepcaoMatch[2].trim();
    
    // Extrair sinônimos (antes do ">")
    const sinonimosMatch = line.match(/:\s*([^>]+)/);
    const sinonimos = sinonimosMatch 
      ? sinonimosMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];
    
    // Extrair antônimos (depois do ">")
    const antonimosMatch = line.match(/>\s*(.+)$/);
    const antonimos = antonimosMatch
      ? antonimosMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];
    
    // Detectar contexto de uso (fig., infrm., coloq., etc.)
    const contextoMatch = acepcao_descricao.match(/\b(fig\.|infrm\.|coloq\.|pop\.|fam\.)\b/);
    const contexto = contextoMatch ? contextoMatch[1] : undefined;
    
    return {
      palavra,
      pos,
      acepcao_numero,
      acepcao_descricao,
      sinonimos,
      antonimos,
      contexto
    };
  } catch (error) {
    console.error('Erro ao parsear linha:', line, error);
    return null;
  }
}

async function processInBackground(
  jobId: string,
  lines: string[],
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  const BATCH_SIZE = 1000;
  let processed = 0;
  let errors = 0;
  const errorLog: string[] = [];
  
  // Preparar batches para lexical_synonyms
  const synonymBatches: any[] = [];
  const networkBatches: any[] = [];

  console.log(`[Job ${jobId}] Processando ${lines.length} linhas do Dicionário Houaiss...`);

  try {
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({ status: 'processando' })
      .eq('id', jobId);

    // ✅ OTIMIZAÇÃO #1: Coletar entradas em batches
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      try {
        const entry = parseHouaissLine(line);
        if (!entry) {
          errors++;
          continue;
        }

        // Adicionar ao batch de sinônimos
        synonymBatches.push({
          palavra: entry.palavra,
          pos: entry.pos,
          acepcao_numero: entry.acepcao_numero,
          acepcao_descricao: entry.acepcao_descricao,
          sinonimos: entry.sinonimos,
          antonimos: entry.antonimos,
          contexto_uso: entry.contexto,
          fonte: 'houaiss'
        });

        // Adicionar relações de sinônimos ao batch
        for (const sinonimo of entry.sinonimos) {
          networkBatches.push({
            palavra_origem: entry.palavra,
            palavra_destino: sinonimo.toLowerCase(),
            tipo_relacao: 'sinonimo',
            contexto: entry.acepcao_descricao,
            fonte: 'houaiss'
          });
        }

        // Adicionar relações de antônimos ao batch
        for (const antonimo of entry.antonimos) {
          networkBatches.push({
            palavra_origem: entry.palavra,
            palavra_destino: antonimo.toLowerCase(),
            tipo_relacao: 'antonimo',
            contexto: entry.acepcao_descricao,
            fonte: 'houaiss'
          });
        }

      } catch (err) {
        console.error(`[Job ${jobId}] Erro parseando linha ${i}:`, err);
        errors++;
        errorLog.push(`Linha ${i}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ✅ OTIMIZAÇÃO #1: Inserir em batches de 1000
    console.log(`[Job ${jobId}] Inserindo ${synonymBatches.length} verbetes em batches...`);
    
    for (let i = 0; i < synonymBatches.length; i += BATCH_SIZE) {
      const batch = synonymBatches.slice(i, Math.min(i + BATCH_SIZE, synonymBatches.length));
      
      const { error: insertError } = await supabaseClient
        .from('lexical_synonyms')
        .insert(batch);

      if (insertError) {
        console.error(`[Job ${jobId}] Erro ao inserir batch:`, insertError);
        errors += batch.length;
        errorLog.push(`Batch ${i}-${i + batch.length}: ${insertError.message}`);
      } else {
        processed += batch.length;
      }

      // Atualizar progresso após cada batch
      const progressPercent = Math.round((processed / synonymBatches.length) * 100);
      await supabaseClient
        .from('dictionary_import_jobs')
        .update({ 
          verbetes_processados: processed,
          verbetes_inseridos: processed,
          erros: errors,
          progresso: progressPercent
        })
        .eq('id', jobId);

      console.log(`[Job ${jobId}] Progresso: ${processed}/${synonymBatches.length} (${progressPercent}%)`);
    }

    // ✅ OTIMIZAÇÃO #1: Inserir redes semânticas em batches
    console.log(`[Job ${jobId}] Inserindo ${networkBatches.length} relações semânticas...`);
    
    for (let i = 0; i < networkBatches.length; i += BATCH_SIZE) {
      const batch = networkBatches.slice(i, Math.min(i + BATCH_SIZE, networkBatches.length));
      
      await supabaseClient
        .from('semantic_networks')
        .upsert(batch, {
          onConflict: 'palavra_origem,palavra_destino,tipo_relacao'
        });
    }

    console.log(`[Job ${jobId}] Processamento concluído: ${processed} entradas, ${errors} erros`);

    // Finalizar job
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({ 
        status: 'concluido',
        verbetes_processados: processed,
        verbetes_inseridos: processed,
        erros: errors,
        progresso: 100,
        metadata: { errorLog: errorLog.slice(0, 10) }
      })
      .eq('id', jobId);

  } catch (error) {
    console.error(`[Job ${jobId}] Erro crítico:`, error);
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({ 
        status: 'erro',
        erro_mensagem: error instanceof Error ? error.message : String(error)
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { fileContent } = await req.json();
    
    if (!fileContent) {
      throw new Error('fileContent is required');
    }

    const lines = fileContent.split('\n');
    const totalLines = lines.filter((l: string) => l.trim() && !l.trim().startsWith('#')).length;

    console.log(`Criando job para processar ${totalLines} linhas do Houaiss...`);

    // ✅ CORREÇÃO CRÍTICA #1: Criar job ANTES de processar
    const { data: job, error: jobError } = await supabaseClient
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'houaiss',
        status: 'iniciado',
        total_verbetes: totalLines,
        verbetes_processados: 0,
        verbetes_inseridos: 0,
        erros: 0,
        metadata: {
          started_at: new Date().toISOString(),
          total_lines: lines.length
        }
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Erro ao criar job:', jobError);
      throw new Error('Erro ao criar job de importação');
    }

    console.log(`Job ${job.id} criado. Iniciando processamento em background...`);

    // ✅ CORREÇÃO CRÍTICA #1: Processar em background
    // @ts-ignore
    EdgeRuntime.waitUntil(
      processInBackground(job.id, lines, supabaseUrl, supabaseKey)
    );

    // ✅ CORREÇÃO CRÍTICA #1: Retornar jobId IMEDIATAMENTE
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: `Processamento do Houaiss iniciado em background. Total: ${totalLines} verbetes.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro no processamento do Houaiss:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
