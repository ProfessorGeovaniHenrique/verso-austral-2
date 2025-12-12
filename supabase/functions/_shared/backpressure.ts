/**
 * Backpressure System - Detecção automática de sobrecarga do Supabase
 * 
 * SPRINT BP-2: Sistema aprimorado com cooldowns escalonados, métricas persistentes
 * e integração com job-slot-manager para controle de concorrência
 * Usa Upstash Redis para coordenar estado entre todas as edge functions
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getJobSlotStatus, type JobSlotStatus } from "./job-slot-manager.ts";

// Configurações de backpressure - COOLDOWNS ESCALONADOS
const COOLDOWN_LEVELS = {
  degraded: 3 * 60 * 1000,   // 3 minutos - latência alta mas funcional
  unhealthy: 10 * 60 * 1000, // 10 minutos - erros ou timeout
  critical: 30 * 60 * 1000,  // 30 minutos - colapso total (equivalente ao kill switch)
} as const;

const LATENCY_THRESHOLD_DEGRADED_MS = 500;
const LATENCY_THRESHOLD_UNHEALTHY_MS = 1000;
const LATENCY_THRESHOLD_CRITICAL_MS = 3000;
const ERROR_RATE_THRESHOLD_DEGRADED = 25;
const ERROR_RATE_THRESHOLD_UNHEALTHY = 50;
const ERROR_RATE_THRESHOLD_CRITICAL = 75;
const REDIS_KEY_PREFIX = "backpressure:";
const METRICS_TTL_SECONDS = 3600; // 1 hora

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "critical";
export type CooldownLevel = keyof typeof COOLDOWN_LEVELS;

export interface BackpressureStatus {
  isActive: boolean;
  status: HealthStatus;
  cooldownUntil: string | null;
  cooldownRemainingMs: number;
  cooldownLevel: CooldownLevel | null;
  triggerReason: string | null;
  lastCheck: string;
  metrics: {
    dbLatencyMs: number;
    dbLatencyAvg: number;
    errorCount: number;
    errorCount1h: number;
    requestCount: number;
    requestCount1h: number;
    errorRate: number;
  };
  concurrency: JobSlotStatus | null;
}

export interface HealthCheckResult {
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  shouldPause: boolean;
  shouldSlowDown: boolean;
  cooldownLevel?: CooldownLevel;
  concurrency?: JobSlotStatus;
}

// In-memory metrics (reset on cold start, complementadas por Redis)
let requestCount = 0;
let errorCount = 0;
let lastDbLatencyMs = 0;
let latencyHistory: number[] = []; // Últimas 10 medições para média móvel

export function incrementRequestCount(): void {
  requestCount++;
  // Também persistir no Redis
  persistMetric("request_count", 1).catch(() => {});
}

export function incrementErrorCount(): void {
  errorCount++;
  // Também persistir no Redis
  persistMetric("error_count", 1).catch(() => {});
}

export function recordDbLatency(latencyMs: number): void {
  lastDbLatencyMs = latencyMs;
  // Manter histórico para média móvel
  latencyHistory.push(latencyMs);
  if (latencyHistory.length > 10) {
    latencyHistory.shift();
  }
  // Persistir no Redis
  persistLatency(latencyMs).catch(() => {});
}

function getAverageLatency(): number {
  if (latencyHistory.length === 0) return 0;
  return Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length);
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
 * Persiste métrica incremental no Redis
 */
async function persistMetric(metricName: string, value: number): Promise<void> {
  const key = `${REDIS_KEY_PREFIX}metrics:${metricName}`;
  await redisCommand(["INCRBY", key, value.toString()]);
  await redisCommand(["EXPIRE", key, METRICS_TTL_SECONDS.toString()]);
}

/**
 * Persiste latência no Redis (média móvel via sorted set)
 */
