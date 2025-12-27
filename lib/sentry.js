// Sentry Error Monitoring Setup
// Initialize in app layout and API routes

import * from "@sentry/nextjs";

export function initSentry() {
  if (typeof window === "undefined") {
    // Server-side initialization
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: process.env.NODE_ENV !== "production",
      beforeSend(event, hint) {
        // Filter out certain errors
        if (
          event.exception &&
          event.exception.some(
            (exception) =>
              exception.type?.includes("ChunkLoadError") ||
              exception.type?.includes("NetworkError")
          )
        ) {
          return null;
        }
        return event;
      },
    });
  } else {
    // Client-side initialization
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Replay({
          maskAllText,
          blockAllMedia,
        }),
      ],
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        if (
          event.exception &&
          event.exception.some(
            (exception) =>
              exception.type?.includes("ChunkLoadError") ||
              exception.value?.includes("NetworkError")
          )
        ) {
          return null;
        }
        return event;
      },
    });
  }
}

// Error capture utilities
export function captureException(error, context?) {
  Sentry.captureException(error, {
    extra,
  });
}

export function captureMessage(message, level: "info" | "warning" | "error" = "info") {
  Sentry.captureMessage(message, level);
}

export function setUserContext(userId, email?) {
  Sentry.setUser({
    id,
    email,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(
  message,
  category,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info"
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
}
