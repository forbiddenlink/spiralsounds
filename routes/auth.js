import { 
  registerUser, loginUser, logoutUser, refreshToken, requestPasswordReset, resetPassword, verifyEmail,
  setup2FA, enable2FA, verify2FA, disable2FA, generateBackupCodes, get2FAStatus
} from '../controllers/authController.js'
import { validate, registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from '../utils/validation.js'
import { optionalAuth, authenticateToken as requireAuth } from '../utils/jwt.js'
import express from 'express'

export const authRouter = express.Router()

// Standard authentication routes
authRouter.post('/register', validate(registerSchema), registerUser)
authRouter.post('/login', validate(loginSchema), loginUser)
authRouter.post('/logout', optionalAuth, logoutUser)
authRouter.post('/refresh-token', refreshToken)
authRouter.post('/request-password-reset', validate(passwordResetRequestSchema), requestPasswordReset)
authRouter.post('/reset-password', validate(passwordResetSchema), resetPassword)
authRouter.get('/verify-email', verifyEmail)



// 2FA routes (require authentication)
authRouter.get('/2fa/status', requireAuth, get2FAStatus)
authRouter.post('/2fa/setup', requireAuth, setup2FA)
authRouter.post('/2fa/enable', requireAuth, enable2FA)
authRouter.post('/2fa/verify', verify2FA) // No auth required - used during login
authRouter.post('/2fa/disable', requireAuth, disable2FA)
authRouter.post('/2fa/backup-codes', requireAuth, generateBackupCodes)

