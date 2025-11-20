import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRetry } from "../_shared/retry.ts";
import { validateGutenbergFile, logValidationResult } from "../_shared/validation.ts";
import { logJobStart, logJobProgress, logJobComplete, logJobError } from "../_shared/logging.ts";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ FASE 1: Configurações otimizadas para parser de blocos
const BATCH_SIZE = 200;
const TIMEOUT_MS = 90000; // 90 segundos
const UPDATE_FREQUENCY = 5; // Atualizar a cada 5 batches

interface VerbeteGutenberg {
  verbete: string;
  verbeteNormalizado: string;
  classeGramatical: string | null;
  genero: string | null;
  definicoes: Array<{
    numero: number;
    texto: string;
    contexto: string | null;
  }>;
  etimologia: string | null;
  origemLingua: string | null;
  sinonimos: string[];
  exemplos: string[];
  arcaico: boolean;
  regional: boolean;
  figurado: boolean;
  popular: boolean;
  entry_type: 'word' | 'mwe';
}

interface ProcessRequest {
  jobId: string;
  fileContent: string;
  offsetInicial?: number;
}

function validateRequest(data: any): ProcessRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { jobId, fileContent, offsetInicial = 0 } = data;
  
  if (!jobId || typeof jobId !== 'string') {
    throw new Error('jobId é obrigatório');
  }
  
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('fileContent deve ser uma string válida');
  }
  
  if (fileContent.length > 20_000_000) {
    throw new Error('fileContent excede tamanho máximo de 20MB');
  }
  
  return { jobId, fileContent, offsetInicial };
}

function normalizeWord(word: string): string {
  return word.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim();
}

/**
 * ✅ FASE 1: NOVO PARSER - Baseado em blocos de texto
 * Formato real do arquivo: Blocos separados por linhas vazias
 */
function parseGutenbergBlock(block: string): VerbeteGutenberg | null {
  try {
    // Dividir o bloco em linhas e remover linhas vazias
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Validação: Precisa de pelo menos verbete e uma linha de definição
    if (lines.length < 2) {
      return null;
    }

    // 1. Verbete: Primeira linha - deve conter o padrão *palavra*,
    const verbeteRaw = lines[0];
    
    // ✅ VALIDAR: Deve conter o padrão *palavra*,
    const asteriskMatch = verbeteRaw.match(/^\*([A-ZÁÀÃÂÉÊÍÓÔÕÚÇÑa-záàãâéêíóôõúçñ\s-]+)\*,?/);
    
    if (!asteriskMatch) {
      // Bloco não tem verbete válido
      return null;
    }
    
    // ✅ EXTRAIR: Remover asteriscos e vírgula
    const verbete = asteriskMatch[1].trim();

    // 2. Corpo da definição: Juntar todas as outras linhas
    const definitionBody = lines.slice(1).join(' ').trim();

    // 3. Tentar extrair classe gramatical (ex: "S.m.", "V.t.", "Adj.")
    let classeGramatical: string | null = null;
    let definitionText = definitionBody;

    // Regex para capturar classe gramatical no início da definição
    const posMatch = definitionBody.match(/^([A-Z][a-z]{0,3}\.(?:\s[a-z]{1,3}\.)?)\s*[-–—]\s*(.+)/);
    
    if (posMatch) {
      classeGramatical = posMatch[1].trim();
      definitionText = posMatch[2].trim();
    }

    // 4. Extrair gênero se presente na classe gramatical
    let genero: string | null = null;
    if (classeGramatical) {
      if (classeGramatical.includes('f.')) genero = 'feminino';
      else if (classeGramatical.includes('m.')) genero = 'masculino';
    }

    // 5. Extrair etimologia se presente
    let etimologia: string | null = null;
    let origemLingua: string | null = null;
    const etimologiaMatch = definitionText.match(/\((Do|Lat\.|Do lat\.|Do gr\.)\s+([^)]+)\)/i);
    if (etimologiaMatch) {
      etimologia = etimologiaMatch[2];
      if (etimologiaMatch[1].toLowerCase().includes('lat')) origemLingua = 'latim';
      else if (etimologiaMatch[1].toLowerCase().includes('gr')) origemLingua = 'grego';
    }

    // 6. Detectar marcadores de uso
    const arcaico = definitionText.includes('Ant.') || definitionText.includes('Antigo');
    const regional = definitionText.includes('Prov.') || definitionText.includes('Provincial') || definitionText.includes('Bras.');
    const figurado = definitionText.includes('Fig.');
    const popular = definitionText.includes('Pop.');

    // 7. Estruturar a definição
    const definicoes = [{
      numero: 1,
      texto: definitionText.substring(0, 1000), // Limite de segurança
      contexto: null
    }];

    // 🔍 DEBUG URGENTE - DETECTAR DEFINIÇÕES VAZIAS
    if (!definitionText || definitionText.trim() === '') {
      console.error(`\n🔴 DEBUG - DEFINIÇÃO VAZIA DETECTADA!`);
      console.error(`   Verbete extraído: "${verbete}"`);
      console.error(`   Bloco original (primeiros 200 chars): "${block.substring(0, 200)}"`);
      console.error(`   Total de linhas no bloco: ${lines.length}`);
      console.error(`   Primeira linha: "${lines[0]}"`);
      if (lines.length > 1) {
        console.error(`   Segunda linha: "${lines[1]}"`);
      }
    }

    // Removido log individual para evitar poluição - logs consolidados no final
    
    const entry_type = verbete.trim().includes(' ') ? 'mwe' : 'word';

    return {
      verbete,
      verbeteNormalizado: normalizeWord(verbete),
      classeGramatical,
      genero,
      definicoes,
      etimologia,
      origemLingua,
      sinonimos: [],
      exemplos: [],
      arcaico,
      regional,
      figurado,
      popular,
      entry_type
    };
  } catch (error) {
    console.error("❌ Erro no parser de bloco:", error);
    return null;
  }
}

