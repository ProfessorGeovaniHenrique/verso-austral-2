import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistId, artistName } = await req.json();

    if (!artistId || !artistName) {
      return new Response(
        JSON.stringify({ error: 'artistId e artistName são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const cacheKey = `artist_bio:${artistName.toLowerCase()}`;
    const { data: cachedBio } = await supabase
      .from('gemini_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    let biography: string;
    let source: string;

    if (cachedBio) {
      console.log(`[generate-artist-bio] Cache hit for artist: ${artistName}`);
      biography = cachedBio.composer || '';
      source = 'cache';
      
      // 🔥 FASE 4: PROTEÇÃO PREVENTIVA - Detectar e corrigir cache contaminado
      if (biography.includes('IA Generativa')) {
        console.log(`[generate-artist-bio] ⚠️ Cache contaminado detectado para "${artistName}", autocorrigindo...`);
        biography = biography.replace('(Fonte: IA Generativa)', '(Fonte: Base de Conhecimento Digital)');
        
        // Atualizar cache com texto corrigido
        const { error: cacheUpdateError } = await supabase
          .from('gemini_cache')
          .update({ composer: biography })
          .eq('id', cachedBio.id);
        
        if (cacheUpdateError) {
          console.error('[generate-artist-bio] Erro ao corrigir cache:', cacheUpdateError);
        } else {
          console.log('[generate-artist-bio] ✅ Cache autocorrigido com sucesso');
        }
      }
      
      // Update cache hit stats
      await supabase
        .from('gemini_cache')
        .update({
          hits_count: (cachedBio.hits_count || 0) + 1,
          last_hit_at: new Date().toISOString()
        })
        .eq('id', cachedBio.id);
    } else {
      console.log(`[generate-artist-bio] Cache miss for artist: ${artistName}`);
      
      // Step 1: Try Wikipedia first
      console.log(`[generate-artist-bio] Attempting Wikipedia search...`);
      const wikipediaBio = await fetchWikipediaBio(artistName);

      if (wikipediaBio) {
        biography = wikipediaBio;
        source = 'wikipedia';
        console.log(`[generate-artist-bio] ✅ Wikipedia biography found`);
      } else {
        // Step 2: Try Gemini 2.5 Pro
        if (geminiApiKey) {
          try {
            console.log(`[generate-artist-bio] Wikipedia not found, trying Gemini 2.5 Pro...`);
            
            const prompt = `Escreva uma biografia resumida, envolvente e informativa (máximo de 3 parágrafos) para o artista musical "${artistName}".
Foque no estilo musical, principais sucessos e importância histórica, especialmente no contexto da música gaúcha se aplicável.
Responda em Português do Brasil.
Retorne APENAS o texto da biografia, sem aspas ou formatação JSON.`;

            const geminiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [{ text: prompt }]
                  }],
                  generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 800
                  }
                })
              }
            );

            if (geminiResponse.ok) {
              const geminiData = await geminiResponse.json();
              biography = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
              source = 'gemini_pro';
              console.log(`[generate-artist-bio] ✅ Gemini 2.5 Pro biography generated`);

              // Log API usage
              await supabase.from('gemini_api_usage').insert({
                function_name: 'generate-artist-bio',
                request_type: 'biography_generation',
                model_used: 'gemini-2.5-pro',
                success: true,
                tokens_input: geminiData.usageMetadata?.promptTokenCount || 0,
                tokens_output: geminiData.usageMetadata?.candidatesTokenCount || 0,
                metadata: { artist_name: artistName }
              });
            } else {
              throw new Error('Gemini API error');
            }
          } catch (geminiError) {
            console.error(`[generate-artist-bio] Gemini error, falling back to Lovable AI:`, geminiError);
            
            // Step 3: Fallback to Lovable AI
            if (lovableApiKey) {
              biography = await fetchAIBiography(artistName, lovableApiKey);
              source = 'lovable_ai';
              console.log(`[generate-artist-bio] ✅ Lovable AI biography generated`);
            } else {
              throw new Error('No AI API keys configured');
            }
          }
        } else if (lovableApiKey) {
          // No Gemini key, use Lovable AI directly
          console.log(`[generate-artist-bio] No Gemini key, using Lovable AI...`);
          biography = await fetchAIBiography(artistName, lovableApiKey);
          source = 'lovable_ai';
          console.log(`[generate-artist-bio] ✅ Lovable AI biography generated`);
        } else {
          throw new Error('No API keys configured for biography generation');
        }
      }

      // Cache the result
      await supabase.from('gemini_cache').insert({
        cache_key: cacheKey,
        artist: artistName,
        title: artistName,
        composer: biography,
        confidence: 'high',
        tokens_used: biography.length,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Update artist table
    const { error: updateError } = await supabase
      .from('artists')
      .update({
        biography,
        biography_source: source,
        biography_updated_at: new Date().toISOString()
      })
      .eq('id', artistId);

    if (updateError) {
      console.error('[generate-artist-bio] Error updating artist:', updateError);
      throw updateError;
    }

    // 🔥 FASE 5: LOGGING E MONITORAMENTO - Rastrear fontes de biografia
    console.log(`[generate-artist-bio] ✅ Biography updated successfully:`, {
      artistName,
      artistId,
      source,
      biographyLength: biography.length,
      hasFonteText: biography.includes('Fonte:'),
      fonteExtracted: biography.match(/\(Fonte: ([^)]+)\)/)?.[1] || 'none',
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        biography,
        source
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-artist-bio] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchWikipediaBio(artistName: string): Promise<string | null> {
  try {
    const encodedName = encodeURIComponent(artistName);
    const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodedName}`;

    console.log(`[Wikipedia] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MusicEnrichmentBot/1.0'
      }
    });

    if (response.status === 404) {
      console.log(`[Wikipedia] Page not found for "${artistName}"`);
      return null;
    }

    if (!response.ok) {
      console.error(`[Wikipedia] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.extract && data.extract.trim()) {
      console.log(`[Wikipedia] Extract found (${data.extract.length} chars)`);
      return `${data.extract}\n\n(Fonte: Wikipédia)`;
    }

    return null;

  } catch (error) {
    console.error('[Wikipedia] Error:', error);
    return null;
  }
}

async function fetchAIBiography(artistName: string, apiKey: string): Promise<string> {
  const prompt = `Você é uma enciclopédia factual especializada em música brasileira.

Resuma a carreira do artista musical "${artistName}".

REGRAS CRÍTICAS:
1. Se você NÃO tiver informações CONFIÁVEIS e VERIFICADAS sobre este artista específico, responda APENAS: "Biografia não disponível no momento"
2. NÃO invente fatos, datas, álbuns, prêmios ou colaborações
3. NÃO confunda com outros artistas de nome similar
4. Se tiver dúvida, seja conservador e admita a falta de informação
5. Foque em fatos verificáveis: carreira musical, gênero, período de atividade
6. Máximo de 3-4 parágrafos

Retorne APENAS o texto da biografia, sem introduções ou explicações adicionais.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Lovable AI] Error:', response.status, errorText);

      if (response.status === 429) {
        return 'Biografia temporariamente indisponível (limite de requisições atingido). Tente novamente em alguns instantes.';
      }

      if (response.status === 402) {
        return 'Biografia temporariamente indisponível (créditos insuficientes).';
      }

      return 'Biografia não disponível no momento.';
    }

    const data = await response.json();
    const biography = data.choices?.[0]?.message?.content || 'Biografia não disponível no momento.';

    return `${biography.trim()}\n\n(Fonte: Base de Conhecimento Digital)`;

  } catch (error) {
    console.error('[Lovable AI] Error:', error);
    return 'Biografia não disponível no momento.';
  }
}
