import winston from 'winston'
import { 
  APIError, 
  ValidationError, 
  AuthError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError, 
  RateLimitError, 
  DatabaseError,
  ExternalServiceError
} from '../utils/errors.js'

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'spiral-sounds' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

// If we're not in production then log to the console with simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

// Global error handler
export const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error(err.message, {
    name: err.name,
    code: err.code,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...(err.details && { details: err.details })
  })

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Handle our custom API errors
  if (err instanceof APIError) {
    const responseData = err.toJSON()
    
    // Add stack trace in development
    if (isDevelopment && err.stack) {
      responseData.error.stack = err.stack
    }

    // Add retry-after header for rate limit errors
    if (err instanceof RateLimitError) {
      res.set('Retry-After', err.retryAfter)
    }

    return res.status(err.statusCode).json(responseData)
  }

  // Handle legacy JWT errors
  if (err.name === 'JsonWebTokenError') {
    const authError = new AuthError('Invalid token', 'INVALID_TOKEN')
    return res.status(authError.statusCode).json(authError.toJSON())
  }

  if (err.name === 'TokenExpiredError') {
    const authError = new AuthError('Token expired', 'TOKEN_EXPIRED')
    return res.status(authError.statusCode).json(authError.toJSON())
  }

  // Handle Joi validation errors
  if (err.name === 'ValidationError' && err.details) {
    const validationError = ValidationError.fromJoiError(err)
    return res.status(validationError.statusCode).json(validationError.toJSON())
  }

  // Handle database errors
  if (err.code === 'SQLITE_CONSTRAINT' || err.code?.startsWith('SQLITE_')) {
    const dbError = new DatabaseError('Database operation failed', err)
    return res.status(dbError.statusCode).json(dbError.toJSON())
  }

  // Handle unknown errors
  const unknownError = new APIError(
    isDevelopment ? err.message : 'Internal Server Error',
    500,
    'INTERNAL_ERROR'
  )
  
  const responseData = unknownError.toJSON()
  if (isDevelopment && err.stack) {
    responseData.error.stack = err.stack
  }

  res.status(unknownError.statusCode).json(responseData)
}

// 404 handler
export const notFoundHandler = (req, res) => {
  const notFoundError = new NotFoundError('Route', req.originalUrl)
  res.status(notFoundError.statusCode).json(notFoundError.toJSON())
}

export { logger }