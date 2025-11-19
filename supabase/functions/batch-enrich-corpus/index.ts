import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentResult {
  compositor?: string;
  ano?: string;
  album?: string;
  fonte: 'musicbrainz' | 'ai-inferred' | 'not-found';
  confianca: number;
  detalhes?: string;
}

/**
 * Carrega corpus dos arquivos públicos via HTTP
 * Para nordestino, concatena as 3 partes
 */
async function loadCorpusFromPublic(corpusType: string, projectBaseUrl: string): Promise<string> {
  // Usar a URL base do projeto passada como parâmetro
  
  if (corpusType === 'nordestino') {
    console.log('Carregando corpus nordestino (3 partes)...');
    
    try {
      const parts = await Promise.all([
        fetch(`${projectBaseUrl}/corpus/full-text/nordestino-parte-01.txt`),
        fetch(`${projectBaseUrl}/corpus/full-text/nordestino-parte-02.txt`),
        fetch(`${projectBaseUrl}/corpus/full-text/nordestino-parte-03.txt`)
      ]);
      
      // Verificar se todas as partes foram carregadas
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].ok) {
          throw new Error(`Erro ao carregar parte ${i + 1}: ${parts[i].status} ${parts[i].statusText}`);
        }
      }
      
      const texts = await Promise.all(parts.map(p => p.text()));
      const concatenated = texts.join('\n');
      
      console.log(`Corpus nordestino carregado: ${concatenated.length} caracteres`);
      return concatenated;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao carregar corpus nordestino:', errorMsg);
      throw new Error(`Falha ao carregar corpus nordestino: ${errorMsg}`);
    }
  }
  
  // Para gaucho, é um arquivo único
  console.log('Carregando corpus gaucho...');
  
  try {
    const response = await fetch(`${projectBaseUrl}/corpus/full-text/gaucho-completo.txt`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log(`Corpus gaucho carregado: ${text.length} caracteres`);
    return text;
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao carregar corpus gaucho:', errorMsg);
    throw new Error(`Falha ao carregar corpus gaucho: ${errorMsg}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // POST /batch-enrich-corpus - Iniciar job
    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { corpusType, projectBaseUrl } = await req.json();
      
      if (!corpusType || !['gaucho', 'nordestino'].includes(corpusType)) {
        return new Response(
          JSON.stringify({ error: 'corpusType deve ser "gaucho" ou "nordestino"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!projectBaseUrl) {
        return new Response(
          JSON.stringify({ error: 'projectBaseUrl é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar job inicial
      const { data: job, error: jobError } = await supabase
        .from('enrichment_jobs')
        .insert({
          corpus_type: corpusType,
          status: 'queued',
          user_id: user.id,
        })
        .select()
        .single();

      if (jobError) {
        console.error('Erro ao criar job:', jobError);
        return new Response(
          JSON.stringify({ error: jobError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Disparar background task
      const backgroundTask = processEnrichment(job.id, corpusType, supabaseUrl, supabaseKey, projectBaseUrl);
      
      // @ts-ignore - EdgeRuntime.waitUntil exists in Deno Deploy
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(backgroundTask);
      } else {
        // Fallback para desenvolvimento local
        backgroundTask.catch(console.error);
      }

      return new Response(
        JSON.stringify({ jobId: job.id, status: 'queued' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processEnrichment(
  jobId: string,
  corpusType: string,
  supabaseUrl: string,
  supabaseKey: string,
  projectBaseUrl: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log(`[Job ${jobId}] Iniciando processamento do corpus ${corpusType}`);
    
    // Atualizar status para processing
    await supabase
      .from('enrichment_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // 1. Carregar corpus via HTTP (arquivos em public/)
    console.log(`[Job ${jobId}] Carregando corpus ${corpusType} via HTTP...`);
    const corpusText = await loadCorpusFromPublic(corpusType, projectBaseUrl);
    
    // 2. Parsear corpus e identificar músicas sem metadados
    const songs = parseCorpus(corpusText);
    const toEnrich = songs.filter(s => !s.compositor || s.compositor.trim() === '');
    
    console.log(`[Job ${jobId}] Total de músicas: ${songs.length}, Para enriquecer: ${toEnrich.length}`);
    
    await supabase
      .from('enrichment_jobs')
      .update({ total_songs: toEnrich.length })
      .eq('id', jobId);

    // 3. Processar em batches
    const enriched: any[] = [];
    const forReview: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < toEnrich.length; i++) {
      const song = toEnrich[i];
      
      try {
        // Chamar edge function de enriquecimento
        const { data, error } = await supabase.functions.invoke('enrich-corpus-metadata', {
          body: {
            artista: song.artista,
            musica: song.musica,
            album: song.album,
            corpusType
          }
        });

        if (error) {
          console.error(`[Job ${jobId}] Erro ao enriquecer ${song.artista} - ${song.musica}:`, error);
          errors.push(`${song.artista} - ${song.musica}: ${error.message}`);
          continue;
        }

        const result = data as EnrichmentResult;
        
        // Classificar baseado na confiança
        if (result.confianca >= 85) {
          enriched.push({
            ...song,
            compositor: result.compositor,
            ano: result.ano,
            album: result.album || song.album,
            fonte: result.fonte
          });
        } else {
          forReview.push({
            ...song,
            compositor_sugerido: result.compositor,
            ano_sugerido: result.ano,
            album_sugerido: result.album,
            fonte: result.fonte,
            confianca: result.confianca,
            detalhes: result.detalhes
          });
        }

        // Rate limiting: 1.2s por música
        await new Promise(resolve => setTimeout(resolve, 1200));

      } catch (error) {
        console.error(`[Job ${jobId}] Erro ao processar ${song.artista} - ${song.musica}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        errors.push(`${song.artista} - ${song.musica}: ${errorMessage}`);
      }

      // Atualizar progresso a cada 10 músicas
      if ((i + 1) % 10 === 0 || i === toEnrich.length - 1) {
        await supabase
          .from('enrichment_jobs')
          .update({
            processed_songs: i + 1,
            auto_validated: enriched.length,
            needs_review: forReview.length,
            errors
          })
          .eq('id', jobId);
        
        console.log(`[Job ${jobId}] Progresso: ${i + 1}/${toEnrich.length}`);
      }
    }

    // 4. Criar backup do corpus original
    const backupPath = `backups/${corpusType}-original-${Date.now()}.txt`;
    const { error: backupError } = await supabase.storage
      .from('corpus')
      .upload(backupPath, corpusText, {
        contentType: 'text/plain',
        upsert: false
      });

    if (backupError) {
      console.error(`[Job ${jobId}] Erro ao criar backup:`, backupError);
    }

    // 5. Gerar CSV de revisão se necessário
    let reviewCsvUrl = null;
    if (forReview.length > 0) {
      const csv = generateReviewCSV(forReview);
      const csvPath = `review/${corpusType}-review-${jobId}.csv`;
      
      const { error: csvError } = await supabase.storage
        .from('corpus')
        .upload(csvPath, csv, {
          contentType: 'text/csv',
          upsert: false
        });

      if (!csvError) {
        const { data: publicUrl } = supabase.storage
          .from('corpus')
          .getPublicUrl(csvPath);
        reviewCsvUrl = publicUrl.publicUrl;
      }
    }

    // 6. Gerar corpus atualizado
    const updatedCorpus = updateCorpusWithEnrichedData(corpusText, enriched);
    const updatedPath = `full-text/${corpusType}-completo-updated-${jobId}.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('corpus')
      .upload(updatedPath, updatedCorpus, {
        contentType: 'text/plain',
        upsert: false
      });

    let updatedCorpusUrl = null;
    if (!uploadError) {
      const { data: publicUrl } = supabase.storage
        .from('corpus')
        .getPublicUrl(updatedPath);
      updatedCorpusUrl = publicUrl.publicUrl;
    }

    // 7. Finalizar job
    await supabase
      .from('enrichment_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        review_csv_url: reviewCsvUrl,
        updated_corpus_url: updatedCorpusUrl,
        backup_url: backupPath,
        metadata: {
          total_enriched: enriched.length,
          total_for_review: forReview.length,
          total_errors: errors.length
        }
      })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] Concluído com sucesso!`);

  } catch (error) {
    console.error(`[Job ${jobId}] Erro fatal:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    await supabase
      .from('enrichment_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: [errorMessage]
      })
      .eq('id', jobId);
  }
}

/**
 * Parse corpus text into song objects
 * Formato real do corpus:
 * Artista - Álbum Ano
 * Titulo_Ano
 * [letra da música]
 * ---------------
 */
function parseCorpus(text: string): any[] {
  const songs: any[] = [];
  const blocks = text.split('---------------').filter(b => b.trim());
  
  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) continue;
    
    // Linha 1: "Artista - Álbum Ano" ou "Artista - Álbum"
    const line1Match = lines[0].match(/^(.+?)\s+-\s+(.+?)(\d{4})?$/);
    if (!line1Match) continue;
    
    const artista = line1Match[1].trim();
    const albumInfo = line1Match[2].trim();
    const anoAlbum = line1Match[3] || '';
    
    // Linha 2: "Titulo_Ano" ou apenas "Titulo"
    const line2Parts = lines[1].split('_');
    const musica = line2Parts[0].trim();
    const anoMusica = line2Parts[1] ? line2Parts[1].trim() : anoAlbum;
    
    songs.push({
      artista,
      musica,
      compositor: '', // Sempre vazio no corpus atual - precisa enriquecimento
      ano: anoMusica,
      album: albumInfo
    });
  }
  
  console.log(`Parser identificou ${songs.length} músicas no corpus`);
  return songs;
}

function generateReviewCSV(songs: any[]): string {
  const headers = 'Artista,Música,Compositor Sugerido,Ano Sugerido,Álbum Sugerido,Fonte,Confiança,Detalhes\n';
  
  const rows = songs.map(s => {
    return [
      s.artista,
      s.musica,
      s.compositor_sugerido || '',
      s.ano_sugerido || '',
      s.album_sugerido || '',
      s.fonte || '',
      s.confianca || 0,
      (s.detalhes || '').replace(/,/g, ';')
    ].map(field => `"${field}"`).join(',');
  });
  
  return headers + rows.join('\n');
}

/**
 * Atualiza o corpus com dados enriquecidos
 * Mantém o formato original, apenas adicionando compositor quando encontrado
 */
function updateCorpusWithEnrichedData(originalText: string, enriched: any[]): string {
  let updatedText = originalText;
  
  for (const song of enriched) {
    // Procurar pelo bloco da música usando o separador
    const blocks = updatedText.split('---------------');
    
    for (let i = 0; i < blocks.length; i++) {
      const lines = blocks[i].trim().split('\n');
      if (lines.length < 2) continue;
      
      // Verificar se é o artista e música corretos
      const line1Match = lines[0].match(/^(.+?)\s+-\s+/);
      const line2 = lines[1].split('_')[0];
      
      if (line1Match && 
          line1Match[1].trim() === song.artista && 
          line2.trim() === song.musica) {
        
        // Atualizar linha 1 com compositor se encontrado
        if (song.compositor) {
          const anoInfo = song.ano ? ` ${song.ano}` : '';
          lines[0] = `${song.artista} - ${song.album || song.compositor}${anoInfo}`;
        }
        
        // Recompor o bloco
        blocks[i] = lines.join('\n');
        break;
      }
    }
    
    updatedText = blocks.join('---------------');
  }
  
  return updatedText;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
