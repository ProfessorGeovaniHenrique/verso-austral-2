import { useState, useCallback, useEffect } from 'react';

const STORAGE_PREFIX = 'collapsible-state-';

/**
 * Hook para gerenciar estado de seções colapsáveis com persistência em localStorage
 * 
 * @param key - Identificador único da seção
 * @param defaultOpen - Estado inicial (default: false)
 * @returns [isOpen, setOpen] - Tupla com estado e setter
 * 
 * @example
 * const [isOpen, setOpen] = useCollapsibleState('pipeline-stats', true);
 */
export function useCollapsibleState(
  key: string,
  defaultOpen: boolean = false
): [boolean, (open: boolean) => void] {
  const storageKey = `${STORAGE_PREFIX}${key}`;

  // Inicializa com valor do localStorage ou default
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn(`[useCollapsibleState] Erro ao ler localStorage para key "${key}":`, error);
    }
    return defaultOpen;
  });

  // Setter que também persiste no localStorage
  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    try {
      localStorage.setItem(storageKey, JSON.stringify(open));
    } catch (error) {
      console.warn(`[useCollapsibleState] Erro ao salvar localStorage para key "${key}":`, error);
    }
  }, [storageKey, key]);

  return [isOpen, setOpen];
}

/**
 * Hook para gerenciar múltiplos estados colapsáveis com prefixo comum
 * 
 * @param prefix - Prefixo comum para todas as seções
 * @param sections - Objeto com ids das seções e seus estados default
 * @returns Objeto com estados e setters para cada seção
 * 
 * @example
 * const states = useMultipleCollapsibleState('pipeline', {
 *   stats: true,
 *   jobs: true,
 *   chart: false
 * });
 * 
 * states.stats.isOpen
 * states.stats.setOpen(true)
 */
export function useMultipleCollapsibleState<T extends Record<string, boolean>>(
  prefix: string,
  sections: T
): { [K in keyof T]: { isOpen: boolean; setOpen: (open: boolean) => void } } {
  const result = {} as { [K in keyof T]: { isOpen: boolean; setOpen: (open: boolean) => void } };

  for (const key of Object.keys(sections) as Array<keyof T>) {
    const fullKey = `${prefix}-${String(key)}`;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [isOpen, setOpen] = useCollapsibleState(fullKey, sections[key]);
    result[key] = { isOpen, setOpen };
  }

  return result;
}

/**
 * Limpa todos os estados colapsáveis salvos (útil para reset)
 */
export function clearAllCollapsibleStates(): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
