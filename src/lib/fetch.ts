/**
 * Utilitário de fetch com timeout e retry para melhorar resiliência do frontend
 * Previne timeouts e melhora experiência do usuário em conexões instáveis
 */

/**
 * Fetch com timeout configurável
 * @param input URL ou Request
 * @param init Opções do fetch
 * @param timeoutMs Timeout em milissegundos (padrão: 30s)
 */
async function fetchWithTimeout(
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
 * Fetch com timeout e retry automático
 * @param url URL para fazer a requisição
 * @param options Opções do fetch
 * @param timeoutMs Timeout por tentativa em milissegundos (padrão: 30s)
 * @param maxRetries Número máximo de tentativas (padrão: 2)
 */
export async function fetchWithTimeoutRetry(
  url: string | URL,
  options: RequestInit = {},
  timeoutMs = 30_000,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      
      // Não fazer retry em erros de cliente (4xx exceto 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // Fazer retry em erros de servidor (5xx) ou rate limit (429)
      if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
        const backoffMs = 500 * Math.pow(2, attempt); // Exponential backoff
        console.warn(`⚠️ Tentativa ${attempt + 1}/${maxRetries + 1} falhou com status ${response.status}. Retry em ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Última tentativa: lançar erro
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Retry com backoff exponencial
      const backoffMs = 500 * Math.pow(2, attempt);
      console.warn(`⚠️ Tentativa ${attempt + 1}/${maxRetries + 1} falhou: ${lastError.message}. Retry em ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error('Todas as tentativas falharam');
}

/**
 * Helper para requisições JSON com timeout e retry
 */
export async function fetchJSON<T = any>(
  url: string | URL,
  options: RequestInit = {},
  timeoutMs = 30_000,
  maxRetries = 2
): Promise<T> {
  const response = await fetchWithTimeoutRetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }, timeoutMs, maxRetries);

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}
