import { toast } from 'sonner';

/**
 * Sistema centralizado de notificações usando Sonner
 * Padroniza toasts em toda a aplicação
 */
export const notifications = {
  /**
   * Toast de sucesso
   * @param message - Título da notificação
   * @param description - Descrição opcional
   */
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },

  /**
   * Toast de erro
   * @param message - Título do erro
   * @param error - Erro (Error object ou string) ou descrição customizada
   */
  error: (message: string, error?: Error | string) => {
    const description = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
      ? error 
      : undefined;
    
    toast.error(message, { description });
    
    // Log para debugging
    if (error instanceof Error) {
      console.error(`[notifications.error] ${message}:`, error);
    } else if (error) {
      console.error(`[notifications.error] ${message}:`, error);
    }
  },

  /**
   * Toast informativo
   * @param message - Título da informação
   * @param description - Descrição opcional
   */
  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },

  /**
   * Toast de aviso/warning
   * @param message - Título do aviso
   * @param description - Descrição opcional
   */
  warning: (message: string, description?: string) => {
    toast.warning(message, { description });
  },

  /**
   * Toast de loading/promessa
   * @param message - Mensagem durante o loading
   * @param promise - Promessa a ser executada
   * @param successMessage - Mensagem de sucesso
   * @param errorMessage - Mensagem de erro
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },

  /**
   * Toast customizado com ação
   * @param message - Título
   * @param description - Descrição
   * @param action - Botão de ação
   */
  withAction: (
    message: string,
    description: string,
    action: {
      label: string;
      onClick: () => void;
    }
  ) => {
    toast(message, {
      description,
      action: {
        label: action.label,
        onClick: action.onClick,
      },
    });
  },
};
