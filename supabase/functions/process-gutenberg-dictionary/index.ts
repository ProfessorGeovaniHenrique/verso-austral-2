import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ IMPROVED: Larger batches for faster processing
const BATCH_SIZE = 5000; // Was 1000, now 5x faster
const TIMEOUT_MS = 180000; // 3 minutes (was 50 seconds)
const MAX_ENTRIES_PER_JOB = 50000; // Process 50k at a time, auto-resume for next batch

interface VerbeteGutenberg {
  verbete: string;
  verbeteNormalizado: string;
  classeGramatical: string | null;
  genero: string | null;
  definicoes: Array<{
    numero: number;
    texto: string;
    contexto: string | null;
  }>;
  etimologia: string | null;
  origemLingua: string | null;
  sinonimos: string[];
  exemplos: string[];
  arcaico: boolean;
  regional: boolean;
  figurado: boolean;
  popular: boolean;
}

interface ProcessRequest {
  fileContent: string;
  batchSize?: number;
  startIndex?: number;
  autoResumeOnCompletion?: boolean; // ✅ NEW: Enable auto-resume for continuous import
}

function validateRequest(data: any): ProcessRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { fileContent, batchSize, startIndex } = data;
  
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('fileContent deve ser uma string válida');
  }
  
  if (fileContent.length > 10000000) {
    throw new Error('fileContent excede tamanho máximo de 10MB');
  }
  
  if (batchSize !== undefined && (typeof batchSize !== 'number' || batchSize < 100 || batchSize > 5000)) {
    throw new Error('batchSize deve estar entre 100 e 5000');
  }
  
  if (startIndex !== undefined && (typeof startIndex !== 'number' || startIndex < 0)) {
    throw new Error('startIndex deve ser >= 0');
  }
  
  return { fileContent, batchSize, startIndex };
}

function normalizeWord(word: string): string {
  return word.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim();
}

function parseGutenbergEntry(entryText: string): VerbeteGutenberg | null {
  try {
    const lines = entryText.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;
    
    const verbeteMatch = lines[0].match(/^\*([A-Za-záàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ\-]+)\*,?/);
    if (!verbeteMatch) return null;
    
    const verbete = verbeteMatch[1];
    
    const classeMatch = lines[1].match(/_([a-z\s\.]+)_/i);
    const classeGramatical = classeMatch ? classeMatch[1].trim() : null;
    
    let genero: string | null = null;
    if (classeGramatical) {
      if (classeGramatical.includes('f.')) genero = 'feminino';
      else if (classeGramatical.includes('m.')) genero = 'masculino';
    }
    
    let defTexto = '';
    for (let i = 2; i < lines.length && i < 10; i++) {
      if (lines[i].startsWith('(Do ') || lines[i].startsWith('(Lat.')) break;
      defTexto += lines[i] + ' ';
    }
    
    const definicoes = [{
      numero: 1,
      texto: defTexto.trim().substring(0, 500),
      contexto: null
    }];
    
    let etimologia: string | null = null;
    let origemLingua: string | null = null;
    const etimologiaMatch = entryText.match(/\((Do|Lat\.|Do lat\.|Do gr\.)\s+([^)]+)\)/i);
    if (etimologiaMatch) {
      etimologia = etimologiaMatch[2];
      if (etimologiaMatch[1].includes('lat')) origemLingua = 'latim';
      else if (etimologiaMatch[1].includes('gr')) origemLingua = 'grego';
    }
    
    const arcaico = entryText.includes('Ant.') || entryText.includes('Antigo');
    const regional = entryText.includes('Prov.') || entryText.includes('Provincial') || entryText.includes('Bras.');
    const figurado = entryText.includes('Fig.');
    const popular = entryText.includes('Pop.');
    
    return {
      verbete,
      verbeteNormalizado: normalizeWord(verbete),
      classeGramatical,
      genero,
      definicoes,
      etimologia,
      origemLingua,
      sinonimos: [],
      exemplos: [],
      arcaico,
      regional,
      figurado,
      popular
    };
  } catch (error) {
    return null;
  }
}

