/**
 * Utilitário de sanitização para prevenir erros de encoding no Postgres
 * Remove caracteres nulos (0x00) e caracteres de controle inválidos
 */

export function sanitizeText(input?: string | null, maxLength = 2_000_000): string {
  if (!input) return '';
  
  // Remove null bytes (\u0000) que causam erro no Postgres
  // Remove caracteres de controle (0x00-0x1F exceto newline/tab)
  let sanitized = input
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ') // Remove control chars (keep \n \t)
    .trim();
  
  // Limitar tamanho máximo
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitiza array de strings
 * Remove entradas vazias após sanitização
 */
export function sanitizeArray(arr: string[]): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  
  return arr
    .map(s => sanitizeText(s))
    .filter(s => s.length > 0);
}

/**
 * Sanitiza objeto com campos de texto
 * Aplica sanitização recursivamente em strings
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value) as any;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: any) => 
        typeof item === 'string' ? sanitizeText(item) : item
      ) as any;
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    }
  }
  
  return sanitized;
}
