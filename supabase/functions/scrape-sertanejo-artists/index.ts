import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ============ LISTA MANUAL DE ARTISTAS TOP SERTANEJO ============
const TOP_SERTANEJO_ARTISTS = [
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
  { name: 'Simone e Simaria', slug: 'simone-e-simaria' },
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
  { name: 'Léo Santana', slug: 'leo-santana' },
  { name: 'Gustavo Mioto', slug: 'gustavo-mioto' },
  { name: 'Hugo e Guilherme', slug: 'hugo-e-guilherme' },
  { name: 'Menos é Mais', slug: 'menos-e-mais' },
];

// ============ NORMALIZAÇÃO ============
function normalizeForDb(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ============ EXTRAÇÃO DE MÚSICAS ============
function extractSongLinks(html: string, artistSlug: string): Array<{ title: string; url: string }> {
  const songs: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  
  // Multiple patterns for song extraction
  const patterns = [
    // Pattern 1: Direct song links with artist slug
    new RegExp(`<a[^>]*href="\\/${artistSlug}\\/([^/"]+)\\/"[^>]*>([^<]+)<\\/a>`, 'gi'),
    // Pattern 2: Song links with title attribute
    new RegExp(`<a[^>]*href="\\/${artistSlug}\\/([^/"]+)\\/"[^>]*title="([^"]+)"[^>]*>`, 'gi'),
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const slug = match[1]?.trim();
      const title = match[2]?.trim();
      
      if (!slug || !title || title.length < 2) continue;
      if (seen.has(slug)) continue;
      
      // Skip navigation-like entries
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('ver mais') || lowerTitle.includes('carregar') || 
          lowerTitle.includes('top ') || lowerTitle.includes('mais acessadas')) continue;
      
      seen.add(slug);
      songs.push({
        title,
        url: `https://www.letras.mus.br/${artistSlug}/${slug}/`
      });
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
    /<div[^>]*id="[^"]*letra[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
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

      if (lyrics.length > 50) {
        return lyrics;
      }
    }
  }
  return null;
}

