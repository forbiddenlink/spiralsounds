// One place for every API call. Always /api/v1, always same-origin cookies.

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function messageFrom(body, status) {
  if (!body) return `Request failed (${status})`
  if (typeof body.error === 'string') return body.error
  if (body.error?.message) return body.error.message
  if (body.message) return body.message
  return `Request failed (${status})`
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Could not reach the shop. Check your connection and try again.', 0)
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(messageFrom(data, res.status), res.status, data)
  return data
}

// ----- Catalog -----
export async function getProducts(params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  const data = await api(`/products?${qs}`)
  return data.data
}

export async function getGenres() {
  const data = await api('/products/genres')
  return data.data
}

export async function getRecord(id) {
  const data = await api(`/products/${encodeURIComponent(id)}`)
  return data.data
}

export const saveReview = (id, review) => api(`/products/${encodeURIComponent(id)}/reviews`, { method: 'POST', body: review })

// ----- Session -----
export async function getMe() {
  const session = await api('/auth/session')
  return session.isLoggedIn ? session : null
}

export const getAuthStatus = () => api('/auth/status')
export const login = creds => api('/auth/login', { method: 'POST', body: creds })
export const register = user => api('/auth/register', { method: 'POST', body: user })
export const logout = () => api('/auth/logout', { method: 'POST' })
export const requestReset = email => api('/auth/password/reset-request', { method: 'POST', body: { email } })
export const resetPassword = (token, password) => api('/auth/password/reset', { method: 'POST', body: { token, password } })
export const verifyEmail = token => api(`/auth/email/verify?token=${encodeURIComponent(token)}`)

// ----- Cart -----
export const getCart = async () => (await api('/cart')).items
export const placeOrder = async () => (await api('/orders', { method: 'POST' })).order
export const getOrders = async () => (await api('/orders')).orders
export const getCartCount = async () => (await api('/cart/count')).totalItems
export const addToCart = productId => api('/cart/items', { method: 'POST', body: { product_id: productId } })
export const setQuantity = (itemId, quantity) => api(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } })
export const removeLine = itemId => api(`/cart/items/${itemId}`, { method: 'DELETE' })
export const clearCart = () => api('/cart/items', { method: 'DELETE' })

// ----- Saved records -----
export const getSaved = async () => (await api('/wishlist')).data.items
export const saveRecord = productId => api('/wishlist', { method: 'POST', body: { product_id: productId } })
export const unsaveRecord = productId => api(`/wishlist/${productId}`, { method: 'DELETE' })

// Field-level messages from a 400 validation response, keyed by field name
export function fieldErrors(err) {
  const list = err?.body?.error?.details?.validationErrors || []
  return Object.fromEntries(list.map(e => [e.field, e.message]))
}
