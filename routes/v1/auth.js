import { 
  registerUser, loginUser, logoutUser, refreshToken, requestPasswordReset, resetPassword, verifyEmail,
  setup2FA, enable2FA, verify2FA, disable2FA, generateBackupCodes, get2FAStatus
} from '../../controllers/authController.js'
import { validate, registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from '../../utils/validation.js'
import { optionalAuth, authenticateToken as requireAuth } from '../../utils/jwt.js'
import { userRepository } from '../../repositories/index.js'
import express from 'express'

export const authRouter = express.Router()

// Authentication endpoints
authRouter.post('/register', validate(registerSchema), registerUser)
authRouter.post('/login', validate(loginSchema), loginUser)
authRouter.post('/logout', optionalAuth, logoutUser)
authRouter.post('/refresh-token', refreshToken)

// Password reset endpoints
authRouter.post('/password/reset-request', validate(passwordResetRequestSchema), requestPasswordReset)
authRouter.post('/password/reset', validate(passwordResetSchema), resetPassword)

// Email verification endpoints
authRouter.get('/email/verify', verifyEmail)

// Two-Factor Authentication endpoints (requires auth)
authRouter.post('/2fa/setup', requireAuth, setup2FA)
authRouter.post('/2fa/enable', requireAuth, enable2FA)
authRouter.post('/2fa/verify', verify2FA)
authRouter.post('/2fa/disable', requireAuth, disable2FA)
authRouter.post('/2fa/backup-codes', requireAuth, generateBackupCodes)
authRouter.get('/2fa/status', requireAuth, get2FAStatus)

// Auth status endpoint
authRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = await userRepository.findById(userId)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        verified: !!user.is_verified,
        twoFactorEnabled: !!user.two_fa_enabled
      }
    })
  } catch (error) {
    next(error)
  }
})