async function persistLatency(latencyMs: number): Promise<void> {
  const key = `${REDIS_KEY_PREFIX}metrics:latency_samples`;
  const timestamp = Date.now();
  
  // Adicionar sample com timestamp como score
  await redisCommand(["ZADD", key, timestamp.toString(), `${timestamp}:${latencyMs}`]);
  
  // Remover samples antigas (> 1 hora)
  const oneHourAgo = timestamp - 3600000;
  await redisCommand(["ZREMRANGEBYSCORE", key, "0", oneHourAgo.toString()]);
  
  // TTL de segurança
  await redisCommand(["EXPIRE", key, METRICS_TTL_SECONDS.toString()]);
}

/**
 * Obtém métricas persistentes do Redis (última hora)
 */
async function getPersistentMetrics(): Promise<{ errorCount1h: number; requestCount1h: number; latencyAvg: number }> {
  const [errorCount1h, requestCount1h, latencySamples] = await Promise.all([
    redisCommand(["GET", `${REDIS_KEY_PREFIX}metrics:error_count`]),
    redisCommand(["GET", `${REDIS_KEY_PREFIX}metrics:request_count`]),
    redisCommand(["ZRANGE", `${REDIS_KEY_PREFIX}metrics:latency_samples`, "0", "-1"]),
  ]);
  
  // Calcular média de latência das samples
  let latencyAvg = 0;
  if (latencySamples && latencySamples.length > 0) {
    const latencies = latencySamples.map((s: string) => {
      const parts = s.split(":");
      return parseInt(parts[1] || "0", 10);
    });
    latencyAvg = Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length);
  }
  
  return {
    errorCount1h: parseInt(errorCount1h || "0", 10),
    requestCount1h: parseInt(requestCount1h || "0", 10),
    latencyAvg,
  };
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
 * Determina nível de cooldown baseado na severidade
 */
function determineCooldownLevel(
  latencyMs: number, 
  errorRate: number, 
  dbHealthy: boolean
): CooldownLevel | null {
  // Crítico: DB down ou latência extrema ou muitos erros
  if (!dbHealthy || latencyMs > LATENCY_THRESHOLD_CRITICAL_MS || errorRate > ERROR_RATE_THRESHOLD_CRITICAL) {
    return "critical";
  }
  
  // Unhealthy: Latência muito alta ou taxa de erros alta
  if (latencyMs > LATENCY_THRESHOLD_UNHEALTHY_MS || errorRate > ERROR_RATE_THRESHOLD_UNHEALTHY) {
    return "unhealthy";
  }
  
  // Degradado: Latência elevada ou alguns erros
  if (latencyMs > LATENCY_THRESHOLD_DEGRADED_MS || errorRate > ERROR_RATE_THRESHOLD_DEGRADED) {
    return "degraded";
  }
  
  return null;
}

/**
 * Verifica se o sistema está em cooldown (backpressure ativo)
 */
