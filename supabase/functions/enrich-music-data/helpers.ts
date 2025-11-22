// Helper functions for music enrichment

interface YouTubeSearchResult {
  videoTitle: string;
  channelTitle: string;
  publishDate: string;
  description: string;
  videoId: string;
}

// Rate Limiter para controlar chamadas de API
export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent: number;
  private minDelay: number;
  private lastRequestTime = 0;

  constructor(maxConcurrent: number, minDelayMs: number) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelayMs;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          
          if (timeSinceLastRequest < this.minDelay) {
            await new Promise(r => setTimeout(r, this.minDelay - timeSinceLastRequest));
          }

          this.lastRequestTime = Date.now();
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        this.running++;
        task();
      }
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getRunningCount(): number {
    return this.running;
  }
}

async function searchYouTubeWithLovableAI(
  titulo: string,
  artista: string,
  apiKey: string
): Promise<YouTubeSearchResult | null> {
  console.log(`[Lovable AI] Searching for YouTube link: "${titulo}" by "${artista}"`);

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
          {
            role: 'system',
            content: 'You are a YouTube search assistant. Search for the official YouTube video and return ONLY valid JSON. No explanations.'
          },
          {
            role: 'user',
            content: `Busque no YouTube o vídeo oficial da música "${titulo}" do artista "${artista}".

IMPORTANTE:
- Retorne APENAS JSON válido
- Use o formato exato abaixo
- Se não encontrar, retorne videoId como null

Formato de resposta:
{
  "videoId": "ID_do_video_youtube",
  "videoTitle": "Título do vídeo",
  "channelTitle": "Nome do canal",
  "publishDate": "YYYY-MM-DD",
  "description": "Descrição do vídeo"
}

Se não encontrar: {"videoId": null}`
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Lovable AI] API error: ${response.status}`);
      console.error(`[Lovable AI] Error details: ${errorBody}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('[Lovable AI] No content returned');
      return null;
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Lovable AI] Could not extract JSON from response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validar estrutura
    if (!parsed || typeof parsed !== 'object') {
      console.warn('[Lovable AI] Invalid JSON structure');
      return null;
    }

    if (!parsed.videoId) {
      console.log(`[Lovable AI] No video found for: "${titulo}" by ${artista}`);
      return null;
    }

    // Validar campos obrigatórios
    if (!parsed.videoTitle || !parsed.channelTitle) {
      console.warn('[Lovable AI] Missing required fields in response');
    }

    console.log(`[Lovable AI] Found: "${parsed.videoTitle || 'Unknown'}" (${parsed.channelTitle || 'Unknown'})`);

    return {
      videoId: parsed.videoId,
      videoTitle: parsed.videoTitle || `${titulo} - ${artista}`,
      channelTitle: parsed.channelTitle || artista,
      publishDate: parsed.publishDate || new Date().toISOString(),
      description: parsed.description || ''
    };

  } catch (error) {
    console.error('[Lovable AI] Search error:', error);
    return null;
  }
}

