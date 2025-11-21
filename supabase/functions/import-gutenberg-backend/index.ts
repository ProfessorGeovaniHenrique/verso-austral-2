// 🔥 DEPLOY TIMESTAMP: 2025-01-20T23:00:00Z - v8.0: CSV Upload Simple & Clean
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { parse } from 'https://deno.land/std@0.224.0/csv/parse.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUNK_SIZE = 1000;

interface VerbeteGutenberg {
  verbete: string;
  verbete_normalizado: string;
  classe_gramatical?: string;
  definicoes?: Array<{ texto: string }>;
  confianca_extracao: number;
}

interface CSVRow {
  verbete: string;
  classe_gramatical: string;
  definicao: string;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function processChunk(
  jobId: string,
  verbetes: VerbeteGutenberg[],
  startIndex: number,
  supabaseClient: any
): Promise<void> {
  try {
    console.log(`\n📦 Processando chunk: ${startIndex} a ${Math.min(startIndex + CHUNK_SIZE, verbetes.length)}`);
    
    const endIndex = Math.min(startIndex + CHUNK_SIZE, verbetes.length);
    const chunk = verbetes.slice(startIndex, endIndex);

    console.log(`🔄 Inserindo ${chunk.length} verbetes...`);
    
    // Inserir chunk no banco com validação
    const { data: insertedData, error, count } = await supabaseClient
      .from('gutenberg_lexicon')
      .insert(chunk)
      .select('id', { count: 'exact' });

    if (error) {
      console.error(`❌ ERRO DE INSERÇÃO NO CHUNK ${startIndex}:`, error);
      throw error;
    }

    const insertedCount = count || insertedData?.length || 0;
    if (insertedCount !== chunk.length) {
      const warning = `⚠️ AVISO: Esperava inserir ${chunk.length} verbetes, mas apenas ${insertedCount} foram inseridos`;
      console.warn(warning);
      
      await supabaseClient.from('system_logs').insert({
        level: 'warn',
        category: 'dictionary_import',
        message: warning,
        metadata: { 
          jobId, 
          startIndex, 
          expected: chunk.length, 
          actual: insertedCount,
          difference: chunk.length - insertedCount
        }
      });
    }

    console.log(`✅ ${insertedCount} verbetes inseridos com sucesso no chunk ${startIndex}-${endIndex}`);

    // Atualizar progresso
    const progressPercentage = Math.round((endIndex / verbetes.length) * 100);
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        verbetes_processados: endIndex,
        verbetes_inseridos: endIndex,
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
      // Verificação final da importação
      console.log('✅ Todos os chunks processados! Finalizando...');
      
      const { count: finalCount } = await supabaseClient
        .from('gutenberg_lexicon')
        .select('*', { count: 'exact', head: true });

      console.log(`🎯 VERIFICAÇÃO FINAL:`);
      console.log(`   Verbetes esperados: ${verbetes.length}`);
      console.log(`   Verbetes no banco: ${finalCount}`);
      console.log(`   Taxa de sucesso: ${((finalCount! / verbetes.length) * 100).toFixed(2)}%`);

      if (finalCount !== verbetes.length) {
        const warning = `⚠️ DISCREPÂNCIA DETECTADA! Esperava ${verbetes.length}, mas banco tem ${finalCount}`;
        console.warn(warning);
        
        await supabaseClient.from('system_logs').insert({
          level: 'warn',
          category: 'dictionary_import_verification',
          message: warning,
          metadata: {
            jobId,
            expected: verbetes.length,
            actual: finalCount,
            missing: verbetes.length - (finalCount || 0)
          }
        });
      }

      // Finalizar job com contagem real do banco
      await supabaseClient
        .from('dictionary_import_jobs')
        .update({
          status: finalCount === verbetes.length ? 'concluido' : 'concluido_com_avisos',
          verbetes_inseridos: finalCount || 0,
          tempo_fim: new Date().toISOString(),
          progresso: 100,
          atualizado_em: new Date().toISOString(),
          metadata: {
            verification: {
              expected: verbetes.length,
              actual: finalCount,
              success_rate: ((finalCount || 0) / verbetes.length) * 100
            }
          }
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
    console.error('❌ ERRO CRÍTICO ao processar chunk:', error);
    console.error('Stack trace:', error.stack);
    console.error('Detalhes:', JSON.stringify(error, null, 2));
    
    // Logar no banco também
    await supabaseClient.from('system_logs').insert({
      level: 'error',
      category: 'dictionary_import_fatal',
      message: `Falha crítica no chunk ${startIndex}`,
      metadata: {
        jobId,
        startIndex,
        endIndex: Math.min(startIndex + CHUNK_SIZE, verbetes.length),
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
    
    await supabaseClient
      .from('dictionary_import_jobs')
      .update({
        status: 'erro',
        erro_mensagem: `Erro no chunk ${startIndex}-${Math.min(startIndex + CHUNK_SIZE, verbetes.length)}: ${error.message}`,
        tempo_fim: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        metadata: {
          error_details: {
            message: error.message,
            stack: error.stack,
            chunk_range: [startIndex, Math.min(startIndex + CHUNK_SIZE, verbetes.length)]
          }
        }
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
    console.log('🚀 VERSÃO 8.0 - CSV Upload (Simple & Clean)');
    console.log('   📄 Upload direto de CSV pré-processado');
    console.log('   🧹 Truncate automático antes da importação');
    console.log('   ⚡ Inserção otimizada em chunks de 1000');
    console.log(`📊 Request ID: ${requestId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const contentType = req.headers.get('content-type') || '';
    
    // ===== FLUXO DE CONTINUAÇÃO (Chunk subsequente) =====
    if (contentType.includes('application/json')) {
      const body = await req.json();
      
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
        const verbetes: VerbeteGutenberg[] = JSON.parse(fileContent);
        
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
    }

    // ===== FLUXO DE INÍCIO (Upload de CSV) =====
    console.log('\n🆕 Iniciando nova importação do Dicionário Gutenberg via CSV...');
    
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type deve ser multipart/form-data com arquivo CSV');
    }

    // Parse do FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('Nenhum arquivo CSV foi enviado');
    }

    console.log(`📥 Arquivo recebido: ${file.name} (${file.size} bytes)`);

    // Ler conteúdo do CSV
    const csvText = await file.text();
    console.log(`📄 Arquivo CSV lido: ${csvText.length} caracteres`);

    // Parse CSV
    const rows = parse(csvText, {
      skipFirstRow: true, // Pula cabeçalho
      columns: ['verbete', 'classe_gramatical', 'definicao']
    }) as CSVRow[];

    console.log(`📊 Total de linhas no CSV: ${rows.length}`);

    // 🧹 TRUNCATE: Limpar tabela antes de importar
    console.log('🧹 Fazendo TRUNCATE completo de gutenberg_lexicon...');

    // Contar registros ANTES
    const { count: countBefore } = await supabase
      .from('gutenberg_lexicon')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Registros ANTES da limpeza: ${countBefore || 0}`);

    // Usar função SQL para TRUNCATE (mais eficiente)
    const { error: truncateError } = await supabase.rpc('truncate_gutenberg_table');

    if (truncateError) {
      console.error('❌ Erro no TRUNCATE:', truncateError);
      throw truncateError;
    }

    // Verificar se realmente limpou
    const { count: countAfter } = await supabase
      .from('gutenberg_lexicon')
      .select('*', { count: 'exact', head: true });

    if (countAfter !== 0) {
      throw new Error(`TRUNCATE falhou! Ainda existem ${countAfter} registros`);
    }

    console.log('✅ Tabela completamente limpa e pronta para importação');

    // Converter para formato do banco
    const verbetesValidos: VerbeteGutenberg[] = rows
      .filter(row => row.verbete && row.verbete.trim().length > 0)
      .map(row => ({
        verbete: row.verbete.trim(),
        verbete_normalizado: normalizeText(row.verbete),
        classe_gramatical: row.classe_gramatical?.trim() || undefined,
        definicoes: row.definicao ? [{ texto: row.definicao.trim() }] : [],
        confianca_extracao: 1.0 // Máxima confiança (CSV pré-processado)
      }));

    console.log(`✅ Verbetes válidos extraídos do CSV: ${verbetesValidos.length}`);

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
          versao: 'v8.0-csv-upload',
          estrategia: 'csv-pre-processado',
          descricao: 'Upload direto de CSV limpo e estruturado'
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
          versao: 'v8.0-csv-upload',
          estrategia: 'csv-pre-processado'
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
