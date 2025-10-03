/**
 * Base API Error class for consistent error handling
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details })
      }
    }
  }
}

/**
 * Validation Error for input validation failures
 */
export class ValidationError extends APIError {
  constructor(message, validationErrors = []) {
    super(message, 400, 'VALIDATION_ERROR', { validationErrors })
    this.name = 'ValidationError'
    this.validationErrors = validationErrors
  }

  static fromJoiError(joiError) {
    const validationErrors = joiError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }))
    
    return new ValidationError('Validation failed', validationErrors)
  }
}

/**
 * Authentication Error for auth-related failures
 */
export class AuthError extends APIError {
  constructor(message, code = 'AUTH_ERROR') {
    super(message, 401, code)
    this.name = 'AuthError'
  }
}

/**
 * Authorization Error for permission-related failures
 */
export class AuthorizationError extends APIError {
  constructor(message = 'Access denied', code = 'AUTHORIZATION_ERROR') {
    super(message, 403, code)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not Found Error for resource not found scenarios
 */
export class NotFoundError extends APIError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`
    super(message, 404, 'NOT_FOUND', { resource, id })
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict Error for resource conflicts (e.g., duplicate email)
 */
export class ConflictError extends APIError {
  constructor(message, field = null) {
    super(message, 409, 'CONFLICT', { field })
    this.name = 'ConflictError'
  }
}

/**
 * Rate Limit Error for too many requests
 */
export class RateLimitError extends APIError {
  constructor(message = 'Too many requests', retryAfter = 3600) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter })
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Database Error for database-related failures
 */
export class DatabaseError extends APIError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DATABASE_ERROR', originalError ? { originalMessage: originalError.message } : null)
    this.name = 'DatabaseError'
    this.originalError = originalError
  }
}

/**
 * External Service Error for third-party service failures
 */
export class ExternalServiceError extends APIError {
  constructor(service, message = 'External service unavailable') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', { service })
    this.name = 'ExternalServiceError'
    this.service = service
  }
}