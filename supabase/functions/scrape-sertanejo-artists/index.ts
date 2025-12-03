import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ============ LISTA DE EXCLUSÃO DE NAVEGAÇÃO ============
const NAVIGATION_KEYWORDS = [
  'top músicas', 'top artistas', 'top álbuns', 'top letras',
  'envie letras', 'envie álbuns', 'correções de letras',
  'mais acessadas', 'mais acessados', 'estilos', 'rankings',
  'traduções', 'cifras', 'playlists', 'aplicativos',
  'letras.mus.br', 'sobre nós', 'contato', 'privacidade',
  'termos de uso', 'ajuda', 'faq', 'login', 'cadastro',
  'ver todos', 'ver mais', 'mostrar mais', 'carregar mais'
];

const NAVIGATION_SLUGS = [
  'mais-acessadas', 'top-artistas', 'top-musicas', 'top-albuns',
  'estilos', 'rankings', 'traducoes', 'cifras', 'playlists',
  'aplicativos', 'sobre', 'contato', 'privacidade', 'termos',
  'ajuda', 'faq', 'login', 'cadastro', 'busca', 'search'
];

function isNavigationLink(name: string, slug: string): boolean {
  const normalizedName = name.toLowerCase().trim();
  const normalizedSlug = slug.toLowerCase().trim();
  
  // Check name against keywords
  if (NAVIGATION_KEYWORDS.some(kw => normalizedName.includes(kw))) {
    return true;
  }
  
  // Check slug against navigation slugs
  if (NAVIGATION_SLUGS.some(ns => normalizedSlug === ns || normalizedSlug.startsWith(ns + '-'))) {
    return true;
  }
  
  return false;
}

function isValidArtistSlug(slug: string): boolean {
  // Must be lowercase alphanumeric with hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  
  // Must be at least 2 characters
  if (slug.length < 2) return false;
  
  // Slugs too short without hyphens are suspicious
  if (!slug.includes('-') && slug.length < 4) return false;
  
  // Skip slugs starting with common non-artist patterns
  const invalidPrefixes = ['mais-', 'top-', 'ver-', 'busca-', 'search-', 'app-', 'play-'];
  if (invalidPrefixes.some(p => slug.startsWith(p))) return false;
  
  return true;
}

// ============ NORMALIZAÇÃO ============
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

function normalizeForDb(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ============ EXTRAÇÃO DE ARTISTAS ============
function extractArtistLinks(html: string): Array<{ name: string; url: string }> {
  const artists: Array<{ name: string; url: string }> = [];
  const seen = new Set<string>();
  
  // Log HTML length and snippet for debugging
  console.log(`[scrape-sertanejo] HTML length: ${html.length}`);
  console.log(`[scrape-sertanejo] HTML snippet (first 2000 chars):\n${html.substring(0, 2000)}`);
  
  // Multiple patterns to try, from most specific to more general
  const patterns = [
    // Pattern 1: Links in list-row items (ranking lists)
    /<li[^>]*class="[^"]*list-row[^"]*"[^>]*>[\s\S]*?<a[^>]*href="\/([^/"]+)\/"[^>]*>([^<]+)<\/a>/gi,
    
    // Pattern 2: Links with artist class
    /<a[^>]*href="\/([^/"]+)\/"[^>]*class="[^"]*art[^"]*"[^>]*>([^<]+)<\/a>/gi,
    
    // Pattern 3: Links inside cnt-list container
    /<div[^>]*class="[^"]*cnt-list[^"]*"[^>]*>[\s\S]*?<a[^>]*href="\/([^/"]+)\/"[^>]*>([^<]+)<\/a>/gi,
    
    // Pattern 4: Links in ordered/unordered lists
    /<[ou]l[^>]*>[\s\S]*?<li[^>]*>[\s\S]*?<a[^>]*href="\/([^/"]+)\/"[^>]*>([^<]+)<\/a>/gi,
    
    // Pattern 5: Generic artist-like links (more flexible)
    /<a[^>]*href="\/([a-z0-9-]+)\/"[^>]*title="([^"]+)"[^>]*>/gi,
    
    // Pattern 6: Final fallback - any link to root-level slug
    /<a[^>]*href="\/([a-z0-9][a-z0-9-]+[a-z0-9])\/"[^>]*>([^<]+)<\/a>/gi,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    let match;
    let matchCount = 0;
    
    while ((match = pattern.exec(html)) !== null) {
      const slug = match[1]?.trim();
      const name = match[2]?.trim();
      
      matchCount++;
      
      // Skip invalid entries
      if (!slug || !name) continue;
      if (name.length < 2 || name.length > 100) continue;
      
      // Skip navigation links
      if (isNavigationLink(name, slug)) {
        console.log(`[scrape-sertanejo] Skipped navigation: "${name}" (${slug})`);
        continue;
      }
      
      // Validate slug format
      if (!isValidArtistSlug(slug)) {
        console.log(`[scrape-sertanejo] Invalid slug: "${slug}"`);
        continue;
      }
      
      // Deduplicate
      if (seen.has(slug)) continue;
      
      seen.add(slug);
      artists.push({
        name,
        url: `https://www.letras.mus.br/${slug}/`
      });
      
      console.log(`[scrape-sertanejo] ✓ Found artist: "${name}" -> /${slug}/`);
    }
    
    console.log(`[scrape-sertanejo] Pattern ${i + 1} matched ${matchCount} times, ${artists.length} valid artists so far`);
    
    // If we found enough artists with a specific pattern, stop
    if (artists.length >= 10) {
      console.log(`[scrape-sertanejo] Found sufficient artists with pattern ${i + 1}, stopping search`);
      break;
    }
  }

  console.log(`[scrape-sertanejo] Total artists extracted: ${artists.length}`);
  console.log(`[scrape-sertanejo] Artists list:`, artists.map(a => a.name).join(', '));

  return artists;
}

