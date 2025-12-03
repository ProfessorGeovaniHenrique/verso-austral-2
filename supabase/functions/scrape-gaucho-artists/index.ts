import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ============ CONFIGURAÇÃO ============
const ARTISTS_PER_CHUNK = 2; // Menos artistas por chunk (site mais lento)
const DEFAULT_SONGS_PER_ARTIST = 20;
const BASE_URL = 'https://musicatradicionalista.com.br';

// ============ NORMALIZAÇÃO ============
function normalizeForDb(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// ============ FETCH COM RETRY ============
async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    const delay = Math.min(800 * Math.pow(2, i), 4000);
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
        console.log(`[scrape-gaucho] Rate limited, waiting ${delay * 2}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * 2));
      }
    } catch (error) {
      console.warn(`[scrape-gaucho] Fetch attempt ${i + 1} failed:`, error);
    }
  }
  return null;
}

// ============ EXTRAIR LISTA DE ARTISTAS DO SITE ============
async function fetchArtistsList(): Promise<Array<{ name: string; url: string }>> {
  const response = await fetchWithRetry(`${BASE_URL}/artistas`);
  if (!response) return [];
  
  const html = await response.text();
  const artists: Array<{ name: string; url: string }> = [];
  const seen = new Set<string>();
  
  // Pattern: <a href="https://musicatradicionalista.com.br/artista/83/adair-de-freitas" data-nome="adair de freitas">Adair de Freitas</a>
  const pattern = /<a\s+href="(https:\/\/musicatradicionalista\.com\.br\/artista\/\d+\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = match[1];
    const name = match[2].trim();
    
    if (!seen.has(url) && name.length > 1) {
      seen.add(url);
      artists.push({ name, url });
    }
  }
  
  console.log(`[scrape-gaucho] Encontrados ${artists.length} artistas no site`);
  return artists;
}

// ============ EXTRAIR ÁLBUNS DE UM ARTISTA ============
async function fetchArtistAlbums(artistUrl: string): Promise<Array<{ title: string; url: string; year: string }>> {
  const response = await fetchWithRetry(artistUrl);
  if (!response) return [];
  
  const html = await response.text();
  const albums: Array<{ title: string; url: string; year: string }> = [];
  const seen = new Set<string>();
  
  // Pattern: <a href="https://musicatradicionalista.com.br/album/597/...">
  const albumPattern = /<a\s+href="(https:\/\/musicatradicionalista\.com\.br\/album\/\d+\/[^"]+)"[^>]*>/gi;
  const yearPattern = /<span[^>]*class="[^"]*album-year[^"]*"[^>]*>(\d{4})<\/span>/gi;
  
  let match;
  while ((match = albumPattern.exec(html)) !== null) {
    const url = match[1];
    if (!seen.has(url)) {
      seen.add(url);
      
      // Tentar extrair ano do contexto próximo
      const contextStart = Math.max(0, match.index - 200);
      const contextEnd = Math.min(html.length, match.index + 500);
      const context = html.substring(contextStart, contextEnd);
      const yearMatch = context.match(/<span[^>]*>(\d{4})<\/span>/);
      
      albums.push({ 
        title: url.split('/').pop() || '', 
        url, 
        year: yearMatch?.[1] || '' 
      });
    }
  }
  
  return albums;
}

// ============ EXTRAIR MÚSICAS DE UM ÁLBUM ============
async function fetchAlbumSongs(albumUrl: string): Promise<Array<{ title: string; url: string; hasLyrics: boolean }>> {
  const response = await fetchWithRetry(albumUrl);
  if (!response) return [];
  
  const html = await response.text();
  const songs: Array<{ title: string; url: string; hasLyrics: boolean }> = [];
  const seen = new Set<string>();
  
  // Pattern: <a href="https://musicatradicionalista.com.br/musica/2851/letra-meu-canto">...</a> 📜
  const songPattern = /<li[^>]*class="[^"]*list-group-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  
  let match;
  while ((match = songPattern.exec(html)) !== null) {
    const liContent = match[1];
    
    const linkMatch = liContent.match(/<a\s+href="(https:\/\/musicatradicionalista\.com\.br\/musica\/\d+\/[^"]+)"[^>]*>[\s\S]*?<\/a>/i);
    if (!linkMatch) continue;
    
    const url = linkMatch[0].match(/href="([^"]+)"/)?.[1] || '';
    const titleMatch = linkMatch[0].match(/<\/span>\s*([^<]+)<\/a>/);
    const title = titleMatch?.[1]?.trim() || '';
    
    // 📜 indica que tem letra
    const hasLyrics = liContent.includes('📜');
    
    if (url && title && !seen.has(url)) {
      seen.add(url);
      songs.push({ title, url, hasLyrics });
    }
  }
  
  return songs;
}

// ============ EXTRAIR LETRA DE UMA MÚSICA ============
async function fetchSongLyrics(songUrl: string): Promise<{ lyrics: string | null; composer: string | null }> {
  const response = await fetchWithRetry(songUrl);
  if (!response) return { lyrics: null, composer: null };
  
  const html = await response.text();
  
  // Extrair letra do div#text-content
  let lyrics: string | null = null;
  const lyricsMatch = html.match(/<div[^>]*id="text-content"[^>]*>([\s\S]*?)<\/div>/i);
  if (lyricsMatch) {
    lyrics = lyricsMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    if (lyrics.length < 30) lyrics = null;
  }
  
  // Compositor geralmente não está disponível neste site
  // Mas podemos tentar extrair se existir
  let composer: string | null = null;
  const composerMatch = html.match(/Composi[çc][aã]o:\s*([^<\n]+)/i);
  if (composerMatch) {
    composer = composerMatch[1].trim();
    if (composer.length < 2 || composer.length > 200) composer = null;
  }
  
  return { lyrics, composer };
}

// ============ AUTO-INVOCAÇÃO ============
async function autoInvokeNextChunk(jobId: string, nextArtistIndex: number) {
  const MAX_RETRIES = 3;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[scrape-gaucho] Auto-invocando próximo chunk (tentativa ${attempt})...`);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/scrape-gaucho-artists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, continueFrom: { artistIndex: nextArtistIndex } }),
      });
      
      if (response.ok) {
        console.log(`[scrape-gaucho] ✅ Auto-invocação bem-sucedida`);
        return true;
      }
    } catch (error) {
      console.warn(`[scrape-gaucho] Auto-invocação falhou (tentativa ${attempt}):`, error);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  
  console.log(`[scrape-gaucho] ⚠️ Todas as tentativas de auto-invocação falharam`);
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
      artistLimit = 100,
      songsPerArtist = DEFAULT_SONGS_PER_ARTIST 
    } = body;

    console.log(`[scrape-gaucho] ========== INICIANDO ==========`);
    console.log(`[scrape-gaucho] Params: jobId=${jobId}, continueFrom=${JSON.stringify(continueFrom)}`);

    // Buscar lista de artistas do site
    const allArtists = await fetchArtistsList();
    if (allArtists.length === 0) {
      throw new Error('Não foi possível obter lista de artistas do site');
    }

    // ============ CRIAR OU CONTINUAR JOB ============
    let job: any;
    let startIndex = 0;
    
    if (jobId && continueFrom) {
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
      
      if (await checkCancellation(supabase, jobId)) {
        await supabase.from('scraping_jobs').update({ status: 'cancelado', completed_at: new Date().toISOString() }).eq('id', jobId);
        return new Response(JSON.stringify({ status: 'cancelled', jobId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (!await acquireLock(supabase, jobId)) {
        console.log(`[scrape-gaucho] Lock não adquirido, outro chunk em execução`);
        return new Response(JSON.stringify({ status: 'locked', jobId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      await supabase.from('scraping_jobs').update({ status: 'processando' }).eq('id', jobId);
      
    } else {
      const totalArtists = Math.min(artistLimit, allArtists.length);
      
      const { data: newJob, error } = await supabase
        .from('scraping_jobs')
        .insert({
          corpus_type: 'gaucho',
          total_artists: totalArtists,
          songs_per_artist: songsPerArtist,
          status: 'processando',
          config: { artistLimit, songsPerArtist, source: 'musicatradicionalista.com.br' }
        })
        .select()
        .single();
      
      if (error) throw new Error(`Falha ao criar job: ${error.message}`);
      job = newJob;
      console.log(`[scrape-gaucho] ✅ Novo job criado: ${job.id}`);
    }

    // ============ GARANTIR CORPUS EXISTE ============
    let corpusId: string;
    const { data: existingCorpus } = await supabase
      .from('corpora')
      .select('id')
      .eq('normalized_name', 'gaucho')
      .single();

    if (existingCorpus) {
      corpusId = existingCorpus.id;
    } else {
      const { data: newCorpus, error } = await supabase
        .from('corpora')
        .insert({
          name: 'Gaúcho',
          normalized_name: 'gaucho',
          description: 'Corpus de música tradicionalista gaúcha',
          color: '#059669',
          icon: 'Leaf',
          is_system: true
        })
        .select('id')
        .single();

      if (error) throw new Error(`Falha ao criar corpus: ${error.message}`);
      corpusId = newCorpus.id;
    }

    // ============ PROCESSAR CHUNK DE ARTISTAS ============
    const endIndex = Math.min(startIndex + ARTISTS_PER_CHUNK, job.total_artists);
    const artistsToProcess = allArtists.slice(startIndex, endIndex);
    
    console.log(`[scrape-gaucho] Processando artistas ${startIndex + 1}-${endIndex} de ${job.total_artists}`);

    let artistsProcessed = 0;
    let artistsSkipped = 0;
    let songsCreated = 0;
    let songsWithLyrics = 0;

    for (const artist of artistsToProcess) {
      if (await checkCancellation(supabase, job.id)) {
        console.log(`[scrape-gaucho] Cancelamento detectado, interrompendo...`);
        break;
      }

      try {
        console.log(`[scrape-gaucho] Processando: ${artist.name}`);
        
        const normalizedName = normalizeForDb(artist.name);
        let artistId: string;
        
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id')
          .eq('normalized_name', normalizedName)
          .single();

        if (existingArtist) {
          artistId = existingArtist.id;
          
          const { count } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .eq('artist_id', artistId)
            .eq('corpus_id', corpusId);
          
          if ((count || 0) >= songsPerArtist) {
            console.log(`[scrape-gaucho] ⏭️ ${artist.name} já tem ${count} músicas, pulando`);
            artistsSkipped++;
            artistsProcessed++;
            continue;
          }
        } else {
          const { data: newArtist, error } = await supabase
            .from('artists')
            .insert({
              name: artist.name,
              normalized_name: normalizedName,
              corpus_id: corpusId,
              genre: 'Tradicionalista Gaúcha'
            })
            .select('id')
            .single();

          if (error) {
            console.error(`[scrape-gaucho] Erro ao criar artista: ${error.message}`);
            continue;
          }
          artistId = newArtist.id;
        }

        // Buscar álbuns do artista
        const albums = await fetchArtistAlbums(artist.url);
        console.log(`[scrape-gaucho] ${artist.name}: ${albums.length} álbuns encontrados`);

        let songsForArtist = 0;
        
        for (const album of albums) {
          if (songsForArtist >= songsPerArtist) break;
          
          const songs = await fetchAlbumSongs(album.url);
          
          for (const song of songs) {
            if (songsForArtist >= songsPerArtist) break;
            
            const normalizedTitle = normalizeForDb(song.title);
            
            // Verificar se música já existe
            const { data: existingSong } = await supabase
              .from('songs')
              .select('id')
              .eq('normalized_title', normalizedTitle)
              .eq('artist_id', artistId)
              .single();
            
            if (existingSong) continue;
            
            // Buscar letra se indicado
            let lyrics: string | null = null;
            let composer: string | null = null;
            
            if (song.hasLyrics) {
              const lyricsData = await fetchSongLyrics(song.url);
              lyrics = lyricsData.lyrics;
              composer = lyricsData.composer;
            }
            
            // Inserir música
            const { error: insertError } = await supabase
              .from('songs')
              .insert({
                title: song.title,
                normalized_title: normalizedTitle,
                artist_id: artistId,
                corpus_id: corpusId,
                lyrics: lyrics,
                composer: composer,
                album: album.title.replace(/-/g, ' '),
                release_year: album.year || null,
                status: lyrics ? 'enriched' : 'pending',
                lyrics_source: lyrics ? 'musicatradicionalista.com.br' : null,
                lyrics_source_url: song.url,
              });
            
            if (!insertError) {
              songsCreated++;
              songsForArtist++;
              if (lyrics) songsWithLyrics++;
            }
          }
          
          // Delay entre álbuns
          await new Promise(r => setTimeout(r, 500));
        }
        
        artistsProcessed++;
        console.log(`[scrape-gaucho] ✅ ${artist.name}: ${songsForArtist} músicas adicionadas`);
        
      } catch (error) {
        console.error(`[scrape-gaucho] Erro ao processar ${artist.name}:`, error);
        artistsProcessed++;
      }
      
      // Delay entre artistas
      await new Promise(r => setTimeout(r, 1000));
    }

    // ============ ATUALIZAR JOB ============
    const newArtistIndex = startIndex + artistsProcessed;
    const isComplete = newArtistIndex >= job.total_artists || await checkCancellation(supabase, job.id);
    
    await supabase
      .from('scraping_jobs')
      .update({
        current_artist_index: newArtistIndex,
        artists_processed: (job.artists_processed || 0) + artistsProcessed,
        artists_skipped: (job.artists_skipped || 0) + artistsSkipped,
        songs_created: (job.songs_created || 0) + songsCreated,
        songs_with_lyrics: (job.songs_with_lyrics || 0) + songsWithLyrics,
        chunks_processed: (job.chunks_processed || 0) + 1,
        status: isComplete ? 'concluido' : 'processando',
        completed_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Auto-invocar próximo chunk
    if (!isComplete) {
      await autoInvokeNextChunk(job.id, newArtistIndex);
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        status: isComplete ? 'completed' : 'processing',
        progress: {
          artistsProcessed: newArtistIndex,
          totalArtists: job.total_artists,
          songsCreated,
          songsWithLyrics,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[scrape-gaucho] ERRO:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
