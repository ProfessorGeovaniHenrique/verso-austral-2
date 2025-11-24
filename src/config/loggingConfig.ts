import { LogLevel } from '@/lib/logger';

/**
 * Configuração centralizada de logging para todo o projeto
 * Permite controlar níveis de log por ambiente, categoria e componente
 */

export type LogCategory =
  | 'pages'
  | 'hooks'
  | 'components'
  | 'services'
  | 'edge-functions'
  | 'all';

export interface LoggingConfig {
  // Configuração Frontend
  frontend: {
    enabled: boolean;
    minLevel: LogLevel;
    enabledCategories: LogCategory[];
    // Componentes específicos a silenciar (para reduzir ruído)
    silencedComponents: string[];
    // Enviar logs para Sentry
    sentryEnabled: boolean;
  };

  // Configuração Backend (Edge Functions)
  backend: {
    enabled: boolean;
    minLevel: LogLevel;
    enabledCategories: LogCategory[];
    // Funções específicas a silenciar
    silencedFunctions: string[];
    // Enviar logs para Sentry
    sentryEnabled: boolean;
  };

  // Configuração de Performance Logging
  performance: {
    // Logar operações que demoram mais que X ms
    slowOperationThreshold: number;
    // Logar queries de database que demoram mais que X ms
    slowQueryThreshold: number;
  };

  // Configuração de Alertas Automáticos
  alerts: {
    // Enviar alerta quando houver X erros em Y minutos
    errorThreshold: {
      count: number;
      windowMinutes: number;
    };
    // Enviar alerta quando taxa de erro exceder X%
    errorRateThreshold: number;
  };
}

// Configuração por ambiente
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const loggingConfig: LoggingConfig = {
  frontend: {
    enabled: true,
    minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
    enabledCategories: isDevelopment
      ? ['all']
      : ['pages', 'hooks', 'services'], // Em produção, silenciar componentes
    silencedComponents: isProduction
      ? [
          // Componentes que geram muito log e não são críticos
          'Button',
          'Input',
          'Label',
          'Card',
        ]
      : [],
    sentryEnabled: isProduction,
  },

  backend: {
    enabled: true,
    minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
    enabledCategories: ['all'],
    silencedFunctions: isProduction
      ? [
          // Funções que geram muito log e não são críticas
          'health',
          'health-aggregator',
        ]
      : [],
    sentryEnabled: isProduction,
  },

  performance: {
    slowOperationThreshold: isDevelopment ? 1000 : 2000, // 1s em dev, 2s em prod
    slowQueryThreshold: isDevelopment ? 500 : 1000, // 500ms em dev, 1s em prod
  },

  alerts: {
    errorThreshold: {
      count: 10, // 10 erros
      windowMinutes: 5, // em 5 minutos
    },
    errorRateThreshold: 0.05, // 5% de taxa de erro
  },
};

/**
 * Helper para verificar se logging está habilitado para um componente/função
 */
export function isLoggingEnabled(
  type: 'frontend' | 'backend',
  componentOrFunction: string
): boolean {
  const config = loggingConfig[type];

  if (!config.enabled) return false;

  // Verificar se está silenciado
  if (type === 'frontend') {
    const frontendConfig = loggingConfig.frontend;
    if (frontendConfig.silencedComponents.includes(componentOrFunction)) {
      return false;
    }
  } else {
    const backendConfig = loggingConfig.backend;
    if (backendConfig.silencedFunctions.includes(componentOrFunction)) {
      return false;
    }
  }

  // Verificar categorias habilitadas
  if (config.enabledCategories.includes('all')) {
    return true;
  }

  // Lógica de categoria (simplificada)
  return true;
}

/**
 * Helper para determinar se uma operação é lenta
 */
export function isSlowOperation(durationMs: number): boolean {
  return durationMs > loggingConfig.performance.slowOperationThreshold;
}

/**
 * Helper para determinar se uma query é lenta
 */
export function isSlowQuery(durationMs: number): boolean {
  return durationMs > loggingConfig.performance.slowQueryThreshold;
}

/**
 * Atualizar configuração em runtime (útil para debugging)
 */
export function updateLoggingConfig(
  updates: Partial<LoggingConfig>
): void {
  Object.assign(loggingConfig, updates);
  console.log('[LoggingConfig] Configuration updated:', loggingConfig);
}

/**
 * Resetar configuração para padrões
 */
export function resetLoggingConfig(): void {
  // Re-avaliar ambiente
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;

  loggingConfig.frontend.minLevel = isDev ? LogLevel.DEBUG : LogLevel.INFO;
  loggingConfig.backend.minLevel = isDev ? LogLevel.DEBUG : LogLevel.INFO;
  loggingConfig.frontend.sentryEnabled = isProd;
  loggingConfig.backend.sentryEnabled = isProd;

  console.log('[LoggingConfig] Configuration reset to defaults');
}
