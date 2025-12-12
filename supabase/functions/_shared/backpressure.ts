/**
 * Backpressure System - Detecção automática de sobrecarga do Supabase
 * 
 * SPRINT BP-1: Sistema que detecta timeouts/alta latência e pausa jobs automaticamente
 * Usa Upstash Redis para coordenar estado entre todas as edge functions
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configurações de backpressure
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos de cooldown
const LATENCY_THRESHOLD_DEGRADED_MS = 500; // Latência para modo degradado
const LATENCY_THRESHOLD_UNHEALTHY_MS = 1000; // Latência para modo unhealthy
const ERROR_RATE_THRESHOLD_DEGRADED = 25; // % de erros para modo degradado
const ERROR_RATE_THRESHOLD_UNHEALTHY = 50; // % de erros para modo unhealthy
const REDIS_KEY_PREFIX = "backpressure:";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface BackpressureStatus {
  isActive: boolean;
  status: HealthStatus;
  cooldownUntil: string | null;
  cooldownRemainingMs: number;
  triggerReason: string | null;
  lastCheck: string;
  metrics: {
    dbLatencyMs: number;
    errorCount: number;
    requestCount: number;
    errorRate: number;
  };
}

export interface HealthCheckResult {
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  shouldPause: boolean;
  shouldSlowDown: boolean;
}

// In-memory metrics (reset on cold start, but Redis persists across instances)
let requestCount = 0;
let errorCount = 0;
let lastDbLatencyMs = 0;

export function incrementRequestCount(): void {
  requestCount++;
}

export function incrementErrorCount(): void {
  errorCount++;
}

export function recordDbLatency(latencyMs: number): void {
  lastDbLatencyMs = latencyMs;
}

/**
 * Verifica saúde do banco de dados com query simples
 */
