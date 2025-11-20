import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  fileContent?: string;
  offsetInicial?: number;
}

interface ParsedEntry {
  verbete: string;
  verbete_normalizado: string;
  classe_gramatical: string | null;
  origem_regionalista: string[];
  variantes: string[];
  definicoes: string[];
  volume_fonte: string;
  confianca_extracao: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { fileContent, offsetInicial = 0 }: ProcessRequest = await req.json();
    
    console.log(`📚 Iniciando importação do Dicionário do Nordeste (Navarro 2014) - offset: ${offsetInicial}`);

    // Criar job de importação
    const { data: job, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'navarro_nordeste_2014',
        status: 'iniciado',
        offset_inicial: offsetInicial,
        metadata: {
          fonte: 'Dicionário do Nordeste - Fred Navarro - 2014 (Limpo)',
          url_github: 'https://github.com/ProfessorGeovaniHenrique/estilisticadecorpus/blob/main/public/dictionaries/NAVARROCLEAN.txt'
        }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    const jobId = job.id;
    console.log(`✅ Job criado: ${jobId}`);

    // Usar conteúdo do body ou buscar do GitHub
    let content: string;
    if (fileContent) {
      console.log('📄 Usando conteúdo fornecido no body');
      content = fileContent;
    } else {
      console.log('📥 Buscando arquivo limpo do GitHub...');
      const githubUrl = 'https://raw.githubusercontent.com/ProfessorGeovaniHenrique/estilisticadecorpus/main/public/dictionaries/NAVARROCLEAN.txt';
      const response = await fetch(githubUrl);
      if (!response.ok) throw new Error(`Erro ao buscar arquivo: ${response.statusText}`);
      content = await response.text();
    }
    
    const lines = content.split('\n').filter(line => line.trim());
    console.log(`📊 Total de linhas processadas: ${lines.length}`);

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

// Função simplificada - arquivo já está limpo de metadados
function isValidVerbete(verbete: string): boolean {
  // Apenas validações essenciais
  if (verbete.length === 0 || verbete.length > 50) {
    return false;
  }
  
  return true;
}

function parseNordestinoEntry(line: string): ParsedEntry | null {
  // Split por bullet point
  const parts = line.split('•').map(p => p.trim()).filter(p => p);
  
  if (parts.length < 2) return null;
  
  const verbete = parts[0].trim();
  
  // Validar se é um verbete real
  if (!isValidVerbete(verbete)) {
    return null;
  }
  
  // Extrair TODAS as acepções
  const acepcoes = extractAcepcoes(parts.slice(1));
  
  if (acepcoes.length === 0) return null;
  
  // Consolidar todas as acepções em um único registro
  const allClasses = [...new Set(acepcoes.map(a => a.pos))].join(' / ');
  const allRegioes = [...new Set(acepcoes.flatMap(a => a.regioes))];
  const allVariantes = [...new Set(acepcoes.flatMap(a => a.variantes))];
  const allDefinicoes = acepcoes.flatMap(a => a.definicoes);
  
  return {
    verbete,
    verbete_normalizado: verbete.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    classe_gramatical: allClasses,
    origem_regionalista: allRegioes,
    variantes: allVariantes,
    definicoes: allDefinicoes,
    volume_fonte: 'Navarro 2014',
    confianca_extracao: 0.92
  };
}

function extractAcepcoes(parts: string[]): Array<{pos: string, regioes: string[], variantes: string[], definicoes: string[]}> {
  const acepcoes: Array<{pos: string, regioes: string[], variantes: string[], definicoes: string[]}> = [];
  let currentContent = '';
  
  for (const part of parts) {
    // Detectar início de nova acepção numerada (1 •, 2 •, etc)
    const match = part.match(/^(\d+)\s+(.+)/);
    if (match) {
      if (currentContent) {
        acepcoes.push(parseAcepcao(currentContent));
      }
      currentContent = match[2];
    } else {
      currentContent += (currentContent ? ' • ' : '') + part;
    }
  }
  
  // Adicionar última acepção ou única
  if (currentContent) {
    acepcoes.push(parseAcepcao(currentContent));
  }
  
  // Se não há acepções, tratar todo conteúdo como única acepção
  if (acepcoes.length === 0) {
    acepcoes.push(parseAcepcao(parts.join(' • ')));
  }
  
  return acepcoes;
}

function parseAcepcao(content: string): {pos: string, regioes: string[], variantes: string[], definicoes: string[]} {
  const posPatterns = ['s.m.', 's.f.', 's.2g.', 'v.t.d.', 'v.t.i.', 'v.int.', 'v.pron.', 'adj.', 'adv.', 'loc.', 'fraseol.'];
  let pos: string | null = null;
  const regioes: string[] = [];
  const variantes: string[] = [];
  const definicoes: string[] = [];
  
  const parts = content.split('•').map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    // Detectar POS
    if (!pos && posPatterns.some(p => part.toLowerCase().includes(p))) {
      pos = part;
      continue;
    }
    
    // Detectar região (códigos de estado: ba, ce, pe, etc. ou n.e.)
    if (part.match(/^[a-z]{2}$/i)) {
      regioes.push(part.toUpperCase());
      continue;
    }
    
    if (part.toLowerCase() === 'n.e.') {
      regioes.push('NORDESTE');
      continue;
    }
    
    // Detectar variantes (entre parênteses ou var.)
    if (part.includes('(') || part.toLowerCase().includes('var.')) {
      variantes.push(part);
      continue;
    }
    
    // Resto é definição
    definicoes.push(part);
  }
  
  // Se não encontrou região, assumir NORDESTE
  if (regioes.length === 0) {
    regioes.push('NORDESTE');
  }
  
  return {
    pos: pos || 's.m.',
    regioes,
    variantes,
    definicoes
  };
}

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

    const verbetes: any[] = [];

    for (let i = offsetInicial; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Validação básica - arquivo já está limpo
      if (!line || !line.includes('•')) continue;

      try {
        const parsedEntry = parseNordestinoEntry(line);
        if (parsedEntry) {
          verbetes.push(parsedEntry);
        }
      } catch (parseError) {
        console.error(`Erro ao parsear linha ${i}:`, line, parseError);
        erros++;
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
