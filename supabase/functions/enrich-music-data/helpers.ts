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

// Lovable AI fallback removed due to hallucination issues

export async function searchYouTube(
  titulo: string,
  artista: string,
  apiKey: string,
  supabase: any
): Promise<YouTubeSearchResult | null> {
  const searchQuery = `${titulo} ${artista} official audio`;
  // Internal debug log - kept for ROI optimization
  console.log(`[YouTube] Searching for: "${searchQuery}"`);

  // Track quota usage BEFORE making API call
  if (supabase) {
    try {
      const { data: quotaData, error: quotaError } = await supabase.rpc('increment_youtube_quota');
      
      if (quotaError) {
        console.error('[YouTube] Error tracking quota:', quotaError);
      } else if (quotaData && quotaData > 10000) {
        console.error('[YouTube] Daily quota exceeded (10,000 queries)');
        return null;
      } else {
        console.log(`[YouTube] Quota usage: ${quotaData}/10,000 queries today`);
      }
    } catch (error) {
      console.error('[YouTube] Error checking quota:', error);
    }
  }

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
        console.error('[YouTube] Daily quota exceeded - No fallback available');
        throw new Error('YOUTUBE_QUOTA_EXCEEDED'); // ✅ FIX: Propaga erro ao invés de return null
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
  geminiApiKey: string
): Promise<{ compositor: string; ano: string; fonte?: string }> {
  const searchPrompt = `Você é um especialista em metadados musicais brasileiros.

Música: "${titulo}"
Artista: "${artista}"

Sua tarefa:
1. Identifique o COMPOSITOR ORIGINAL (não o intérprete)
2. Identifique o ANO DE LANÇAMENTO ORIGINAL (não de regravações)

REGRAS CRÍTICAS:
- Se for cover/regravação, retorne dados da versão ORIGINAL
- Retorne APENAS informações verificáveis e precisas
- Se não tiver certeza, retorne "Não Identificado" para compositor e "0000" para ano
- Priorize música brasileira (forró, piseiro, sertanejo, gaúcha)

Retorne APENAS um objeto JSON válido:
{
  "compositor": "Nome do Compositor",
  "ano": "YYYY",
  "fonte": "Base de Conhecimento Digital"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: searchPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300,
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini Pro Web Search] Error:', response.status, errorText);
      return { compositor: 'Não Identificado', ano: '0000' };
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.warn('[Gemini Pro Web Search] No content returned');
      return { compositor: 'Não Identificado', ano: '0000' };
    }

    const parsedData = JSON.parse(rawText);
    return {
      compositor: parsedData.compositor || 'Não Identificado',
      ano: validateYear(parsedData.ano),
      fonte: parsedData.fonte || 'Base de Conhecimento Digital'
    };

  } catch (error) {
    console.error('[Gemini Pro Web Search] Error:', error);
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