async function checkDatabaseHealth(): Promise<{ latencyMs: number; healthy: boolean; error?: string }> {
  const start = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Query simples para verificar conectividade
    const { error } = await supabase
      .from("semantic_tagset")
      .select("id")
      .limit(1);
    
    const latencyMs = Date.now() - start;
    
    if (error) {
      return { latencyMs, healthy: false, error: error.message };
    }
    
    return { latencyMs, healthy: true };
  } catch (error) {
    const latencyMs = Date.now() - start;
    return { 
      latencyMs, 
      healthy: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Obtém cliente Redis (Upstash)
 */
function getRedisClient() {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  
  if (!redisUrl || !redisToken) {
    console.warn("[backpressure] Redis não configurado, usando fallback local");
    return null;
  }
  
  return { url: redisUrl, token: redisToken };
}

/**
 * Executa comando Redis via REST API
 */
async function redisCommand(command: string[]): Promise<any> {
  const redis = getRedisClient();
  if (!redis) return null;
  
  try {
    const response = await fetch(`${redis.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redis.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    
    if (!response.ok) {
      console.error("[backpressure] Redis error:", response.status);
      return null;
    }
    
    const data = await response.json();
    return data.result;
  } catch (err) {
    console.error("[backpressure] Redis request failed:", err);
    return null;
  }
}

/**
 * Verifica se o sistema está em cooldown (backpressure ativo)
 */
export async function checkBackpressureStatus(): Promise<BackpressureStatus> {
  const now = Date.now();
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  
  // Tentar obter estado do Redis
  const cooldownUntil = await redisCommand(["GET", `${REDIS_KEY_PREFIX}cooldown_until`]);
  const triggerReason = await redisCommand(["GET", `${REDIS_KEY_PREFIX}trigger_reason`]);
  
  let isActive = false;
  let cooldownRemainingMs = 0;
  
  if (cooldownUntil) {
    const cooldownTimestamp = parseInt(cooldownUntil, 10);
    if (cooldownTimestamp > now) {
      isActive = true;
      cooldownRemainingMs = cooldownTimestamp - now;
    } else {
      // Cooldown expirou, limpar
      await clearBackpressure();
    }
  }
  
  // Determinar status baseado em métricas
  let status: HealthStatus = "healthy";
  if (errorRate > ERROR_RATE_THRESHOLD_UNHEALTHY || lastDbLatencyMs > LATENCY_THRESHOLD_UNHEALTHY_MS) {
    status = "unhealthy";
  } else if (errorRate > ERROR_RATE_THRESHOLD_DEGRADED || lastDbLatencyMs > LATENCY_THRESHOLD_DEGRADED_MS) {
    status = "degraded";
  }
  
  return {
    isActive,
    status,
    cooldownUntil: cooldownUntil ? new Date(parseInt(cooldownUntil, 10)).toISOString() : null,
    cooldownRemainingMs,
    triggerReason,
    lastCheck: new Date().toISOString(),
    metrics: {
      dbLatencyMs: lastDbLatencyMs,
      errorCount,
      requestCount,
      errorRate: parseFloat(errorRate.toFixed(2)),
    },
  };
}

/**
 * Ativa backpressure com cooldown de 5 minutos
 */
export async function triggerBackpressure(reason: string, cooldownMs: number = COOLDOWN_MS): Promise<void> {
  const cooldownUntil = Date.now() + cooldownMs;
  
  console.log(`[backpressure] 🛑 ATIVANDO BACKPRESSURE: ${reason}`);
  console.log(`[backpressure] Cooldown até: ${new Date(cooldownUntil).toISOString()}`);
  
  // Salvar no Redis com TTL
  const ttlSeconds = Math.ceil(cooldownMs / 1000) + 60; // TTL com margem
  await redisCommand(["SETEX", `${REDIS_KEY_PREFIX}cooldown_until`, ttlSeconds.toString(), cooldownUntil.toString()]);
  await redisCommand(["SETEX", `${REDIS_KEY_PREFIX}trigger_reason`, ttlSeconds.toString(), reason]);
  await redisCommand(["SET", `${REDIS_KEY_PREFIX}status`, "active"]);
}

/**
 * Limpa backpressure (sistema recuperou)
 */
export async function clearBackpressure(): Promise<void> {
  console.log("[backpressure] ✅ Limpando backpressure - sistema recuperado");
  
  await redisCommand(["DEL", `${REDIS_KEY_PREFIX}cooldown_until`]);
  await redisCommand(["DEL", `${REDIS_KEY_PREFIX}trigger_reason`]);
  await redisCommand(["SET", `${REDIS_KEY_PREFIX}status`, "inactive"]);
  
  // Reset métricas locais
  errorCount = 0;
  requestCount = 0;
}

/**
 * FUNÇÃO PRINCIPAL: Verifica saúde e decide se deve pausar/continuar
 * Deve ser chamada no início de cada chunk de processamento
 */
export async function performHealthCheck(functionName: string): Promise<HealthCheckResult> {
  incrementRequestCount();
  
  // 1. Verificar se já está em cooldown
  const bpStatus = await checkBackpressureStatus();
  if (bpStatus.isActive) {
    const minutesRemaining = Math.ceil(bpStatus.cooldownRemainingMs / 60000);
    console.log(`[backpressure] ⏸️ Sistema em cooldown (${minutesRemaining}min restantes)`);
    return {
      status: "unhealthy",
      latencyMs: 0,
      message: `Backpressure ativo: ${bpStatus.triggerReason}. Retomada em ${minutesRemaining} min.`,
      shouldPause: true,
      shouldSlowDown: false,
    };
  }
  
  // 2. Verificar saúde do banco
  const dbHealth = await checkDatabaseHealth();
  recordDbLatency(dbHealth.latencyMs);
  
  console.log(`[backpressure] DB health check: ${dbHealth.latencyMs}ms, healthy=${dbHealth.healthy}`);
  
  // 3. Avaliar resultado
  if (!dbHealth.healthy || dbHealth.latencyMs > LATENCY_THRESHOLD_UNHEALTHY_MS) {
    // DB está com problemas - ativar backpressure
    const reason = dbHealth.error 
      ? `DB error: ${dbHealth.error}` 
      : `Alta latência: ${dbHealth.latencyMs}ms`;
    
    await triggerBackpressure(reason);
    incrementErrorCount();
    
    return {
      status: "unhealthy",
      latencyMs: dbHealth.latencyMs,
      message: reason,
      shouldPause: true,
      shouldSlowDown: false,
    };
  }
  
  if (dbHealth.latencyMs > LATENCY_THRESHOLD_DEGRADED_MS) {
    // DB está lento mas funcionando - modo degradado
    console.log(`[backpressure] ⚠️ Modo degradado: latência ${dbHealth.latencyMs}ms`);
    return {
      status: "degraded",
      latencyMs: dbHealth.latencyMs,
      message: `Latência elevada: ${dbHealth.latencyMs}ms - reduzindo velocidade`,
      shouldPause: false,
      shouldSlowDown: true,
    };
  }
  
  // DB saudável
  return {
    status: "healthy",
    latencyMs: dbHealth.latencyMs,
    shouldPause: false,
    shouldSlowDown: false,
  };
}

/**
 * Obtém delay recomendado baseado no status de saúde
 */
export function getRecommendedDelay(healthResult: HealthCheckResult, baseDelayMs: number): number {
  if (healthResult.status === "degraded") {
    return baseDelayMs * 2; // Dobrar delay em modo degradado
  }
  return baseDelayMs;
}
