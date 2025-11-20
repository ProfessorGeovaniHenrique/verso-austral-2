import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { withRetry } from '../_shared/retry.ts';
import { Timeouts } from '../_shared/timeout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 1000;
const TIMEOUT_MS = Timeouts.DICTIONARY_IMPORT; // 20 minutos

interface VerbeteGutenberg {
  verbete: string;
  verbete_normalizado: string;
  classe_gramatical: string | null;
  definicoes: any;
  sinonimos: string[] | null;
  antonimos: string[] | null;
  exemplos: string[] | null;
  expressoes: string[] | null;
  etimologia: string | null;
  derivados: string[] | null;
  genero: string | null;
  areas_conhecimento: string[] | null;
  origem_lingua: string | null;
  regional: boolean;
  popular: boolean;
  figurado: boolean;
  arcaico: boolean;
  confianca_extracao: number;
  validado: boolean;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseGutenbergEntry(entryText: string): VerbeteGutenberg | null {
  try {
    const lines = entryText.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;

    const headerLine = lines[0];
    const verbeteMatch = headerLine.match(/\*([A-Za-záàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ\-]+)\*/);
    if (!verbeteMatch) return null;

    const verbete = verbeteMatch[1].trim();
    const verbeteNormalizado = normalizeText(verbete);

    const classeMatch = headerLine.match(/,\s*([smfadv\.]\.?)/i);
    const classeGramatical = classeMatch ? classeMatch[1].toLowerCase() : null;

    const definicoes: any[] = [];
    const sinonimos: string[] = [];
    const exemplos: string[] = [];
    let etimologia: string | null = null;
    let genero: string | null = null;
    let figurado = false;
    let popular = false;
    let regional = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.match(/^\d+\./)) {
        const defText = line.replace(/^\d+\.\s*/, '');
        if (defText) {
          definicoes.push({ sentido: defText });
          if (line.toLowerCase().includes('fig.')) figurado = true;
          if (line.toLowerCase().includes('pop.')) popular = true;
          if (line.toLowerCase().includes('bras.') || line.toLowerCase().includes('reg.')) regional = true;
        }
      }

      if (line.toLowerCase().startsWith('sin.') || line.toLowerCase().startsWith('sinôn')) {
        const sinTexto = line.split(/sin[ôo]?n?[iy]?m[oa]?s?\.?\s*/i)[1];
        if (sinTexto) {
          sinonimos.push(...sinTexto.split(/[,;]/).map(s => s.trim()).filter(Boolean));
        }
      }

      if (line.startsWith('"') || line.startsWith('Ex.:')) {
        exemplos.push(line.replace(/^(Ex\.:?\s*|")/, '').replace(/"$/, ''));
      }

      if (line.toLowerCase().startsWith('etim') || line.toLowerCase().includes('do lat') || line.toLowerCase().includes('do gr')) {
        etimologia = line;
      }

      if (classeGramatical === 's.' || classeGramatical === 'sm.' || classeGramatical === 'sf.') {
        if (classeGramatical === 'sm.') genero = 'm';
        else if (classeGramatical === 'sf.') genero = 'f';
      }
    }

    return {
      verbete,
      verbete_normalizado: verbeteNormalizado,
      classe_gramatical: classeGramatical,
      definicoes: definicoes.length > 0 ? definicoes : null,
      sinonimos: sinonimos.length > 0 ? sinonimos : null,
      antonimos: null,
      exemplos: exemplos.length > 0 ? exemplos : null,
      expressoes: null,
      etimologia,
      derivados: null,
      genero,
      areas_conhecimento: null,
      origem_lingua: null,
      regional,
      popular,
      figurado,
      arcaico: false,
      confianca_extracao: 0.75,
      validado: false
    };
  } catch (error) {
    console.error('Erro ao processar verbete:', error);
    return null;
  }
}

