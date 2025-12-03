import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ============ CONFIGURAÇÃO ============
const ARTISTS_PER_CHUNK = 3; // Artistas por execução (evita timeout)
const DEFAULT_SONGS_PER_ARTIST = 15;

// ============ LISTA EXPANDIDA DE ARTISTAS (60+) ============
const TOP_SERTANEJO_ARTISTS = [
  // Top 30 mais populares
  { name: 'Henrique e Juliano', slug: 'henrique-e-juliano' },
  { name: 'Marília Mendonça', slug: 'marilia-mendonca' },
  { name: 'Jorge e Mateus', slug: 'jorge-mateus' },
  { name: 'Luan Santana', slug: 'luan-santana' },
  { name: 'Gusttavo Lima', slug: 'gusttavo-lima' },
  { name: 'Zé Neto e Cristiano', slug: 'ze-neto-e-cristiano' },
  { name: 'Maiara e Maraisa', slug: 'maiara-e-maraisa' },
  { name: 'Bruno e Marrone', slug: 'bruno-e-marrone' },
  { name: 'Leonardo', slug: 'leonardo' },
  { name: 'Wesley Safadão', slug: 'wesley-safadao' },
  { name: 'Chitãozinho e Xororó', slug: 'chitaozinho-e-xororo' },
  { name: 'Michel Teló', slug: 'michel-telo' },
  { name: 'Simone e Simaria', slug: 'simone-simaria' }, // CORRIGIDO
  { name: 'Paula Fernandes', slug: 'paula-fernandes' },
  { name: 'Cristiano Araújo', slug: 'cristiano-araujo' },
  { name: 'Ana Castela', slug: 'ana-castela' },
  { name: 'Murilo Huff', slug: 'murilo-huff' },
  { name: 'Diego e Victor Hugo', slug: 'diego-e-victor-hugo' },
  { name: 'João Bosco e Vinícius', slug: 'joao-bosco-vinicius' },
  { name: 'Fernando e Sorocaba', slug: 'fernando-e-sorocaba' },
  { name: 'Victor e Leo', slug: 'victor-e-leo' },
  { name: 'Zezé Di Camargo e Luciano', slug: 'zeze-di-camargo-e-luciano' },
  { name: 'Matheus e Kauan', slug: 'matheus-e-kauan' },
  { name: 'Israel e Rodolffo', slug: 'israel-e-rodolffo' },
  { name: 'Lauana Prado', slug: 'lauana-prado' },
  { name: 'Naiara Azevedo', slug: 'naiara-azevedo' },
  { name: 'Gustavo Mioto', slug: 'gustavo-mioto' },
  { name: 'Hugo e Guilherme', slug: 'hugo-e-guilherme' },
  { name: 'Léo Santana', slug: 'leo-santana' },
  { name: 'Menos é Mais', slug: 'menos-e-mais' },
  // 30+ artistas adicionais
  { name: 'Felipe Araújo', slug: 'felipe-araujo' },
  { name: 'Marcos e Belutti', slug: 'marcos-e-belutti' },
  { name: 'César Menotti e Fabiano', slug: 'cesar-menotti-e-fabiano' },
  { name: 'Maria Cecília e Rodolfo', slug: 'maria-cecilia-e-rodolfo' },
  { name: 'Jads e Jadson', slug: 'jads-e-jadson' },
  { name: 'Thaeme e Thiago', slug: 'thaeme-e-thiago' },
  { name: 'João Neto e Frederico', slug: 'joao-neto-e-frederico' },
  { name: 'Lucas Lucco', slug: 'lucas-lucco' },
  { name: 'Eduardo Costa', slug: 'eduardo-costa' },
  { name: 'Roberta Miranda', slug: 'roberta-miranda' },
  { name: 'Daniel', slug: 'daniel' },
  { name: 'Rick e Renner', slug: 'rick-e-renner' },
  { name: 'Edson e Hudson', slug: 'edson-e-hudson' },
  { name: 'Teodoro e Sampaio', slug: 'teodoro-e-sampaio' },
  { name: 'Gian e Giovani', slug: 'gian-e-giovani' },
  { name: 'Rio Negro e Solimões', slug: 'rio-negro-e-solimoes' },
  { name: 'Guilherme e Santiago', slug: 'guilherme-e-santiago' },
  { name: 'Leandro e Leonardo', slug: 'leandro-e-leonardo' },
  { name: 'Milionário e José Rico', slug: 'milionario-e-jose-rico' },
  { name: 'Chrystian e Ralf', slug: 'chrystian-e-ralf' },
  { name: 'Sergio Reis', slug: 'sergio-reis' },
  { name: 'Almir Sater', slug: 'almir-sater' },
  { name: 'Renato Teixeira', slug: 'renato-teixeira' },
  { name: 'Tonico e Tinoco', slug: 'tonico-e-tinoco' },
  { name: 'Inezita Barroso', slug: 'inezita-barroso' },
  { name: 'Padre Fábio de Melo', slug: 'padre-fabio-de-melo' },
  { name: 'Ney Matogrosso', slug: 'ney-matogrosso' },
  { name: 'Mariano', slug: 'mariano' },
  { name: 'Munhoz e Mariano', slug: 'munhoz-e-mariano' },
  { name: 'João Carreiro e Capataz', slug: 'joao-carreiro-e-capataz' },
];