export async function checkBackpressureStatus(): Promise<BackpressureStatus> {
  const now = Date.now();
  const localErrorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  
  // Tentar obter estado do Redis
  const [cooldownUntil, triggerReason, cooldownLevel, persistentMetrics, jobSlotStatus] = await Promise.all([
    redisCommand(["GET", `${REDIS_KEY_PREFIX}cooldown_until`]),
    redisCommand(["GET", `${REDIS_KEY_PREFIX}trigger_reason`]),
    redisCommand(["GET", `${REDIS_KEY_PREFIX}cooldown_level`]),
    getPersistentMetrics(),
    getJobSlotStatus().catch(() => null),
  ]);
  
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
  
  // Determinar status baseado em métricas (usar média móvel para suavizar)
  const avgLatency = getAverageLatency() || lastDbLatencyMs;
  const effectiveErrorRate = Math.max(localErrorRate, 
    persistentMetrics.requestCount1h > 0 
      ? (persistentMetrics.errorCount1h / persistentMetrics.requestCount1h) * 100 
      : 0
  );
  
  let status: HealthStatus = "healthy";
  if (effectiveErrorRate > ERROR_RATE_THRESHOLD_CRITICAL || avgLatency > LATENCY_THRESHOLD_CRITICAL_MS) {
    status = "critical";
  } else if (effectiveErrorRate > ERROR_RATE_THRESHOLD_UNHEALTHY || avgLatency > LATENCY_THRESHOLD_UNHEALTHY_MS) {
    status = "unhealthy";
  } else if (effectiveErrorRate > ERROR_RATE_THRESHOLD_DEGRADED || avgLatency > LATENCY_THRESHOLD_DEGRADED_MS) {
    status = "degraded";
  }
  
  return {
    isActive,
    status,
    cooldownUntil: cooldownUntil ? new Date(parseInt(cooldownUntil, 10)).toISOString() : null,
    cooldownRemainingMs,
    cooldownLevel: (cooldownLevel as CooldownLevel) || null,
    triggerReason,
    lastCheck: new Date().toISOString(),
    metrics: {
      dbLatencyMs: lastDbLatencyMs,
      dbLatencyAvg: avgLatency,
      errorCount,
      errorCount1h: persistentMetrics.errorCount1h,
      requestCount,
      requestCount1h: persistentMetrics.requestCount1h,
      errorRate: parseFloat(effectiveErrorRate.toFixed(2)),
    },
    concurrency: jobSlotStatus,
  };
}

/**
 * Ativa backpressure com cooldown escalonado baseado na severidade
 */
export async function triggerBackpressure(
  reason: string, 
  level: CooldownLevel = "unhealthy"
): Promise<void> {
  const cooldownMs = COOLDOWN_LEVELS[level];
  const cooldownUntil = Date.now() + cooldownMs;
  
  console.log(`[backpressure] 🛑 ATIVANDO BACKPRESSURE (${level}): ${reason}`);
  console.log(`[backpressure] Cooldown de ${cooldownMs / 60000} minutos até: ${new Date(cooldownUntil).toISOString()}`);
  
  // Salvar no Redis com TTL
  const ttlSeconds = Math.ceil(cooldownMs / 1000) + 60; // TTL com margem
  await Promise.all([
    redisCommand(["SETEX", `${REDIS_KEY_PREFIX}cooldown_until`, ttlSeconds.toString(), cooldownUntil.toString()]),
    redisCommand(["SETEX", `${REDIS_KEY_PREFIX}trigger_reason`, ttlSeconds.toString(), reason]),
    redisCommand(["SETEX", `${REDIS_KEY_PREFIX}cooldown_level`, ttlSeconds.toString(), level]),
    redisCommand(["SET", `${REDIS_KEY_PREFIX}status`, "active"]),
  ]);
}

/**
 * Limpa backpressure (sistema recuperou)
 */
export async function clearBackpressure(): Promise<void> {
  console.log("[backpressure] ✅ Limpando backpressure - sistema recuperado");
  
  await Promise.all([
    redisCommand(["DEL", `${REDIS_KEY_PREFIX}cooldown_until`]),
    redisCommand(["DEL", `${REDIS_KEY_PREFIX}trigger_reason`]),
    redisCommand(["DEL", `${REDIS_KEY_PREFIX}cooldown_level`]),
    redisCommand(["SET", `${REDIS_KEY_PREFIX}status`, "inactive"]),
  ]);
  
  // Reset métricas locais
  errorCount = 0;
  requestCount = 0;
  latencyHistory = [];
}

/**
 * FUNÇÃO PRINCIPAL: Verifica saúde e decide se deve pausar/continuar
 * Deve ser chamada no início de cada chunk de processamento
 */