async function checkCancellation(jobId: string, supabaseClient: any) {
  const { data: job } = await supabaseClient
    .from('dictionary_import_jobs')
    .select('is_cancelling')
    .eq('id', jobId)
    .single();

  if (job?.is_cancelling) {
    console.log('🛑 Cancelamento detectado!');
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        status: 'cancelado',
        cancelled_at: new Date().toISOString(),
        tempo_fim: new Date().toISOString()
      })
      .eq('id', jobId);
    throw new Error('JOB_CANCELLED');
  }
}

async function processInBackground(jobId: string, verbetes: string[]) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();
  let processados = 0;
  let inseridos = 0;

  console.log(`🚀 Iniciando processamento em background: ${verbetes.length} verbetes`);

  await supabase
    .from('dictionary_import_jobs')
    .update({ 
      status: 'processando', 
      total_verbetes: verbetes.length,
      tempo_inicio: new Date().toISOString()
    })
    .eq('id', jobId);

  try {
    for (let i = 0; i < verbetes.length; i += BATCH_SIZE) {
      // Verificar timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log('⏱️ Timeout atingido, pausando job...');
        await supabase
          .from('dictionary_import_jobs')
          .update({
            status: 'pausado',
            verbetes_processados: processados,
            metadata: { last_index: i, message: 'Pausado por timeout' }
          })
          .eq('id', jobId);
        return;
      }

      // Verificar cancelamento
      await checkCancellation(jobId, supabase);

      const batch = verbetes.slice(i, Math.min(i + BATCH_SIZE, verbetes.length));
      const parsedBatch = batch
        .map(v => parseGutenbergEntry(v))
        .filter((v): v is VerbeteGutenberg => v !== null);

      if (parsedBatch.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase
            .from('gutenberg_lexicon')
            .insert(parsedBatch);
          if (error) throw error;
        });
        inseridos += parsedBatch.length;
      }

      processados = i + batch.length;

      // Atualizar progresso a cada batch
      await supabase
        .from('dictionary_import_jobs')
        .update({
          verbetes_processados: processados,
          verbetes_inseridos: inseridos
        })
        .eq('id', jobId);

      console.log(`📊 Progresso: ${processados}/${verbetes.length} (${inseridos} inseridos)`);
    }

    // Marcar como concluído
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: 'concluido',
        tempo_fim: new Date().toISOString(),
        progresso: 100
      })
      .eq('id', jobId);

    console.log(`✅ Importação completa! ${inseridos} verbetes inseridos`);

  } catch (error: any) {
    if (error.message === 'JOB_CANCELLED') {
      console.log('✅ Job cancelado gracefully');
      return;
    }

    console.error('❌ Erro no processamento:', error);
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: 'erro',
        erro_mensagem: error.message,
        tempo_fim: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('📥 Iniciando importação do Gutenberg Dictionary...');

    // Fetch o arquivo do GitHub
    const gutenbergUrl = 'https://raw.githubusercontent.com/ProfessorGeovaniHenrique/estilisticadecorpus/main/public/dictionaries/gutenberg-completo.txt';
    console.log('🌐 Baixando dicionário de:', gutenbergUrl);

    const response = await fetch(gutenbergUrl);
    if (!response.ok) {
      throw new Error(`Erro ao baixar dicionário: ${response.status}`);
    }

    const fileContent = await response.text();
    console.log('✅ Arquivo baixado com sucesso');

    // Split verbetes
    const verbetes = fileContent
      .split(/\n\n+/)
      .map(v => v.trim())
      .filter(v => v && v.startsWith('*'));

    console.log(`📚 Total de verbetes encontrados: ${verbetes.length}`);

    if (verbetes.length === 0) {
      throw new Error('Nenhum verbete válido encontrado no arquivo');
    }

    // Criar job
    const { data: job, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'gutenberg',
        status: 'iniciado',
        total_verbetes: verbetes.length,
        offset_inicial: 0
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('❌ Erro ao criar job:', jobError);
      throw new Error('Erro ao criar job de importação');
    }

    console.log(`✅ Job criado: ${job.id}`);

    // Processar em background usando EdgeRuntime.waitUntil()
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(processInBackground(job.id, verbetes));

    // Retornar resposta imediata
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        totalVerbetes: verbetes.length,
        message: 'Processamento iniciado em background'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
