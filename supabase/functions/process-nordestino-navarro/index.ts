import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  offsetInicial?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { offsetInicial = 0 }: ProcessRequest = await req.json();
    
    console.log(`📚 Iniciando importação do Dicionário do Nordeste (Navarro 2014) - offset: ${offsetInicial}`);

    // Criar job de importação
    const { data: job, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'nordestino_navarro',
        status: 'iniciado',
        offset_inicial: offsetInicial,
        metadata: {
          fonte: 'Dicionário do Nordeste - Fred Navarro - 2014',
          url_github: 'https://github.com/your-repo/corpus/nordestino_navarro_2014.txt'
        }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    const jobId = job.id;
    console.log(`✅ Job criado: ${jobId}`);

    // Buscar arquivo do GitHub
    const githubUrl = 'https://raw.githubusercontent.com/your-repo/main/public/corpus/nordestino_navarro_2014.txt';
    console.log(`📥 Buscando arquivo: ${githubUrl}`);
    
    const response = await fetch(githubUrl);
    if (!response.ok) throw new Error(`Erro ao buscar arquivo: ${response.statusText}`);
    
    const content = await response.text();
    const lines = content.split('\n');
    
    console.log(`📊 Total de linhas: ${lines.length}`);

    // Processar em background
    processInBackground(supabase, jobId, lines, offsetInicial);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        message: 'Importação iniciada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processInBackground(supabase: any, jobId: string, lines: string[], offsetInicial: number) {
  const BATCH_SIZE = 100;
  let processados = offsetInicial;
  let inseridos = 0;
  let erros = 0;

  try {
    await supabase
      .from('dictionary_import_jobs')
      .update({ 
        status: 'processando',
        tempo_inicio: new Date().toISOString()
      })
      .eq('id', jobId);

    // Parse verbetes
    const verbetes: any[] = [];
    let currentEntry: any = null;
    let inDefinition = false;
    let definitionText = '';

    for (let i = offsetInicial; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Ignorar linhas vazias e metadados iniciais
      if (!line || line.startsWith('TÍTULO:') || line.startsWith('AUTOR:') || 
          line.startsWith('====') || line.startsWith('Créditos') ||
          line.match(/^\d+:$/)) {
        continue;
      }

      // Remove número da linha se existir
      const cleanLine = line.replace(/^\d+:\s*/, '');
      
      // Nova entrada - linha com bullet points (•)
      if (cleanLine.includes('•')) {
        // Salvar entrada anterior
        if (currentEntry && definitionText) {
          currentEntry.definicoes = [definitionText.trim()];
          verbetes.push(currentEntry);
        }

        // Parse nova entrada
        const parts = cleanLine.split('•').map(p => p.trim()).filter(p => p);
        
        if (parts.length >= 2) {
          const verbete = parts[0];
          const classeParts = parts.slice(1);
          
          // Extrair classe gramatical
          const posPatterns = ['s.m.', 's.f.', 's.2g.', 'v.t.d.', 'v.t.i.', 'v.int.', 'v.pron.', 'adj.', 'adv.', 'loc.', 'fraseol.'];
          let classe = null;
          let regiao = null;
          
          for (const part of classeParts) {
            if (posPatterns.some(p => part.includes(p))) {
              classe = part;
            } else if (part.match(/^[a-z]{2}$/)) {
              // Códigos de estado: ba, ce, pe, etc.
              regiao = part.toUpperCase();
            } else if (part === 'n.e.') {
              regiao = 'NORDESTE';
            }
          }

          currentEntry = {
            verbete,
            verbete_normalizado: verbete.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
            classe_gramatical: classe,
            origem_regionalista: regiao ? [regiao] : ['NORDESTE'],
            volume_fonte: 'Navarro 2014',
            confianca_extracao: 0.95
          };

          // Iniciar captura de definição
          definitionText = parts.slice(2).join(' ');
          inDefinition = true;
        }
      } else if (inDefinition && currentEntry) {
        // Continuar capturando definição
        definitionText += ' ' + cleanLine;
      }

      // Processar em lotes
      if (verbetes.length >= BATCH_SIZE) {
        const { error: insertError } = await supabase
          .from('dialectal_lexicon')
          .upsert(verbetes, { 
            onConflict: 'verbete_normalizado',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.error('Erro ao inserir lote:', insertError);
          erros += verbetes.length;
        } else {
          inseridos += verbetes.length;
        }

        processados = i + 1;
        const progresso = (processados / lines.length) * 100;

        await supabase
          .from('dictionary_import_jobs')
          .update({
            total_verbetes: lines.length,
            verbetes_processados: processados,
            verbetes_inseridos: inseridos,
            erros,
            progresso,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', jobId);

        verbetes.length = 0;
      }
    }

    // Processar últimos verbetes
    if (verbetes.length > 0) {
      const { error: insertError } = await supabase
        .from('dialectal_lexicon')
        .upsert(verbetes, { 
          onConflict: 'verbete_normalizado',
          ignoreDuplicates: false 
        });

      if (!insertError) {
        inseridos += verbetes.length;
      } else {
        erros += verbetes.length;
      }
    }

    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: 'concluido',
        tempo_fim: new Date().toISOString(),
        total_verbetes: lines.length,
        verbetes_processados: lines.length,
        verbetes_inseridos: inseridos,
        erros,
        progresso: 100,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ Importação concluída: ${inseridos} verbetes inseridos, ${erros} erros`);

  } catch (error: any) {
    console.error('❌ Erro no processamento:', error);
    
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: 'erro',
        erro_mensagem: error.message,
        tempo_fim: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}
