// Custom error classes
export class RoseramError extends Error {
  constructor(code, message, statusCode = 500, details) {
    super(message);
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'RoseramError';
  }
}

export class AuthenticationError extends RoseramError {
  constructor(message = 'Authentication failed') {
    super('AUTH_ERROR', message, 401);
  }
}

export class ValidationError extends RoseramError {
  constructor(message = 'Validation failed', details) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends RoseramError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ConflictError extends RoseramError {
  constructor(message = 'Resource already exists') {
    super('CONFLICT', message, 409);
  }
}

export class RateLimitError extends RoseramError {
  constructor(message = 'Rate limit exceeded') {
    super('RATE_LIMIT', message, 429);
  }
}

export class ExternalServiceError extends RoseramError {
  constructor(service, message = `${service} service error`, details) {
    super('EXTERNAL_SERVICE_ERROR', message, 503, details);
  }
}

// Error handling utilities
export function formatErrorResponse(error) {
  if (error instanceof RoseramError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    };
  }

  return {
    success: false,
    error: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}

export function parseApiError(response) {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      // Will be parsed by caller
      return `HTTP ${response.status}: API returned an error`;
    }
    return `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    return 'Failed to parse error response';
  }
}

export async function handleApiError(response) {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return data.message || data.error || parseApiError(response);
    }
    const text = await response.text();
    return text || parseApiError(response);
  } catch {
    return parseApiError(response);
  }
}

// Logging utilities
export const logger = {
  info: (message, data) => {
    if (typeof window === 'undefined') {
      // Server-side logging
      console.log(`[INFO] ${message}`, data || '');
    }
  },

  error: (message, error) => {
    if (typeof window === 'undefined') {
      // Server-side logging - avoid logging sensitive data
      console.error(`[ERROR] ${message}`, error instanceof Error ? error.message : error || '');
    }
  },

  warn: (message, data) => {
    if (typeof window === 'undefined') {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },

  debug: (message, data) => {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },
};

// User-friendly error messages
export const getUserFriendlyErrorMessage = (error) => {
  if (error instanceof ValidationError) {
    return 'Please check your input and try again.';
  }
  if (error instanceof AuthenticationError) {
    return 'Please log in again.';
  }
  if (error instanceof RateLimitError) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error instanceof ExternalServiceError) {
    return 'A service is temporarily unavailable. Please try again later.';
  }
  return 'Something went wrong. Please try again.';
};
