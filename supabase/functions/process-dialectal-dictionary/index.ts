import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeWord(word: string): string {
  return word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function inferCategorias(verbete: string, definicoes: any[], contextos: any): string[] {
  const categorias: Set<string> = new Set();
  const texto = `${verbete} ${JSON.stringify(definicoes)} ${JSON.stringify(contextos)}`.toLowerCase();
  
  if (/\b(cavalo|gado|tropeiro|peão|estância|campeiro|campo|laço)\b/.test(texto)) categorias.add('lida_campeira');
  if (/\b(animal|ave|pássaro|peixe|bicho)\b/.test(texto)) categorias.add('fauna');
  if (/\b(árvore|planta|flor|erva|mato|capim)\b/.test(texto)) categorias.add('flora');
  if (/\b(comida|prato|bebida|churrasco|mate|chimarrão)\b/.test(texto)) categorias.add('gastronomia');
  if (/\b(roupa|vestir|traje|bombacha|lenço|chapéu|poncho)\b/.test(texto)) categorias.add('vestimenta');
  if (/\b(música|dança|cantar|tocar|violão|gaita)\b/.test(texto)) categorias.add('musica_danca');
  if (/\b(lugar|região|pampa|coxilha|arroio|banhado|várzea)\b/.test(texto)) categorias.add('geografia');
  if (/\b(tradição|costume|festa|rodeio|querência|gaúcho)\b/.test(texto)) categorias.add('cultura_tradicoes');
  
  return Array.from(categorias);
}

function parseVerbete(verbeteRaw: string, volumeNum: string): any | null {
  try {
    const headerRegex = /^([A-ZÁÀÃÉÊÍÓÔÚÇ\-\(\)]+)\s+\((BRAS|PLAT|CAST|QUER|BRAS\/PLAT)\s?\)\s+([^-–\n]+?)(?:\s*[-–]\s*|\n)(.+)$/s;
    const match = verbeteRaw.match(headerRegex);
    if (!match) return null;
    
    const [_, verbete, origem, classeGramBruta, restoDefinicao] = match;
    const classeGram = classeGramBruta.replace(/\b(ANT|DES|BRAS|PLAT)\b/g, '').trim();
    const temANT = /\bANT\b/.test(classeGramBruta);
    const temDES = /\bDES\b/.test(classeGramBruta);
    const marcacao_temporal = temANT && temDES ? 'ANT/DES' : (temANT ? 'ANT' : (temDES ? 'DES' : null));
    const freqMatch = restoDefinicao.match(/\[(r\/us|m\/us|n\/d)\]/);
    const definicoesBrutas = restoDefinicao.split('//').map(d => d.trim()).filter(d => d.length > 0);
    const definicoes = definicoesBrutas.map((def, idx) => ({
      texto: def.replace(/\[(r\/us|m\/us|n\/d)\]/g, '').trim(),
      acepcao: idx + 1
    }));
    
    const remissoes: string[] = [];
    const remissoesRegex = /(?:V\.|Cf\.)\s+([A-ZÁÀÃÉÊÍÓÔÚÇ\-]+)/g;
    let remMatch;
    while ((remMatch = remissoesRegex.exec(restoDefinicao)) !== null) remissoes.push(remMatch[1].trim());
    
    const contextos_culturais = { autores_citados: [], regioes_mencionadas: [], notas: [] };
    const categorias = inferCategorias(verbete, definicoes, contextos_culturais);
    
    return {
      verbete: verbete.trim(),
      verbete_normalizado: normalizeWord(verbete),
      origem_primaria: origem,
      classe_gramatical: classeGram || null,
      marcacao_temporal,
      frequencia_uso: freqMatch ? freqMatch[1] : null,
      definicoes,
      remissoes: remissoes.length > 0 ? remissoes : null,
      contextos_culturais,
      categorias_tematicas: categorias.length > 0 ? categorias : null,
      volume_fonte: volumeNum,
      confianca_extracao: 0.8,
      origem_regionalista: origem === 'PLAT' ? ['platino'] : ['brasileiro'],
      influencia_platina: origem === 'PLAT'
    };
  } catch (error) {
    return null;
  }
}

async function processInBackground(jobId: string, verbetes: string[], volumeNum: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log(`[JOB ${jobId}] Iniciando processamento em background de ${verbetes.length} verbetes`);

  await supabase
    .from("dictionary_import_jobs")
    .update({ 
      status: 'processando',
      total_verbetes: verbetes.length 
    })
    .eq('id', jobId);

  let processados = 0, inseridos = 0, erros = 0;
  const batchSize = 50;
  
  for (let i = 0; i < verbetes.length; i += batchSize) {
    const batch = verbetes.slice(i, i + batchSize);
    const verbetesParsed = [];
    
    for (const verbeteRaw of batch) {
      if (!verbeteRaw || verbeteRaw.trim().length < 10) continue;
      const verbete = parseVerbete(verbeteRaw.trim(), volumeNum);
      if (verbete) {
        verbetesParsed.push(verbete);
      } else {
        erros++;
      }
      processados++;
    }

    if (verbetesParsed.length > 0) {
      const { error } = await supabase.from("dialectal_lexicon").insert(verbetesParsed);
      if (error) {
        console.error(`[JOB ${jobId}] Erro no batch ${i}-${i + batchSize}:`, error);
        erros += verbetesParsed.length;
      } else {
        inseridos += verbetesParsed.length;
      }
    }

    // Atualizar progresso a cada batch
    await supabase
      .from("dictionary_import_jobs")
      .update({ 
        verbetes_processados: processados,
        verbetes_inseridos: inseridos,
        erros: erros
      })
      .eq('id', jobId);

    console.log(`[JOB ${jobId}] Progresso: ${processados}/${verbetes.length} (${Math.round(processados/verbetes.length*100)}%)`);
  }

  // Marcar como concluído
  await supabase
    .from("dictionary_import_jobs")
    .update({ 
      status: 'concluido',
      verbetes_processados: processados,
      verbetes_inseridos: inseridos,
      erros: erros
    })
    .eq('id', jobId);

  console.log(`[JOB ${jobId}] Concluído: ${inseridos} inseridos, ${erros} erros`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileContent, volumeNum } = await req.json();
    console.log(`[VOLUME ${volumeNum}] Recebendo ${fileContent.length} caracteres`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const verbetes = fileContent.split(/\n(?=[A-ZÁÀÃÉÊÍÓÔÚÇ\-]{3,}\s+\((BRAS|PLAT|CAST|QUER|BRAS\/PLAT)\))/);
    console.log(`${verbetes.length} verbetes identificados`);

    // Criar job de importação
    const { data: job, error: jobError } = await supabase
      .from("dictionary_import_jobs")
      .insert({
        tipo_dicionario: `dialectal_${volumeNum}`,
        status: 'iniciado',
        total_verbetes: verbetes.length
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error(`Erro ao criar job: ${jobError?.message}`);
    }

    console.log(`[JOB ${job.id}] Criado para Volume ${volumeNum}`);

    // Processar em background (Deno Deploy suporta nativamente background tasks)
    processInBackground(job.id, verbetes, volumeNum).catch(err => 
      console.error(`[JOB ${job.id}] Erro no background:`, err)
    );

    // Retornar resposta imediata
    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: job.id,
        message: `Processamento iniciado em background. ${verbetes.length} verbetes serão processados.`
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
