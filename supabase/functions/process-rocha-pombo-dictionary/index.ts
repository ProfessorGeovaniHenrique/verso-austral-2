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

function parseRochaPomboEntry(text: string): RochaPomboEntry | null {
  const trimmed = text.trim();
  
  // Validar que começa com maiúscula (verbetes começam com caixa alta)
  if (!trimmed.match(/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/)) return null;
  
  // Encontrar o separador ". –" (ponto + espaço + travessão)
  // Tudo antes disso é: PALAVRA, sinônimos
  // Tudo depois é: explicação (ignorar)
  const separatorMatch = trimmed.match(/\.\s+[–—-]\s+/);
  
  let entryPart: string;
  if (separatorMatch) {
    // Extrair apenas a parte antes da explicação
    entryPart = trimmed.substring(0, separatorMatch.index);
  } else {
    // Se não tem separador, usar tudo (mas pode não ser verbete válido)
    entryPart = trimmed;
  }
  
  // Encontrar primeira vírgula (separa palavra principal dos sinônimos)
  const firstCommaIndex = entryPart.indexOf(',');
  if (firstCommaIndex === -1) return null;
  
  // Extrair palavra principal
  const mainWord = entryPart.substring(0, firstCommaIndex).trim();
  if (!mainWord || mainWord.length < 2) return null;
  
  // Extrair sinônimos (tudo depois da primeira vírgula)
  const synonymsPart = entryPart.substring(firstCommaIndex + 1).trim();
  if (!synonymsPart) return null;
  
  // Dividir sinônimos por vírgula e ponto e vírgula
  const synonyms = synonymsPart
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length >= 2 && s !== mainWord);
  
  if (synonyms.length === 0) return null;
  
  return {
    palavra: mainWord,
    sinonimos: synonyms.slice(0, 20), // Limitar a 20
    contexto: undefined
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

    // Dividir por linhas em branco (cada bloco é um verbete completo)
    const verbetes = fileContent
      .split(/\n\s*\n/) // Dividir por linha em branco
      .map((v: string) => v.trim())
      .filter((v: string) => v.length > 0);

    console.log(`📝 Total de verbetes detectados: ${verbetes.length}`);

    const entries: RochaPomboEntry[] = [];
    let skippedEntries = 0;

    for (const verbete of verbetes) {
      const entry = parseRochaPomboEntry(verbete);
      if (entry) {
        entries.push(entry);
      } else {
        skippedEntries++;
      }
    }

    console.log(`✅ Entradas válidas: ${entries.length}`);
    console.log(`⚠️ Verbetes ignorados: ${skippedEntries}`);

    // Atualizar job com total de verbetes
    await supabase
      .from('dictionary_import_jobs')
      .update({
        total_verbetes: entries.length,
        status: 'processando',
        metadata: {
          fonte: 'Academia Brasileira de Letras',
          edicao: '2ª edição (2011)',
          tipo: 'Dicionário de Sinônimos',
          totalVerbetes: verbetes.length,
          verbetesValidos: entries.length,
          verbetesIgnorados: skippedEntries
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
          skipped: skippedEntries,
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