export async function performHealthCheck(functionName: string): Promise<HealthCheckResult> {
  incrementRequestCount();
  
  // 1. Verificar status de concorrência (via job-slot-manager)
  let concurrency: JobSlotStatus | undefined;
  try {
    concurrency = await getJobSlotStatus();
    
    // Se nível CRITICAL de concorrência, ativar backpressure imediatamente
    if (concurrency.level === "CRITICAL") {
      const reason = `Sobrecarga de concorrência: ${concurrency.activeJobCount} jobs ativos`;
      await triggerBackpressure(reason, "critical");
      
      return {
        status: "critical",
        latencyMs: 0,
        message: reason,
        shouldPause: true,
        shouldSlowDown: false,
        cooldownLevel: "critical",
        concurrency,
      };
    }
  } catch (err) {
    console.warn("[backpressure] Erro ao verificar concorrência:", err);
  }
  
  // 2. Verificar se já está em cooldown
  const bpStatus = await checkBackpressureStatus();
  if (bpStatus.isActive) {
    const minutesRemaining = Math.ceil(bpStatus.cooldownRemainingMs / 60000);
    console.log(`[backpressure] ⏸️ Sistema em cooldown ${bpStatus.cooldownLevel} (${minutesRemaining}min restantes)`);
    return {
      status: "unhealthy",
      latencyMs: 0,
      message: `Backpressure ativo (${bpStatus.cooldownLevel}): ${bpStatus.triggerReason}. Retomada em ${minutesRemaining} min.`,
      shouldPause: true,
      shouldSlowDown: false,
      cooldownLevel: bpStatus.cooldownLevel || undefined,
      concurrency,
    };
  }
  
  // 3. Verificar saúde do banco
  const dbHealth = await checkDatabaseHealth();
  recordDbLatency(dbHealth.latencyMs);
  
  console.log(`[backpressure] DB health check: ${dbHealth.latencyMs}ms, healthy=${dbHealth.healthy}`);
  
  // 4. Determinar se precisa ativar cooldown e qual nível
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  const cooldownLevel = determineCooldownLevel(dbHealth.latencyMs, errorRate, dbHealth.healthy);
  
  if (cooldownLevel) {
    const reason = dbHealth.error 
      ? `DB error: ${dbHealth.error}` 
      : `Alta latência: ${dbHealth.latencyMs}ms, Taxa erros: ${errorRate.toFixed(1)}%`;
    
    await triggerBackpressure(reason, cooldownLevel);
    incrementErrorCount();
    
    // Critical e unhealthy pausam, degraded apenas reduz velocidade
    const shouldPause = cooldownLevel === "critical" || cooldownLevel === "unhealthy";
    
    return {
      status: cooldownLevel === "critical" ? "critical" : cooldownLevel === "unhealthy" ? "unhealthy" : "degraded",
      latencyMs: dbHealth.latencyMs,
      message: reason,
      shouldPause,
      shouldSlowDown: !shouldPause,
      cooldownLevel,
      concurrency,
    };
  }
  
  // 5. DB saudável - verificar se nível de concorrência exige slowdown
  if (concurrency && concurrency.level !== "NORMAL") {
    console.log(`[backpressure] ⚠️ Concorrência ${concurrency.level}: aplicando delay ${concurrency.delayMultiplier}x`);
    return {
      status: "degraded",
      latencyMs: dbHealth.latencyMs,
      message: `Concorrência elevada: ${concurrency.activeJobCount} jobs ativos`,
      shouldPause: false,
      shouldSlowDown: true,
      concurrency,
    };
  }
  
  // Tudo OK
  return {
    status: "healthy",
    latencyMs: dbHealth.latencyMs,
    shouldPause: false,
    shouldSlowDown: false,
    concurrency,
  };
}

/**
 * Obtém delay recomendado baseado no status de saúde E concorrência
 */
export function getRecommendedDelay(healthResult: HealthCheckResult, baseDelayMs: number): number {
  // Usar multiplicador de concorrência se disponível
  const concurrencyMultiplier = healthResult.concurrency?.delayMultiplier || 1;
  
  // Multiplicador adicional por status de saúde
  let healthMultiplier = 1;
  if (healthResult.status === "degraded") {
    healthMultiplier = 2;
  } else if (healthResult.status === "unhealthy") {
    healthMultiplier = 4;
  }
  
  return baseDelayMs * Math.max(concurrencyMultiplier, healthMultiplier);
}
