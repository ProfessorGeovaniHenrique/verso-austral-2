import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 500; // ✅ FASE 3: Otimizado de 200 para 500 (priorizar velocidade)
const UPDATE_FREQUENCY = 10; // Atualizar progresso a cada 10 batches
const TIMEOUT_MS = 90000; // ✅ FASE 3: Padronizado para 90s

interface ProcessRequest {
  fileContent: string;
  volumeNum: string;
  offsetInicial?: number; // ✅ NOVO: Suporte a retomada
}

function validateRequest(data: any): ProcessRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { fileContent, volumeNum, offsetInicial = 0 } = data;
  
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('fileContent deve ser uma string válida');
  }
  
  if (fileContent.length > 10000000) {
    throw new Error('fileContent excede tamanho máximo de 10MB');
  }
  
  if (!volumeNum || !['I', 'II'].includes(volumeNum)) {
    throw new Error('volumeNum deve ser "I" ou "II"');
  }
  
  return { fileContent, volumeNum, offsetInicial };
}

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

/**
 * ✅ FASE 2: Parser melhorado com regex mais robusto
 * Suporta múltiplas variações de formato do Dialectal Volume II
 */
function parseVerbete(verbeteRaw: string, volumeNum: string): any | null {
  try {
    // Limpar espaços extras e normalizar separadores
    const cleanText = verbeteRaw.trim().replace(/\s+/g, ' ').replace(/[-–—]/g, '-');
    
    // ✅ FASE 2: Regex principal melhorado para aceitar mais variações
    // Formato: PALAVRA (ORIGEM) POS MARCADORES - Definição
    const headerRegex = /^([A-ZÁÀÃÉÊÍÓÔÚÇ\-\(\)\s]+?)\s+\((BRAS|PLAT|CAST|QUER|BRAS\/PLAT|PORT)\s?\)\s+([^-]+?)(?:\s+-\s+|\n)(.+)$/s;
    const match = cleanText.match(headerRegex);
    
    if (!match) {
      // ✅ FASE 2: Fallback 1 - Formato mais simples sem marcadores
      const simpleRegex = /^([A-ZÁÀÃÉÊÍÓÔÚÇ\-\(\)\s]+?)\s+\((BRAS|PLAT|CAST|QUER|PORT)\s?\)\s+(.+)$/s;
      const simpleMatch = cleanText.match(simpleRegex);
      
      if (simpleMatch) {
        const [_, verbete, origem, restoConteudo] = simpleMatch;
        
        // Tentar extrair POS do resto do conteúdo
        const posMatch = restoConteudo.match(/^(S\.m\.|S\.f\.|Adj\.|V\.|Adv\.|Tr\.dir\.|Int\.)\s+(.+)$/i);
        const pos = posMatch ? posMatch[1] : null;
        const definicao = posMatch ? posMatch[2] : restoConteudo;
        
        return {
          verbete: verbete.trim(),
          verbete_normalizado: normalizeWord(verbete),
          origem_primaria: origem.replace(/\s/g, ''),
          classe_gramatical: pos,
          marcacao_temporal: null,
          frequencia_uso: null,
          definicoes: [{ texto: definicao.trim(), acepcao: 1 }],
          remissoes: [],
          contextos_culturais: {},
          categorias_tematicas: [],
          volume_fonte: volumeNum,
          pagina_fonte: null,
          confianca_extracao: 0.75,
          validado_humanamente: false,
          variantes: [],
          sinonimos: [],
          termos_espanhol: [],
          influencia_platina: origem === 'PLAT',
          origem_regionalista: [origem]
        };
      }
      
      // ✅ FASE 2: Fallback 2 - Formato ainda mais simples (última tentativa)
      console.log(`⚠️ Tentando último fallback para: ${verbeteRaw.substring(0, 80)}...`);
      
      const lastResortRegex = /^([A-ZÁÀÃÉÊÍÓÔÚÇ][A-ZÁÀÃÉÊÍÓÔÚÇ\-\(\)\s]+?)\s+(.+)$/s;
      const lastMatch = cleanText.match(lastResortRegex);
      
      if (lastMatch) {
        const [_, verbete, conteudo] = lastMatch;
        
        return {
          verbete: verbete.trim(),
          verbete_normalizado: normalizeWord(verbete),
          origem_primaria: 'BRAS',
          classe_gramatical: null,
          marcacao_temporal: null,
          frequencia_uso: null,
          definicoes: [{ texto: conteudo.trim(), acepcao: 1 }],
          remissoes: [],
          contextos_culturais: {},
          categorias_tematicas: [],
          volume_fonte: volumeNum,
          pagina_fonte: null,
          confianca_extracao: 0.60,
          validado_humanamente: false,
          variantes: [],
          sinonimos: [],
          termos_espanhol: [],
          influencia_platina: false,
          origem_regionalista: ['BRAS']
        };
      }
      
      console.error(`❌ Parse falhou completamente para: ${verbeteRaw.substring(0, 100)}`);
      return null;
    }
    
    // Parse com match bem-sucedido
    const [_, verbete, origem, classeGramBruta, restoDefinicao] = match;
    const classeGram = classeGramBruta.replace(/\b(ANT|DES|BRAS|PLAT)\b/g, '').trim();
    const temANT = /\bANT\b/.test(classeGramBruta);
    const temDES = /\bDES\b/.test(classeGramBruta);
    const marcacao_temporal = temANT && temDES ? 'ANT/DES' : (temANT ? 'ANT' : (temDES ? 'DES' : null));
    const freqMatch = restoDefinicao.match(/\[(r\/us|m\/us|n\/d)\]/);
    const definicoesBrutas = restoDefinicao.split('//').map((d: string) => d.trim()).filter((d: string) => d.length > 0);
    const definicoes = definicoesBrutas.map((def: string, idx: number) => ({
      texto: def.replace(/\[(r\/us|m\/us|n\/d)\]/g, '').trim(),
      acepcao: idx + 1
    }));
    
    const remissoes: string[] = [];
    const remissoesRegex = /(?:V\.|Cf\.)\s+([A-ZÁÀÃÉÊÍÓÔÚÇ\-]+)/g;
    let remMatch;
    while ((remMatch = remissoesRegex.exec(restoDefinicao)) !== null) remissoes.push(remMatch[1].trim());
    
    const contextos_culturais = { autores_citados: [], regioes_mencionadas: [], notas: [] };
    const categorias = inferCategorias(verbete, definicoes, contextos_culturais);
    
    const result = {
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
      pagina_fonte: null,
      confianca_extracao: 0.95,
      validado_humanamente: false,
      variantes: [],
      sinonimos: [],
      termos_espanhol: [],
      influencia_platina: origem === 'PLAT'|| origem === 'BRAS/PLAT',
      origem_regionalista: [origem]
    };
    
    console.log(`✅ Verbete parseado: ${result.verbete} (Volume ${volumeNum})`);
    return result;
    
  } catch (error: any) {
    console.error(`❌ Erro crítico ao parsear verbete: ${error.message}`);
    return null;
  }
}

