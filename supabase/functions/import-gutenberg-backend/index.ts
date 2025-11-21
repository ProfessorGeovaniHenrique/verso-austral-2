// 🔥 DEPLOY TIMESTAMP: 2025-01-20T20:00:00Z - v6.0: Radical Simplification (No AI, No Complex Regex)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { withRetry } from '../_shared/retry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUNK_SIZE = 5000;
const MAX_RETRIES = 3;
const DICTIONARY_URLS = [
  'https://raw.githubusercontent.com/ProfessorGeovaniHenrique/estilisticadecorpus/main/public/Dicionarios/GutenbergNOVO.txt',
];

interface VerbeteGutenberg {
  verbete: string;
  verbete_normalizado: string;
  classe_gramatical?: string;
  definicoes?: Array<{ tipo?: string; texto: string }>;
  etimologia?: string;
  exemplos?: string[];
  sinonimos?: string[];
  antonimos?: string[];
  areas_conhecimento?: string[];
  origem_lingua?: string;
  regional?: boolean;
  popular?: boolean;
  figurado?: boolean;
  arcaico?: boolean;
  genero?: string;
  derivados?: string[];
  expressoes?: string[];
  confianca_extracao: number;
}

interface RequestBody {
  resumeJobId?: string;
  startIndex?: number;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * 🆕 v6.0: Parser RADICAL SIMPLES
 * - Primeira linha: verbete + classe gramatical
 * - Resto do bloco: definições
 * - SEM IA, SEM REGEXES COMPLEXAS
 */
function parseVerbeteSimples(blocoTexto: string): VerbeteGutenberg | null {
  try {
    const linhas = blocoTexto.trim().split('\n').filter(l => l.trim());
    
    if (linhas.length === 0) return null;
    
    // ============ PRIMEIRA LINHA: VERBETE + CLASSE ============
    const primeiraLinha = linhas[0];
    
    // Regex simples: /^\*([^*]+)\*(?:,\s*(.*))?/
    // Captura: *VERBETE*, CLASSE_GRAMATICAL (opcional)
    const match = primeiraLinha.match(/^\*([^*]+)\*(?:,\s*(.*))?/);
    
    if (!match) {
      return null;
    }
    
    const verbete = match[1].trim();
    const classeGramatical = match[2]?.trim() || undefined;
    
    if (!verbete || verbete.length < 2) {
      return null;
    }
    
    // ============ RESTO DAS LINHAS: DEFINIÇÕES ============
    const definicoes = linhas.slice(1) // Pula primeira linha
      .filter(linha => linha.trim().length > 5) // Ignora linhas muito curtas
      .map(linha => ({
        texto: linha.trim()
      }));
    
    // Validar se tem pelo menos 1 definição
    if (definicoes.length === 0) {
      return null;
    }
    
    return {
      verbete,
      verbete_normalizado: normalizeText(verbete),
      classe_gramatical: classeGramatical,
      definicoes,
      confianca_extracao: 0.95, // Alta confiança (formato esperado)
    };
    
  } catch (error) {
    console.error('❌ Erro ao parsear bloco:', error);
    return null;
  }
}

async function checkCancellation(jobId: string, supabaseClient: any): Promise<void> {
  const { data: job, error } = await supabaseClient
    .from('dictionary_import_jobs')
    .select('is_cancelling, status')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    throw new Error('Erro ao verificar status do job');
  }

