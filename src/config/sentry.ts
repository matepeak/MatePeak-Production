/**
 * Sentry Configuration
 * Error tracking and performance monitoring
 */
import * as Sentry from "@sentry/react";

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Initialize Sentry error tracking
 */
export function initSentry() {
  // Only initialize in production or when explicitly enabled
  if (!isProduction && !import.meta.env.VITE_ENABLE_SENTRY) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (isProduction) {
      console.warn("[Sentry] DSN not configured. Error tracking disabled.");
    }
    return;
  }

  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_APP_ENV ||
      (isDevelopment ? "development" : "production"),

    // Performance Monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),

      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text
        blockAllMedia: true, // Privacy: block all media
      }),
    ],

    // Filter out known non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Filter out network errors (often user's connection issues)
      if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message);
        if (
          message.includes("NetworkError") ||
          message.includes("Failed to fetch") ||
          message.includes("Network request failed")
        ) {
          return null;
        }
      }

      // Filter out Supabase auth session errors (expected during logout)
      if (event.exception?.values?.[0]?.value?.includes("session")) {
        return null;
      }

      return event;
    },

    // Add user context
    beforeBreadcrumb(breadcrumb) {
      // Don't log console breadcrumbs in production
      if (isProduction && breadcrumb.category === "console") {
        return null;
      }
      return breadcrumb;
    },

    // Performance optimizations
    maxBreadcrumbs: 50,
    attachStacktrace: true,

    // Privacy settings
    sendDefaultPii: false, // Don't send personally identifiable information
  });

  if (!isProduction) {
    console.info("[Sentry] Error tracking initialized");
  }
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(userId: string | null, email?: string) {
  if (userId) {
    Sentry.setUser({
      id: userId,
      email: email || undefined,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add custom context to errors
 */
export function setSentryContext(key: string, data: any) {
  Sentry.setContext(key, data);
}

/**
 * Manually capture exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture custom message
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
) {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: "info",
    data,
  });
}

// Export Sentry for advanced usage
export { Sentry };
