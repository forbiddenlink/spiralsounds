import rateLimit from 'express-rate-limit'

// General API limit per IP
export const apiLimiter = () =>
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
  })

// Stricter limit for sign-in style endpoints: 5 failed attempts per 15 minutes
export const authLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: {
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  })

export const AUTH_LIMITED_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/password/reset-request',
  '/auth/2fa/verify',
]

// Mount the auth limiter on the v1 paths the site uses and on the legacy aliases
export function mountAuthLimits(app) {
  const limiter = authLimiter()
  for (const path of AUTH_LIMITED_PATHS) {
    app.use(`/api/v1${path}`, limiter)
    app.use(`/api${path}`, limiter)
  }
}
