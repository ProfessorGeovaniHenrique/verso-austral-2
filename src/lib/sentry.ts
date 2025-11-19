import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN_FRONTEND;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const ENVIRONMENT = import.meta.env.MODE || "development";

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
    ],
    
    beforeSend(event, hint) {
      // Add custom context
      if (hint.originalException instanceof Error) {
        event.extra = {
          ...event.extra,
          errorMessage: hint.originalException.message,
          errorStack: hint.originalException.stack,
        };
      }
      return event;
    },
  });
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const setUser = Sentry.setUser;
export const addBreadcrumb = Sentry.addBreadcrumb;

export default Sentry;
