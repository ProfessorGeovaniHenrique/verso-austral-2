/**
 * Utilitário de retry com exponential backoff
 * Aumenta a resiliência de operações de rede
 */

export interface RetryOptions {
  /** Número máximo de tentativas (padrão: 3) */
  maxRetries?: number;
  /** Delay inicial em ms (padrão: 1000) */
  baseDelay?: number;
  /** Multiplicador do backoff (padrão: 2) */
  backoffMultiplier?: number;
  /** Delay máximo em ms (padrão: 30000) */
  maxDelay?: number;
  /** Função para determinar se deve fazer retry baseado no erro */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback executado antes de cada retry */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  shouldRetry: () => true,
  onRetry: (error, attempt, delay) => {
    console.warn(`[retry] Tentativa ${attempt} falhou: ${error.message}. Retry em ${delay}ms`);
  },
};

/**
 * Executa uma função com retry e exponential backoff
 * 
 * @example
 * ```typescript
 * const data = await retryWithBackoff(
 *   async () => {
 *     const { data, error } = await supabase.from('table').select();
 *     if (error) throw error;
 *     return data;
 *   },
 *   { maxRetries: 5, baseDelay: 500 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Última tentativa
      if (attempt === opts.maxRetries) {
        console.error(
          `[retry] Todas as ${opts.maxRetries + 1} tentativas falharam.`,
          lastError
        );
        break;
      }

      // Verificar se deve fazer retry
      if (!opts.shouldRetry(lastError, attempt + 1)) {
        console.warn(`[retry] shouldRetry retornou false. Abortando retries.`);
        break;
      }

      // Calcular delay com exponential backoff
      const exponentialDelay = opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt);
      const delay = Math.min(exponentialDelay, opts.maxDelay);

      // Callback antes do retry
      opts.onRetry(lastError, attempt + 1, delay);

      // Aguardar antes da próxima tentativa
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Helper para aguardar um tempo
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Função shouldRetry pré-configurada para erros de rede
 * Faz retry apenas em erros temporários (5xx, timeouts, network)
 */
export function shouldRetryNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Retry em erros de rede
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('fetch failed')
  ) {
    return true;
  }

  // Retry em erros 5xx do servidor
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return true;
  }

  // Não fazer retry em erros 4xx (cliente)
  if (
    message.includes('400') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404')
  ) {
    return false;
  }

  // Por padrão, fazer retry
  return true;
}

/**
 * Retry específico para operações do Supabase
 * 
 * @example
 * ```typescript
 * const jobs = await retrySupabaseOperation(async () => {
 *   const { data, error } = await supabase.from('annotation_jobs').select('*');
 *   if (error) throw error;
 *   return data;
 * });
 * ```
 */
export async function retrySupabaseOperation<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'shouldRetry'> = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    ...options,
    shouldRetry: shouldRetryNetworkError,
    onRetry: (error, attempt, delay) => {
      console.warn(
        `[retrySupabase] Tentativa ${attempt} falhou: ${error.message}. Retry em ${delay}ms`
      );
    },
  });
}
