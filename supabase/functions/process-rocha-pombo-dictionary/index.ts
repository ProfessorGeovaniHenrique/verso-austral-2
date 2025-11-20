import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RochaPomboEntry {
  palavra: string;
  sinonimos: string[];
  contexto?: string;
}

function parseRochaPomboLine(line: string): RochaPomboEntry | null {
  const trimmed = line.trim();
  
  // Ignorar linhas de metadados, cabeçalhos e linhas muito curtas
  if (
    !trimmed || 
    trimmed.length < 10 ||
    /^(\d+:|[A-Z\s]{20,}|Page \d+|ISBN|Catalogação|Biblioteca|Dados Internacionais|CIP-BRASIL|SUMÁRIO|PREFÁCIO)/.test(trimmed)
  ) {
    return null;
  }
  
  // Dividir por " – " para separar sinônimos de explicação
  const parts = trimmed.split(' – ');
  const synPart = parts[0];
  const contexto = parts.slice(1).join(' – ').trim();
  
  // Separar palavra principal dos sinônimos (divididos por vírgula)
  const wordParts = synPart.split(',').map(s => s.trim()).filter(s => s);
  
  if (wordParts.length === 0) return null;
  
  // Primeira palavra é a principal (em maiúsculas)
  const palavra = wordParts[0].toLowerCase();
  
  // Restante são sinônimos
  const sinonimos = wordParts.slice(1)
    .flatMap(s => s.split(';')) // Separar grupos por ";"
    .map(s => s.trim().toLowerCase())
    .filter(s => s && s.length > 1 && /^[a-záàâãéêíóôõúç\s\-]+$/i.test(s));
  
  // Validar entrada
  if (!palavra || sinonimos.length === 0 || !/^[a-záàâãéêíóôõúç\s\-]+$/i.test(palavra)) {
    return null;
  }
  
  return { palavra, sinonimos, contexto: contexto || undefined };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, fileContent, batchSize = 1000 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📖 Processando Dicionário Rocha Pombo - Job: ${jobId}`);

    // Pular metadados (primeiras ~200 linhas)
    const allLines = fileContent.split('\n');
    const lines = allLines.slice(200);
    
    console.log(`📝 Total de linhas: ${allLines.length} (processando ${lines.length} após metadados)`);

    const entries: RochaPomboEntry[] = [];
    let skippedLines = 0;

    for (const line of lines) {
      const entry = parseRochaPomboLine(line);
      if (entry) {
        entries.push(entry);
      } else {
        skippedLines++;
      }
    }

    console.log(`✅ Entradas válidas: ${entries.length}`);
    console.log(`⚠️ Linhas ignoradas: ${skippedLines}`);

    // Atualizar job com total de verbetes
    await supabase
      .from('dictionary_import_jobs')
      .update({
        total_verbetes: entries.length,
        status: 'processando',
        metadata: {
          fonte: 'Academia Brasileira de Letras',
          edicao: '2ª edição (2011)',
          totalLinhas: allLines.length,
          linhasProcessadas: lines.length,
          linhasIgnoradas: skippedLines
        }
      })
      .eq('id', jobId);

    // Processar em lotes
    let processedCount = 0;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      // Inserir no banco
      const insertData = batch.map(entry => ({
        palavra: entry.palavra,
        sinonimos: entry.sinonimos,
        contexto_uso: entry.contexto,
        fonte: 'rocha_pombo',
        pos: null
      }));

      const { data, error } = await supabase
        .from('lexical_synonyms')
        .insert(insertData)
        .select();

      if (error) {
        console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, error);
        errorCount += batch.length;
      } else {
        insertedCount += data?.length || 0;
      }

      processedCount += batch.length;

      // Atualizar progresso
      const progresso = (processedCount / entries.length) * 100;
      
      await supabase
        .from('dictionary_import_jobs')
        .update({
          verbetes_processados: processedCount,
          verbetes_inseridos: insertedCount,
          erros: errorCount,
          progresso: Math.round(progresso)
        })
        .eq('id', jobId);

      console.log(`📊 Progresso: ${progresso.toFixed(1)}% (${processedCount}/${entries.length})`);
    }

    // Finalizar job
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: 'concluido',
        tempo_fim: new Date().toISOString(),
        progresso: 100
      })
      .eq('id', jobId);

    console.log(`✅ Importação concluída!
      - Total: ${entries.length}
      - Inseridos: ${insertedCount}
      - Erros: ${errorCount}
      - Taxa de sucesso: ${((insertedCount / entries.length) * 100).toFixed(1)}%
    `);

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        stats: {
          total: entries.length,
          inserted: insertedCount,
          errors: errorCount,
          skipped: skippedLines,
          successRate: ((insertedCount / entries.length) * 100).toFixed(1)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no processamento:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
