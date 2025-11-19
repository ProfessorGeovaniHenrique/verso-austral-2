/**
 * ✅ SPRINT 2: Rate Limiting com Upstash Redis
 * Implementa sliding window rate limiting para proteger edge functions
 */

interface RateLimitConfig {
  maxRequests: number;  // Número máximo de requisições
  windowMs: number;     // Janela de tempo em milisegundos
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  error?: string;
}

/**
 * Implementa rate limiting usando Upstash Redis
 * Usa sliding window algorithm para contagem precisa
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const upstashUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const upstashToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (!upstashUrl || !upstashToken) {
    console.warn("⚠️ Upstash Redis não configurado - rate limiting desabilitado");
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowMs,
    };
  }

  try {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const key = `ratelimit:${identifier}`;

    // Pipeline Redis: limpar antigos + adicionar novo + contar + expirar
    const pipeline = [
      ["ZREMRANGEBYSCORE", key, 0, windowStart],
      ["ZADD", key, now, `${now}-${Math.random()}`],
      ["ZCOUNT", key, windowStart, now],
      ["EXPIRE", key, Math.ceil(config.windowMs / 1000)],
    ];

    const response = await fetch(`${upstashUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });

    if (!response.ok) {
      throw new Error(`Upstash error: ${response.status}`);
    }

    const results = await response.json();
    const count = results[2]?.result || 0;

    const remaining = Math.max(0, config.maxRequests - count);
    const reset = now + config.windowMs;

    if (count > config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset,
        error: `Rate limit excedido. Tente novamente em ${Math.ceil(config.windowMs / 1000)}s`,
      };
    }

    return {
      success: true,
      limit: config.maxRequests,
      remaining,
      reset,
    };
  } catch (error) {
    console.error("❌ Erro no rate limiting:", error);
    // Em caso de erro, permitir requisição (fail-open)
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowMs,
    };
  }
}

/**
 * Configs de rate limit pré-definidos
 */
export const RateLimitPresets = {
  // 5 requisições por minuto (para operações sensíveis)
  STRICT: { maxRequests: 5, windowMs: 60_000 },
  
  // 20 requisições por minuto (para operações normais)
  NORMAL: { maxRequests: 20, windowMs: 60_000 },
  
  // 100 requisições por minuto (para operações leves)
  RELAXED: { maxRequests: 100, windowMs: 60_000 },
  
  // 10 requisições por hora (para importações pesadas)
  HEAVY_IMPORT: { maxRequests: 10, windowMs: 3_600_000 },
} as const;

/**
 * Cria headers de resposta HTTP com informações de rate limit
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}