// ============ NORMALIZAÇÃO ============
function normalizeForDb(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// ============ FETCH COM RETRY ============
async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    const delay = Math.min(500 * Math.pow(2, i), 2000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });
      
      if (response.ok) return response;
      if (response.status === 429) {
        console.log(`[scrape] Rate limited, waiting ${delay * 2}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * 2));
      }
    } catch (error) {
      console.warn(`[scrape] Fetch attempt ${i + 1} failed:`, error);
    }
  }
  return null;
}

// ============ EXTRAÇÃO DE MÚSICAS ============
function extractSongLinks(html: string, artistSlug: string): Array<{ title: string; url: string }> {
  const songs: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  
  const SKIP_TITLES = ['ver mais', 'carregar', 'top ', 'mais acessadas', 'tradução', 'cifra', 'álbum', 'álbuns'];
  
  const patterns = [
    new RegExp(`<a[^>]*href="\\/${artistSlug}\\/([^/"]+)\\/"[^>]*>([^<]+)<\\/a>`, 'gi'),
    new RegExp(`<a[^>]*href="\\/${artistSlug}\\/([^/"]+)\\/"[^>]*title="([^"]+)"[^>]*>`, 'gi'),
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const slug = match[1]?.trim();
      const title = match[2]?.trim();
      
      if (!slug || !title || title.length < 2) continue;
      if (seen.has(slug)) continue;
      
      const lowerTitle = title.toLowerCase();
      if (SKIP_TITLES.some(skip => lowerTitle.includes(skip))) continue;
      
      seen.add(slug);
      songs.push({ title, url: `https://www.letras.mus.br/${artistSlug}/${slug}/` });
    }
  }

  return songs;
}