export async function searchYouTube(
  titulo: string,
  artista: string,
  apiKey: string,
  supabase: any
): Promise<YouTubeSearchResult | null> {
  const searchQuery = `${titulo} ${artista} official audio`;

  try {
    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('youtube_cache')
      .select('video_id, video_title, channel_title, publish_date, description')
      .eq('search_query', searchQuery)
      .maybeSingle();

    if (cached && !cacheError) {
      console.log(`[YouTube] Cache HIT: "${searchQuery}"`);
      return {
        videoTitle: cached.video_title || '',
        channelTitle: cached.channel_title || '',
        publishDate: cached.publish_date || '',
        description: cached.description || '',
        videoId: cached.video_id
      };
    }

    console.log(`[YouTube] Cache MISS - Searching API: "${searchQuery}"`);

    // Search YouTube API
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=1&key=${apiKey}`;
    const response = await fetch(url);

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        console.error('[YouTube] Daily quota exceeded - Trying Lovable AI fallback...');
        
        // 🔄 FALLBACK: Try Lovable AI
        const lovableKey = Deno.env.get('LOVABLE_API_KEY');
        if (lovableKey) {
          const lovableResult = await searchYouTubeWithLovableAI(titulo, artista, lovableKey);
          
          if (lovableResult) {
            // Cache the Lovable AI result
            const { error: cacheSaveError } = await supabase.from('youtube_cache').insert({
              search_query: searchQuery,
              video_id: lovableResult.videoId,
              video_title: lovableResult.videoTitle,
              channel_title: lovableResult.channelTitle,
              publish_date: lovableResult.publishDate,
              description: lovableResult.description || '',
              hits_count: 0
            });

            if (cacheSaveError && !cacheSaveError.message.includes('duplicate')) {
              console.error('[YouTube] Cache save error:', cacheSaveError.message);
            }

            return lovableResult;
          }
        }
        
        return null;
      }
    }

    if (!response.ok) {
      console.error(`[YouTube] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const firstResult = data.items?.[0];

    if (!firstResult) {
      console.log(`[YouTube] No results found for: "${searchQuery}"`);
      return null;
    }

    const snippet = firstResult.snippet;
    const result: YouTubeSearchResult = {
      videoTitle: snippet.title,
      channelTitle: snippet.channelTitle || snippet.channelName,
      publishDate: snippet.publishedAt,
      description: snippet.description || '',
      videoId: firstResult.id.videoId
    };

    console.log(`[YouTube] Found: "${result.videoTitle}" (${result.channelTitle})`);

    // Cache the result
    const { error: cacheSaveError } = await supabase.from('youtube_cache').insert({
      search_query: searchQuery,
      video_id: result.videoId,
      video_title: result.videoTitle,
      channel_title: result.channelTitle,
      publish_date: result.publishDate,
      description: result.description || '',
      hits_count: 0
    });

    if (cacheSaveError && !cacheSaveError.message.includes('duplicate')) {
      console.error('[YouTube] Cache save error:', cacheSaveError.message);
    }

    return result;

  } catch (error) {
    console.error('[YouTube] Search error:', error);
    return null;
  }
}

export async function searchWithAI(
  titulo: string,
  artista: string,
  apiKey: string
): Promise<{ compositor: string; ano: string; fonte?: string }> {
  const searchPrompt = `Pesquise em seu conhecimento informações precisas sobre a música "${titulo}" do artista "${artista}".

Preciso encontrar:
1. O compositor (ou compositores) ORIGINAL(is) da música
2. O ano de lançamento ORIGINAL da música

IMPORTANTE:
- Se for um cover/regravação, quero os dados da versão ORIGINAL
- Retorne APENAS informações verificáveis que você conhece
- Se não tiver certeza, retorne "Não Identificado" para compositor e "0000" para ano
- Foque em música brasileira, especialmente forró, piseiro, sertanejo

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "compositor": "Nome do Compositor",
  "ano": "YYYY",
  "fonte": "IA Generativa"
}`;

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
          {
            role: 'system',
            content: 'Você é um pesquisador musical especialista em música brasileira. Retorne APENAS JSON válido, sem texto adicional.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Web Search AI] Error:', response.status, errorText);
      return { compositor: 'Não Identificado', ano: '0000' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('[Web Search AI] No content returned');
      return { compositor: 'Não Identificado', ano: '0000' };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      return {
        compositor: parsedData.compositor || 'Não Identificado',
        ano: validateYear(parsedData.ano),
        fonte: parsedData.fonte
      };
    }

    console.warn('[Web Search AI] Could not extract JSON from response');
    return { compositor: 'Não Identificado', ano: '0000' };

  } catch (error) {
    console.error('[Web Search AI] Error:', error);
    return { compositor: 'Não Identificado', ano: '0000' };
  }
}

export function validateYear(year: any): string {
  if (!year) return '0000';

  const yearStr = String(year).trim();

  if (/^\d{4}$/.test(yearStr)) {
    const yearNum = parseInt(yearStr, 10);
    const currentYear = new Date().getFullYear();
    if (yearNum >= 1900 && yearNum <= currentYear + 1) {
      return yearStr;
    }
  }

  const match = yearStr.match(/\d{4}/);
  if (match) {
    const yearNum = parseInt(match[0], 10);
    const currentYear = new Date().getFullYear();
    if (yearNum >= 1900 && yearNum <= currentYear + 1) {
      return match[0];
    }
  }

  return '0000';
}
