import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SERTANEJO_CORPUS_ID = '3f8b9c1a-5d2e-4f6g-8h0i-1j2k3l4m5n6o'; // Will be created if not exists

// Normalize text for URL slug
function normalizeForUrl(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Normalize text for database comparison
function normalizeForDb(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Extract artist links from Letras.mus.br genre page
function extractArtistLinks(html: string): Array<{ name: string; url: string }> {
  const artists: Array<{ name: string; url: string }> = [];
  
  // Pattern for artist links in the ranking
  const pattern = /<a[^>]*href="\/([^/"]+)\/"[^>]*class="[^"]*art[^"]*"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = pattern.exec(html)) !== null) {
    const slug = match[1];
    const name = match[2].trim();
    
    // Skip if it's not an artist link
    if (slug && name && !slug.includes('/') && name.length > 1) {
      artists.push({
        name,
        url: `https://www.letras.mus.br/${slug}/`
      });
    }
  }

  // Fallback pattern
  if (artists.length === 0) {
    const fallbackPattern = /<li[^>]*>[\s\S]*?<a[^>]*href="\/([^/"]+)\/"[^>]*>([^<]+)<\/a>/gi;
    while ((match = fallbackPattern.exec(html)) !== null) {
      const slug = match[1];
      const name = match[2].trim();
      if (slug && name && !slug.includes('/') && name.length > 1) {
        artists.push({
          name,
          url: `https://www.letras.mus.br/${slug}/`
        });
      }
    }
  }

  return artists;
}

// Extract song links from artist page
function extractSongLinks(html: string, artistSlug: string): Array<{ title: string; url: string }> {
  const songs: Array<{ title: string; url: string }> = [];
  
  // Pattern for song links
  const pattern = new RegExp(`<a[^>]*href="\\/${artistSlug}\\/([^/"]+)\\/"[^>]*>([^<]+)<\\/a>`, 'gi');
  let match;
  
  while ((match = pattern.exec(html)) !== null) {
    const slug = match[1];
    const title = match[2].trim();
    
    if (slug && title && title.length > 1) {
      songs.push({
        title,
        url: `https://www.letras.mus.br/${artistSlug}/${slug}/`
      });
    }
  }

  return songs;
}

// Extract lyrics from song page
function extractLyrics(html: string): string | null {
  const patterns = [
    /<div[^>]*class="[^"]*lyric-original[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*cnt-letra[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistLimit = 25, songsPerArtist = 20 } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[scrape-sertanejo] Starting with artistLimit=${artistLimit}, songsPerArtist=${songsPerArtist}`);

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

    // Fetch artist list from Letras.mus.br sertanejo ranking
    console.log(`[scrape-sertanejo] Fetching artist list from Letras.mus.br`);
    const rankingResponse = await fetch('https://www.letras.mus.br/mais-acessadas/artistas/sertanejo/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!rankingResponse.ok) {
      throw new Error(`Failed to fetch artist ranking: ${rankingResponse.status}`);
    }

    const rankingHtml = await rankingResponse.text();
    const artistLinks = extractArtistLinks(rankingHtml).slice(0, artistLimit);

    console.log(`[scrape-sertanejo] Found ${artistLinks.length} artists to process`);

    let artistsCreated = 0;
    let songsCreated = 0;
    let songsWithLyrics = 0;
    const errors: string[] = [];

    // Process each artist
    for (const artistLink of artistLinks) {
      try {
        console.log(`[scrape-sertanejo] Processing artist: ${artistLink.name}`);

        // Check if artist already exists
        const normalizedName = normalizeForDb(artistLink.name);
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id')
          .eq('normalized_name', normalizedName)
          .single();

        let artistId: string;
        if (existingArtist) {
          artistId = existingArtist.id;
          console.log(`[scrape-sertanejo] Artist exists: ${artistLink.name}`);
        } else {
          // Create artist
          const { data: newArtist, error: artistError } = await supabase
            .from('artists')
            .insert({
              name: artistLink.name,
              normalized_name: normalizedName,
              genre: 'Sertanejo',
              corpus_id: corpusId
            })
            .select('id')
            .single();

          if (artistError) {
            errors.push(`Failed to create artist ${artistLink.name}: ${artistError.message}`);
            continue;
          }
          artistId = newArtist.id;
          artistsCreated++;
          console.log(`[scrape-sertanejo] Created artist: ${artistLink.name}`);
        }

        // Fetch artist page for songs
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
        const artistResponse = await fetch(artistLink.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
        });

        if (!artistResponse.ok) {
          errors.push(`Failed to fetch artist page ${artistLink.name}: ${artistResponse.status}`);
          continue;
        }

        const artistHtml = await artistResponse.text();
        const artistSlug = artistLink.url.match(/\/([^/]+)\/$/)?.[1] || '';
        const songLinks = extractSongLinks(artistHtml, artistSlug).slice(0, songsPerArtist);

        console.log(`[scrape-sertanejo] Found ${songLinks.length} songs for ${artistLink.name}`);

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
            console.log(`[scrape-sertanejo] Created song: ${songLink.title} ${lyrics ? '✅' : '❌'}`);

          } catch (songError) {
            errors.push(`Error processing song ${songLink.title}: ${songError instanceof Error ? songError.message : String(songError)}`);
          }
        }

      } catch (artistError) {
        errors.push(`Error processing artist ${artistLink.name}: ${artistError instanceof Error ? artistError.message : String(artistError)}`);
      }
    }

    console.log(`[scrape-sertanejo] Completed: ${artistsCreated} artists, ${songsCreated} songs, ${songsWithLyrics} with lyrics`);

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
    console.error('[scrape-sertanejo] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});