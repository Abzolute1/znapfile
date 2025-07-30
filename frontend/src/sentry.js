import * as Sentry from "@sentry/react";

export function initSentry() {
  // Only initialize in production
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || "unknown",
      
      // Environment
      environment: import.meta.env.MODE,
      
      // Don't send errors in development
      beforeSend(event, hint) {
        // Filter out certain errors
        const error = hint.originalException;
        
        // Don't send network errors
        if (error?.message?.includes('Network request failed')) {
          return null;
        }
        
        // Don't send authentication errors
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return null;
        }
        
        return event;
      },
    });
  }
}