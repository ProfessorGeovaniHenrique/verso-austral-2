import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize text for URL slug
function normalizeForUrl(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove multiple hyphens
    .trim();
}

// Extract lyrics from Letras.mus.br HTML
function extractLyricsFromHtml(html: string): string | null {
  // Try multiple selectors used by Letras.mus.br
  const patterns = [
    /<div[^>]*class="[^"]*lyric-original[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*cnt-letra[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*letra-cnt[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Clean HTML tags and decode entities
      let lyrics = match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
        .trim();

      if (lyrics.length > 50) {
        return lyrics;
      }
    }
  }
  return null;
}

// Try to fetch lyrics from Letras.mus.br
async function fetchFromLetrasMuBr(artistName: string, songTitle: string): Promise<{ lyrics: string; sourceUrl: string } | null> {
  const normalizedArtist = normalizeForUrl(artistName);
  const normalizedTitle = normalizeForUrl(songTitle);
  const url = `https://www.letras.mus.br/${normalizedArtist}/${normalizedTitle}/`;

  console.log(`[fetch-lyrics] Trying Letras.mus.br: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      console.log(`[fetch-lyrics] Letras.mus.br returned ${response.status}`);
      return null;
    }

    const html = await response.text();
    const lyrics = extractLyricsFromHtml(html);

    if (lyrics) {
      console.log(`[fetch-lyrics] Found lyrics on Letras.mus.br (${lyrics.length} chars)`);
      return { lyrics, sourceUrl: url };
    }

    console.log(`[fetch-lyrics] Could not extract lyrics from Letras.mus.br HTML`);
    return null;
  } catch (error) {
    console.error(`[fetch-lyrics] Error fetching from Letras.mus.br:`, error);
    return null;
  }
}

// Try web search via Gemini with Google Search Grounding
async function fetchViaWebSearch(artistName: string, songTitle: string): Promise<{ lyrics: string; sourceUrl: string } | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    console.log(`[fetch-lyrics] No GEMINI_API_KEY configured, skipping web search`);
    return null;
  }

  console.log(`[fetch-lyrics] Trying web search for: ${artistName} - ${songTitle}`);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Encontre a letra COMPLETA e EXATA da música "${songTitle}" do artista "${artistName}" em um site oficial de letras de música (como letras.mus.br, vagalume.com.br, genius.com, etc).

IMPORTANTE:
- Retorne APENAS a letra encontrada em um site verificável
- NÃO invente ou gere letras
- Se não encontrar em nenhum site oficial, responda "NOT_FOUND"
- Inclua a URL do site onde encontrou a letra

Formato da resposta (JSON):
{
  "found": true/false,
  "lyrics": "letra completa aqui",
  "sourceUrl": "URL do site onde encontrou"
}`
            }]
          }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8192,
          }
        })
      }
    );

    if (!response.ok) {
      console.error(`[fetch-lyrics] Gemini API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*"found"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        if (result.found && result.lyrics && result.sourceUrl && result.lyrics.length > 50) {
          // Validate URL is from a known lyrics site
          const validDomains = ['letras.mus.br', 'vagalume.com.br', 'genius.com', 'musixmatch.com', 'azlyrics.com'];
          const isValidUrl = validDomains.some(domain => result.sourceUrl.includes(domain));
          
          if (isValidUrl) {
            console.log(`[fetch-lyrics] Web search found lyrics from: ${result.sourceUrl}`);
            return { lyrics: result.lyrics, sourceUrl: result.sourceUrl };
          }
          console.log(`[fetch-lyrics] Web search found lyrics but URL not from valid domain: ${result.sourceUrl}`);
        }
      } catch (e) {
        console.log(`[fetch-lyrics] Failed to parse Gemini JSON response`);
      }
    }

    console.log(`[fetch-lyrics] Web search did not find valid lyrics`);
    return null;
  } catch (error) {
    console.error(`[fetch-lyrics] Error in web search:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistName, songTitle } = await req.json();

    if (!artistName || !songTitle) {
      return new Response(
        JSON.stringify({ error: 'artistName and songTitle are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-lyrics] Searching lyrics for: ${artistName} - ${songTitle}`);

    // Layer 1: Try Letras.mus.br (primary source for Brazilian music)
    const letrasMuBrResult = await fetchFromLetrasMuBr(artistName, songTitle);
    if (letrasMuBrResult) {
      return new Response(
        JSON.stringify({
          lyrics: letrasMuBrResult.lyrics,
          source: 'letras.mus.br',
          sourceUrl: letrasMuBrResult.sourceUrl,
          found: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Layer 2: Try web search via Gemini (search only, no generation)
    const webSearchResult = await fetchViaWebSearch(artistName, songTitle);
    if (webSearchResult) {
      return new Response(
        JSON.stringify({
          lyrics: webSearchResult.lyrics,
          source: 'web_search',
          sourceUrl: webSearchResult.sourceUrl,
          found: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No lyrics found from any verified source
    console.log(`[fetch-lyrics] No lyrics found for: ${artistName} - ${songTitle}`);
    return new Response(
      JSON.stringify({
        lyrics: null,
        source: null,
        sourceUrl: null,
        found: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-lyrics] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});