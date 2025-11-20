/**
 * ✅ SPRINT 3: Timeout Configurável
 * Implementa timeouts para operações de edge functions
 */

/**
 * Executa operação com timeout configurável
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || `Operação excedeu ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Timeouts configuráveis via env vars
 */
export const Timeouts = {
  // Timeout para importação de dicionários (padrão: 5 min)
  DICTIONARY_IMPORT: parseInt(
    Deno.env.get('TIMEOUT_DICTIONARY_IMPORT_MS') || '300000'
  ),
  
  // Timeout para anotação de corpus (padrão: 10 min)
  CORPUS_ANNOTATION: parseInt(
    Deno.env.get('TIMEOUT_CORPUS_ANNOTATION_MS') || '600000'
  ),
  
  // Timeout para cancelamento de job (padrão: 45s - aumentado para lidar com locks)
  JOB_CANCELLATION: parseInt(
    Deno.env.get('TIMEOUT_JOB_CANCELLATION_MS') || '45000'
  ),
  
  // Timeout para operações de banco (padrão: 10s)
  DATABASE_OPERATION: parseInt(
    Deno.env.get('TIMEOUT_DATABASE_MS') || '10000'
  ),
  
  // Timeout para chamadas HTTP externas (padrão: 30s)
  HTTP_REQUEST: parseInt(
    Deno.env.get('TIMEOUT_HTTP_MS') || '30000'
  ),
} as const;

/**
 * Cria operação com timeout + cleanup
 */
export async function withTimeoutAndCleanup<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  cleanup?: () => void | Promise<void>,
  errorMessage?: string
): Promise<T> {
  try {
    return await withTimeout(operation, timeoutMs, errorMessage);
  } catch (error) {
    // Executar cleanup em caso de timeout
    if (cleanup) {
      try {
        await cleanup();
      } catch (cleanupError) {
        console.error('❌ Erro no cleanup após timeout:', cleanupError);
      }
    }
    throw error;
  }
}

/**
 * Controller de timeout manual (permite cancelamento)
 */
export class TimeoutController {
  private timeoutId?: number;
  private aborted = false;

  constructor(private timeoutMs: number) {}

  /**
   * Executa operação com este controller
   */
  async execute<T>(
    operation: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const abortController = new AbortController();

    // Configurar timeout
    this.timeoutId = setTimeout(() => {
      this.aborted = true;
      abortController.abort();
    }, this.timeoutMs);

    try {
      const result = await operation(abortController.signal);
      this.clear();
      return result;
    } catch (error) {
      this.clear();
      if (this.aborted) {
        throw new Error(`Operação cancelada após timeout de ${this.timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Cancela o timeout manualmente
   */
  clear() {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  /**
   * Verifica se foi abortado
   */
  isAborted(): boolean {
    return this.aborted;
  }
}
