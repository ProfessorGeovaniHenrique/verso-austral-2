import { Redis } from "https://esm.sh/@upstash/redis@1.28.4";

interface RateLimitConfig {
  maxRequests: number;      // Máximo de requisições
  windowSeconds: number;    // Janela de tempo em segundos
  identifier: string;        // IP ou user_id
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;          // Timestamp quando o limite reseta
}

export class RateLimiter {
  private redis: Redis;

  constructor() {
    const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      throw new Error('Upstash Redis credentials not configured');
    }

    this.redis = new Redis({ url, token });
  }

  /**
   * Implementa rate limiting com Sliding Window Counter
   * Algoritmo: Mantém contadores para cada segundo da janela
   */
  async checkLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const { maxRequests, windowSeconds, identifier } = config;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    const key = `ratelimit:${identifier}`;

    // 1. Remover requisições antigas (fora da janela)
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // 2. Contar requisições na janela atual
    const currentCount = await this.redis.zcount(key, windowStart, now);

    // 3. Verificar se excedeu limite
    if (currentCount >= maxRequests) {
      // Obter timestamp da requisição mais antiga na janela
      const oldestRequest: any = await this.redis.zrange(key, 0, 0, { withScores: true });
      const resetAt = oldestRequest[0]?.score 
        ? (oldestRequest[0].score + (windowSeconds * 1000))
        : now + (windowSeconds * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(resetAt / 1000)
      };
    }

    // 4. Registrar nova requisição
    await this.redis.zadd(key, { score: now, member: `${now}` });

    // 5. Definir TTL para limpeza automática
    await this.redis.expire(key, windowSeconds * 2);

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt: Math.ceil((now + (windowSeconds * 1000)) / 1000)
    };
  }

  /**
   * Rate limiting por IP (para requisições anônimas)
   */
  async checkByIP(req: Request, maxRequests: number = 10, windowSeconds: number = 60): Promise<RateLimitResult> {
    const ip = req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') || 
                'unknown';

    return this.checkLimit({
      maxRequests,
      windowSeconds,
      identifier: `ip:${ip}`
    });
  }

  /**
   * Rate limiting por user_id (para requisições autenticadas)
   */
  async checkByUser(userId: string, maxRequests: number = 50, windowSeconds: number = 60): Promise<RateLimitResult> {
    return this.checkLimit({
      maxRequests,
      windowSeconds,
      identifier: `user:${userId}`
    });
  }
}

/**
 * Helper para adicionar headers de rate limiting na resposta
 */
export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-RateLimit-Limit', String(result.remaining + (result.allowed ? 1 : 0)));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.resetAt));
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
