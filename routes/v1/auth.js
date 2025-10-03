import { 
  registerUser, loginUser, logoutUser, refreshToken, requestPasswordReset, resetPassword, verifyEmail,
  setup2FA, enable2FA, verify2FA, disable2FA, generateBackupCodes, get2FAStatus
} from '../../controllers/authController.js'
import { validate, registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from '../../utils/validation.js'
import { optionalAuth, authenticateToken as requireAuth } from '../../utils/jwt.js'
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
authRouter.get('/status', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      verified: req.user.emailVerified,
      twoFactorEnabled: req.user.twoFactorEnabled
    }
  })
})