import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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
      console.warn('⚠️ Failed to parse request body, using defaults:', parseError);
    }

    const { offset = 0 } = requestBody;

    // Arquivo unificado - gaucho.txt contém todos os verbetes
    const GAUCHO_URL = 'https://raw.githubusercontent.com/ProfessorGeovaniHenrique/estilisticadecorpus/main/public/Dicionarios/gaucho.txt';
    const tipoDicionario = 'gaucho_unificado';

    console.log('📥 Carregando dicionário Gaúcho Unificado do GitHub...');

    // Buscar arquivo do GitHub
    const fileResponse = await fetch(GAUCHO_URL);
    if (!fileResponse.ok) {
      throw new Error(`Falha ao carregar arquivo do GitHub: ${fileResponse.statusText}`);
    }

    const fileContent = await fileResponse.text();
    console.log(`✅ Arquivo Gaúcho Unificado carregado com sucesso: ${(fileContent.length / 1024).toFixed(2)} KB`);

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
      console.log(`🔄 Retomando job existente: ${job.id}`);
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
            fonte: 'Dicionário Gaúcho Unificado (Vol I + Vol II)',
            indice_linha: 6226 
          }
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Erro ao criar job: ${jobError.message}`);
      }

      job = newJob as DictionaryJob;
      console.log(`✅ Novo job criado: ${job.id}`);
    }

    // Chamar a edge function de processamento
    console.log(`🔄 Chamando process-dialectal-dictionary...`);
    const processResponse = await supabase.functions.invoke('process-dialectal-dictionary', {
      body: {
        jobId: job.id,
        fileContent,
        volumeNum: 'I',
        tipoDicionario: 'gaucho_unificado', // ✅ Identificador único do dicionário
        offset: job.offset_inicial || 0
      }
    });

    if (processResponse.error) {
      throw new Error(`Erro no processamento: ${processResponse.error.message}`);
    }

    const result = processResponse.data;

    // Buscar job atualizado
    const { data: updatedJob } = await supabase
      .from('dictionary_import_jobs')
      .select('*')
      .eq('id', job.id)
      .single();

    console.log('✅ Importação concluída - Dicionário Gaúcho Unificado');

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        tipoDicionario: 'gaucho_unificado',
        processados: result.processados || 0,
        inseridos: result.inseridos || 0,
        total: result.total || 0,
        complete: result.complete || false,
        nextOffset: result.nextOffset || 0,
        job: updatedJob
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Erro na importação do dicionário Dialectal:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
