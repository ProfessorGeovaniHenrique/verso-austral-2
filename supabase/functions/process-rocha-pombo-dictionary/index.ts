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
  
  // Ignorar linhas vazias ou muito curtas
  if (!trimmed || trimmed.length < 5) return null;
  
  // Ignorar separadores e cabeçalhos
  if (trimmed.match(/^[=\-_]{3,}$/)) return null;
  if (trimmed.match(/^(DICIONÁRIO|SINÔNIMOS|VOLUME|PÁGINA|Figura|Tabela)/i)) return null;
  
  // Ignorar linhas que começam com minúscula ou caracteres especiais (definições/explicações)
  if (trimmed.match(/^[a-z\(\)\[\]\{\}\d\.\,\;\:\-]/)) return null;
  
  // Formato esperado: "PALAVRA PRINCIPAL, sinônimo1, sinônimo2, ..."
  // Deve começar com letra maiúscula
  if (!trimmed.match(/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/)) return null;
  
  // Encontrar primeira vírgula que separa palavra principal dos sinônimos
  const firstCommaIndex = trimmed.indexOf(',');
  if (firstCommaIndex === -1) return null;
  
  // Extrair palavra principal
  let mainWord = trimmed.substring(0, firstCommaIndex).trim();
  
  // Limpar caracteres especiais da palavra principal
  mainWord = mainWord
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, '') // Remover sobrescritos
    .replace(/[\(\)\[\]\{\}]/g, '') // Remover parênteses/colchetes
    .replace(/\s+/g, ' ') // Normalizar espaços
    .trim();
  
  if (!mainWord || mainWord.length < 2) return null;
  
  // Extrair parte dos sinônimos
  const synonymsPart = trimmed.substring(firstCommaIndex + 1).trim();
  if (!synonymsPart) return null;
  
  // Dividir sinônimos por vírgula ou ponto e vírgula
  const synonyms = synonymsPart
    .split(/[,;]/)
    .map(s => {
      // Limpar cada sinônimo
      return s
        .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, '')
        .replace(/[\(\)\[\]\{\}]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\.$/, '') // Remover ponto final
        .trim();
    })
    .filter(s => {
      // Filtrar sinônimos válidos
      if (s.length < 2) return false;
      if (s === mainWord) return false;
      if (s.match(/^[\d\.\,\;\:\-\s]+$/)) return false; // Apenas números/pontuação
      return true;
    });
  
  // Validar que temos pelo menos um sinônimo válido
  if (synonyms.length === 0) return null;
  
  return {
    palavra: mainWord,
    sinonimos: synonyms.slice(0, 20), // Limitar a 20 sinônimos por entrada
    contexto: undefined,
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

    // 🔥 DEBUG: LOG DO CONTEÚDO BRUTO (primeiras 200 chars)
    console.log("🔍 PRIMEIRAS 200 CHARS DO ARQUIVO:");
    console.log(fileContent.substring(0, 200));
    console.log("---");

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
      const insertData = batch.map(entry => {
        const entry_type = entry.palavra.trim().includes(' ') ? 'mwe' : 'word';
        return {
          palavra: entry.palavra,
          sinonimos: entry.sinonimos,
          contexto_uso: entry.contexto,
          fonte: 'rocha_pombo',
          pos: null,
          entry_type
        };
      });

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
