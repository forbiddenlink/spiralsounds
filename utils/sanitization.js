import xss from 'xss'

/**
 * Sanitization utilities for preventing XSS attacks
 */

// Server-side XSS protection
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return xss(input, {
    whiteList: {
      // Allow basic formatting tags for user content
      'b': [],
      'i': [],
      'em': [],
      'strong': [],
      'p': [],
      'br': []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  })
}

// Fields whose value is a secret or a one-time code. They are never rendered as
// HTML and must reach the auth code exactly as the user typed them, so the XSS
// filter must not rewrite them (it would silently change a password containing
// "<" or "&" and make the user unable to log in again).
const VERBATIM_KEY = /pass(word|phrase)|token|secret|^code$|otp|backupcode/i

const sanitizeValue = (value) => {
  if (typeof value === 'string') return sanitizeInput(value)
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (typeof value === 'object' && value !== null) return sanitizeObject(value)
  return value
}

// Sanitize an object's string properties (arrays stay arrays)
export const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) return obj.map(sanitizeValue)

  const sanitized = {}
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = VERBATIM_KEY.test(key) && typeof value === 'string'
      ? value
      : sanitizeValue(value)
  }
  return sanitized
}

// Middleware to sanitize request body
export const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body)
  }
  next()
}

// Sanitize HTML content for safe display
export const sanitizeHtml = (html) => {
  return xss(html, {
    whiteList: {
      'p': [],
      'br': [],
      'b': [],
      'i': [],
      'em': [],
      'strong': [],
      'ul': [],
      'ol': [],
      'li': [],
      'a': ['href', 'title'],
      'h1': [],
      'h2': [],
      'h3': [],
      'h4': [],
      'h5': [],
      'h6': []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
    allowCommentTag: false,
    css: false
  })
}