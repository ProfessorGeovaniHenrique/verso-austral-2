import { useState, useCallback, useRef } from 'react';

interface ActionFeedbackOptions {
  /** Duração do feedback em ms (default: 2000) */
  duration?: number;
}

interface ActionFeedbackState {
  /** IDs que estão em estado de sucesso */
  successIds: Set<string>;
  /** Mostra feedback de sucesso para um ID */
  showSuccess: (id: string) => void;
  /** Verifica se um ID está em estado de sucesso */
  isSuccess: (id: string) => boolean;
  /** Limpa todos os estados de sucesso */
  clearAll: () => void;
}

/**
 * Hook para gerenciar feedback visual temporário após ações
 * 
 * @param options - Configurações do feedback
 * @returns Estado e funções para controlar feedback
 * 
 * @example
 * const { showSuccess, isSuccess } = useActionFeedback({ duration: 2000 });
 * 
 * // Após ação bem-sucedida:
 * showSuccess(itemId);
 * 
 * // No JSX:
 * <TableRow className={cn(isSuccess(item.id) && 'bg-green-500/10')}>
 */
export function useActionFeedback(
  options: ActionFeedbackOptions = {}
): ActionFeedbackState {
  const { duration = 2000 } = options;
  
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const showSuccess = useCallback((id: string) => {
    // Limpa timeout anterior se existir
    const existingTimeout = timeoutRefs.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Adiciona ID ao set de sucessos
    setSuccessIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Agenda remoção após duração
    const timeout = setTimeout(() => {
      setSuccessIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timeoutRefs.current.delete(id);
    }, duration);

    timeoutRefs.current.set(id, timeout);
  }, [duration]);

  const isSuccess = useCallback((id: string): boolean => {
    return successIds.has(id);
  }, [successIds]);

  const clearAll = useCallback(() => {
    // Limpa todos os timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
    
    // Limpa o set
    setSuccessIds(new Set());
  }, []);

  return {
    successIds,
    showSuccess,
    isSuccess,
    clearAll
  };
}

/**
 * Hook para feedback de múltiplos tipos (success, error, warning)
 */
interface MultiFeedbackState {
  success: Set<string>;
  error: Set<string>;
  warning: Set<string>;
}

type FeedbackType = 'success' | 'error' | 'warning';

interface MultiActionFeedbackState {
  states: MultiFeedbackState;
  show: (id: string, type: FeedbackType) => void;
  is: (id: string, type: FeedbackType) => boolean;
  getType: (id: string) => FeedbackType | null;
  clearAll: () => void;
}

export function useMultiActionFeedback(
  options: ActionFeedbackOptions = {}
): MultiActionFeedbackState {
  const { duration = 2000 } = options;
  
  const [states, setStates] = useState<MultiFeedbackState>({
    success: new Set(),
    error: new Set(),
    warning: new Set()
  });
  
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const show = useCallback((id: string, type: FeedbackType) => {
    // Limpa timeout anterior se existir
    const existingTimeout = timeoutRefs.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Remove de todos os tipos e adiciona ao novo
    setStates(prev => ({
      success: type === 'success' 
        ? new Set(prev.success).add(id) 
        : new Set([...prev.success].filter(x => x !== id)),
      error: type === 'error' 
        ? new Set(prev.error).add(id) 
        : new Set([...prev.error].filter(x => x !== id)),
      warning: type === 'warning' 
        ? new Set(prev.warning).add(id) 
        : new Set([...prev.warning].filter(x => x !== id))
    }));

    // Agenda remoção
    const timeout = setTimeout(() => {
      setStates(prev => ({
        success: new Set([...prev.success].filter(x => x !== id)),
        error: new Set([...prev.error].filter(x => x !== id)),
        warning: new Set([...prev.warning].filter(x => x !== id))
      }));
      timeoutRefs.current.delete(id);
    }, duration);

    timeoutRefs.current.set(id, timeout);
  }, [duration]);

  const is = useCallback((id: string, type: FeedbackType): boolean => {
    return states[type].has(id);
  }, [states]);

  const getType = useCallback((id: string): FeedbackType | null => {
    if (states.success.has(id)) return 'success';
    if (states.error.has(id)) return 'error';
    if (states.warning.has(id)) return 'warning';
    return null;
  }, [states]);

  const clearAll = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
    setStates({ success: new Set(), error: new Set(), warning: new Set() });
  }, []);

  return { states, show, is, getType, clearAll };
}