  if (job.is_cancelling || job.status === 'cancelado') {
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

async function processChunk(
  jobId: string,
  verbetes: string[],
  startIndex: number,
  supabaseClient: any
): Promise<void> {
  try {
    console.log(`\n📦 Processando chunk: ${startIndex} a ${Math.min(startIndex + CHUNK_SIZE, verbetes.length)}`);
    
    await checkCancellation(jobId, supabaseClient);

    const endIndex = Math.min(startIndex + CHUNK_SIZE, verbetes.length);
    const chunk = verbetes.slice(startIndex, endIndex);

    // ✨ NOVO: Parser simples e direto
    console.log(`🔄 v6.0: Parsing SIMPLES (sem IA, sem regex complexa)`);
    console.log(`   Processando ${chunk.length} verbetes...`);
    
    const parsedResults = chunk.map(v => parseVerbeteSimples(v));
    const validParsed = parsedResults.filter((v): v is VerbeteGutenberg => v !== null);
    
    console.log(`\n📊 RESUMO DO CHUNK:`);
    console.log(`   Total: ${chunk.length}`);
    console.log(`   ✅ Válidos: ${validParsed.length} (${Math.round(validParsed.length/chunk.length*100)}%)`);
    console.log(`   ❌ Rejeitados: ${chunk.length - validParsed.length}`);

    // Inserir no banco
    if (validParsed.length > 0) {
      await withRetry(
        async () => {
          const { error } = await supabaseClient
            .from('gutenberg_lexicon')
            .insert(validParsed);
          if (error) throw error;
        },
        MAX_RETRIES,
        1000
      );
    }

    // Atualizar progresso
    const progressPercentage = Math.round((endIndex / verbetes.length) * 100);
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        verbetes_processados: endIndex,
        verbetes_inseridos: startIndex + validParsed.length,
        progresso: progressPercentage,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`📊 Progresso: ${endIndex}/${verbetes.length} (${progressPercentage}%)`);

    // Se ainda há verbetes, invocar próximo chunk
    if (endIndex < verbetes.length) {
      console.log(`🔄 Auto-invocando próximo chunk...`);
      
      const { error: invokeError } = await supabaseClient.functions.invoke('import-gutenberg-backend', {
        body: {
          resumeJobId: jobId,
          startIndex: endIndex,
        }
      });

      if (invokeError) {
        console.error('❌ Erro ao invocar próximo chunk:', invokeError);
        throw invokeError;
      }
    } else {
      // Concluir e limpar
      console.log('✅ Todos os chunks processados! Finalizando...');
      
      await supabaseClient
        .from('dictionary_import_jobs')
        .update({
          status: 'concluido',
          tempo_fim: new Date().toISOString(),
          progresso: 100,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Limpar arquivo temporário do Storage
      const { error: deleteError } = await supabaseClient.storage
        .from('corpus')
        .remove([`temp-imports/gutenberg-${jobId}.json`]);

      if (deleteError) {
        console.warn('⚠️ Erro ao deletar arquivo temporário:', deleteError);
      } else {
        console.log('🗑️ Arquivo temporário removido do Storage');
      }

      console.log(`✅ IMPORTAÇÃO COMPLETA! Total de verbetes processados: ${verbetes.length}`);
    }
  } catch (error: any) {
    if (error.message === 'JOB_CANCELLED') {
      console.log('🛑 Job cancelado pelo usuário');
      return;
    }

    console.error('❌ Erro ao processar chunk:', error);
    
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        status: 'erro',
        erro_mensagem: `Erro no chunk ${startIndex}: ${error.message}`,
        tempo_fim: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', jobId);

    throw error;
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔵 REQUEST RECEBIDA [${requestId}]`);
  console.log(`   Method: ${req.method}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}\n`);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 VERSÃO 6.0 - Radical Simplification');
    console.log('   ✨ Split por linhas vazias');
    console.log('   ✨ Filtro simples por asterisco');
    console.log('   ✨ Parser de 2 linhas de código');
    console.log('   ⚡ Execução em segundos (não minutos)');
    console.log(`📊 Request ID: ${requestId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let body: RequestBody = {};
    try {
      body = await req.json();
      console.log('📦 Body recebido:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.log('ℹ️ Nenhum body enviado (ou JSON inválido), usando body vazio');
    }

    // ===== FLUXO DE CONTINUAÇÃO (Chunk subsequente) =====
    if (body.resumeJobId) {
      console.log(`\n🔄 Continuando job existente: ${body.resumeJobId}`);
      console.log(`   Retomando do índice: ${body.startIndex || 0}`);
      
      const jobId = body.resumeJobId;
      const startIndex = body.startIndex || 0;
      
      // Carregar verbetes do Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('corpus')
        .download(`temp-imports/gutenberg-${jobId}.json`);

      if (downloadError || !fileData) {
        throw new Error(`Erro ao carregar arquivo: ${downloadError?.message || 'File not found'}`);
      }

      const fileContent = await fileData.text();
      const verbetes = JSON.parse(fileContent);
      
      console.log(`📋 Verbetes carregados do Storage: ${verbetes.length}`);
      console.log(`🎯 Processando a partir do índice: ${startIndex}`);

      // Processar próximo chunk em background (sem await)
      processChunk(jobId, verbetes, startIndex, supabase).catch(error => {
        console.error('❌ Erro no processamento em background:', error);
      });

      const responseTime = Date.now() - startTime;
      console.log(`\n${'='.repeat(70)}`);
      console.log(`✅ RESPOSTA ENVIADA [${requestId}]`);
      console.log(`   Status: 200 OK`);
      console.log(`   Continuando processamento em background`);
      console.log(`   Tempo de resposta: ${responseTime}ms`);
      console.log(`${'='.repeat(70)}\n`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Chunk em processamento',
          jobId: jobId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== FLUXO DE INÍCIO (Nova importação) =====
    console.log('\n🆕 Iniciando nova importação do Dicionário Gutenberg...');
    console.log(`📥 Baixando dicionário de: ${DICTIONARY_URLS[0]}`);
    
    const response = await fetch(DICTIONARY_URLS[0]);
    if (!response.ok) {
      throw new Error(`Erro ao baixar dicionário: ${response.status}`);
    }
    
    const fileContent = await response.text();
    console.log(`📄 Arquivo baixado: ${fileContent.length} caracteres`);

    // ✨ NOVO: Split simples por linhas vazias
    console.log('\n🔍 Aplicando split SIMPLES por linhas vazias...');
    const blocosBrutos = fileContent.split(/\n\s*\n+/);
    console.log(`📦 Total de blocos brutos encontrados: ${blocosBrutos.length}`);

    // ✨ NOVO: Filtrar apenas blocos que começam com *
    const verbetesValidos = blocosBrutos.filter(bloco => {
      const primeiraLinha = bloco.trim().split('\n')[0];
      return primeiraLinha && primeiraLinha.startsWith('*');
    });

    console.log(`✅ Verbetes válidos (começam com *): ${verbetesValidos.length}`);
    console.log(`❌ Blocos rejeitados: ${blocosBrutos.length - verbetesValidos.length}`);

    // Criar job de importação
    const { data: job, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'gutenberg',
        status: 'processando',
        total_verbetes: verbetesValidos.length,
        verbetes_processados: 0,
        verbetes_inseridos: 0,
        progresso: 0,
        tempo_inicio: new Date().toISOString(),
        metadata: {
          blocos_totais: blocosBrutos.length,
          blocos_rejeitados: blocosBrutos.length - verbetesValidos.length,
          versao: 'v6.0-radical-simplification',
          estrategia: 'split-linhas-vazias + filtro-asterisco + parser-simples'
        }
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error(`Erro ao criar job: ${jobError?.message || 'Unknown error'}`);
    }

    const jobId = job.id;
    console.log(`✅ Job criado: ${jobId}`);

    // Salvar verbetes no Storage para processamento em chunks
    const storageKey = `temp-imports/gutenberg-${jobId}.json`;
    const { error: uploadError } = await supabase.storage
      .from('corpus')
      .upload(storageKey, JSON.stringify(verbetesValidos), {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Erro ao salvar no Storage: ${uploadError.message}`);
    }

    console.log(`💾 Verbetes salvos no Storage: ${storageKey}`);

    // Iniciar processamento do primeiro chunk em background
    console.log('🚀 Iniciando processamento do primeiro chunk em background...');
    console.log(`📦 Processando chunk: 0 a ${Math.min(CHUNK_SIZE, verbetesValidos.length)}`);
    
    // Processar primeiro chunk em background (sem await)
    processChunk(jobId, verbetesValidos, 0, supabase).catch(error => {
      console.error('❌ Erro no processamento em background:', error);
    });

    const responseTime = Date.now() - startTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ RESPOSTA ENVIADA [${requestId}]`);
    console.log(`   Status: 200 OK`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Total verbetes: ${verbetesValidos.length}`);
    console.log(`   Tempo de resposta: ${responseTime}ms`);
    console.log(`${'='.repeat(70)}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Importação iniciada com sucesso',
        jobId: jobId,
        totalVerbetes: verbetesValidos.length,
        metadata: {
          blocos_totais: blocosBrutos.length,
          blocos_rejeitados: blocosBrutos.length - verbetesValidos.length,
          taxa_rejeicao: `${Math.round((blocosBrutos.length - verbetesValidos.length) / blocosBrutos.length * 100)}%`
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`\n❌ ERRO FATAL [${requestId}]:`);
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`   Tempo até falha: ${responseTime}ms`);
    console.error(`${'='.repeat(70)}\n`);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