// ============ EXTRAÇÃO DE MÚSICAS ============
function extractSongLinks(html: string, artistSlug: string): Array<{ title: string; url: string }> {
  const songs: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  
  // Pattern for song links - songs have format /artist-slug/song-slug/
  const pattern = new RegExp(`<a[^>]*href="\\/${artistSlug}\\/([^/"]+)\\/"[^>]*>([^<]+)<\\/a>`, 'gi');
  let match;
  
  while ((match = pattern.exec(html)) !== null) {
    const slug = match[1]?.trim();
    const title = match[2]?.trim();
    
    if (!slug || !title || title.length < 2) continue;
    if (seen.has(slug)) continue;
    
    // Skip navigation-like song titles
    if (isNavigationLink(title, slug)) continue;
    
    seen.add(slug);
    songs.push({
      title,
      url: `https://www.letras.mus.br/${artistSlug}/${slug}/`
    });
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

    // Fetch artist list from Letras.mus.br sertanejo ranking
    const rankingUrl = 'https://www.letras.mus.br/mais-acessadas/artistas/sertanejo/';
    console.log(`[scrape-sertanejo] Fetching: ${rankingUrl}`);
    
    const rankingResponse = await fetch(rankingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    });

    console.log(`[scrape-sertanejo] Ranking response status: ${rankingResponse.status}`);

    if (!rankingResponse.ok) {
      throw new Error(`Failed to fetch artist ranking: ${rankingResponse.status}`);
    }

    const rankingHtml = await rankingResponse.text();
    console.log(`[scrape-sertanejo] Received HTML: ${rankingHtml.length} bytes`);
    
    const artistLinks = extractArtistLinks(rankingHtml).slice(0, artistLimit);

    if (artistLinks.length === 0) {
      console.log(`[scrape-sertanejo] WARNING: No artists found! HTML might have changed.`);
      console.log(`[scrape-sertanejo] Full HTML (first 5000 chars):\n${rankingHtml.substring(0, 5000)}`);
      
      return new Response(
        JSON.stringify({
          corpusId,
          artistsCreated: 0,
          songsCreated: 0,
          songsWithLyrics: 0,
          errors: ['No artists found in ranking page. Site structure may have changed.'],
          debug: {
            htmlLength: rankingHtml.length,
            htmlSnippet: rankingHtml.substring(0, 1000)
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[scrape-sertanejo] Processing ${artistLinks.length} artists`);

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
          console.log(`[scrape-sertanejo] ✓ Created artist: ${artistLink.name}`);
        }

        // Fetch artist page for songs
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
        const artistResponse = await fetch(artistLink.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        errors.push(`Error processing artist ${artistLink.name}: ${artistError instanceof Error ? artistError.message : String(artistError)}`);
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
