import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN_FRONTEND;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const ENVIRONMENT = import.meta.env.MODE || "development";

// Helper to detect feature from URL
const detectFeature = (): string => {
  const url = window.location.pathname;
  if (url.includes('music-catalog')) return 'music-catalog';
  if (url.includes('music-enrichment')) return 'music-enrichment';
  if (url.includes('lexicon')) return 'lexicon';
  if (url.includes('dictionary')) return 'dictionary';
  if (url.includes('semantic')) return 'semantic';
  if (url.includes('admin')) return 'admin';
  if (url.includes('dashboard')) return 'dashboard';
  return 'general';
};

// Helper to get user role from localStorage
const getUserRole = (): string => {
  try {
    const userRole = localStorage.getItem('user_role');
    return userRole || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.warn("Sentry DSN not configured");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `vibe-analyzer@${APP_VERSION}`,
    
    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    
    // Sample rates
    tracesSampleRate: ENVIRONMENT === "production" ? 0.2 : 1.0,
    
    // Error filtering
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "Network request failed", // Transient network errors
      "Failed to fetch", // Common network error
    ],
    
    beforeSend(event, hint) {
      // Add strategic tags for filtering
      event.tags = {
        ...event.tags,
        feature: detectFeature(),
        user_role: getUserRole(),
        browser: navigator.userAgent.split('/')[0],
      };

      // Classify severity automatically
      const error = hint.originalException;
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Auth errors
        if (errorMsg.includes('auth') || errorMsg.includes('login') || errorMsg.includes('unauthorized')) {
          event.tags.category = 'auth';
          event.level = 'error';
        }
        // Database errors
        else if (errorMsg.includes('database') || errorMsg.includes('supabase') || errorMsg.includes('query')) {
          event.tags.category = 'database';
          event.level = 'fatal';
        }
        // API errors
        else if (errorMsg.includes('api') || errorMsg.includes('fetch') || errorMsg.includes('network')) {
          event.tags.category = 'api';
          event.level = 'warning';
        }
        // UI/Component errors
        else {
          event.tags.category = 'ui';
          event.level = 'error';
        }

        // Add custom context
        event.extra = {
          ...event.extra,
          errorMessage: error.message,
          errorStack: error.stack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        };
      }
      
      return event;
    },
  });
};

// Performance tracking for slow operations
export const trackPerformance = (
  operation: string, 
  durationMs: number, 
  metadata?: Record<string, any>
) => {
  const SLOW_OPERATION_THRESHOLD = 3000; // 3 seconds

  if (durationMs > SLOW_OPERATION_THRESHOLD) {
    captureMessage(`Slow operation: ${operation}`, {
      level: 'warning',
      tags: { 
        performance: 'slow',
        operation,
        feature: detectFeature(),
      },
      extra: {
        duration_ms: durationMs,
        threshold_ms: SLOW_OPERATION_THRESHOLD,
        ...metadata,
      },
    });
  }
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const setUser = Sentry.setUser;
export const addBreadcrumb = Sentry.addBreadcrumb;

// Enhanced exception capture with context
export const captureExceptionWithContext = (
  error: Error,
  context?: {
    feature?: string;
    action?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    extra?: Record<string, any>;
  }
) => {
  const level = context?.severity === 'critical' ? 'fatal' 
    : context?.severity === 'high' ? 'error'
    : context?.severity === 'low' ? 'info'
    : 'warning';

  return Sentry.captureException(error, {
    level,
    tags: {
      feature: context?.feature || detectFeature(),
      action: context?.action,
      severity: context?.severity || 'medium',
    },
    extra: context?.extra,
  });
};

export default Sentry;
