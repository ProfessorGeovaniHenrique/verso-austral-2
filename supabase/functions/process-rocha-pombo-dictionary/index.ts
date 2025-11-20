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
  // Remover numeração inicial (ex: "1. ", "120. ")
  const cleanLine = line
    .replace(/^\d+\.\s*/, '') 
    .trim();

  // Ignorar linhas vazias ou cabeçalhos irrelevantes
  if (!cleanLine || cleanLine.length < 3) return null;
  if (cleanLine.includes('===') || cleanLine.includes('---')) return null;
  if (cleanLine.match(/^(DICIONÁRIO|SINÔNIMOS|VOLUME|PÁGINA)/i)) return null;

  // ✅ NOVA REGEX: 
  // 1. Começa com letra maiúscula ou acentuada
  // 2. Permite letras minúsculas, espaços, hífens e vírgulas no meio
  // 3. Termina com ponto final seguido de espaço
  const match = cleanLine.match(/^([A-ZÁÀÃÂÉÊÍÓÔÕÚÇÑ][a-zA-ZÁÀÃÂÉÊÍÓÔÕÚÇÑáàãâéêíóôõúçñ\s\-,]*?)\.\s+(.+)/);

  if (!match) {
    // LOG DE DEBUG: Ajuda a identificar por que linhas estão sendo rejeitadas
    // (Limitado a 0.1% das linhas para não poluir o log)
    if (Math.random() < 0.001) { 
      console.log(`[Pombo] Linha rejeitada (formato não bateu): ${cleanLine.substring(0, 80)}...`);
    }
    return null;
  }

  const mainWord = match[1].trim();
  const synonymsPart = match[2];

  // Remover numeração dos sinônimos: "1. palavra, 2. palavra" → "palavra, palavra"
  const cleanSynonyms = synonymsPart.replace(/\d+\.\s*/g, '');

  // Dividir sinônimos por vírgula ou ponto e vírgula
  const synonyms = cleanSynonyms
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== mainWord && s !== '.');

  // Validar que temos pelo menos um sinônimo
  if (synonyms.length === 0) return null;

  return {
    palavra: mainWord,
    sinonimos: synonyms,
    contexto: undefined, // Novo formato não tem contexto separado
  };
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
