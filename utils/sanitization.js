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

// Sanitize an object's string properties
export const sanitizeObject = (obj) => {
  const sanitized = {}
  
  for (const [key, value] in Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
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