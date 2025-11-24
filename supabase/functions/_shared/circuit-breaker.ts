/**
 * ✅ SPRINT 3: Circuit Breaker Pattern
 * Implementa proteção contra falhas em cascata em serviços externos
 * ✅ SPRINT 1: Logging Migration - Logger opcional para backward compatibility
 */

import type StructuredLogger from "./structured-logger.ts";

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Número de falhas para abrir o circuito
  resetTimeout: number;         // Tempo em ms antes de tentar HALF_OPEN
  halfOpenMaxAttempts: number;  // Tentativas em estado HALF_OPEN
}

/**
 * Circuit Breaker in-memory (para edge functions stateless)
 * Em produção, considere usar Redis para estado compartilhado
 */
class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED',
  };

  constructor(
    private config: CircuitBreakerConfig,
    private logger?: StructuredLogger
  ) {}

  /**
   * Executa operação com proteção de circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    // 1️⃣ Verificar estado do circuito
    if (this.state.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.state.lastFailureTime;
      
      // Se passou o resetTimeout, tentar HALF_OPEN
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        if (this.logger) {
          this.logger.info('Circuit Breaker: Tentando HALF_OPEN', { state: 'HALF_OPEN' });
        } else {
          console.log('🔄 Circuit Breaker: Tentando HALF_OPEN');
        }
        this.state.state = 'HALF_OPEN';
        this.state.failures = 0;
      } else {
        const retryIn = Math.ceil((this.config.resetTimeout - timeSinceLastFailure) / 1000);
        if (this.logger) {
          this.logger.warn('Circuit Breaker: OPEN - bloqueando requisição', {
            state: this.state.state,
            failures: this.state.failures,
            retry_in_seconds: retryIn,
          });
        } else {
          console.warn(`⚡ Circuit Breaker: OPEN - bloqueando requisição`);
        }
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker aberto. Tentando novamente em ${retryIn}s`);
      }
    }

    // 2️⃣ Executar operação
    try {
      const result = await operation();
      
      // Sucesso - resetar estado
      if (this.state.state === 'HALF_OPEN') {
        if (this.logger) {
          this.logger.info('Circuit Breaker: HALF_OPEN → CLOSED (recuperado)', {
            previous_failures: this.state.failures,
          });
        } else {
          console.log('✅ Circuit Breaker: HALF_OPEN → CLOSED (recuperado)');
        }
        this.state.state = 'CLOSED';
        this.state.failures = 0;
      }
      
      return result;
    } catch (error) {
      // Falha - incrementar contador
      this.state.failures++;
      this.state.lastFailureTime = Date.now();

      if (this.logger) {
        this.logger.error(
          `Circuit Breaker: Falha ${this.state.failures}/${this.config.failureThreshold}`,
          error as Error,
          {
            state: this.state.state,
            failures: this.state.failures,
            threshold: this.config.failureThreshold,
          }
        );
      } else {
        console.error(
          `❌ Circuit Breaker: Falha ${this.state.failures}/${this.config.failureThreshold}`,
          error
        );
      }

      // Verificar se deve abrir o circuito
      if (
        this.state.state === 'CLOSED' &&
        this.state.failures >= this.config.failureThreshold
      ) {
        if (this.logger) {
          this.logger.warn('Circuit Breaker: CLOSED → OPEN (limite atingido)', {
            failures: this.state.failures,
            threshold: this.config.failureThreshold,
          });
        } else {
          console.warn('⚡ Circuit Breaker: CLOSED → OPEN (limite atingido)');
        }
        this.state.state = 'OPEN';
      } else if (this.state.state === 'HALF_OPEN') {
        if (this.logger) {
          this.logger.warn('Circuit Breaker: HALF_OPEN → OPEN (falha na recuperação)');
        } else {
          console.warn('⚡ Circuit Breaker: HALF_OPEN → OPEN (falha na recuperação)');
        }
        this.state.state = 'OPEN';
      }

      if (fallback) {
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Retorna estado atual do circuit breaker
   */
  getState() {
    return this.state;
  }

  /**
   * Reseta manualmente o circuit breaker (útil para testes)
   */
  reset() {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
    };
  }
}

/**
 * Configs de circuit breaker pré-definidos
 */
export const CircuitBreakerPresets = {
  // Crítico: falha rápido, recupera rápido
  CRITICAL: {
    failureThreshold: 3,
    resetTimeout: 30_000, // 30s
    halfOpenMaxAttempts: 2,
  },
  
  // Normal: tolerante, recuperação moderada
  NORMAL: {
    failureThreshold: 5,
    resetTimeout: 60_000, // 1min
    halfOpenMaxAttempts: 3,
  },
  
  // Relaxado: muito tolerante
  RELAXED: {
    failureThreshold: 10,
    resetTimeout: 120_000, // 2min
    halfOpenMaxAttempts: 5,
  },
} as const;

/**
 * Registry global de circuit breakers (um por serviço)
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Obtém ou cria um circuit breaker para um serviço
 */
export function getCircuitBreaker(
  serviceName: string,
  config: CircuitBreakerConfig = CircuitBreakerPresets.NORMAL,
  logger?: StructuredLogger
): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(config, logger));
  }
  return circuitBreakers.get(serviceName)!;
}

/**
 * Wrapper para executar operações com circuit breaker
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  operation: () => Promise<T>,
  fallback?: () => T | Promise<T>,
  config?: CircuitBreakerConfig,
  logger?: StructuredLogger
): Promise<T> {
  const breaker = getCircuitBreaker(serviceName, config, logger);
  return breaker.execute(operation, fallback);
}
