import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRequest {
  artista: string;
  musica: string;
  album?: string;
  ano?: string;
  corpusType?: 'gaucho' | 'nordestino';
  lyricsPreview?: string;
}

interface EnrichmentResult {
  compositor?: string;
  artista?: string;
  album?: string;
  ano?: string;
  fonte: 'musicbrainz' | 'ai-inferred' | 'not-found';
  confianca: number; // 0-100
  detalhes?: string;
}

serve(withInstrumentation('enrich-corpus-metadata', async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await createHealthCheck('enrich-corpus-metadata', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artista, musica, album, ano, corpusType, lyricsPreview }: EnrichmentRequest = await req.json();
    
    if (!musica) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: musica' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎵 Enriquecendo [${corpusType}]: ${artista} - ${musica}`);
    
    let result: EnrichmentResult;
    
    // Estratégia por corpus
    if (corpusType === 'nordestino' || artista === 'Desconhecido' || !artista) {
      // Corpus Nordestino: pular MusicBrainz, ir direto para Gemini com letra
      console.log('🎭 Corpus Nordestino detectado - usando IA diretamente com letra');
      result = await queryLovableAI(artista, musica, album, ano, corpusType, lyricsPreview);
    } else {
      // Corpus Gaúcho: tentar MusicBrainz primeiro (híbrido)
      console.log('🐴 Corpus Gaúcho - tentando MusicBrainz primeiro');
      result = await queryMusicBrainz(artista, musica);
      
      // Fallback para IA se MusicBrainz falhar
      if (result.fonte === 'not-found') {
        console.log('🤖 MusicBrainz não encontrou, usando IA...');
        result = await queryLovableAI(artista, musica, album, ano, corpusType, lyricsPreview);
      }
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
}));

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
    const artistEncoded = encodeURIComponent(artista);
    const songEncoded = encodeURIComponent(musica);
    
    // Try with artist + title first
    let url = `https://musicbrainz.org/ws/2/recording/?query=artist:${artistEncoded}%20AND%20recording:${songEncoded}&fmt=json&limit=1`;
    
    console.log('🔍 Consultando MusicBrainz (artista+título):', url);
    
    let response = await fetch(url, {
      headers: {
        'User-Agent': 'VaiboraApp/1.0 (contato@vaibora.app)',
      },
    });

    if (!response.ok) {
      console.error('❌ Erro MusicBrainz (artista+título):', response.status);
      return { fonte: 'not-found', confianca: 0 };
    }

    let data = await response.json();
    
    // Fallback: try title-only search if no results
    if (!data.recordings || data.recordings.length === 0) {
      console.log('⚠️ Nenhum resultado com artista+título, tentando apenas título...');
      url = `https://musicbrainz.org/ws/2/recording/?query=recording:${songEncoded}&fmt=json&limit=3`;
      
      response = await fetch(url, {
        headers: {
          'User-Agent': 'VaiboraApp/1.0 (contato@vaibora.app)',
        },
      });
      
      if (!response.ok) {
        console.error('❌ Erro na busca por título:', response.status);
        return { fonte: 'not-found', confianca: 0 };
      }
      
      data = await response.json();
      
      if (!data.recordings || data.recordings.length === 0) {
        console.log('❌ Nenhuma gravação encontrada no MusicBrainz');
        return { fonte: 'not-found', confianca: 0 };
      }
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
  ano?: string,
  corpusType?: string,
  lyricsPreview?: string
): Promise<EnrichmentResult> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY não configurada');
      return { fonte: 'not-found', confianca: 0 };
    }

    const contextoCultural = corpusType === 'gaucho' 
      ? 'música gaúcha/regionalista do Rio Grande do Sul'
      : corpusType === 'nordestino'
      ? 'música nordestina/forró/baião do Nordeste brasileiro'
      : 'música popular brasileira';

    // Prompt otimizado para Nordestino (com letra) ou Gaúcho (com artista)
    const isNordestino = corpusType === 'nordestino' || artista === 'Desconhecido' || !artista;
    
    let prompt: string;
    
    if (isNordestino && lyricsPreview) {
      // Prompt para Nordestino: usar título + letra para identificar compositor E artista
      prompt = `Você é um especialista em música popular brasileira, especializado em ${contextoCultural}.

**TAREFA:** Identifique o COMPOSITOR e o ARTISTA/INTÉRPRETE original desta música:

🎵 **Título:** ${musica}
${ano ? `📅 **Ano:** ${ano}` : ''}

📝 **Trecho da letra:**
"""
${lyricsPreview}
"""

**INSTRUÇÕES:**
1. Identifique o compositor principal desta música
2. Se possível, identifique também o artista/intérprete mais conhecido
3. Para parcerias, liste os nomes separados por "e" (ex: "Raul Torres e João Pacífico")
4. Se for tradicional/domínio público, responda "Tradicional"
5. Se não souber com certeza, responda "Desconhecido"

**IMPORTANTE:** 
- Use o trecho da letra para identificar a música com precisão
- Priorize compositores e intérpretes nordestinos conhecidos
- Não invente informações - apenas responda se tiver conhecimento confiável

**RESPOSTA (formato JSON):**
{
  "compositor": "nome do compositor",
  "artista": "nome do artista/intérprete (se diferente do campo fornecido)",
  "confianca": 85
}`;
    } else {
      // Prompt para Gaúcho: artista conhecido
      prompt = `Você é um especialista em música popular brasileira, com profundo conhecimento sobre compositores, parcerias e histórico de gravações.

**TAREFA:** Identifique o compositor da seguinte ${contextoCultural}:

📌 **Artista/Intérprete:** ${artista}
🎵 **Música:** ${musica}
${album ? `💿 **Álbum:** ${album}` : ''}
${ano ? `📅 **Ano:** ${ano}` : ''}

**INSTRUÇÕES:**
1. Se você conhece o compositor com certeza, retorne APENAS o nome completo (ex: "Raul Torres e João Pacífico")
2. Se o artista é o próprio compositor (autoral), repita o nome do artista
3. Se for uma música tradicional/domínio público, responda "Tradicional"
4. Se você NÃO tiver certeza, responda "Desconhecido"

**IMPORTANTE:** 
- Para parcerias, liste ambos os nomes separados por "e" (ex: "Tonico e Tinoco")
- Não invente informações - apenas responda se tiver conhecimento confiável
- Priorize compositores brasileiros e regionais conhecidos

**RESPOSTA (apenas o nome):**`;
    }

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
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lovable AI error: ${response.status} - ${errorText}`);
      return { fonte: 'not-found', confianca: 0 };
    }

    const data = await response.json();
    let responseContent = data.choices?.[0]?.message?.content?.trim() || '';
    
    if (!responseContent) {
      console.log('❌ IA não retornou resposta válida');
      return { fonte: 'not-found', confianca: 0 };
    }

    console.log('🤖 Resposta da IA:', responseContent);
    
    // Parse JSON response for Nordestino format
    let compositor = '';
    let artistaSugerido = '';
    let confiancaIA = 70;
    
    if (isNordestino && responseContent.includes('{')) {
      try {
        // Tentar extrair JSON da resposta (pode ter texto antes/depois)
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Validar campos obrigatórios
          if (parsed.compositor && typeof parsed.compositor === 'string') {
            compositor = parsed.compositor.trim();
            artistaSugerido = parsed.artista?.trim() || '';
            confiancaIA = typeof parsed.confianca === 'number' ? parsed.confianca : 70;
            
            console.log(`✅ JSON válido parseado com sucesso`);
            console.log(`📊 Dados extraídos:`, { compositor, artistaSugerido, confiancaIA });
          } else {
            console.warn('⚠️ JSON sem campo "compositor", usando resposta raw');
            compositor = responseContent;
          }
        } else {
          console.warn('⚠️ JSON malformado, usando resposta raw');
          compositor = responseContent;
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
        console.warn(`⚠️ Erro ao parsear JSON: ${errorMessage}`);
        console.warn(`   Resposta: ${responseContent.slice(0, 200)}`);
        compositor = responseContent; // Fallback para texto puro
      }
    } else {
      // Gaúcho: texto puro esperado
      console.log(`📝 Resposta texto puro: ${responseContent.slice(0, 100)}...`);
      compositor = responseContent;
    }

    if (!compositor || compositor === 'Desconhecido') {
      console.log('❌ AI: Compositor desconhecido ou não confiável');
      console.log(`   Resposta original: "${responseContent.slice(0, 150)}"`);
      return { fonte: 'not-found', confianca: 0 };
    }

    // Parse response to extract composer name from complex responses
    let compositorExtraido = compositor;

    // Se a resposta contiver explicações, extrair apenas o nome
    if (compositor.includes('compost') || compositor.includes('autor')) {
      const nomeMatch = compositor.match(/(?:compositor(?:es)?|autor(?:es)?|parceria|por)\s*:?\s*([A-ZÇÁÉÍÓÚÂÊÔÃÕ][a-zçáéíóúâêôãõ]+(?:\s+[A-ZÇÁÉÍÓÚÂÊÔÃÕ][a-zçáéíóúâêôãõ]+)*(?:\s+e\s+[A-ZÇÁÉÍÓÚÂÊÔÃÕ][a-zçáéíóúâêôãõ]+(?:\s+[A-ZÇÁÉÍÓÚÂÊÔÃÕ][a-zçáéíóúâêôãõ]+)*)?)/i);
      
      if (nomeMatch) {
        compositorExtraido = nomeMatch[1].trim();
        console.log(`🎯 Nome extraído de contexto:`);
        console.log(`   Original: "${compositor}"`);
        console.log(`   Extraído: "${compositorExtraido}"`);
      }
    }

    // Validar que não é uma resposta genérica
    if (compositorExtraido.toLowerCase().includes('desconhecido') || 
        compositorExtraido.toLowerCase().includes('não encontr')) {
      return { fonte: 'not-found', confianca: 0 };
    }

    // Calcular confiança baseada no tipo de resposta
    let confianca: number;

    if (isNordestino && confiancaIA > 0) {
      // MODO JSON: Priorizar confiança da IA + ajustes mínimos
      console.log(`🎯 Confiança base da IA: ${confiancaIA}%`);
      confianca = confiancaIA;
      
      // Ajustes finos baseados em qualidade da resposta
      if (compositorExtraido.length > 5 && compositorExtraido.includes(' ')) {
        confianca += 5; // Nome completo
      }
      
      if (compositorExtraido.includes(' e ')) {
        confianca += 3; // Parceria identificada
      }
      
      if (artistaSugerido && artistaSugerido !== 'Desconhecido') {
        confianca += 5; // IA também identificou o artista
      }
      
      // Diminuir se resposta suspeita
      if (compositorExtraido.length < 5) {
        confianca -= 15;
      }
      
      confianca = Math.min(Math.max(confianca, 40), 98); // Limitar 40-98%
      
    } else {
      // MODO TEXTO PURO: Calcular confiança via heurísticas (Gaúcho)
      console.log(`🧮 Calculando confiança via heurísticas...`);
      confianca = 70; // Base
      
      if (compositorExtraido.length > 5 && compositorExtraido.includes(' ')) {
        confianca += 10;
      }
      
      if (artista && artista.toLowerCase() === compositorExtraido.toLowerCase()) {
        confianca += 15; // Música autoral
      }
      
      if (compositorExtraido.includes(' e ')) {
        confianca += 5;
      }
      
      if (compositorExtraido.length < 5) {
        confianca -= 20;
      }
      
      if (!compositorExtraido.match(/^[A-ZÇÁÉÍÓÚÂÊÔÃÕ]/)) {
        confianca -= 15;
      }
      
      confianca = Math.min(Math.max(confianca, 30), 95); // Limitar 30-95%
    }

    console.log(`✅ Confiança final: ${confianca}%`)

    console.log(`✅ AI inferiu: ${compositorExtraido} (${confianca}% confiança)`);

    return {
      compositor: compositorExtraido,
      artista: artistaSugerido || undefined, // NOVO: Retornar artista sugerido para Nordestino
      fonte: 'ai-inferred',
      confianca,
      detalhes: `Gemini 2.5 Flash | Contexto: ${contextoCultural} | Confiança: ${confianca}%${
        artistaSugerido ? ` | Artista sugerido: ${artistaSugerido}` : ''
      }${compositorExtraido !== compositor ? ` | Original: "${compositor.slice(0, 100)}..."` : ''}`
    };

  } catch (error) {
    console.error('❌ Lovable AI error:', error);
    return { fonte: 'not-found', confianca: 0 };
  }
}