/**
 * ✅ FASE 1: Detectar cancelamento de job
 */
async function checkCancellation(jobId: string, supabaseClient: any) {
  const { data: job } = await supabaseClient
    .from('dictionary_import_jobs')
    .select('is_cancelling')
    .eq('id', jobId)
    .single();

  if (job?.is_cancelling) {
    console.log('🛑 Cancelamento detectado! Interrompendo processamento...');
    
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        status: 'cancelado',
        cancelled_at: new Date().toISOString(),
        tempo_fim: new Date().toISOString(),
        erro_mensagem: 'Job cancelado pelo usuário'
      })
      .eq('id', jobId);

    throw new Error('JOB_CANCELLED');
  }
}

async function processInBackground(jobId: string, blocks: string[]) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();
  const totalBlocks = blocks.length;
  
  logJobStart({
    fonte: 'Gutenberg',
    jobId,
    totalEntries: totalBlocks,
    batchSize: BATCH_SIZE,
    timeoutMs: TIMEOUT_MS,
    maxRetries: 3
  });

  await supabase
    .from('dictionary_import_jobs')
    .update({
      status: 'processando',
      total_verbetes: totalBlocks,
      tempo_inicio: new Date().toISOString(),
      metadata: { metodo_parsing: 'blocos_v2' }
    })
    .eq('id', jobId);

  let processados = 0;
  let inseridos = 0;
  let erros = 0;
  let batchCount = 0;
  let blocosInvalidos = 0;
  let definicoesVazias = 0; // ✅ NOVO CONTADOR
  
  // Para estatísticas de parsing detalhadas
  const parsingErrors: { type: string, sample: string }[] = [];

  try {
    for (let i = 0; i < totalBlocks; i += BATCH_SIZE) {
      // Verificar timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log(`[JOB ${jobId}] ⏱️ Timeout. Pausando em ${processados}/${totalBlocks}`);
        await supabase
          .from('dictionary_import_jobs')
          .update({
            status: 'pausado',
            verbetes_processados: processados,
            verbetes_inseridos: inseridos,
            erros: erros,
            metadata: { last_index: i, blocos_invalidos: blocosInvalidos }
          })
          .eq('id', jobId);
        return;
      }

      const batch = blocks.slice(i, Math.min(i + BATCH_SIZE, totalBlocks));
      const parsedBatch: any[] = [];

      for (const block of batch) {
        const parsed = parseGutenbergBlock(block);
        
        if (parsed) {
          // ✅ VERIFICAR SE DEFINIÇÃO ESTÁ VAZIA
          const temDefinicao = parsed.definicoes && 
                              parsed.definicoes.length > 0 && 
                              parsed.definicoes[0].texto && 
                              parsed.definicoes[0].texto.trim() !== '';
          
          if (!temDefinicao) {
            definicoesVazias++;
          }
          
          parsedBatch.push({
            verbete: parsed.verbete,
            verbete_normalizado: parsed.verbeteNormalizado,
            classe_gramatical: parsed.classeGramatical,
            genero: parsed.genero,
            definicoes: parsed.definicoes,
            etimologia: parsed.etimologia,
            origem_lingua: parsed.origemLingua,
            sinonimos: parsed.sinonimos,
            exemplos: parsed.exemplos,
            arcaico: parsed.arcaico,
            regional: parsed.regional,
            figurado: parsed.figurado,
            popular: parsed.popular,
            confianca_extracao: parsed.classeGramatical ? 0.95 : 0.85
          });
        } else {
          erros++;
          blocosInvalidos++;
          
          // Coletar amostragem de erros de parsing (até 5)
          if (parsingErrors.length < 5) {
            parsingErrors.push({
              type: 'parser_falhou',
              sample: block.substring(0, 150)
            });
          }
        }
        
        processados++;
      }

      // Inserir batch se houver dados válidos
      if (parsedBatch.length > 0) {
        await withRetry(async () => {
          const { error: insertError } = await supabase
            .from('gutenberg_lexicon')
            .upsert(parsedBatch, { onConflict: 'verbete_normalizado', ignoreDuplicates: false });

          if (insertError) {
            console.error(`[JOB ${jobId}] ❌ Erro batch ${i}:`, insertError);
            throw insertError;
          }
          
          inseridos += parsedBatch.length;
        }, 3, 2000, 2);
        
        console.log(`[JOB ${jobId}] ✅ Batch de ${parsedBatch.length} verbetes inserido`);
      }

      batchCount++;

      // Atualizar progresso a cada 5 batches
      if (batchCount % UPDATE_FREQUENCY === 0 || processados >= totalBlocks) {
        await checkCancellation(jobId, supabase);
        
        const progressPercent = Math.round((processados / totalBlocks) * 100);
        
        await withRetry(async () => {
          const { error } = await supabase
            .from('dictionary_import_jobs')
            .update({
              verbetes_processados: processados,
              verbetes_inseridos: inseridos,
              erros: erros,
              progresso: progressPercent,
              atualizado_em: new Date().toISOString(),
              metadata: { blocos_invalidos: blocosInvalidos }
            })
            .eq('id', jobId);
          
          if (error) throw error;
        }, 2, 1000, 1);

        logJobProgress({
          jobId,
          processed: processados,
          totalEntries: totalBlocks,
          inserted: inseridos,
          errors: erros,
          startTime
        });
      }
    }

    // Finalização
    const finalStatus = erros > processados * 0.5 ? 'erro' : 'concluido';
    const totalTime = Date.now() - startTime;
    
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: finalStatus,
        verbetes_processados: processados,
        verbetes_inseridos: inseridos,
        erros: erros,
        progresso: 100,
        tempo_fim: new Date().toISOString(),
        metadata: { blocos_invalidos: blocosInvalidos }
      })
      .eq('id', jobId);

    // 📊 LOGS DIAGNÓSTICOS FINAIS - Parsing
    console.log(`\n📊 [Gutenberg] ESTATÍSTICAS DE PARSING:\n` +
      `   - Blocos processados: ${processados}\n` +
      `   - Verbetes inseridos: ${inseridos}\n` +
      `   - Falhas de parsing: ${blocosInvalidos}\n` +
      `   - Definições vazias: ${definicoesVazias}\n` +
      `   - Taxa de sucesso: ${((inseridos / processados) * 100).toFixed(1)}%\n` +
      `   - Taxa de falha: ${((blocosInvalidos / processados) * 100).toFixed(1)}%\n` +
      `   - Taxa de definições vazias: ${((definicoesVazias / processados) * 100).toFixed(1)}%\n`);
    
    if (parsingErrors.length > 0) {
      console.log(`\n📊 [Gutenberg] AMOSTRAGEM DE ERROS DE PARSING (até 5):`);
      parsingErrors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. Tipo: ${err.type}\n      Sample: "${err.sample}..."\n`);
      });
    }
    
    logJobComplete({
      fonte: 'Gutenberg',
      jobId,
      processed: processados,
      totalEntries: totalBlocks,
      inserted: inseridos,
      errors: erros,
      totalTime
    });

  } catch (error: any) {
    console.error(`[JOB ${jobId}] ❌ Erro fatal:`, error);
    
    // Não cancelar se for erro de cancelamento intencional
    if (error.message === 'JOB_CANCELLED') {
      return;
    }
    
    if (error instanceof Error) {
      logJobError({ fonte: 'Gutenberg', jobId, error });
    }
    
    await supabase
      .from('dictionary_import_jobs')
      .update({
        status: 'erro',
        erro_mensagem: error instanceof Error ? error.message : String(error),
        tempo_fim: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

serve(withInstrumentation('process-gutenberg-dictionary', async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await createHealthCheck('process-gutenberg-dictionary', '2.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const rawBody = await req.json();
    const { jobId, fileContent } = validateRequest(rawBody);
    
    console.log(`[process-gutenberg] Iniciando processamento para job ${jobId}`);
    
    // 🔍 DEBUG URGENTE - CONTEÚDO BRUTO DO ARQUIVO
    console.log("\n🔍 DEBUG - Início do arquivo (primeiros 500 chars):");
    console.log("---INÍCIO---");
    console.log(fileContent.substring(0, 500));
    console.log("---FIM DOS 500 CHARS---\n");
    
    // 📊 LOGS DIAGNÓSTICOS - Arquivo Recebido
    const fileStats = {
      tamanho: fileContent.length,
      linhas: fileContent.split('\n').length,
      linhaSeparadora: '\\n\\n (duas quebras consecutivas)'
    };
    
    console.log(`\n📊 [Gutenberg] ARQUIVO RECEBIDO:\n` +
      `   - Tamanho: ${(fileStats.tamanho / 1024 / 1024).toFixed(2)}MB\n` +
      `   - Total de linhas: ${fileStats.linhas.toLocaleString()}\n` +
      `   - Separador de blocos: ${fileStats.linhaSeparadora}\n`);
    
    // ✅ NOVO SPLIT: Usar regex com lookahead para identificar início de verbete
    // Padrão descoberto: Cada verbete começa com *palavra*, (asteriscos + vírgula)
    const verbeteStartRegex = /(?=\n\*[A-ZÁÀÃÂÉÊÍÓÔÕÚÇÑa-záàãâéêíóôõúçñ\s-]+\*,)/;
    
    // Split inicial por esse padrão
    let blocks = fileContent.split(verbeteStartRegex)
      .map(b => b.trim())
      .filter(b => b.length > 0);
    
    // 🔍 DEBUG URGENTE - RESULTADO DO SPLIT
    console.log(`\n🔍 DEBUG - Total de blocos após split: ${blocks.length}`);
    console.log("\n🔍 DEBUG - Primeiros 3 blocos para inspeção:\n");
    blocks.slice(0, 3).forEach((bloco, i) => {
      console.log(`--- BLOCO ${i} (primeiros 150 chars) ---`);
      console.log(bloco.substring(0, 150));
      console.log(`--- FIM BLOCO ${i} ---\n`);
    });
    
    // 📊 LOGS DIAGNÓSTICOS - Split
    console.log(`\n📊 [Gutenberg] SPLIT POR REGEX (asteriscos):\n` +
      `   - Regex pattern: /(?=\\n\\*[A-Z...]+\\*,)/\n` +
      `   - Padrão: Verbetes começam com *palavra*,\n` +
      `   - Blocos detectados: ${blocks.length.toLocaleString()}\n`);
    
    // Filtrar blocos muito pequenos ou muito grandes (rejeitados)
    const MIN_BLOCK_SIZE = 20;   // Verbete + definição mínima
    const MAX_BLOCK_SIZE = 3000; // Evitar junção de múltiplos verbetes
    
    const rejectedBlocks: { reason: string, sample: string, count: number }[] = [];
    let tooShortCount = 0;
    let tooLongCount = 0;
    
    const validBlocks = blocks.filter(block => {
      if (block.length < MIN_BLOCK_SIZE) {
        tooShortCount++;
        if (rejectedBlocks.length < 3) {
          rejectedBlocks.push({
            reason: 'muito curto (< 10 chars)',
            sample: block.substring(0, 100),
            count: 1
          });
        }
        return false;
      }
      
      if (block.length > MAX_BLOCK_SIZE) {
        tooLongCount++;
        if (rejectedBlocks.length < 3) {
          rejectedBlocks.push({
            reason: 'muito longo (> 5000 chars)',
            sample: block.substring(0, 150) + '...',
            count: 1
          });
        }
        return false;
      }
      
      return true;
    });
    
    blocks = validBlocks;
    
    // 📊 LOGS DIAGNÓSTICOS - Rejeição
    console.log(`\n📊 [Gutenberg] REJEIÇÃO DE BLOCOS:\n` +
      `   - Rejeitados muito curtos: ${tooShortCount}\n` +
      `   - Rejeitados muito longos: ${tooLongCount}\n` +
      `   - Total rejeitado: ${tooShortCount + tooLongCount}\n` +
      `   - Blocos válidos aceitos: ${blocks.length.toLocaleString()}\n` +
      `   - Taxa de aceitação: ${((blocks.length / (blocks.length + tooShortCount + tooLongCount)) * 100).toFixed(1)}%\n`);
    
    // 📊 VALIDAÇÃO DE FORMATO: Verificar se blocos têm o padrão de asterisco
    const blocksWithPattern = validBlocks.filter(b => 
      b.match(/^\*[A-ZÁÀÃÂÉÊÍÓÔÕÚÇÑa-záàãâéêíóôõúçñ\s-]+\*,/)
    ).length;
    
    console.log(`\n📊 [Gutenberg] VALIDAÇÃO DE FORMATO:\n` +
      `   - Blocos com padrão *palavra*,: ${blocksWithPattern}\n` +
      `   - Taxa de conformidade: ${((blocksWithPattern / validBlocks.length) * 100).toFixed(1)}%\n`);
    
    // 📊 Amostragem de rejeições
    if (rejectedBlocks.length > 0) {
      console.log(`\n📊 [Gutenberg] AMOSTRAGEM DE REJEIÇÕES (até 3):`);
      rejectedBlocks.forEach((rej, idx) => {
        console.log(`   ${idx + 1}. Razão: ${rej.reason}\n      Sample: "${rej.sample}"\n`);
      });
    }
    
    console.log(`\n[process-gutenberg] ✅ ${blocks.length} blocos válidos para processamento`);

    // Atualizar job com total de blocos
    await supabase
      .from('dictionary_import_jobs')
      .update({
        total_verbetes: blocks.length,
        status: 'iniciado'
      })
      .eq('id', jobId);

    // @ts-ignore - EdgeRuntime é global no Deno Deploy
    EdgeRuntime.waitUntil(processInBackground(jobId, blocks));

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        totalBlocos: blocks.length,
        message: `Processamento iniciado com ${blocks.length} blocos`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[process-gutenberg] ❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}));
