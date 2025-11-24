import { logger, LogContext } from './logger';
import { loggingConfig } from '@/config/loggingConfig';

/**
 * Factory para criar loggers contextualizados no frontend
 * Uso: const log = createLogger('ComponentName', { userId: '123' })
 */
export function createLogger(
  component: string,
  defaultContext: Partial<LogContext> = {}
) {
  const context: LogContext = {
    component,
    ...defaultContext,
  };

  // Verificar se logging está habilitado para este componente
  const isEnabled = loggingConfig.frontend.enabledCategories.includes(
    getCategoryFromComponent(component)
  );

  return {
    debug: (message: string, additionalContext?: Partial<LogContext>) => {
      if (!isEnabled || loggingConfig.frontend.minLevel > 0) return;
      logger.debug(message, { ...context, ...additionalContext });
    },

    info: (message: string, additionalContext?: Partial<LogContext>) => {
      if (!isEnabled || loggingConfig.frontend.minLevel > 1) return;
      logger.info(message, { ...context, ...additionalContext });
    },

    warn: (message: string, additionalContext?: Partial<LogContext>) => {
      if (!isEnabled || loggingConfig.frontend.minLevel > 2) return;
      logger.warn(message, { ...context, ...additionalContext });
    },

    error: (
      message: string,
      error?: Error,
      additionalContext?: Partial<LogContext>
    ) => {
      if (!isEnabled || loggingConfig.frontend.minLevel > 3) return;
      logger.error(message, error, { ...context, ...additionalContext });
    },

    fatal: (
      message: string,
      error?: Error,
      additionalContext?: Partial<LogContext>
    ) => {
      if (!isEnabled) return;
      logger.fatal(message, error, { ...context, ...additionalContext });
    },

    success: (message: string, additionalContext?: Partial<LogContext>) => {
      if (!isEnabled || loggingConfig.frontend.minLevel > 1) return;
      logger.success(message, { ...context, ...additionalContext });
    },

    // Helpers para logging estruturado de eventos comuns
    logAction: (
      action: string,
      status: 'start' | 'success' | 'error',
      additionalContext?: Partial<LogContext>
    ) => {
      const message = `${action} - ${status}`;
      if (status === 'error') {
        logger.error(message, undefined, {
          ...context,
          action,
          ...additionalContext,
        });
      } else {
        logger.info(message, { ...context, action, ...additionalContext });
      }
    },

    logApiCall: (
      endpoint: string,
      method: string,
      status: number,
      duration?: number
    ) => {
      logger.info(`API ${method} ${endpoint} - ${status}`, {
        ...context,
        action: 'api_call',
        endpoint,
        method,
        status,
        duration,
      });
    },

    logNavigation: (from: string, to: string) => {
      logger.info(`Navigation ${from} → ${to}`, {
        ...context,
        action: 'navigation',
        from,
        to,
      });
    },

    logUserInteraction: (
      interactionType: string,
      target: string,
      additionalContext?: Partial<LogContext>
    ) => {
      logger.debug(`User ${interactionType} on ${target}`, {
        ...context,
        action: 'user_interaction',
        interactionType,
        target,
        ...additionalContext,
      });
    },
  };
}

/**
 * Determina a categoria do componente baseado no nome
 */
function getCategoryFromComponent(component: string): 'pages' | 'hooks' | 'components' | 'services' {
  // Páginas
  if (component.includes('Page') || component.includes('Admin')) {
    return 'pages';
  }
  // Hooks
  if (component.startsWith('use')) {
    return 'hooks';
  }
  // Componentes
  if (component.includes('Modal') || component.includes('Dialog')) {
    return 'components';
  }
  // Serviços
  if (component.includes('Service') || component.includes('API')) {
    return 'services';
  }
  return 'components'; // Default
}

/**
 * Logger global para uso rápido (quando contexto não é crítico)
 */
export const globalLogger = createLogger('Global');
