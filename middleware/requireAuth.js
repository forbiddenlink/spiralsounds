import { authenticateToken } from '../utils/jwt.js'

// Use JWT-based authentication instead of session-based
export const requireAuth = authenticateToken

// Admin role verification middleware
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}