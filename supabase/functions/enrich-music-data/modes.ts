// Mode handlers for different enrichment workflows
import { searchYouTube, searchWithAI, RateLimiter } from "./helpers.ts";

const geminiLimiter = new RateLimiter(3, 500);
const youtubeLimiter = new RateLimiter(2, 1000);
const webSearchLimiter = new RateLimiter(2, 800);

interface EnrichmentResult {
  songId: string;
  success: boolean;
  enrichedData?: {
    composer?: string;
    releaseYear?: string;
    youtubeVideoId?: string;
    lyrics?: string;
  };
  confidenceScore: number;
  sources: string[];
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Single mode: Enrich one song by ID
export async function handleSingleMode(body: any, supabase: any) {
  const songId = body.songId;
  const enrichmentMode = body.mode || 'full'; // 'metadata-only', 'youtube-only', 'full'
  
  if (!songId) {
    return new Response(
      JSON.stringify({ error: 'songId is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Single Mode] Enriching song ${songId} with mode: ${enrichmentMode}`);

  const result = await enrichSingleSong(songId, supabase, enrichmentMode);

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Database mode: Enrich pending songs for an artist
export async function handleDatabaseMode(body: any, supabase: any) {
  const { artistId } = body;
  
  if (!artistId) {
    return new Response(
      JSON.stringify({ error: 'artistId is required for database mode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Database Mode] Enriching songs for artist ID: ${artistId}`);

  // Fetch artist name
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('name')
    .eq('id', artistId)
    .single();

  if (artistError) {
    return new Response(
      JSON.stringify({ error: `Artist not found: ${artistError.message}` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch pending songs
  const { data: songsData, error: songsError } = await supabase
    .from('songs')
    .select('id, title')
    .eq('artist_id', artistId)
    .eq('status', 'pending')
    .limit(20);

  if (songsError) {
    return new Response(
      JSON.stringify({ error: `Error fetching songs: ${songsError.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!songsData || songsData.length === 0) {
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'No pending songs found',
        processed: 0,
        successCount: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Database Mode] Found ${songsData.length} pending songs`);

  let successCount = 0;
  let failureCount = 0;

  // Enrich each song
  for (const song of songsData) {
    try {
      const result = await enrichSingleSong(song.id, supabase);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      console.error(`[Database Mode] Error enriching song ${song.id}:`, error);
      failureCount++;
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Enrichment completed',
      processed: songsData.length,
      successCount,
      failed: failureCount
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Legacy mode: Batch enrichment from array of titles
export async function handleLegacyMode(body: any) {
  const { titles, musics } = body;
  
  let musicsToProcess: Array<{ id?: string; titulo: string; artista?: string }> = [];
  
  if (titles && Array.isArray(titles)) {
    musicsToProcess = titles.map((titulo: string, index: number) => ({
      id: `legacy-${index}`,
      titulo,
      artista: undefined
    }));
  } else if (musics && Array.isArray(musics)) {
    musicsToProcess = musics.map((m: any) => ({
      id: m.id || `unknown-${Math.random()}`,
      titulo: m.titulo,
      artista: m.artista_contexto || m.artista
    }));
  } else {
    return new Response(
      JSON.stringify({ error: 'titles or musics array is required for legacy mode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Legacy Mode] Processing ${musicsToProcess.length} items`);

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'No AI API keys configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const enrichedData = [];
  let successCount = 0;

  for (const music of musicsToProcess) {
    try {
      // YouTube search
      let youtubeData = null;
      const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
      if (youtubeApiKey) {
        try {
          youtubeData = await youtubeLimiter.schedule(() =>
            searchYouTube(music.titulo, music.artista || '', youtubeApiKey, null)
          );
        } catch (ytError) {
          console.error(`[Legacy Mode] YouTube error for "${music.titulo}":`, ytError);
        }
      }

      // Enrich with AI
      const metadata = await enrichWithAI(
        music.titulo,
        music.artista,
        youtubeData,
        GEMINI_API_KEY,
        LOVABLE_API_KEY
      );

      let result = {
        id: music.id,
        titulo_original: music.titulo,
        artista_encontrado: metadata.artista || 'Não Identificado',
        compositor_encontrado: metadata.compositor || 'Não Identificado',
        ano_lancamento: metadata.ano || '0000',
        youtube_url: youtubeData?.videoId 
          ? `https://www.youtube.com/watch?v=${youtubeData.videoId}`
          : null,
        status_pesquisa: metadata.compositor !== 'Não Identificado' && metadata.ano !== '0000' 
          ? 'Sucesso' 
          : 'Parcial',
        observacoes: metadata.observacoes || '',
        enriched_by_web: false
      };

      // Web search fallback if needed
      const needsWebSearch = 
        result.compositor_encontrado === 'Não Identificado' ||
        result.ano_lancamento === '0000';

      if (needsWebSearch && LOVABLE_API_KEY) {
        try {
          const webData = await webSearchLimiter.schedule(() =>
            searchWithAI(music.titulo, music.artista || '', LOVABLE_API_KEY)
          );

          if (webData.compositor && webData.compositor !== 'Não Identificado') {
            result.compositor_encontrado = webData.compositor;
          }
          if (webData.ano && webData.ano !== '0000') {
            result.ano_lancamento = webData.ano;
          }

          if (webData.compositor !== 'Não Identificado' || webData.ano !== '0000') {
            result.status_pesquisa = 'Sucesso (Web)';
            result.enriched_by_web = true;
          }
        } catch (webError) {
          console.error(`[Legacy Mode] Web search error for "${music.titulo}":`, webError);
        }
      }

      enrichedData.push(result);
      if (result.status_pesquisa.includes('Sucesso')) successCount++;

    } catch (error) {
      console.error(`[Legacy Mode] Error enriching "${music.titulo}":`, error);
      enrichedData.push({
        id: music.id,
        titulo_original: music.titulo,
        artista_encontrado: 'Não Identificado',
        compositor_encontrado: 'Não Identificado',
        ano_lancamento: '0000',
        status_pesquisa: 'Falha',
        observacoes: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      results: enrichedData,
      processedCount: enrichedData.length,
      successCount
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper function to extract YouTube video ID from URL
function extractVideoId(youtubeUrl: string): string | undefined {
  const match = youtubeUrl.match(/[?&]v=([^&]+)/);
  return match ? match[1] : undefined;
}

// Core enrichment function for a single song
async function enrichSingleSong(
  songId: string, 
  supabase: any,
  enrichmentMode: 'full' | 'metadata-only' | 'youtube-only' = 'full'
): Promise<EnrichmentResult> {
  try {
    // Fetch song data (including current enrichment status)
    const { data: song, error: fetchError } = await supabase
      .from('songs')
      .select(`
        id,
        title,
        normalized_title,
        composer,
        release_year,
        youtube_url,
        lyrics,
        confidence_score,
        status,
        artists (
          name
        )
      `)
      .eq('id', songId)
      .single();

    if (fetchError || !song) {
      return {
        songId,
        success: false,
        confidenceScore: 0,
        sources: [],
        error: 'Song not found'
      };
    }

    // Store current data for intelligent merge
    const currentData = {
      composer: song.composer,
      release_year: song.release_year,
      youtube_url: song.youtube_url,
      lyrics: song.lyrics,
      confidence_score: song.confidence_score || 0,
      status: song.status
    };

    console.log(`[enrichSingleSong] Current data for ${songId}:`, currentData);

    const artistName = (song.artists as any)?.name || 'Unknown Artist';
    const enrichedData: any = {};
    const sources: string[] = [];
    let confidenceScore = 0;

    // 1. YouTube search (skip if mode is metadata-only)
    let youtubeContext = null;
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (youtubeApiKey && enrichmentMode !== 'metadata-only') {
      try {
        youtubeContext = await youtubeLimiter.schedule(() =>
          searchYouTube(song.title, artistName, youtubeApiKey, supabase)
        );
        if (youtubeContext) {
          enrichedData.youtubeVideoId = youtubeContext.videoId;
          sources.push('youtube');
          confidenceScore += 30;
        }
      } catch (error) {
        console.error('[enrichSingleSong] YouTube error:', error);
      }
    }

    // 2. Enrich with AI (skip if mode is youtube-only)
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (enrichmentMode !== 'youtube-only' && !song.composer && (GEMINI_API_KEY || LOVABLE_API_KEY)) {
      const metadata = await enrichWithAI(
        song.title,
        artistName,
        youtubeContext,
        GEMINI_API_KEY,
        LOVABLE_API_KEY
      );

      if (metadata.composer || metadata.compositor) {
        enrichedData.composer = metadata.composer || metadata.compositor;
        confidenceScore += 40;
      }
      if (metadata.releaseYear || metadata.ano) {
        enrichedData.releaseYear = metadata.releaseYear || metadata.ano;
        confidenceScore += 20;
      }

      sources.push(metadata.source || 'ai');
    }

    // 3. Web search fallback (skip if mode is youtube-only)
    const needsWebSearch = enrichmentMode !== 'youtube-only' && (!enrichedData.composer || !enrichedData.releaseYear);
    if (needsWebSearch && LOVABLE_API_KEY) {
      try {
        const webData = await webSearchLimiter.schedule(() =>
          searchWithAI(song.title, artistName, LOVABLE_API_KEY)
        );

        if (!enrichedData.composer && webData.compositor !== 'Não Identificado') {
          enrichedData.composer = webData.compositor;
          confidenceScore += 20;
          sources.push('web_search_ai');
        }

        if (!enrichedData.releaseYear && webData.ano !== '0000') {
          enrichedData.releaseYear = webData.ano;
          confidenceScore += 15;
          if (!sources.includes('web_search_ai')) sources.push('web_search_ai');
        }
      } catch (error) {
        console.error('[enrichSingleSong] Web search error:', error);
      }
    }

    // 4. Search lyrics if blank (new feature for Phase 3)
    const shouldSearchLyrics = !song.lyrics && LOVABLE_API_KEY && enrichmentMode === 'full';

    if (shouldSearchLyrics) {
      try {
        console.log(`[enrichSingleSong] Searching lyrics for "${song.title}"`);
        const lyrics = await searchLyrics(song.title, artistName, LOVABLE_API_KEY);
        if (lyrics) {
          enrichedData.lyrics = lyrics;
          confidenceScore += 10;
          sources.push('lyrics_ai');
          console.log(`[enrichSingleSong] ✅ Lyrics found (${lyrics.length} chars)`);
        }
      } catch (error) {
        console.error('[enrichSingleSong] Lyrics search error:', error);
      }
    }

    confidenceScore = Math.min(confidenceScore, 100);

    // ✅ INTELLIGENT MERGE LOGIC: Only update if new data is better
    const hasNewData = 
      enrichedData.composer || 
      enrichedData.releaseYear || 
      enrichedData.youtubeVideoId;

    const isBetterConfidence = confidenceScore > currentData.confidence_score;
    const hasNewYouTube = enrichedData.youtubeVideoId && !currentData.youtube_url;
    const hasNewComposer = enrichedData.composer && !currentData.composer;
    const hasNewYear = enrichedData.releaseYear && !currentData.release_year;

    const shouldUpdate = hasNewData && (
      isBetterConfidence ||
      hasNewYouTube ||
      hasNewComposer ||
      hasNewYear ||
      currentData.confidence_score === 0
    );

    if (!shouldUpdate) {
      console.log(`[enrichSingleSong] Skipping update for ${songId} - current data is better or equal`);
      console.log(`  Current confidence: ${currentData.confidence_score}%, New: ${confidenceScore}%`);
      
      return {
        songId,
        success: true,
        enrichedData: {
          composer: currentData.composer || undefined,
          releaseYear: currentData.release_year || undefined,
          youtubeVideoId: currentData.youtube_url ? extractVideoId(currentData.youtube_url) : undefined
        },
        confidenceScore: currentData.confidence_score,
        sources: ['cached']
      };
    }

    // ✅ MERGE DATA: Combine best of both enrichments
    const updateData: any = {
      status: 'enriched',
      confidence_score: Math.max(confidenceScore, currentData.confidence_score),
      enrichment_source: sources.join(','),
      updated_at: new Date().toISOString(),
    };

    // Intelligent field merge: use new data if available, otherwise preserve existing
    updateData.composer = enrichedData.composer || currentData.composer || null;
    updateData.release_year = enrichedData.releaseYear || currentData.release_year || null;
    updateData.lyrics = enrichedData.lyrics || currentData.lyrics || null;
    
    if (enrichedData.youtubeVideoId) {
      updateData.youtube_url = `https://www.youtube.com/watch?v=${enrichedData.youtubeVideoId}`;
    } else if (currentData.youtube_url) {
      // Preserve existing YouTube URL
      updateData.youtube_url = currentData.youtube_url;
    }

    console.log(`[enrichSingleSong] Updating ${songId} with merged data:`, {
      composer: updateData.composer,
      release_year: updateData.release_year,
      youtube_url: updateData.youtube_url,
      confidence: updateData.confidence_score
    });

    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', songId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[enrichSingleSong] Success: ${songId} (confidence: ${confidenceScore}%)`);

    return {
      songId,
      success: true,
      enrichedData,
      confidenceScore,
      sources
    };

  } catch (error) {
    console.error('[enrichSingleSong] Error:', error);
    return {
      songId,
      success: false,
      confidenceScore: 0,
      sources: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Helper function to search lyrics using AI
async function searchLyrics(
  songTitle: string,
  artistName: string,
  lovableApiKey: string
): Promise<string | null> {
  const prompt = `Você é um sistema de busca de letras de músicas.

Retorne APENAS a letra completa da música "${songTitle}" do artista "${artistName}".

REGRAS CRÍTICAS:
1. Se você NÃO tiver certeza da letra COMPLETA e EXATA, retorne APENAS: "LETRA_NAO_DISPONIVEL"
2. NÃO invente versos ou trechos
3. NÃO misture com outras músicas
4. Retorne a letra em português (se for música brasileira)
5. Inclua quebras de linha entre versos
6. NÃO adicione introduções, comentários ou formatação markdown

Retorne APENAS a letra ou "LETRA_NAO_DISPONIVEL".`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      console.error('[searchLyrics] API error:', response.status);
      return null;
    }

    const data = await response.json();
    const lyrics = data.choices?.[0]?.message?.content?.trim();

    if (!lyrics || lyrics === 'LETRA_NAO_DISPONIVEL' || lyrics.length < 50) {
      console.log(`[searchLyrics] Letra não encontrada para "${songTitle}"`);
      return null;
    }

    console.log(`[searchLyrics] ✅ Letra encontrada (${lyrics.length} caracteres)`);
    return lyrics;

  } catch (error) {
    console.error('[searchLyrics] Error:', error);
    return null;
  }
}

// AI enrichment with Gemini → Lovable AI fallback
async function enrichWithAI(
  titulo: string,
  artista: string | undefined,
  youtubeContext: any,
  geminiApiKey: string | undefined,
  lovableApiKey: string | undefined
): Promise<{ 
  artista?: string; 
  composer?: string;
  compositor?: string; 
  ano?: string; 
  releaseYear?: string; 
  observacoes?: string; 
  source?: string;
}> {
  
  let youtubeContextText = 'Nenhum vídeo do YouTube encontrado';
  if (youtubeContext) {
    const publishYear = new Date(youtubeContext.publishDate).getFullYear();
    youtubeContextText = `
🎬 CONTEXTO DO YOUTUBE:
- Vídeo: "${youtubeContext.videoTitle}"
- Canal: ${youtubeContext.channelTitle}
- Data: ${youtubeContext.publishDate} (Ano: ${publishYear})

DESCRIÇÃO DO VÍDEO (busque créditos aqui):
${youtubeContext.description.substring(0, 800)}${youtubeContext.description.length > 800 ? '...' : ''}

Procure por: "Composer:", "Compositor:", "℗ [ano]", "Written by:", "Provided to YouTube by"`;
  }

  const systemPrompt = `Você é um especialista em metadados musicais.
Sua tarefa é identificar o Compositor e o Ano de Lançamento da música.

Entrada:
Artista: ${artista || 'Desconhecido'}
Música: ${titulo}

${youtubeContextText}

Saída Obrigatória (JSON):
{
  "composer": "Nome do Compositor (ou null)",
  "release_year": "Ano YYYY (ou null)",
  "confidence": "high/medium/low"
}
Não adicione markdown \`\`\`json ou explicações. Apenas o objeto JSON cru.`;

  // Try Gemini 2.5 Pro first
  if (geminiApiKey) {
    try {
      console.log('[AI] Trying Gemini 2.5 Pro...');
      const geminiResponse = await geminiLimiter.schedule(() =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 200,
                responseMimeType: "application/json"
              }
            }),
          }
        )
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (rawText) {
          const metadata = JSON.parse(rawText);
          console.log('[AI] Gemini 2.5 Pro success');
          return {
            artista: artista,
            composer: metadata.composer !== 'null' ? metadata.composer : undefined,
            compositor: metadata.composer !== 'null' ? metadata.composer : undefined,
            releaseYear: metadata.release_year !== 'null' ? metadata.release_year : undefined,
            ano: metadata.release_year !== 'null' ? metadata.release_year : undefined,
            observacoes: '',
            source: 'gemini_pro'
          };
        }
      }
    } catch (geminiError) {
      console.error('[AI] Gemini error, falling back to Lovable AI:', geminiError);
    }
  }

  // Fallback to Lovable AI
  if (lovableApiKey) {
    try {
      console.log('[AI] Falling back to Lovable AI...');
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: systemPrompt }],
          tools: [
            {
              type: 'function',
              function: {
                name: 'enrich_music_info',
                description: 'Return structured music metadata',
                parameters: {
                  type: 'object',
                  properties: {
                    composer: { type: 'string' },
                    release_year: { type: 'string' },
                    confidence: { type: 'string' }
                  },
                  required: ['composer', 'release_year']
                }
              }
            }
          ],
          tool_choice: { type: 'function', function: { name: 'enrich_music_info' } }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const metadata = JSON.parse(toolCall.function.arguments);
          console.log('[AI] Lovable AI success');
          return {
            artista: artista,
            composer: metadata.composer !== 'null' ? metadata.composer : undefined,
            compositor: metadata.composer !== 'null' ? metadata.composer : undefined,
            releaseYear: metadata.release_year !== 'null' ? metadata.release_year : undefined,
            ano: metadata.release_year !== 'null' ? metadata.release_year : undefined,
            observacoes: '',
            source: 'lovable_ai'
          };
        }
      }
    } catch (lovableError) {
      console.error('[AI] Lovable AI error:', lovableError);
    }
  }

  console.warn('[AI] All AI sources failed');
  return {
    compositor: 'Não Identificado',
    ano: '0000',
    observacoes: 'AI enrichment failed'
  };
}
