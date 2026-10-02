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

// Short-lived proof that a password check passed for an account with 2FA on.
// A separate audience means it can never be used as an access token.
const TWO_FA_AUDIENCE = 'spiral-sounds-2fa'

export const generate2FAChallenge = (userId) => {
  return jwt.sign({ userId, purpose: '2fa-challenge' }, getJWTSecret(), {
    expiresIn: '5m',
    issuer: 'spiral-sounds',
    audience: TWO_FA_AUDIENCE,
    jwtid: crypto.randomBytes(16).toString('hex')
  })
}

export const verify2FAChallenge = (token) => {
  const payload = jwt.verify(token, getJWTSecret(), { issuer: 'spiral-sounds', audience: TWO_FA_AUDIENCE })
  if (payload.purpose !== '2fa-challenge' || !payload.jti) {
    throw new Error('Not a 2FA challenge')
  }
  return payload
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
  const headerToken = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
  const token = headerToken || req.cookies?.accessToken

  if (!token) {
    return next(new AuthError('Access token required', 'TOKEN_REQUIRED'))
  }

  try {
    const decoded = verifyToken(token)
    req.user = {
      ...decoded,
      id: decoded.id || decoded.userId,
      userId: decoded.userId || decoded.id
    }
    next()
  } catch {
    // Bad, expired, or wrong-audience tokens are a 401, not a server error
    next(new AuthError('Invalid or expired access token', 'TOKEN_INVALID'))
  }
}

// Optional JWT middleware (doesn't fail if no token)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const headerToken = authHeader && authHeader.split(' ')[1]
  const token = headerToken || req.cookies?.accessToken

  if (token) {
    try {
      const decoded = verifyToken(token)
      req.user = {
        ...decoded,
        id: decoded.id || decoded.userId,
        userId: decoded.userId || decoded.id
      }
    } catch (error) {
      // Token exists but is invalid - could log this
      req.user = null
    }
  } else {
    req.user = null
  }

  next()
}