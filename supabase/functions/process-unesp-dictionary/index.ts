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

interface UNESPEntry {
  palavra: string;
  pos: string;
  definicao: string;
  exemplos: string[];
  registro: string;
}

function parseUNESPEntry(text: string): UNESPEntry | null {
  try {
    // Formato esperado (simplificado):
    // palavra s.m./s.f./adj./v. definição [exemplo1; exemplo2] (Registro)
    
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;
    
    const firstLine = lines[0];
    
    // Extrair palavra e POS
    const wordPosMatch = firstLine.match(/^(\S+)\s+(s\.m\.|s\.f\.|adj\.|v\.|adv\.|prep\.|conj\.)/i);
    if (!wordPosMatch) return null;
    
    const palavra = wordPosMatch[1].toLowerCase();
    const pos = wordPosMatch[2];
    
    // Extrair definição (depois do POS até exemplos ou fim)
    const definicaoMatch = firstLine.match(/(?:s\.m\.|s\.f\.|adj\.|v\.|adv\.|prep\.|conj\.)\s+(.+?)(?:\[|$)/i);
    const definicao = definicaoMatch ? definicaoMatch[1].trim() : '';
    
    // Extrair exemplos (entre colchetes)
    const exemplosMatch = firstLine.match(/\[([^\]]+)\]/);
    const exemplos = exemplosMatch
      ? exemplosMatch[1].split(';').map(e => e.trim()).filter(e => e.length > 0)
      : [];
    
    // Extrair registro de uso (entre parênteses)
    const registroMatch = firstLine.match(/\(([^)]+)\)/);
    const registro = registroMatch ? registroMatch[1].trim() : '';
    
    return {
      palavra,
      pos,
      definicao,
      exemplos,
      registro
    };
  } catch (error) {
    console.error('Erro ao parsear entrada UNESP:', error);
    return null;
  }
}

async function processInBackground(
  jobId: string,
  entries: string[],
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  const BATCH_SIZE = 1000;
  let processed = 0;
  let errors = 0;
  const errorLog: string[] = [];
  const definitionBatches: any[] = [];

  console.log(`[Job ${jobId}] Processando ${entries.length} entradas do Dicionário UNESP...`);

  try {
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({ status: 'processando' })
      .eq('id', jobId);

    // ✅ OTIMIZAÇÃO #2: Coletar entradas em batches
    for (let i = 0; i < entries.length; i++) {
      const entryText = entries[i];
      
      try {
        const entry = parseUNESPEntry(entryText);
        if (!entry) {
          errors++;
          continue;
        }

        definitionBatches.push({
          palavra: entry.palavra,
          pos: entry.pos,
          definicao: entry.definicao,
          exemplos: entry.exemplos,
          registro_uso: entry.registro || null,
          fonte: 'unesp'
        });

      } catch (err) {
        console.error(`[Job ${jobId}] Erro processando entrada ${i}:`, err);
        errors++;
        errorLog.push(`Entrada ${i}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ✅ OTIMIZAÇÃO #2: Inserir em batches de 1000
    console.log(`[Job ${jobId}] Inserindo ${definitionBatches.length} definições em batches...`);
    
    for (let i = 0; i < definitionBatches.length; i += BATCH_SIZE) {
      const batch = definitionBatches.slice(i, Math.min(i + BATCH_SIZE, definitionBatches.length));
      
      const { error: insertError } = await supabaseClient
        .from('lexical_definitions')
        .insert(batch);

      if (insertError) {
        console.error(`[Job ${jobId}] Erro ao inserir batch:`, insertError);
        errors += batch.length;
        errorLog.push(`Batch ${i}-${i + batch.length}: ${insertError.message}`);
      } else {
        processed += batch.length;
      }

      // Atualizar progresso após cada batch
      const progressPercent = Math.round((processed / definitionBatches.length) * 100);
      await supabaseClient
        .from('dictionary_import_jobs')
        .update({ 
          verbetes_processados: processed,
          verbetes_inseridos: processed,
          erros: errors,
          progresso: progressPercent
        })
        .eq('id', jobId);

      console.log(`[Job ${jobId}] Progresso: ${processed}/${definitionBatches.length} (${progressPercent}%)`);
    }

    console.log(`[Job ${jobId}] Processamento concluído: ${processed} definições, ${errors} erros`);

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

    // Dividir por entradas (assumindo linha dupla como separador)
    const entries = fileContent.split('\n\n').filter((e: string) => e.trim());

    console.log(`Criando job para processar ${entries.length} entradas do UNESP...`);

    // ✅ CORREÇÃO CRÍTICA #1: Criar job ANTES de processar
    const { data: job, error: jobError } = await supabaseClient
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'unesp',
        status: 'iniciado',
        total_verbetes: entries.length,
        verbetes_processados: 0,
        verbetes_inseridos: 0,
        erros: 0,
        metadata: {
          started_at: new Date().toISOString()
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
      processInBackground(job.id, entries, supabaseUrl, supabaseKey)
    );

    // ✅ CORREÇÃO CRÍTICA #1: Retornar jobId IMEDIATAMENTE
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: `Processamento do UNESP iniciado em background. Total: ${entries.length} verbetes.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro no processamento do UNESP:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
