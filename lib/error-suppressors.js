/**
 * Suppresses non-critical console errors from external services
 * These errors don't affect app functionality but create noise in the console
 */

const SUPPRESSED_ERROR_PATTERNS = [
  /ERR_BLOCKED_BY_CLIENT/, // CORS/CSP blocked requests
  /launchdarkly/i,
  /wootric/i,
  /speedcurve/i,
  /cookielaw/i,
  /events\.launchdarkly/i,
  /Could not evaluate in iframe/,
  /Access-Control-Allow/i, // CORS policy violations
  /Failed to fetch/, // Network blocked requests
  /net::ERR_BLOCKED_BY_CLIENT/,
  /chunk\.(js|ts)/, // Module chunk loading errors
  /Uncaught.*in promise/i, // Unhandled promise rejections
  /WebSocket.*failed/i, // WebSocket connection failures
  /newrelic/i, // New Relic monitoring
];

/**
 * Check if an error message should be suppressed
 */
export function shouldSuppressError(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  return SUPPRESSED_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Install error suppressors to prevent non-critical errors from cluttering console
 */
export function installErrorSuppressors() {
  if (typeof window === 'undefined') {
    return; // Only install in browser
  }

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = function (...args) {
    const message = args[0]?.toString?.() || String(args[0]);
    if (!shouldSuppressError(message)) {
      originalError.apply(console, args);
    }
  };

  console.warn = function (...args) {
    const message = args[0]?.toString?.() || String(args[0]);
    if (!shouldSuppressError(message)) {
      originalWarn.apply(console, args);
    }
  };

  // Suppress unhandled promise rejections from blocked requests
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || String(event.reason);
    if (shouldSuppressError(errorMessage)) {
      event.preventDefault();
    }
  });

  // Suppress window errors from non-critical sources
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || String(event.error);
    if (shouldSuppressError(errorMessage)) {
      event.preventDefault();
      return true;
    }
  });
}

/**
 * Wrap a fetch call to gracefully handle network errors
 */
export async function fetchWithErrorSuppression(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (shouldSuppressError(error.message)) {
      return null; // Silently fail for blocked requests
    }
    throw error;
  }
}
