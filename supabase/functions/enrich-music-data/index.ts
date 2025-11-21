import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentResult {
  songId: string;
  success: boolean;
  enrichedData?: {
    composer?: string;
    releaseYear?: string;
    album?: string;
    genre?: string;
    youtubeVideoId?: string;
  };
  confidenceScore: number;
  sources: string[];
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { songId } = await req.json();
    
    if (!songId) {
      return new Response(
        JSON.stringify({ error: 'songId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich-music-data] Enriching song ${songId}`);

    // Fetch song data
    const { data: song, error: fetchError } = await supabase
      .from('songs')
      .select(`
        id,
        title,
        normalized_title,
        composer,
        release_year,
        artists (
          name
        )
      `)
      .eq('id', songId)
      .single();

    if (fetchError || !song) {
      return new Response(
        JSON.stringify({ error: 'Song not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const artistName = (song.artists as any)?.name || 'Unknown Artist';
    const searchQuery = `${song.title} ${artistName}`;
    
    console.log(`[enrich-music-data] Searching for: ${searchQuery}`);

    const enrichedData: EnrichmentResult['enrichedData'] = {};
    const sources: string[] = [];
    let confidenceScore = 0;

    // 1. YouTube API - Search for video and cache
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (youtubeApiKey) {
      try {
        // Check cache first
        const { data: cached } = await supabase
          .from('youtube_cache')
          .select('video_id, metadata')
          .eq('artist', artistName)
          .eq('title', song.title)
          .maybeSingle();

        if (cached) {
          console.log(`[enrich-music-data] YouTube cache hit for ${searchQuery}`);
          enrichedData.youtubeVideoId = cached.video_id;
          sources.push('youtube_cache');
          confidenceScore += 20;
        } else {
          // Search YouTube
          console.log(`[enrich-music-data] Searching YouTube for ${searchQuery}`);
          const youtubeResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=1&key=${youtubeApiKey}`
          );

          if (youtubeResponse.ok) {
            const youtubeData = await youtubeResponse.json();
            if (youtubeData.items && youtubeData.items.length > 0) {
              const videoId = youtubeData.items[0].id.videoId;
              enrichedData.youtubeVideoId = videoId;
              sources.push('youtube');
              confidenceScore += 30;

              // Cache the result
              await supabase.from('youtube_cache').insert({
                artist: artistName,
                title: song.title,
                video_id: videoId,
                metadata: youtubeData.items[0],
              });
            }
          }
        }
      } catch (error) {
        console.error('[enrich-music-data] YouTube API error:', error);
      }
    }

    // 2. Gemini API - Extract metadata (PRIMARY SOURCE)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiApiKey && !song.composer) {
      try {
        // Criar cache key (hash simples do artista + música)
        const cacheKey = `${artistName.toLowerCase().trim()}:${song.title.toLowerCase().trim()}`;
        console.log(`[enrich-music-data] Checking cache for key: ${cacheKey}`);
        
        // Verificar cache primeiro
        const { data: cached, error: cacheError } = await supabase
          .from('gemini_cache')
          .select('*')
          .eq('cache_key', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        
        if (cached && !cacheError) {
          console.log(`[enrich-music-data] Cache HIT for ${artistName} - ${song.title}`);
          
          // Usar dados do cache
          if (cached.composer) enrichedData.composer = cached.composer;
          if (cached.release_year) enrichedData.releaseYear = cached.release_year;
          
          const confidenceMap = { high: 40, medium: 25, low: 15 };
          confidenceScore += confidenceMap[cached.confidence as keyof typeof confidenceMap] || 25;
          if (cached.release_year) confidenceScore += 20;
          
          sources.push('gemini_cache');
          
          // Incrementar hit counter
          await supabase
            .from('gemini_cache')
            .update({ 
              hits_count: (cached.hits_count || 0) + 1,
              last_hit_at: new Date().toISOString()
            })
            .eq('id', cached.id);
          
          // Log cache hit (sem tokens usados)
          await supabase.from("gemini_api_usage").insert({
            function_name: "enrich-music-data",
            model_used: "gemini-1.5-flash",
            request_type: "enrich_song_cache_hit",
            tokens_input: 0,
            tokens_output: 0,
            success: true,
            metadata: {
              song_id: songId,
              artist: artistName,
              title: song.title,
              cache_hit: true,
              cache_id: cached.id,
            },
          });
          
        } else {
          console.log(`[enrich-music-data] Cache MISS - Querying Gemini API for metadata`);
        
          // Contexto adicional do YouTube se disponível
          const youtubeContext = enrichedData.youtubeVideoId 
            ? `YouTube Video ID encontrado: ${enrichedData.youtubeVideoId}` 
            : 'Nenhum vídeo do YouTube encontrado';

          const startTime = Date.now();
          let tokensInput = 0;
          let tokensOutput = 0;
        
          const systemPrompt = `Você é um especialista em metadados musicais.
Sua tarefa é identificar o Compositor e o Ano de Lançamento da música.

Entrada:
Artista: ${artistName}
Música: ${song.title}
Contexto Extra (YouTube): ${youtubeContext}

Saída Obrigatória (JSON):
{
  "composer": "Nome do Compositor (ou null)",
  "release_year": "Ano YYYY (ou null)",
  "confidence": "high/medium/low"
}
Não adicione markdown \`\`\`json ou explicações. Apenas o objeto JSON cru.`;

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [{ text: systemPrompt }]
                  }
                ],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 200,
                  responseMimeType: "application/json"
                }
              }),
            }
          );

          if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error(`[enrich-music-data] Gemini API HTTP Error ${geminiResponse.status}:`, errorText);
            throw new Error(`Gemini API returned ${geminiResponse.status}`);
          }

          const geminiData = await geminiResponse.json();
          console.log('[enrich-music-data] Gemini raw response:', JSON.stringify(geminiData));
        
          // Extrair usage metadata
          if (geminiData.usageMetadata) {
            tokensInput = geminiData.usageMetadata.promptTokenCount || 0;
            tokensOutput = geminiData.usageMetadata.candidatesTokenCount || 0;
          }
        
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log('[enrich-music-data] Gemini text extracted:', rawText);
        
          if (!rawText) {
            throw new Error('Gemini retornou resposta vazia');
          }

          // Parse JSON response
          let metadata;
          try {
            // Tentar parse direto (JSON mode)
            metadata = JSON.parse(rawText);
          } catch (parseError) {
            // Fallback: extrair JSON de texto com markdown
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              metadata = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('Não foi possível extrair JSON da resposta do Gemini');
            }
          }

          console.log('[enrich-music-data] Gemini parsed metadata:', metadata);

          // Processar resultados
          if (metadata.composer && metadata.composer !== 'null') {
            enrichedData.composer = metadata.composer;
          
            // Ajustar confidence baseado na resposta do Gemini
            const confidenceMap = { high: 40, medium: 25, low: 15 };
            confidenceScore += confidenceMap[metadata.confidence as keyof typeof confidenceMap] || 25;
          }

          if (metadata.release_year && metadata.release_year !== 'null') {
            enrichedData.releaseYear = metadata.release_year;
            confidenceScore += 20;
          }

          sources.push('gemini');
          console.log(`[enrich-music-data] Gemini enrichment successful: composer=${metadata.composer}, year=${metadata.release_year}`);
        
          // Salvar no cache
          await supabase.from('gemini_cache').insert({
            cache_key: cacheKey,
            artist: artistName,
            title: song.title,
            composer: metadata.composer !== 'null' ? metadata.composer : null,
            release_year: metadata.release_year !== 'null' ? metadata.release_year : null,
            confidence: metadata.confidence,
            tokens_used: tokensInput + tokensOutput,
          });
        
          // Log API usage
          await supabase.from("gemini_api_usage").insert({
            function_name: "enrich-music-data",
            model_used: "gemini-1.5-flash",
            request_type: "enrich_song",
            tokens_input: tokensInput,
            tokens_output: tokensOutput,
            success: true,
            metadata: {
              song_id: songId,
              artist: artistName,
              title: song.title,
              processing_time_ms: Date.now() - startTime,
              cache_miss: true,
            },
          });
        }

      } catch (error) {
        console.error('[enrich-music-data] Gemini API error:', error);
        console.error('[enrich-music-data] Error details:', error instanceof Error ? error.message : String(error));
        
        // Log failed API call
        try {
          await supabase.from("gemini_api_usage").insert({
            function_name: "enrich-music-data",
            model_used: "gemini-1.5-flash",
            request_type: "enrich_song",
            success: false,
            error_message: error instanceof Error ? error.message : String(error),
            metadata: { song_id: songId, artist: artistName, title: song.title },
          });
        } catch (logError) {
          console.error("Failed to log API error:", logError);
        }
      }
    }

    // Perplexity removido - usando apenas Gemini para todas as validações

    // Cap confidence score at 100
    confidenceScore = Math.min(confidenceScore, 100);

    // Update song in database
    const updateData: any = {
      status: 'enriched',
      confidence_score: confidenceScore,
      enrichment_source: sources.join(','),
      updated_at: new Date().toISOString(),
    };

    if (enrichedData.composer) updateData.composer = enrichedData.composer;
    if (enrichedData.releaseYear) updateData.release_year = enrichedData.releaseYear;
    if (enrichedData.album || enrichedData.genre) {
      updateData.raw_data = {
        ...(song as any).raw_data,
        album: enrichedData.album,
        genre: enrichedData.genre,
      };
    }

    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', songId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[enrich-music-data] Successfully enriched song ${songId} with confidence ${confidenceScore}%`);

    const result: EnrichmentResult = {
      songId,
      success: true,
      enrichedData,
      confidenceScore,
      sources,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-music-data] Error:', error);
    
    const result: EnrichmentResult = {
      songId: (await req.json()).songId,
      success: false,
      confidenceScore: 0,
      sources: [],
      error: error instanceof Error ? error.message : String(error),
    };

    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