// ============ MAIN SERVER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistLimit = 25, songsPerArtist = 20 } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[scrape-sertanejo] ========== STARTING ==========`);
    console.log(`[scrape-sertanejo] Config: artistLimit=${artistLimit}, songsPerArtist=${songsPerArtist}`);

    // Ensure Sertanejo corpus exists
    const { data: existingCorpus } = await supabase
      .from('corpora')
      .select('id')
      .eq('normalized_name', 'sertanejo')
      .single();

    let corpusId: string;
    if (existingCorpus) {
      corpusId = existingCorpus.id;
      console.log(`[scrape-sertanejo] Using existing Sertanejo corpus: ${corpusId}`);
    } else {
      const { data: newCorpus, error: corpusError } = await supabase
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

      if (corpusError) throw new Error(`Failed to create corpus: ${corpusError.message}`);
      corpusId = newCorpus.id;
      console.log(`[scrape-sertanejo] Created Sertanejo corpus: ${corpusId}`);
    }

    // USE MANUAL ARTIST LIST (SPA pages can't be scraped)
    const artistsToProcess = TOP_SERTANEJO_ARTISTS.slice(0, artistLimit);
    console.log(`[scrape-sertanejo] Using manual artist list: ${artistsToProcess.length} artists`);
    console.log(`[scrape-sertanejo] Artists: ${artistsToProcess.map(a => a.name).join(', ')}`);

    let artistsCreated = 0;
    let songsCreated = 0;
    let songsWithLyrics = 0;
    const errors: string[] = [];

    // Process each artist
    for (const artist of artistsToProcess) {
      try {
        console.log(`[scrape-sertanejo] Processing artist: ${artist.name}`);

        // Check if artist already exists
        const normalizedName = normalizeForDb(artist.name);
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id')
          .eq('normalized_name', normalizedName)
          .single();

        let artistId: string;
        if (existingArtist) {
          artistId = existingArtist.id;
          console.log(`[scrape-sertanejo] Artist exists: ${artist.name} (${artistId})`);
        } else {
          // Create artist
          const { data: newArtist, error: artistError } = await supabase
            .from('artists')
            .insert({
              name: artist.name,
              normalized_name: normalizedName,
              genre: 'Sertanejo',
              corpus_id: corpusId
            })
            .select('id')
            .single();

          if (artistError) {
            errors.push(`Failed to create artist ${artist.name}: ${artistError.message}`);
            continue;
          }
          artistId = newArtist.id;
          artistsCreated++;
          console.log(`[scrape-sertanejo] ✓ Created artist: ${artist.name} (${artistId})`);
        }

        // Fetch artist page for songs
        const artistUrl = `https://www.letras.mus.br/${artist.slug}/`;
        console.log(`[scrape-sertanejo] Fetching: ${artistUrl}`);
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
        const artistResponse = await fetch(artistUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
        });

        if (!artistResponse.ok) {
          errors.push(`Failed to fetch artist page ${artist.name}: ${artistResponse.status}`);
          console.log(`[scrape-sertanejo] ✗ Failed to fetch ${artist.name}: ${artistResponse.status}`);
          continue;
        }

        const artistHtml = await artistResponse.text();
        console.log(`[scrape-sertanejo] Artist page HTML: ${artistHtml.length} bytes`);
        
        const songLinks = extractSongLinks(artistHtml, artist.slug).slice(0, songsPerArtist);
        console.log(`[scrape-sertanejo] Found ${songLinks.length} songs for ${artist.name}`);

        if (songLinks.length === 0) {
          console.log(`[scrape-sertanejo] WARNING: No songs found for ${artist.name}`);
          console.log(`[scrape-sertanejo] HTML snippet: ${artistHtml.substring(0, 2000)}`);
        }

        // Process each song
        for (const songLink of songLinks) {
          try {
            // Check if song already exists
            const normalizedTitle = normalizeForDb(songLink.title);
            const { data: existingSong } = await supabase
              .from('songs')
              .select('id')
              .eq('artist_id', artistId)
              .eq('normalized_title', normalizedTitle)
              .single();

            if (existingSong) {
              console.log(`[scrape-sertanejo] Song exists: ${songLink.title}`);
              continue;
            }

            // Fetch song page for lyrics
            await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit
            const songResponse = await fetch(songLink.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'pt-BR,pt;q=0.9',
              },
            });

            let lyrics: string | null = null;
            if (songResponse.ok) {
              const songHtml = await songResponse.text();
              lyrics = extractLyrics(songHtml);
            }

            // Create song
            const { error: songError } = await supabase
              .from('songs')
              .insert({
                title: songLink.title,
                normalized_title: normalizedTitle,
                artist_id: artistId,
                corpus_id: corpusId,
                lyrics: lyrics,
                lyrics_source: lyrics ? 'letras.mus.br' : null,
                lyrics_url: lyrics ? songLink.url : null,
                status: 'pending'
              });

            if (songError) {
              errors.push(`Failed to create song ${songLink.title}: ${songError.message}`);
              continue;
            }

            songsCreated++;
            if (lyrics) songsWithLyrics++;
            console.log(`[scrape-sertanejo] ✓ Song: ${songLink.title} ${lyrics ? '(with lyrics)' : '(no lyrics)'}`);

          } catch (songError) {
            errors.push(`Error processing song ${songLink.title}: ${songError instanceof Error ? songError.message : String(songError)}`);
          }
        }

      } catch (artistError) {
        errors.push(`Error processing artist ${artist.name}: ${artistError instanceof Error ? artistError.message : String(artistError)}`);
      }
    }

    console.log(`[scrape-sertanejo] ========== COMPLETED ==========`);
    console.log(`[scrape-sertanejo] Results: ${artistsCreated} artists, ${songsCreated} songs, ${songsWithLyrics} with lyrics`);

    return new Response(
      JSON.stringify({
        corpusId,
        artistsCreated,
        songsCreated,
        songsWithLyrics,
        errors: errors.slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[scrape-sertanejo] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
