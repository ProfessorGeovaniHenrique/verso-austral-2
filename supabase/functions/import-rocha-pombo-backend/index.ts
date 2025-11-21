import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Iniciando importação do Dicionário Rocha Pombo (ABL)...');

    // Buscar arquivo do repositório GitHub
    const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/ProfessorGeovaniHenrique/estilisticadecorpus/main/public/Dicionarios/DicionariodeSinonimosdaABL.txt';
    
    console.log(`📥 Buscando arquivo de: ${GITHUB_RAW_URL}`);
    
    const fileResponse = await fetch(GITHUB_RAW_URL);
    
    if (!fileResponse.ok) {
      throw new Error(`Falha ao buscar arquivo: ${fileResponse.status} ${fileResponse.statusText}`);
    }
    
    const fileContent = await fileResponse.text();
    
    console.log(`✅ Arquivo carregado: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`);

    // Criar job de importação
    const { data: job, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'rocha_pombo',
        status: 'iniciado',
        total_verbetes: 0,
        verbetes_processados: 0,
        verbetes_inseridos: 0,
        erros: 0,
        progresso: 0,
        metadata: {
          fonte: 'Academia Brasileira de Letras',
          edicao: '2ª edição (2011)',
          tipo: 'Dicionário de Sinônimos',
          githubUrl: GITHUB_RAW_URL
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Erro ao criar job:', jobError);
      throw jobError;
    }

    console.log(`✅ Job criado: ${job.id}`);

    // Invocar função de processamento
    const { data: processData, error: processError } = await supabase.functions.invoke(
      'process-rocha-pombo-dictionary',
      {
        body: {
          jobId: job.id,
          fileContent,
          batchSize: 1000
        }
      }
    );

    if (processError) {
      console.error('❌ Erro ao processar:', processError);
      
      // Atualizar job com erro
      await supabase
        .from('dictionary_import_jobs')
        .update({
          status: 'erro',
          erro_mensagem: processError.message,
          tempo_fim: new Date().toISOString()
        })
        .eq('id', job.id);
      
      throw processError;
    }

    console.log('✅ Importação do Rocha Pombo iniciada com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'Importação do Dicionário Rocha Pombo iniciada',
        processed: processData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Erro na importação do Rocha Pombo:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
