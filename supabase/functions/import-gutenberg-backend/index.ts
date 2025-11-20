// 🔥 DEPLOY TIMESTAMP: 2025-01-20T15:30:00Z - Correções críticas de split e parser
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

function parseGutenbergEntry(entryText: string): VerbeteGutenberg | null {
  try {
    const lines = entryText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return null;

    const firstLine = lines[0];
    
    // ✅ VALIDAR: Deve conter o padrão *palavra*,
    const asteriskMatch = firstLine.match(/^\*([A-ZÁÀÃÂÉÊÍÓÔÕÚÇÑa-záàãâéêíóôõúçñ\s-]+)\*,?\s*(.+)?/);
    if (!asteriskMatch) {
      console.error(`🔴 DEBUG - Linha sem padrão *palavra*,: "${firstLine}"`);
      return null;
    }

    // ✅ EXTRAIR: Remover asteriscos e vírgula
    const verbete = asteriskMatch[1].trim();
    const classe_gramatical = asteriskMatch[2]?.trim();

    // Extrair definições - PARSER MELHORADO
    const definicoes: Array<{ tipo?: string; texto: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // ✅ Pular linhas que são apenas classe gramatical
      if (line.match(/^_[a-z\s\.]+_?$/i)) {
        console.log(`   [SKIP] Classe gramatical: "${line}"`);
        continue;
      }
      
      // ✅ Pular linhas muito curtas ou vazias
      if (line.length < 3) continue;
      
      // ✅ Capturar qualquer linha com texto real (mesmo começando com _, (, [, etc)
      if (line.match(/[a-zA-ZáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]/)) {
        definicoes.push({ texto: line });
        console.log(`   [CAPTURA] Definição: "${line.substring(0, 60)}..."`);
      }
    }

    // 🔍 DEBUG - DETECTAR DEFINIÇÕES VAZIAS
    if (definicoes.length === 0) {
      console.error(`\n🔴 DEBUG - DEFINIÇÃO VAZIA!`);
      console.error(`   Verbete: "${verbete}"`);
      console.error(`   Primeira linha: "${firstLine}"`);
      console.error(`   Total de linhas: ${lines.length}`);
      if (lines.length > 1) {
        console.error(`   Segunda linha: "${lines[1]}"`);
      }
    }

    const verbeteData: VerbeteGutenberg = {
      verbete,
      verbete_normalizado: normalizeText(verbete),
      classe_gramatical: classe_gramatical || undefined,
      definicoes: definicoes.length > 0 ? definicoes : undefined,
      confianca_extracao: 0.95, // Confiança aumentada para elegibilidade de validação
    };

    return verbeteData;
  } catch (error) {
    console.error('Erro ao parsear verbete:', error);
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
    console.log(`📦 Processando chunk: ${startIndex} a ${Math.min(startIndex + CHUNK_SIZE, verbetes.length)}`);
    
    await checkCancellation(jobId, supabaseClient);

    const endIndex = Math.min(startIndex + CHUNK_SIZE, verbetes.length);
    const chunk = verbetes.slice(startIndex, endIndex);

    let definicoesVazias = 0; // ✅ NOVO CONTADOR

    const parsedBatch = chunk
      .map(v => {
        const parsed = parseGutenbergEntry(v);
        
        // ✅ VERIFICAR SE DEFINIÇÃO ESTÁ VAZIA
        if (parsed && (!parsed.definicoes || parsed.definicoes.length === 0)) {
          definicoesVazias++;
        }
        
        return parsed;
      })
      .filter((v): v is VerbeteGutenberg => v !== null);

    console.log(`✅ Parsed ${parsedBatch.length} verbetes válidos de ${chunk.length} tentativas`);
    console.log(`⚠️ Definições vazias detectadas: ${definicoesVazias}`);

    if (parsedBatch.length > 0) {
      await withRetry(
        async () => {
          const { error } = await supabaseClient
            .from('gutenberg_lexicon')
            .insert(parsedBatch);
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
        verbetes_inseridos: startIndex + parsedBatch.length,
        progresso: progressPercentage,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`📊 Progresso: ${endIndex}/${verbetes.length} (${progressPercentage}%) - ${parsedBatch.length} inseridos`);

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
    console.log('🚀 VERSÃO 4.0 - Split e Parser CORRIGIDOS + Logs Detalhados');
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
      const { resumeJobId, startIndex } = body;
      
      if (typeof startIndex !== 'number') {
        throw new Error('startIndex deve ser um número');
      }
      
      console.log(`🔄 Continuando job: ${resumeJobId}, startIndex: ${startIndex}`);

      // Baixar verbetes do Storage
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('corpus')
        .download(`temp-imports/gutenberg-${resumeJobId}.json`);

      if (downloadError || !downloadData) {
        throw new Error(`Erro ao baixar arquivo temporário: ${downloadError?.message}`);
      }

      const fileContent = await downloadData.text();
      const verbetes = JSON.parse(fileContent);

      console.log(`📚 Verbetes carregados do Storage: ${verbetes.length}`);

      // Processar chunk em background
      processChunk(resumeJobId, verbetes, startIndex, supabase).catch(console.error);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Processando chunk ${startIndex}`,
          chunk: startIndex 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== FLUXO INICIAL (Primeira invocação) =====
    console.log('📥 Iniciando nova importação...');

    // Tentar baixar de múltiplas URLs
    let fileContent = '';
    let usedUrl = '';

    for (const url of DICTIONARY_URLS) {
      console.log(`🌐 Tentando baixar de: ${url}`);
      try {
        const response = await fetch(url);
        if (response.ok) {
          fileContent = await response.text();
          usedUrl = url;
          console.log(`✅ Arquivo baixado com sucesso de: ${url}`);
          console.log(`📄 Tamanho: ${fileContent.length} caracteres`);
          break;
        }
      } catch (fetchError) {
        console.warn(`⚠️ Erro ao baixar de ${url}:`, fetchError);
      }
    }

    if (!fileContent) {
      throw new Error('Nenhuma URL de dicionário disponível ou acessível');
    }

    // 🔍 DEBUG DETALHADO - CONTEÚDO BRUTO DO ARQUIVO
    console.log("\n🔍 DEBUG - Início do arquivo (primeiros 1000 chars):");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(fileContent.substring(0, 1000));
    console.log("═══════════════════════════════════════════════════════════\n");

    // Log das primeiras linhas para debug
    const firstLines = fileContent.split('\n').slice(0, 10);
    console.log('📝 Primeiras 10 linhas do arquivo:');
    firstLines.forEach((line, idx) => console.log(`   ${idx + 1}: ${line.substring(0, 80)}`));

    // Parse verbetes com estratégia CORRIGIDA
    console.log('🔍 Aplicando estratégia de parsing corrigida...');
    
    // Remover cabeçalhos do Project Gutenberg se existirem
    const startMarker = fileContent.indexOf('*** START');
    const endMarker = fileContent.indexOf('*** END');
    
    let contentToParse = fileContent;
    if (startMarker !== -1) {
      const startPos = fileContent.indexOf('\n', startMarker) + 1;
      contentToParse = endMarker !== -1 
        ? fileContent.substring(startPos, endMarker)
        : fileContent.substring(startPos);
      console.log('✂️ Removido cabeçalho/rodapé do Project Gutenberg');
    }

    // Split por verbetes - REGEX CORRIGIDO: Quebra em \n seguido de *palavra*,
    console.log('🔍 Aplicando split CORRIGIDO: /\\n(?=\\*[A-ZÁ-Ú][^*]*\\*,)/');
    const verbetes = contentToParse
      .split(/\n(?=\*[A-ZÁ-Ú][^*]*\*,)/)
      .map(v => v.trim())
      .filter(v => {
        // Validar: Deve começar com *palavra*, e ter conteúdo
        const match = v.match(/^\*[A-ZÁÀÃÂÉÊÍÓÔÕÚÇÑa-záàãâéêíóôõúçñ\s-]+\*,/);
        const isValid = match !== null && v.length > 10;
        
        if (!isValid && v.length > 0) {
          console.log(`❌ [REJEITADO] "${v.substring(0, 50)}..."`);
        }
        
        return isValid;
      });

    // 🔍 DEBUG COMPLETO - RESULTADO DO SPLIT
    console.log(`\n🔍 DEBUG - Total de verbetes após split: ${verbetes.length}`);
    console.log("\n🔍 DEBUG - Primeiros 5 verbetes COMPLETOS para inspeção:\n");
    verbetes.slice(0, 5).forEach((v, i) => {
      console.log(`╔════════════════════════════════════════════════════════════╗`);
      console.log(`║ VERBETE ${i + 1} (primeiros 300 chars)                          ║`);
      console.log(`╠════════════════════════════════════════════════════════════╣`);
      console.log(v.substring(0, 300));
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    });

    console.log(`\n📚 Total de verbetes identificados: ${verbetes.length}`);
    console.log(`📊 Estatísticas de Split:`);
    console.log(`   - Linhas totais: ${fileContent.split('\n').length}`);
    console.log(`   - Verbetes válidos (padrão *palavra*,): ${verbetes.length}`);
    console.log(`   - Média de caracteres por verbete: ${Math.round(contentToParse.length / verbetes.length)}`);
    console.log(`   - Blocos rejeitados no filter: ${contentToParse.split(/(?=\n\*[A-ZÁÀÃÂÉÊÍÓÔÕÚÇÑa-záàãâéêíóôõúçñ\s-]+\*,)/).length - verbetes.length}`);

    if (verbetes.length === 0) {
      console.error('❌ Nenhum verbete válido encontrado!');
      console.log('📄 Amostra do conteúdo (primeiros 500 chars):');
      console.log(contentToParse.substring(0, 500));
      throw new Error('Nenhum verbete válido encontrado no arquivo. Verifique o formato.');
    }

    // Criar job
    const { data: job, error: jobError } = await supabase
      .from('dictionary_import_jobs')
      .insert({
        tipo_dicionario: 'gutenberg',
        status: 'processando',
        total_verbetes: verbetes.length,
        verbetes_processados: 0,
        verbetes_inseridos: 0,
        progresso: 0,
        metadata: { 
          source_url: usedUrl,
          chunk_size: CHUNK_SIZE,
          total_chunks: Math.ceil(verbetes.length / CHUNK_SIZE)
        },
        tempo_inicio: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('❌ Erro ao criar job:', jobError);
      throw new Error(`Erro ao criar job: ${jobError?.message}`);
    }

    console.log(`✅ Job criado: ${job.id}`);

    // Salvar verbetes no Storage para uso nos próximos chunks
    const { error: uploadError } = await supabase.storage
      .from('corpus')
      .upload(
        `temp-imports/gutenberg-${job.id}.json`,
        JSON.stringify(verbetes),
        {
          contentType: 'application/json',
          upsert: true,
        }
      );

    if (uploadError) {
      console.error('❌ Erro ao salvar no Storage:', uploadError);
      throw new Error(`Erro ao salvar arquivo temporário: ${uploadError.message}`);
    }

    console.log(`💾 Verbetes salvos no Storage: temp-imports/gutenberg-${job.id}.json`);

    // Processar primeiro chunk em background
    console.log('🚀 Iniciando processamento do primeiro chunk em background...');
    processChunk(job.id, verbetes, 0, supabase).catch(console.error);

    const responseTime = Date.now() - startTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ RESPOSTA ENVIADA [${requestId}]`);
    console.log(`   Status: 200 OK`);
    console.log(`   Tempo de resposta: ${responseTime}ms`);
    console.log(`   Job ID: ${job.id}`);
    console.log(`   Total verbetes: ${verbetes.length}`);
    console.log(`${'='.repeat(70)}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        totalVerbetes: verbetes.length,
        totalChunks: Math.ceil(verbetes.length / CHUNK_SIZE),
        message: `Importação iniciada com ${verbetes.length} verbetes`,
        requestId,
        responseTime: `${responseTime}ms`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`\n${'='.repeat(70)}`);
    console.error(`❌ ERRO FATAL [${requestId}]`);
    console.error(`   Tempo até erro: ${responseTime}ms`);
    console.error(`   Erro: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`${'='.repeat(70)}\n`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack,
        requestId,
        responseTime: `${responseTime}ms`,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
