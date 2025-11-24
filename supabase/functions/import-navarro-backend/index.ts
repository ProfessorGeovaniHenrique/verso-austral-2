import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { createEdgeLogger } from '../_shared/unified-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DictionaryJob {
  id: string;
  tipo_dicionario: string;
  status: string;
  total_verbetes: number;
  verbetes_processados: number;
  verbetes_inseridos: number;
  erros: number;
  progresso: number;
  offset_inicial: number;
  metadata: any;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('import-navarro-backend', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Safe JSON parsing with fallback
    let requestBody: any = {};
    try {
      const text = await req.text();
      if (text && text.trim()) {
        requestBody = JSON.parse(text);
      }
    } catch (parseError) {
      log.warn('Failed to parse request body', { error: parseError });
    }

    const { offset = 0 } = requestBody;

    const tipoDicionario = 'navarro_nordeste_2014';
    const fileUrl = 'https://raw.githubusercontent.com/ProfessorGeovaniHenrique/estilisticadecorpus/main/public/Dicionarios/Dicion%C3%A1rio%20do%20Nordeste%20definitivo.txt';

    log.info('Loading Navarro dictionary from GitHub');

    // Buscar arquivo do GitHub
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Falha ao carregar arquivo do GitHub: ${fileResponse.statusText}`);
    }

    const fileContent = await fileResponse.text();
    log.info('Dictionary file loaded', { sizeKB: (fileContent.length / 1024).toFixed(2) });

    // Verificar se já existe job em andamento
    const { data: existingJobs } = await supabase
      .from('dictionary_import_jobs')
      .select('*')
      .eq('tipo_dicionario', tipoDicionario)
      .in('status', ['iniciado', 'processando'])
      .order('criado_em', { ascending: false })
      .limit(1);

    let job: DictionaryJob;

    if (existingJobs && existingJobs.length > 0) {
      // Retomar job existente
      job = existingJobs[0] as DictionaryJob;
      log.info('Resuming existing job', { jobId: job.id });
    } else {
      // Criar novo job
      const { data: newJob, error: jobError } = await supabase
        .from('dictionary_import_jobs')
        .insert({
          tipo_dicionario: tipoDicionario,
          status: 'iniciado',
          total_verbetes: 0,
          verbetes_processados: 0,
          verbetes_inseridos: 0,
          erros: 0,
          progresso: 0,
          tempo_inicio: new Date().toISOString(),
          offset_inicial: offset,
          metadata: { 
            offset,
            fonte: 'Dicionário do Nordeste',
            autor: 'Fred Navarro',
            ano: 2014,
            githubUrl: fileUrl
          }
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Erro ao criar job: ${jobError.message}`);
      }

      job = newJob as DictionaryJob;
      log.logJobStart(job.id, 0, { tipoDicionario });
    }

    // Chamar a edge function de processamento
    log.info('Invoking process-nordestino-navarro', { jobId: job.id });
    const processResponse = await supabase.functions.invoke('process-nordestino-navarro', {
      body: {
        jobId: job.id,
        fileContent,
        offsetInicial: job.offset_inicial || 0
      }
    });

    if (processResponse.error) {
      log.error('Processing invocation failed', processResponse.error as Error);
      throw new Error(`Erro no processamento: ${processResponse.error.message}`);
    }

    const result = processResponse.data;

    // Buscar job atualizado
    const { data: updatedJob } = await supabase
      .from('dictionary_import_jobs')
      .select('*')
      .eq('id', job.id)
      .single();

    log.logJobComplete(job.id, result.verbetesProcessados || 0, Date.now() - Date.now());

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        processados: result.verbetesProcessados || 0,
        inseridos: result.verbetesInseridos || 0,
        total: result.totalVerbetes || 0,
        complete: result.complete || false,
        job: updatedJob
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    log.fatal('Import failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