async function processInBackground(jobId: string, verbetes: string[], volumeNum: string, offsetInicial: number) {
  const MAX_PROCESSING_TIME = 30 * 60 * 1000;
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: 30 minutos excedidos')), MAX_PROCESSING_TIME)
  );

  try {
    await Promise.race([
      processVerbetesInternal(jobId, verbetes, volumeNum, offsetInicial),
      timeoutPromise
    ]);
  } catch (error: any) {
    console.error(`[JOB ${jobId}] Erro fatal:`, error);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
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

async function processVerbetesInternal(jobId: string, verbetes: string[], volumeNum: string, offsetInicial: number) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let processados = offsetInicial;
  let inseridos = 0;
  let erros = 0;
  let batchCount = 0;

  console.log(`[JOB ${jobId}] Iniciando processamento de ${verbetes.length} verbetes (offset: ${offsetInicial})`);

  for (let i = offsetInicial; i < verbetes.length; i += BATCH_SIZE) {
    const batch = verbetes.slice(i, i + BATCH_SIZE);
    const parsedBatch: any[] = [];

    for (const verbeteRaw of batch) {
      const parsed = parseVerbete(verbeteRaw, volumeNum);
      if (!parsed) {
        erros++;
        console.error(`❌ Parse falhou para verbete: ${verbeteRaw.substring(0, 100)}`);
        
        // ✅ Log failed entry for debugging
        try {
          await supabase.from('dictionary_import_jobs').insert({
            tipo_dicionario: `dialectal-volume-${volumeNum}-FAILED`,
            status: 'erro',
            erro_mensagem: `Parse failed: ${verbeteRaw.substring(0, 200)}`,
            metadata: { original_verbete: verbeteRaw }
          });
        } catch (logError) {
          console.error('Failed to log error:', logError);
        }
        continue;
      }
      
      // ✅ VALIDATION: Double-check volume_fonte
      if (!parsed.volume_fonte) {
        console.error(`⚠️ CRITICAL: volume_fonte missing, setting to ${volumeNum}`);
        parsed.volume_fonte = volumeNum;
      }
      
      parsedBatch.push(parsed);
    }

    if (parsedBatch.length > 0) {
      const { error: insertError } = await supabase
        .from('dialectal_lexicon')
        .upsert(parsedBatch, { onConflict: 'verbete_normalizado,origem_primaria', ignoreDuplicates: true });

      if (insertError) {
        console.error(`[JOB ${jobId}] Erro ao inserir batch:`, insertError);
        erros += parsedBatch.length;
      } else {
        inseridos += parsedBatch.length;
      }
    }

    processados += batch.length;
    batchCount++;

    // ✅ OTIMIZADO: Atualizar progresso a cada UPDATE_FREQUENCY batches (reduz 90% dos updates)
    if (batchCount % UPDATE_FREQUENCY === 0 || processados >= verbetes.length) {
      await supabase
        .from('dictionary_import_jobs')
        .update({
          verbetes_processados: processados,
          verbetes_inseridos: inseridos,
          erros: erros,
          progresso: Math.round((processados / verbetes.length) * 100 * 100) / 100
        })
        .eq('id', jobId);

      console.log(`[JOB ${jobId}] Progresso: ${processados}/${verbetes.length} (${Math.round((processados / verbetes.length) * 100)}%)`);
    }
  }

  await supabase
    .from('dictionary_import_jobs')
    .update({
      status: 'concluido',
      verbetes_processados: processados,
      verbetes_inseridos: inseridos,
      erros: erros,
      progresso: 100,
      tempo_fim: new Date().toISOString()
    })
    .eq('id', jobId);

  console.log(`[JOB ${jobId}] Concluído: ${inseridos} inseridos, ${erros} erros`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const { fileContent, volumeNum, offsetInicial = 0 } = validateRequest(rawBody);

    console.log(`[VOLUME ${volumeNum}] Recebendo ${fileContent.length} caracteres (offset: ${offsetInicial})`);

    const verbetes = fileContent
      .split(/\n{2,}/)
      .map(v => v.trim())
      .filter(v => v.length > 10);

    console.log(`${verbetes.length} verbetes identificados`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: jobData, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: `dialectal_${volumeNum}`,
        status: 'iniciado',
        total_verbetes: verbetes.length,
        verbetes_processados: offsetInicial,
        offset_inicial: offsetInicial,
        tempo_inicio: new Date().toISOString(),
        metadata: { volume: volumeNum, offset: offsetInicial }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    console.log(`[JOB ${jobData.id}] Criado para Volume ${volumeNum}`);

    processInBackground(jobData.id, verbetes, volumeNum, offsetInicial);

    return new Response(
      JSON.stringify({ 
        jobId: jobData.id, 
        message: 'Processamento iniciado em background',
        totalVerbetes: verbetes.length,
        offsetInicial
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
