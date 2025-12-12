/**
 * Job Slot Manager - Controle de concorrência global via Redis
 * 
 * SPRINT BP-2: Sistema que limita jobs ativos globalmente para prevenir sobrecarga
 * Usa Upstash Redis para coordenar slots entre todas as edge functions
 */

const MAX_CONCURRENT_JOBS = 5;
const SLOT_KEY = "backpressure:active_jobs";
const SLOT_SET_KEY = "backpressure:active_jobs_set";
const SLOT_TTL_SECONDS = 300; // 5 minutos TTL por slot (auto-cleanup se job crashar)

// Thresholds progressivos baseados em jobs ativos
export const CONCURRENCY_THRESHOLDS = {
  NORMAL: { maxJobs: 3, delayMultiplier: 1, canStart: true },
  ELEVATED: { maxJobs: 5, delayMultiplier: 2, canStart: true },
  HIGH: { maxJobs: 8, delayMultiplier: 4, canStart: false },
  CRITICAL: { maxJobs: 999, delayMultiplier: 8, canStart: false },
} as const;

export type ConcurrencyLevel = keyof typeof CONCURRENCY_THRESHOLDS;

export interface JobSlotStatus {
  activeJobCount: number;
  maxConcurrentJobs: number;
  level: ConcurrencyLevel;
  canStartNewJob: boolean;
  delayMultiplier: number;
  activeJobIds: string[];
}

/**
 * Obtém cliente Redis (Upstash)
 */
function getRedisClient() {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  
  if (!redisUrl || !redisToken) {
    console.warn("[job-slot-manager] Redis não configurado");
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
      console.error("[job-slot-manager] Redis error:", response.status);
      return null;
    }
    
    const data = await response.json();
    return data.result;
  } catch (err) {
    console.error("[job-slot-manager] Redis request failed:", err);
    return null;
  }
}

/**
 * Executa pipeline de comandos Redis (múltiplos comandos em uma chamada)
 */
