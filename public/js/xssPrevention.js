/**
 * Client-side XSS Protection Utilities
 * Uses DOMPurify for sanitizing user-generated content
 */

// DOMPurify will be loaded from CDN or installed via npm
let DOMPurify = null

// Initialize DOMPurify
async function initializeDOMPurify() {
  if (typeof window !== 'undefined' && !DOMPurify) {
    try {
      // Try to import from installed package
      const module = await import('dompurify')
      DOMPurify = module.default
    } catch (error) {
      // Fallback to CDN version if available
      if (window.DOMPurify) {
        DOMPurify = window.DOMPurify
      } else {
        console.warn('DOMPurify not available. XSS protection disabled.')
        // Fallback to basic sanitization
        DOMPurify = {
          sanitize: (input) => {
            if (typeof input !== 'string') return input
            return input
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
          }
        }
      }
    }
  }
}

// Sanitize HTML content for display
export function sanitizeHtml(html) {
  if (!DOMPurify) {
    console.warn('DOMPurify not initialized. Using basic sanitization.')
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false
  })
}

// Sanitize text for safe insertion into HTML
export function sanitizeText(text) {
  if (typeof text !== 'string') return text
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Safely set innerHTML with sanitization
export function safeSetInnerHTML(element, html) {
  if (!element) return
  
  const sanitized = sanitizeHtml(html)
  element.innerHTML = sanitized
}

// Safely set text content
export function safeSetTextContent(element, text) {
  if (!element) return
  
  element.textContent = sanitizeText(text)
}

// Create safe HTML element with content
export function createSafeElement(tagName, content, attributes = {}) {
  const element = document.createElement(tagName)
  
  // Set safe text content
  if (content) {
    element.textContent = sanitizeText(content)
  }
  
  // Set safe attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'string' && ['href', 'src', 'alt', 'title', 'id', 'class'].includes(key)) {
      element.setAttribute(key, sanitizeText(value))
    }
  }
  
  return element
}

// Initialize on module load
initializeDOMPurify()

// Export initialization function for manual setup
export { initializeDOMPurify }