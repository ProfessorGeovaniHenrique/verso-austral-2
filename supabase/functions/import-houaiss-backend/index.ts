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

/**
 * ✅ FASE 2: Validação e Pré-processamento
 * Detecta e remove ruído antes do processamento
 */
function isNoiseOrMetadata(line: string): boolean {
  const trimmed = line.trim();
  
  // Linhas vazias ou muito curtas
  if (!trimmed || trimmed.length < 3) return true;
  
  // Metadados de página
  if (/^Page \d+$/i.test(trimmed)) return true;
  
  // Separadores
  if (/^={10,}$/.test(trimmed)) return true;
  
  // Linhas que são só números ou pontuação
  if (/^[\d\s.,;:]+$/.test(trimmed)) return true;
  
  // Cabeçalhos conhecidos do Houaiss
  const headers = [
    'Sumário', 'Chave de uso', 'Prefácio', 'Introdução',
    'Abreviações', 'Notice', 'Created with', 'The text on',
    'This book was', 'Internet Archive', 'HOUAISS', 'PUBLIFOLHA',
    'Equipe Editorial', 'DinproREs', 'francisco'
  ];
  if (headers.some(h => trimmed.toLowerCase().includes(h.toLowerCase()))) return true;
  
  return false;
}

function preprocessHouaissFile(content: string): string {
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    // Ignorar ruído conhecido
    if (isNoiseOrMetadata(line)) continue;
    
    // Normalizar espaços múltiplos
    const normalized = line.trim().replace(/\s+/g, ' ');
    
    if (normalized) {
      cleanedLines.push(normalized);
    }
  }
  
  const removedCount = lines.length - cleanedLines.length;
  const removedPercentage = ((removedCount / lines.length) * 100).toFixed(1);
  
  console.log(`🧹 Pré-processamento Houaiss:
    - Linhas originais: ${lines.length.toLocaleString()}
    - Linhas limpas: ${cleanedLines.length.toLocaleString()}
    - Removido: ${removedCount.toLocaleString()} (${removedPercentage}%)
  `);
  
  return cleanedLines.join('\n');
}

function analyzeFileQuality(content: string): void {
  const lines = content.split('\n');
  const sampleSize = Math.min(1000, lines.length);
  const sample = lines.slice(0, sampleSize);

  let validEntries = 0;
  let noisyLines = 0;

  for (const line of sample) {
    if (isNoiseOrMetadata(line)) {
      noisyLines++;
    } else if (line.match(/^[a-zàáâãèéêìíòóôõùúçñ\-]+\s*=?\s*«/i)) {
      validEntries++;
    }
  }

  const noisePercentage = (noisyLines / sampleSize) * 100;
  const validPercentage = (validEntries / sampleSize) * 100;

  console.log(`📊 Análise de qualidade do arquivo Houaiss:
    - Amostra analisada: ${sampleSize} linhas
    - Ruído detectado: ${noisePercentage.toFixed(1)}%
    - Entradas válidas: ${validPercentage.toFixed(1)}%
    - Tamanho: ${(content.length / 1024 / 1024).toFixed(2)} MB
  `);

  if (validPercentage < 20) {
    console.warn(`⚠️ Arquivo com baixa qualidade (${validPercentage.toFixed(1)}% válido)`);
  }
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

    const tipoDicionario = 'houaiss';
    const fileUrl = 'https://raw.githubusercontent.com/ProfessorGeovaniHenrique/estilisticadecorpus/main/src/data/dictionaries/houaiss-sinonimos.txt';

    console.log(`📥 Carregando dicionário Houaiss do GitHub...`);

    // Buscar arquivo do GitHub
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Falha ao carregar arquivo do GitHub: ${fileResponse.statusText}`);
    }

    const rawFileContent = await fileResponse.text();
    console.log(`✅ Arquivo Houaiss carregado: ${(rawFileContent.length / 1024).toFixed(2)} KB`);

    // ✅ FASE 2: Analisar qualidade e pré-processar
    analyzeFileQuality(rawFileContent);
    const fileContent = preprocessHouaissFile(rawFileContent);

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
          metadata: { offset }
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Erro ao criar job: ${jobError.message}`);
      }

      job = newJob as DictionaryJob;
      console.log(`✅ Novo job criado: ${job.id}`);
    }

    // Chamar a edge function de processamento com arquivo pré-processado
    console.log(`🔄 Chamando process-houaiss-dictionary com arquivo limpo...`);
    const processResponse = await supabase.functions.invoke('process-houaiss-dictionary', {
      body: {
        jobId: job.id,
        fileContent,
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

    console.log(`✅ Importação Houaiss concluída`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
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
    console.error('❌ Erro na importação do dicionário Houaiss:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