async function redisPipeline(commands: string[][]): Promise<any[]> {
  const redis = getRedisClient();
  if (!redis) return [];
  
  try {
    const response = await fetch(`${redis.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redis.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });
    
    if (!response.ok) {
      console.error("[job-slot-manager] Redis pipeline error:", response.status);
      return [];
    }
    
    const data = await response.json();
    return data.map((r: any) => r.result);
  } catch (err) {
    console.error("[job-slot-manager] Redis pipeline failed:", err);
    return [];
  }
}

/**
 * Determina nível de concorrência baseado em jobs ativos
 */
function getConcurrencyLevel(activeJobs: number): ConcurrencyLevel {
  if (activeJobs <= CONCURRENCY_THRESHOLDS.NORMAL.maxJobs) return "NORMAL";
  if (activeJobs <= CONCURRENCY_THRESHOLDS.ELEVATED.maxJobs) return "ELEVATED";
  if (activeJobs <= CONCURRENCY_THRESHOLDS.HIGH.maxJobs) return "HIGH";
  return "CRITICAL";
}

/**
 * Obtém status atual de slots de job
 */
export async function getJobSlotStatus(): Promise<JobSlotStatus> {
  // Obter contador e lista de jobs ativos
  const [count, members] = await Promise.all([
    redisCommand(["GET", SLOT_KEY]),
    redisCommand(["SMEMBERS", SLOT_SET_KEY]),
  ]);
  
  const activeJobCount = parseInt(count || "0", 10);
  const activeJobIds = members || [];
  const level = getConcurrencyLevel(activeJobCount);
  const threshold = CONCURRENCY_THRESHOLDS[level];
  
  return {
    activeJobCount,
    maxConcurrentJobs: MAX_CONCURRENT_JOBS,
    level,
    canStartNewJob: threshold.canStart && activeJobCount < MAX_CONCURRENT_JOBS,
    delayMultiplier: threshold.delayMultiplier,
    activeJobIds,
  };
}

/**
 * Tenta adquirir um slot para novo job
 * Retorna true se slot adquirido, false se sistema cheio
 */
export async function acquireJobSlot(jobId: string, jobType: string): Promise<boolean> {
  const status = await getJobSlotStatus();
  
  // Verificar se pode iniciar
  if (!status.canStartNewJob) {
    console.log(`[job-slot-manager] ⛔ Slot negado para ${jobType}:${jobId} - ${status.activeJobCount}/${MAX_CONCURRENT_JOBS} jobs ativos (nível: ${status.level})`);
    return false;
  }
  
  // Incrementar contador e adicionar ao set com TTL
  const slotKey = `${jobType}:${jobId}`;
  
  const results = await redisPipeline([
    ["INCR", SLOT_KEY],
    ["SADD", SLOT_SET_KEY, slotKey],
    ["EXPIRE", SLOT_KEY, SLOT_TTL_SECONDS.toString()],
    ["EXPIRE", SLOT_SET_KEY, SLOT_TTL_SECONDS.toString()],
    // Também criar chave individual com TTL para auto-cleanup
    ["SETEX", `backpressure:job:${slotKey}`, SLOT_TTL_SECONDS.toString(), Date.now().toString()],
  ]);
  
  const newCount = results[0] || 0;
  console.log(`[job-slot-manager] ✅ Slot adquirido para ${slotKey} - agora ${newCount}/${MAX_CONCURRENT_JOBS} jobs ativos`);
  
  return true;
}

/**
 * Libera slot quando job termina
 */
export async function releaseJobSlot(jobId: string, jobType: string): Promise<void> {
  const slotKey = `${jobType}:${jobId}`;
  
  await redisPipeline([
    ["DECR", SLOT_KEY],
    ["SREM", SLOT_SET_KEY, slotKey],
    ["DEL", `backpressure:job:${slotKey}`],
  ]);
  
  // Garantir que contador não fique negativo
  const count = await redisCommand(["GET", SLOT_KEY]);
  if (parseInt(count || "0", 10) < 0) {
    await redisCommand(["SET", SLOT_KEY, "0"]);
  }
  
  console.log(`[job-slot-manager] 🔓 Slot liberado para ${slotKey}`);
}

/**
 * Renova TTL do slot (heartbeat)
 * Deve ser chamado periodicamente durante processamento longo
 */
export async function renewJobSlot(jobId: string, jobType: string): Promise<void> {
  const slotKey = `${jobType}:${jobId}`;
  
  await redisPipeline([
    ["EXPIRE", SLOT_KEY, SLOT_TTL_SECONDS.toString()],
    ["EXPIRE", SLOT_SET_KEY, SLOT_TTL_SECONDS.toString()],
    ["SETEX", `backpressure:job:${slotKey}`, SLOT_TTL_SECONDS.toString(), Date.now().toString()],
  ]);
}

/**
 * Limpa todos os slots (para emergências/reset)
 */
export async function clearAllJobSlots(): Promise<void> {
  console.log("[job-slot-manager] 🧹 Limpando todos os slots de job");
  
  // Obter todos os jobs ativos
  const members = await redisCommand(["SMEMBERS", SLOT_SET_KEY]) || [];
  
  // Deletar keys individuais
  const deleteCommands: string[][] = members.map((key: string) => ["DEL", `backpressure:job:${key}`]);
  
  if (deleteCommands.length > 0) {
    await redisPipeline(deleteCommands);
  }
  
  // Resetar contador e set
  await redisPipeline([
    ["SET", SLOT_KEY, "0"],
    ["DEL", SLOT_SET_KEY],
  ]);
  
  console.log(`[job-slot-manager] ✅ ${members.length} slots limpos`);
}

/**
 * Obtém delay recomendado baseado no nível de concorrência
 */
export async function getRecommendedDelayMultiplier(): Promise<number> {
  const status = await getJobSlotStatus();
  return status.delayMultiplier;
}
