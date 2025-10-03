import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { AuthError } from './errors.js'

// Function to get and validate JWT secret
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required for security')
  }
  return secret
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'

// Generate access token
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'spiral-sounds',
    audience: 'spiral-sounds-client'
  })
}

// Generate refresh token
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'spiral-sounds',
    audience: 'spiral-sounds-client'
  })
}

// Verify token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJWTSecret(), {
      issuer: 'spiral-sounds',
      audience: 'spiral-sounds-client'
    })
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`)
  }
}

// Generate secure random token (for password reset, email verification)
export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

// Hash token (for storing sensitive tokens in database)
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// JWT middleware for routes that require authentication
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return next(new AuthError('Access token required', 'TOKEN_REQUIRED'))
  }

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    // Pass JWT errors to our error handler
    next(error)
  }
}

// Optional JWT middleware (doesn't fail if no token)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = verifyToken(token)
      req.user = decoded
    } catch (error) {
      // Token exists but is invalid - could log this
      req.user = null
    }
  } else {
    req.user = null
  }

  next()
}