async function processInBackground(jobId: string, verbetes: string[]) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();
  console.log(`[JOB ${jobId}] Iniciando processamento Gutenberg: ${verbetes.length} verbetes`);

  await supabase
    .from('dictionary_import_jobs')
    .update({
      status: 'processando',
      total_verbetes: verbetes.length,
      tempo_inicio: new Date().toISOString()
    })
    .eq('id', jobId);

  let processados = 0;
  let inseridos = 0;
  let erros = 0;
  const errorLog: string[] = [];

  try {
    for (let i = 0; i < verbetes.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log(`[JOB ${jobId}] Timeout. Pausando em ${processados}/${verbetes.length}`);
        await supabase
          .from('dictionary_import_jobs')
          .update({
            status: 'pausado',
            verbetes_processados: processados,
            verbetes_inseridos: inseridos,
            erros: erros,
            metadata: { last_index: i }
          })
          .eq('id', jobId);
        return;
      }

      const batch = verbetes.slice(i, Math.min(i + BATCH_SIZE, verbetes.length));
      const parsedBatch = batch
        .map(v => parseGutenbergEntry(v))
        .filter(v => v !== null)
        .map(v => ({
          verbete: v!.verbete,
          verbete_normalizado: v!.verbeteNormalizado,
          classe_gramatical: v!.classeGramatical,
          genero: v!.genero,
          definicoes: v!.definicoes,
          etimologia: v!.etimologia,
          origem_lingua: v!.origemLingua,
          sinonimos: v!.sinonimos,
          exemplos: v!.exemplos,
          arcaico: v!.arcaico,
          regional: v!.regional,
          figurado: v!.figurado,
          popular: v!.popular,
          confianca_extracao: 0.85
        }));

      if (parsedBatch.length > 0) {
        const { data, error: insertError } = await supabase
          .from('gutenberg_lexicon')
          .insert(parsedBatch)
          .select();

        if (insertError) {
          console.error(`[JOB ${jobId}] Erro batch ${i}:`, insertError);
          erros += batch.length;
          errorLog.push(`Batch ${i}: ${insertError.message}`);
        } else {
          inseridos += data?.length || 0;
        }
      }

      processados += batch.length;

      if (processados % 500 === 0) {
        await supabase
          .from('dictionary_import_jobs')
          .update({
            verbetes_processados: processados,
            verbetes_inseridos: inseridos,
            erros: erros
          })
          .eq('id', jobId);

        console.log(`[JOB ${jobId}] ${processados}/${verbetes.length}`);
      }
    }

    const finalStatus = erros > processados * 0.5 ? 'erro' : 'concluido';
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: finalStatus,
        verbetes_processados: processados,
        verbetes_inseridos: inseridos,
        erros: erros,
        tempo_fim: new Date().toISOString(),
        metadata: { errorLog: errorLog.slice(0, 50) }
      })
      .eq('id', jobId);

    console.log(`[JOB ${jobId}] Concluído: ${inseridos}/${processados}`);

  } catch (error) {
    console.error(`[JOB ${jobId}] Erro fatal:`, error);
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: 'erro',
        erro_mensagem: error instanceof Error ? error.message : String(error),
        tempo_fim: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const rawBody = await req.json();
    const { fileContent } = validateRequest(rawBody);
    
    const verbetes = fileContent.split(/(?=\n\*[A-Za-záàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ\-]+\*,)/);
    
    console.log(`[process-gutenberg] ${verbetes.length} verbetes encontrados`);

    const { data: job, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'gutenberg',
        status: 'pendente',
        total_verbetes: verbetes.length
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Erro ao criar job: ' + (jobError?.message || 'Job não retornado'));
    }

    // @ts-ignore
    EdgeRuntime.waitUntil(processInBackground(job.id, verbetes));

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        totalVerbetes: verbetes.length,
        message: `Processamento iniciado. Job ID: ${job.id}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[process-gutenberg] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
