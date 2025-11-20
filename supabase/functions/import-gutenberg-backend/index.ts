import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 1000;
const MAX_ENTRIES_PER_INVOCATION = 5000;

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
    console.error('Erro ao parsear verbete:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Iniciando importação do Gutenberg via backend...');

    // Buscar o arquivo do GitHub (repositório público)
    const fileUrl = 'https://raw.githubusercontent.com/seu-usuario/seu-repo/main/src/data/dictionaries/gutenberg-dictionary.txt';
    console.log(`📥 Carregando arquivo do GitHub: ${fileUrl}`);
    
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Arquivo não encontrado no GitHub: ${fileResponse.status}. Certifique-se de que o arquivo está no repositório público.`);
    }

    const fileContent = await fileResponse.text();
    console.log(`✅ Arquivo carregado: ${fileContent.length} bytes`);

    // Dividir em verbetes
    const verbetes = fileContent.split(/(?=\n\*[A-Za-záàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ\-]+\*,)/);
    console.log(`📚 ${verbetes.length} verbetes encontrados`);

    // Criar ou atualizar job
    const { data: existingJob } = await supabase
      .from('dictionary_import_jobs')
      .select('*')
      .eq('tipo_dicionario', 'gutenberg')
      .in('status', ['processando', 'iniciado'])
      .single();

    let jobId: string;
    let startIndex = 0;

    if (existingJob) {
      jobId = existingJob.id;
      startIndex = existingJob.verbetes_processados || 0;
      console.log(`🔄 Retomando job existente: ${jobId} (offset: ${startIndex})`);
    } else {
      const { data: newJob, error: jobError } = await supabase
        .from('dictionary_import_jobs')
        .insert({
          tipo_dicionario: 'gutenberg',
          status: 'processando',
          total_verbetes: verbetes.length,
          verbetes_processados: 0,
          verbetes_inseridos: 0,
          tempo_inicio: new Date().toISOString()
        })
        .select()
        .single();

      if (jobError) throw jobError;
      jobId = newJob.id;
      console.log(`✨ Novo job criado: ${jobId}`);
    }

    // Processar em lotes
    let processados = startIndex;
    let inseridos = 0;
    const endIndex = Math.min(startIndex + MAX_ENTRIES_PER_INVOCATION, verbetes.length);

    for (let i = startIndex; i < endIndex; i += BATCH_SIZE) {
      const batch = verbetes.slice(i, Math.min(i + BATCH_SIZE, endIndex));
      const parsedBatch = batch
        .map(v => parseGutenbergEntry(v))
        .filter(v => v !== null);

      if (parsedBatch.length > 0) {
        const { error: insertError } = await supabase
          .from('gutenberg_lexicon')
          .insert(parsedBatch);

        if (insertError) {
          console.error(`❌ Erro ao inserir batch ${i}-${i + batch.length}:`, insertError);
        } else {
          inseridos += parsedBatch.length;
        }
      }

      processados = i + batch.length;

      // Atualizar progresso
      await supabase
        .from('dictionary_import_jobs')
        .update({
          verbetes_processados: processados,
          verbetes_inseridos: inseridos,
          progresso: Math.floor((processados / verbetes.length) * 100)
        })
        .eq('id', jobId);

      console.log(`📊 Progresso: ${processados}/${verbetes.length} (${inseridos} inseridos)`);
    }

    // Verificar se completou
    const isComplete = processados >= verbetes.length;

    if (isComplete) {
      await supabase
        .from('dictionary_import_jobs')
        .update({
          status: 'concluido',
          tempo_fim: new Date().toISOString(),
          progresso: 100
        })
        .eq('id', jobId);

      console.log(`✅ Importação completa! Total: ${inseridos} verbetes`);
    } else {
      console.log(`⏸️ Batch processado. Próximo offset: ${processados}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        processados,
        inseridos,
        total: verbetes.length,
        complete: isComplete,
        nextOffset: processados
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
