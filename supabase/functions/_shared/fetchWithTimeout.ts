/**
 * Utilitário de fetch com timeout e retry para Edge Functions
 * Previne travamentos indefinidos e melhora resiliência
 * 
 * Versão 2: Adiciona fetchWithTimeoutRetry com exponential backoff configurável
 * ✅ SPRINT 1: Logging Migration - Logger opcional para backward compatibility
 */

import type StructuredLogger from "./structured-logger.ts";

/**
 * Fetch com timeout usando AbortController
 * 
 * @param input URL ou Request
 * @param init Opções do fetch
 * @param timeoutMs Timeout em milissegundos (padrão: 30s)
 * @returns Promise<Response>
 * @throws Error se timeout for atingido ou fetch falhar
 * 
 * @example
 * const res = await fetchWithTimeout('https://api.example.com/data', {}, 10000);
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Melhorar mensagem de erro para timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout após ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Fetch com timeout e retry automático com exponential backoff
 * 
 * @param input URL ou Request
 * @param init Opções do fetch
 * @param timeoutMs Timeout por tentativa em ms (padrão: 30s)
 * @param retries Número de tentativas além da primeira (padrão: 2)
 * @param backoffMs Delay inicial entre tentativas em ms (padrão: 300ms)
 * @returns Promise<Response>
 * @throws Error após esgotar todas as tentativas
 * 
 * @example
 * // 3 tentativas totais (1 inicial + 2 retries)
 * // Delays: 300ms, 600ms (exponential backoff)
 * const res = await fetchWithTimeoutRetry('https://api.example.com/data', {}, 10000, 2, 300);
 */
export async function fetchWithTimeoutRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30_000,
  retries = 2,
  backoffMs = 300,
  logger?: StructuredLogger
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(input, init, timeoutMs);
      
      // Não fazer retry em erros de cliente (4xx exceto 429 rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // Fazer retry em erros de servidor (5xx) ou rate limit (429)
      if ((response.status >= 500 || response.status === 429) && attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        
        if (logger) {
          logger.warn(`Retry attempt ${attempt + 1}/${retries + 1} - Status ${response.status}`, {
            status_code: response.status,
            delay_ms: delay,
            attempt: attempt + 1,
            total_attempts: retries + 1,
          });
        } else {
          console.warn(
            `⚠️ Tentativa ${attempt + 1}/${retries + 1} falhou com status ${response.status}. ` +
            `Retry em ${delay}ms...`
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Última tentativa: lançar erro
      if (attempt === retries) {
        throw lastError;
      }
      
      // Retry com backoff exponencial
      const delay = backoffMs * Math.pow(2, attempt);
      
      if (logger) {
        logger.warn(`Retry attempt ${attempt + 1}/${retries + 1} failed`, {
          error_message: lastError.message,
          delay_ms: delay,
          attempt: attempt + 1,
          total_attempts: retries + 1,
        });
      } else {
        console.warn(
          `⚠️ Tentativa ${attempt + 1}/${retries + 1} falhou: ${lastError.message}. ` +
          `Retry em ${delay}ms...`
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Todas as tentativas falharam');
}
