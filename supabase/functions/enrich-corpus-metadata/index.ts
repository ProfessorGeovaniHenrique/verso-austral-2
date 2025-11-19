import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRequest {
  artista: string;
  musica: string;
  album?: string;
  ano?: string;
}

interface EnrichmentResult {
  compositor?: string;
  album?: string;
  ano?: string;
  fonte: 'musicbrainz' | 'ai-inferred' | 'not-found';
  confianca: number; // 0-100
  detalhes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artista, musica, album, ano }: EnrichmentRequest = await req.json();
    
    console.log(`🔍 Enriquecendo: ${artista} - ${musica}`);

    // STEP 1: Try MusicBrainz API
    let result = await queryMusicBrainz(artista, musica);
    
    // STEP 2: If MusicBrainz fails, use Lovable AI
    if (result.fonte === 'not-found') {
      result = await queryLovableAI(artista, musica, album, ano);
    }

    console.log(`✅ Resultado: ${result.fonte} (${result.confianca}% confiança)`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Erro no enriquecimento:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        fonte: 'not-found',
        confianca: 0
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Query MusicBrainz API for metadata
 * https://musicbrainz.org/doc/MusicBrainz_API
 */
async function queryMusicBrainz(
  artista: string, 
  musica: string
): Promise<EnrichmentResult> {
  try {
    // MusicBrainz requires URL encoding and user agent
    const query = encodeURIComponent(`artist:"${artista}" AND recording:"${musica}"`);
    const url = `https://musicbrainz.org/ws/2/recording/?query=${query}&fmt=json&limit=5`;
    
    console.log(`📡 MusicBrainz query: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CorpusAnalyzer/1.0 (research@example.com)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ MusicBrainz returned ${response.status}`);
      return { fonte: 'not-found', confianca: 0 };
    }

    const data = await response.json();
    
    if (!data.recordings || data.recordings.length === 0) {
      console.log('📭 MusicBrainz: Nenhum resultado');
      return { fonte: 'not-found', confianca: 0 };
    }

    // Get best match (first result with highest score)
    const bestMatch = data.recordings[0];
    const score = bestMatch.score || 0; // MusicBrainz score 0-100
    
    // Extract composer from credits
    let compositor: string | undefined;
    const credits = bestMatch['artist-credit'] || [];
    
    if (credits.length > 0) {
      compositor = credits[0]?.name;
    }

    // Extract release info (album, year)
    let album: string | undefined;
    let ano: string | undefined;
    
    if (bestMatch.releases && bestMatch.releases.length > 0) {
      const release = bestMatch.releases[0];
      album = release.title;
      
      if (release.date) {
        ano = release.date.split('-')[0]; // Extract year from YYYY-MM-DD
      }
    }

    console.log(`✅ MusicBrainz: Compositor=${compositor}, Score=${score}`);

    return {
      compositor,
      album,
      ano,
      fonte: 'musicbrainz',
      confianca: score,
      detalhes: `MusicBrainz ID: ${bestMatch.id}`
    };

  } catch (error) {
    console.error('❌ MusicBrainz error:', error);
    return { fonte: 'not-found', confianca: 0 };
  }
}

/**
 * Query Lovable AI (Gemini) for metadata inference
 */
async function queryLovableAI(
  artista: string,
  musica: string,
  album?: string,
  ano?: string
): Promise<EnrichmentResult> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY não configurada');
      return { fonte: 'not-found', confianca: 0 };
    }

    const prompt = `Você é um especialista em música brasileira. Identifique o COMPOSITOR da seguinte música:

Artista: ${artista}
Música: ${musica}
${album ? `Álbum: ${album}` : ''}
${ano ? `Ano: ${ano}` : ''}

Responda APENAS com o nome do compositor principal. Se não souber com certeza, responda "Desconhecido".
Se o artista for o próprio compositor, repita o nome do artista.

Exemplo de resposta válida: "Luiz Marenco"
Exemplo de resposta para desconhecido: "Desconhecido"`;

    console.log(`🤖 Consultando Lovable AI...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em música brasileira. Seja preciso e conciso.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 100
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lovable AI error: ${response.status} - ${errorText}`);
      return { fonte: 'not-found', confianca: 0 };
    }

    const data = await response.json();
    const compositor = data.choices?.[0]?.message?.content?.trim();

    if (!compositor || compositor === 'Desconhecido') {
      console.log('🤖 AI: Compositor desconhecido');
      return { fonte: 'not-found', confianca: 0 };
    }

    console.log(`✅ AI inferiu: ${compositor}`);

    return {
      compositor,
      fonte: 'ai-inferred',
      confianca: 70, // AI inference has moderate confidence
      detalhes: 'Inferido por Gemini 2.5 Flash'
    };

  } catch (error) {
    console.error('❌ Lovable AI error:', error);
    return { fonte: 'not-found', confianca: 0 };
  }
}
