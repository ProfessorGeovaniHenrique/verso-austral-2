// 🔥 DEPLOY TIMESTAMP: 2025-01-20T23:00:00Z - v8.0: CSV Upload Simple & Clean
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { parse } from 'https://deno.land/std@0.224.0/csv/parse.ts';
import { createEdgeLogger } from '../_shared/unified-logger.ts';

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
  validado?: boolean; // ✅ Adicionar campo de validação
  validation_status?: string; // ✅ Adicionar campo de status
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
  supabaseClient: any,
  log: ReturnType<typeof createEdgeLogger>
): Promise<void> {
  try {
    const endIndex = Math.min(startIndex + CHUNK_SIZE, verbetes.length);
    const chunk = verbetes.slice(startIndex, endIndex);

    log.info('Processing chunk', { startIndex, endIndex, chunkSize: chunk.length });
    
    // Inserir chunk no banco com validação
    const { data: insertedData, error, count } = await supabaseClient
      .from('gutenberg_lexicon')
      .insert(chunk)
      .select('id', { count: 'exact' });

    if (error) {
      log.error('Chunk insertion failed', error as Error, { startIndex, chunkSize: chunk.length });
      throw error;
    }

    const insertedCount = count || insertedData?.length || 0;
    if (insertedCount !== chunk.length) {
      log.warn('Partial chunk insertion', { 
        expected: chunk.length, 
        actual: insertedCount,
        difference: chunk.length - insertedCount 
      });
      
      await supabaseClient.from('system_logs').insert({
        level: 'warn',
        category: 'dictionary_import',
        message: 'Partial chunk insertion detected',
        metadata: { 
          jobId, 
          startIndex, 
          expected: chunk.length, 
          actual: insertedCount,
          difference: chunk.length - insertedCount
        }
      });
    }

    log.logDatabaseQuery('gutenberg_lexicon', 'insert', insertedCount);

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

    log.logJobProgress(jobId, endIndex, verbetes.length, progressPercentage);

    // Se ainda há verbetes, invocar próximo chunk
    if (endIndex < verbetes.length) {
      log.info('Invoking next chunk', { nextIndex: endIndex });
      
      const { error: invokeError } = await supabaseClient.functions.invoke('import-gutenberg-backend', {
        body: {
          resumeJobId: jobId,
          startIndex: endIndex,
        }
      });

      if (invokeError) {
        log.error('Failed to invoke next chunk', invokeError as Error);
        throw invokeError;
      }
    } else {
      // Verificação final da importação
      log.info('All chunks processed, finalizing job', { totalProcessed: endIndex });
      
      const { count: finalCount } = await supabaseClient
        .from('gutenberg_lexicon')
        .select('*', { count: 'exact', head: true });

      const successRate = ((finalCount! / verbetes.length) * 100).toFixed(2);
      log.info('Final verification', { 
        expected: verbetes.length, 
        actual: finalCount, 
        successRate 
      });

      if (finalCount !== verbetes.length) {
        log.warn('Count discrepancy detected', { 
          expected: verbetes.length, 
          actual: finalCount, 
          missing: verbetes.length - (finalCount || 0) 
        });
        
        await supabaseClient.from('system_logs').insert({
          level: 'warn',
          category: 'dictionary_import_verification',
          message: 'Final count discrepancy detected',
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
      const storageKey = `temp-imports/gutenberg-${jobId}.json`;
      const { error: deleteError } = await supabaseClient.storage
        .from('corpus')
        .remove([storageKey]);

      if (deleteError) {
        log.warn('Failed to delete temp file', { key: storageKey, error: deleteError.message });
      }

      log.logJobComplete(jobId, verbetes.length, Date.now() - startIndex, { finalCount });
    }
  } catch (error: any) {
    log.fatal('Critical chunk processing error', error instanceof Error ? error : new Error(String(error)), { startIndex });
    
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
  const log = createEdgeLogger('import-gutenberg-backend', requestId);
  
  log.info('Request received', { method: req.method, url: req.url });
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log.info('Version 8.0 - CSV Upload', { strategy: 'csv-pre-processed', chunkSize: CHUNK_SIZE });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const contentType = req.headers.get('content-type') || '';
    
    // ===== FLUXO DE CONTINUAÇÃO (Chunk subsequente) =====
    if (contentType.includes('application/json')) {
      const body = await req.json();
      
      if (body.resumeJobId) {
        log.info('Resuming existing job', { jobId: body.resumeJobId, startIndex: body.startIndex || 0 });
        
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
        
        log.info('Verbetes loaded from storage', { count: verbetes.length, startIndex });

        // Processar próximo chunk em background (sem await)
        processChunk(jobId, verbetes, startIndex, supabase, log).catch(error => {
          log.error('Background processing failed', error as Error, { jobId });
        });

        log.info('Response sent - processing continues in background', { 
          duration: Date.now() - startTime 
        });

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
    log.debug('CSV file read', { charCount: csvText.length });

    // Parse CSV
    const rows = parse(csvText, {
      skipFirstRow: true,
      columns: ['verbete', 'classe_gramatical', 'definicao']
    }) as CSVRow[];

    log.info('CSV parsed', { totalRows: rows.length });

    // 🧹 TRUNCATE: Limpar tabela antes de importar
    const { count: countBefore } = await supabase
      .from('gutenberg_lexicon')
      .select('*', { count: 'exact', head: true });

    log.info('Truncating table', { recordsBeforeCleanup: countBefore || 0 });

    // Usar função SQL para TRUNCATE (mais eficiente)
    const { error: truncateError } = await supabase.rpc('truncate_gutenberg_table');

    if (truncateError) {
      log.error('Truncate failed', truncateError as Error);
      throw truncateError;
    }

    // Verificar se realmente limpou
    const { count: countAfter } = await supabase
      .from('gutenberg_lexicon')
      .select('*', { count: 'exact', head: true });

    if (countAfter !== 0) {
      throw new Error(`TRUNCATE falhou! Ainda existem ${countAfter} registros`);
    }

    log.info('Table truncated successfully', { recordsAfter: countAfter });

    // Converter para formato do banco
    const verbetesValidos: VerbeteGutenberg[] = rows
      .filter(row => row.verbete && row.verbete.trim().length > 0)
      .map(row => ({
        verbete: row.verbete.trim(),
        verbete_normalizado: normalizeText(row.verbete),
        classe_gramatical: row.classe_gramatical?.trim() || undefined,
        definicoes: row.definicao ? [{ texto: row.definicao.trim() }] : [],
        confianca_extracao: 1.0, // Máxima confiança (CSV pré-processado)
        validado: true, // ✅ Marcar como validado ao importar
        validation_status: 'approved' // ✅ Definir status de validação
      }));

    log.info('Valid entries extracted from CSV', { count: verbetesValidos.length });

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
    log.logJobStart(jobId, verbetesValidos.length, { strategy: 'csv-upload' });

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

    log.info('Verbetes saved to storage', { storageKey });

    // Iniciar processamento do primeiro chunk em background
    processChunk(jobId, verbetesValidos, 0, supabase, log).catch(error => {
      log.error('Background processing failed', error as Error, { jobId });
    });

    log.info('Import initiated successfully', { 
      jobId, 
      totalVerbetes: verbetesValidos.length, 
      duration: Date.now() - startTime 
    });

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
    log.fatal('Fatal error in import', error instanceof Error ? error : new Error(String(error)), { 
      duration: Date.now() - startTime 
    });

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