// ============ EXTRAÇÃO DE LETRAS ============
function extractLyrics(html: string): string | null {
  const patterns = [
    /<div[^>]*class="[^"]*lyric-original[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*cnt-letra[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*letra[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let lyrics = match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (lyrics.length > 50) return lyrics;
    }
  }
  return null;
}

// ============ AUTO-INVOCAÇÃO ============
async function autoInvokeNextChunk(jobId: string, nextArtistIndex: number) {
  const MAX_RETRIES = 3;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[scrape] Auto-invocando próximo chunk (tentativa ${attempt})...`);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/scrape-sertanejo-artists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, continueFrom: { artistIndex: nextArtistIndex } }),
      });
      
      if (response.ok) {
        console.log(`[scrape] ✅ Auto-invocação bem-sucedida`);
        return true;
      }
    } catch (error) {
      console.warn(`[scrape] Auto-invocação falhou (tentativa ${attempt}):`, error);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  
  console.log(`[scrape] ⚠️ Todas as tentativas de auto-invocação falharam`);
  return false;
}

// ============ VERIFICAÇÕES ============
async function checkCancellation(supabase: any, jobId: string): Promise<boolean> {
  const { data } = await supabase
    .from('scraping_jobs')
    .select('is_cancelling, status')
    .eq('id', jobId)
    .single();
  
  return data?.is_cancelling || data?.status === 'cancelado';
}

async function acquireLock(supabase: any, jobId: string): Promise<boolean> {
  const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
  
  const { data, error } = await supabase
    .from('scraping_jobs')
    .update({ last_chunk_at: new Date().toISOString() })
    .eq('id', jobId)
    .or(`last_chunk_at.is.null,last_chunk_at.lte.${thirtySecondsAgo}`)
    .select();
  
  return !error && data && data.length > 0;
}

// ============ MAIN SERVER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      jobId,
      continueFrom,
      artistLimit = TOP_SERTANEJO_ARTISTS.length,
      songsPerArtist = DEFAULT_SONGS_PER_ARTIST 
    } = body;

    console.log(`[scrape] ========== INICIANDO ==========`);
    console.log(`[scrape] Params: jobId=${jobId}, continueFrom=${JSON.stringify(continueFrom)}`);

    // ============ CRIAR OU CONTINUAR JOB ============
    let job: any;
    let startIndex = 0;
    
    if (jobId && continueFrom) {
      // Continuar job existente
      const { data: existingJob, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error || !existingJob) {
        return new Response(
          JSON.stringify({ error: 'Job não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      job = existingJob;
      startIndex = continueFrom.artistIndex || job.current_artist_index;
      
      // Verificar cancelamento
      if (await checkCancellation(supabase, jobId)) {
        await supabase.from('scraping_jobs').update({ status: 'cancelado', completed_at: new Date().toISOString() }).eq('id', jobId);
        return new Response(JSON.stringify({ status: 'cancelled', jobId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Tentar adquirir lock
      if (!await acquireLock(supabase, jobId)) {
        console.log(`[scrape] Lock não adquirido, outro chunk em execução`);
        return new Response(JSON.stringify({ status: 'locked', jobId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Atualizar status para processando
      await supabase.from('scraping_jobs').update({ status: 'processando' }).eq('id', jobId);
      
    } else {
      // Criar novo job
      const totalArtists = Math.min(artistLimit, TOP_SERTANEJO_ARTISTS.length);
      
      const { data: newJob, error } = await supabase
        .from('scraping_jobs')
        .insert({
          corpus_type: 'sertanejo',
          total_artists: totalArtists,
          songs_per_artist: songsPerArtist,
          status: 'processando',
          config: { artistLimit, songsPerArtist }
        })
        .select()
        .single();
      
      if (error) throw new Error(`Falha ao criar job: ${error.message}`);
      job = newJob;
      console.log(`[scrape] ✅ Novo job criado: ${job.id}`);
    }

    // ============ GARANTIR CORPUS EXISTE ============
    let corpusId: string;
    const { data: existingCorpus } = await supabase
      .from('corpora')
      .select('id')
      .eq('normalized_name', 'sertanejo')
      .single();

    if (existingCorpus) {
      corpusId = existingCorpus.id;
    } else {
      const { data: newCorpus, error } = await supabase
        .from('corpora')
        .insert({
          name: 'Sertanejo',
          normalized_name: 'sertanejo',
          description: 'Corpus de música sertaneja brasileira',
          color: '#F59E0B',
          icon: 'Guitar',
          is_system: true
        })
        .select('id')
        .single();

      if (error) throw new Error(`Falha ao criar corpus: ${error.message}`);
      corpusId = newCorpus.id;
    }

    // ============ PROCESSAR CHUNK DE ARTISTAS ============
    const endIndex = Math.min(startIndex + ARTISTS_PER_CHUNK, job.total_artists);
    const artistsToProcess = TOP_SERTANEJO_ARTISTS.slice(startIndex, endIndex);
    
    console.log(`[scrape] Processando artistas ${startIndex + 1}-${endIndex} de ${job.total_artists}`);

    let artistsProcessed = 0;
    let artistsSkipped = 0;
    let songsCreated = 0;
    let songsWithLyrics = 0;

    for (const artist of artistsToProcess) {
      // Verificar cancelamento a cada artista
      if (await checkCancellation(supabase, job.id)) {
        console.log(`[scrape] Cancelamento detectado, interrompendo...`);
        break;
      }

      try {
        console.log(`[scrape] Processando: ${artist.name}`);
        
        // Verificar se artista já existe
        const normalizedName = normalizeForDb(artist.name);
        let artistId: string;
        
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id')
          .eq('normalized_name', normalizedName)
          .single();

        if (existingArtist) {
          artistId = existingArtist.id;
          
          // Verificar se já tem músicas suficientes
          const { count } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .eq('artist_id', artistId)
            .eq('corpus_id', corpusId);
          
          if ((count || 0) >= job.songs_per_artist) {
            console.log(`[scrape] ⏭️ ${artist.name} já tem ${count} músicas, pulando`);
            artistsSkipped++;
            artistsProcessed++;
            continue;
          }
        } else {
          // Criar artista
          const { data: newArtist, error } = await supabase
            .from('artists')
            .insert({
              name: artist.name,
              normalized_name: normalizedName,
              genre: 'Sertanejo',
              corpus_id: corpusId
            })
            .select('id')
            .single();

          if (error) {
            console.warn(`[scrape] Falha ao criar ${artist.name}: ${error.message}`);
            continue;
          }
          artistId = newArtist.id;
        }

        // Buscar página do artista
        const artistUrl = `https://www.letras.mus.br/${artist.slug}/`;
        const artistResponse = await fetchWithRetry(artistUrl);
        
        if (!artistResponse) {
          console.warn(`[scrape] Falha ao buscar ${artist.name}`);
          artistsProcessed++;
          continue;
        }

        const artistHtml = await artistResponse.text();
        const songLinks = extractSongLinks(artistHtml, artist.slug).slice(0, job.songs_per_artist);
        
        console.log(`[scrape] ${artist.name}: ${songLinks.length} músicas encontradas`);

        // Processar músicas
        for (const songLink of songLinks) {
          const normalizedTitle = normalizeForDb(songLink.title);
          
          // Verificar se música já existe
          const { data: existingSong } = await supabase
            .from('songs')
            .select('id')
            .eq('artist_id', artistId)
            .eq('normalized_title', normalizedTitle)
            .single();

          if (existingSong) continue;

          // Buscar letra
          const songResponse = await fetchWithRetry(songLink.url);
          let lyrics: string | null = null;
          
          if (songResponse) {
            const songHtml = await songResponse.text();
            lyrics = extractLyrics(songHtml);
          }

          // Criar música
          const { error: songError } = await supabase
            .from('songs')
            .insert({
              title: songLink.title,
              normalized_title: normalizedTitle,
              artist_id: artistId,
              corpus_id: corpusId,
              lyrics,
              lyrics_source: lyrics ? 'letras.mus.br' : null,
              lyrics_url: lyrics ? songLink.url : null,
              status: 'pending'
            });

          if (!songError) {
            songsCreated++;
            if (lyrics) songsWithLyrics++;
          }
        }

        artistsProcessed++;
        
      } catch (error) {
        console.warn(`[scrape] Erro em ${artist.name}:`, error);
        artistsProcessed++;
      }

      // Atualizar progresso no banco
      await supabase.from('scraping_jobs').update({
        current_artist_index: startIndex + artistsProcessed,
        artists_processed: (job.artists_processed || 0) + artistsProcessed,
        artists_skipped: (job.artists_skipped || 0) + artistsSkipped,
        songs_created: (job.songs_created || 0) + songsCreated,
        songs_with_lyrics: (job.songs_with_lyrics || 0) + songsWithLyrics,
        chunks_processed: (job.chunks_processed || 0) + 1,
      }).eq('id', job.id);
    }

    // ============ VERIFICAR SE TEM MAIS ============
    const nextArtistIndex = startIndex + artistsProcessed;
    const hasMore = nextArtistIndex < job.total_artists && !await checkCancellation(supabase, job.id);

    if (hasMore) {
      // Auto-invocar próximo chunk
      const autoInvoked = await autoInvokeNextChunk(job.id, nextArtistIndex);
      
      if (!autoInvoked) {
        // Se auto-invocação falhou, marcar como pausado (GitHub Actions vai retomar)
        await supabase.from('scraping_jobs').update({ status: 'pausado' }).eq('id', job.id);
      }
    } else {
      // Job concluído
      await supabase.from('scraping_jobs').update({
        status: 'concluido',
        completed_at: new Date().toISOString()
      }).eq('id', job.id);
      
      console.log(`[scrape] ✅ JOB CONCLUÍDO!`);
    }

    // ============ BUSCAR DADOS FINAIS ============
    const { data: finalJob } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', job.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        status: finalJob?.status,
        progress: {
          currentIndex: nextArtistIndex,
          total: job.total_artists,
          percentage: Math.round((nextArtistIndex / job.total_artists) * 100)
        },
        stats: {
          artistsProcessed: finalJob?.artists_processed || 0,
          artistsSkipped: finalJob?.artists_skipped || 0,
          songsCreated: finalJob?.songs_created || 0,
          songsWithLyrics: finalJob?.songs_with_lyrics || 0,
        },
        hasMore,
        nextArtistIndex: hasMore ? nextArtistIndex : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[scrape] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
