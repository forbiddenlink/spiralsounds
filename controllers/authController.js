import validator from 'validator'
import bcrypt from 'bcryptjs'
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/jwt.js'
import { logger } from '../middleware/errorHandler.js'
import { emailService } from '../utils/emailService.js'
import { userRepository } from '../repositories/index.js'
import { getDBConnection } from '../db/db.js'
import { 
  ValidationError, 
  ConflictError, 
  DatabaseError, 
  AuthError,
  NotFoundError 
} from '../utils/errors.js'

// Security audit logging function
async function logSecurityEvent(userId, eventType, details, req) {
  try {
    const db = await getDBConnection()
    await db.run(
      'INSERT INTO security_audit_log (user_id, event_type, event_details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, eventType, details, req.ip, req.get('User-Agent'), Date.now()]
    )
  } catch (error) {
    logger.error('Failed to log security event:', error)
  }
}

export async function registerUser(req, res, next) {
  try {
    const { name, email, username, password } = req.body

    // Create user using repository
    const { id: userId, verificationToken } = await userRepository.createUser({
      name, email, username, password
    })

    // Generate JWT tokens
    const accessToken = generateAccessToken({ userId, username, email })
    const refreshToken = generateRefreshToken({ userId })

    // Store refresh token in database
    const db = await userRepository.getDB()
    await db.run(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, hashToken(refreshToken), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()]
    )

    // Set session for backward compatibility
    req.session.userId = userId

    // Set HTTP-only cookies for tokens
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    })

    // Log successful registration
    await logSecurityEvent(userId, 'USER_REGISTERED', { username, email }, req)
    logger.info(`New user registered: ${username} (${email})`)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: userId,
        name,
        email,
        username,
        isVerified: false
      },
      accessToken // Also return in response for client-side storage if needed
    })

  } catch (err) {
    // Pass error to global error handler
    next(err)
  }
}

export async function loginUser(req, res, next) {
  try {
    let { username, password } = req.body

    // Note: Basic validation now handled by validation middleware
    username = username.trim()

    const user = await userRepository.findByEmailOrUsername(username)

    if (!user) {
      await logSecurityEvent(null, 'LOGIN_FAILED', { username, reason: 'user_not_found' }, req)
      logger.warn(`Login attempt with non-existent username: ${username}`)
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      await logSecurityEvent(user.id, 'LOGIN_FAILED', { username, reason: 'invalid_password' }, req)
      logger.warn(`Failed login attempt for user: ${username}`)
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    // Update last login using repository
    await userRepository.updateLastLogin(user.id)

    // Generate new JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email
    })
    const refreshToken = generateRefreshToken({ userId: user.id })

    // Clean up old refresh tokens for this user and store new one
    const db = await userRepository.getDB()
    await db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id])
    await db.run(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, hashToken(refreshToken), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()]
    )

    // Set session for backward compatibility
    req.session.userId = user.id

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })

    // Log successful login
    await logSecurityEvent(user.id, 'USER_LOGGED_IN', { username }, req)
    logger.info(`User logged in: ${user.username}`)

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        isVerified: user.is_verified
      },
      accessToken
    })

  } catch (err) {
    // Pass error to global error handler
    next(err)
  }
}


export async function logoutUser(req, res) {
  try {
    const db = await getDBConnection()

    // If user is authenticated via JWT, clean up refresh tokens
    if (req.user && req.user.userId) {
      await db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.userId])
    }

    // Clear cookies
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destroy error:', err)
        return res.status(500).json({ error: 'Logout failed' })
      }

      logger.info(`User logged out: ${req.user?.username || 'unknown'}`)
      res.json({ message: 'Logged out successfully' })
    })

  } catch (err) {
    logger.error('Logout error:', err)
    res.status(500).json({ error: 'Logout failed' })
  }
}

// New function to refresh access token
export async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.cookies

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' })
    }

    const db = await getDBConnection()

    // Check if refresh token exists and is valid
    const tokenRecord = await db.get(
      'SELECT rt.*, u.username, u.email FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = ? AND rt.expires_at > ?',
      [hashToken(refreshToken), new Date().toISOString()]
    )

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' })
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: tokenRecord.user_id,
      username: tokenRecord.username,
      email: tokenRecord.email
    })

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken
    })

  } catch (err) {
    logger.error('Token refresh error:', err)
    res.status(500).json({ error: 'Token refresh failed' })
  }
}

// Password reset request
export async function requestPasswordReset(req, res) {
  const { email } = req.body

  try {
    const db = await getDBConnection()

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email])

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        message: 'If an account with that email exists, we\'ve sent a password reset link.'
      })
    }

    // Generate reset token
    const resetToken = generateSecureToken()
    const hashedToken = hashToken(resetToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Clean up old reset tokens for this user
    await db.run('DELETE FROM password_resets WHERE user_id = ?', [user.id])

    // Store reset token
    await db.run(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, hashedToken, expiresAt.toISOString()]
    )

    // Send email (don't await to not block response)
    emailService.sendPasswordResetEmail(email, resetToken, user.name)
      .catch(error => logger.error('Failed to send password reset email:', error))

    logger.info(`Password reset requested for user: ${user.username}`)

    res.json({
      message: 'If an account with that email exists, we\'ve sent a password reset link.'
    })

  } catch (err) {
    logger.error('Password reset request error:', err)
    res.status(500).json({ error: 'Password reset request failed. Please try again.' })
  }
}

// Reset password with token
export async function resetPassword(req, res) {
  const { token, password } = req.body

  try {
    const db = await getDBConnection()
    const hashedToken = hashToken(token)

    // Find valid reset token
    const resetRecord = await db.get(
      'SELECT pr.*, u.username, u.email FROM password_resets pr JOIN users u ON pr.user_id = u.id WHERE pr.token_hash = ? AND pr.expires_at > ? AND pr.used = FALSE',
      [hashedToken, new Date().toISOString()]
    )

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Update password
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetRecord.user_id])

    // Mark reset token as used
    await db.run('UPDATE password_resets SET used = TRUE WHERE id = ?', [resetRecord.id])

    // Invalidate all refresh tokens for this user (force re-login)
    await db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [resetRecord.user_id])

    logger.info(`Password reset completed for user: ${resetRecord.username}`)

    res.json({ message: 'Password reset successful. Please log in with your new password.' })

  } catch (err) {
    logger.error('Password reset error:', err)
    res.status(500).json({ error: 'Password reset failed. Please try again.' })
  }
}

// Email verification
export async function verifyEmail(req, res) {
  const { token } = req.query

  if (!token) {
    return res.status(400).json({ error: 'Verification token required' })
  }

  try {
    const db = await getDBConnection()
    const hashedToken = hashToken(token)

    const user = await db.get(
      'SELECT * FROM users WHERE email_verification_token = ? AND is_verified = FALSE',
      [hashedToken]
    )

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' })
    }

    // Mark user as verified
    await db.run(
      'UPDATE users SET is_verified = TRUE, email_verification_token = NULL WHERE id = ?',
      [user.id]
    )

    // Send welcome email
    emailService.sendWelcomeEmail(user.email, user.name)
      .catch(error => logger.error('Failed to send welcome email:', error))

    logger.info(`Email verified for user: ${user.username}`)

    res.json({
      message: 'Email verified successfully! Welcome to Spiral Sounds.',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        isVerified: true
      }
    })

  } catch (err) {
    logger.error('Email verification error:', err)
    res.status(500).json({ error: 'Email verification failed. Please try again.' })
  }
}

// Import 2FA service
import TwoFactorAuthService from '../services/TwoFactorAuthService.js'

/**
 * Generate 2FA secret and QR code
 */
export async function setup2FA(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const result = await TwoFactorAuthService.generateSecret(
      req.user.id,
      req.user.email,
      req.user.display_name || req.user.name
    )

    await logSecurityEvent(req.user.id, '2FA_SETUP_INITIATED', 'User initiated 2FA setup', req)

    res.json({
      message: '2FA setup initiated',
      qrCode: result.qrCode,
      manualEntryKey: result.manualEntryKey,
      backupCodes: result.backupCodes
    })

  } catch (error) {
    logger.error('2FA setup error:', error)
    res.status(500).json({ error: 'Failed to setup 2FA' })
  }
}

/**
 * Enable 2FA after verification
 */
export async function enable2FA(req, res) {
  try {
    const { token } = req.body

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!token) {
      return res.status(400).json({ error: 'Authentication code required' })
    }

    const result = await TwoFactorAuthService.enableTwoFA(req.user.id, token)

    if (result.success) {
      await logSecurityEvent(req.user.id, '2FA_ENABLED', 'Two-factor authentication enabled', req)
    } else {
      await logSecurityEvent(req.user.id, '2FA_ENABLE_FAILED', `Failed to enable 2FA: ${result.message}`, req)
    }

    res.json(result)

  } catch (error) {
    logger.error('2FA enable error:', error)
    res.status(500).json({ error: 'Failed to enable 2FA' })
  }
}

/**
 * Verify 2FA token during login
 */
export async function verify2FA(req, res) {
  try {
    const { token, userId } = req.body

    if (!token || !userId) {
      return res.status(400).json({ error: 'Authentication code and user ID required' })
    }

    const result = await TwoFactorAuthService.verifyToken(userId, token)

    if (result.success) {
      // Complete the login process
      const db = await getDBConnection()
      const user = await db.get(
        'SELECT id, username, email, display_name, profile_picture FROM users WHERE id = ?',
        [userId]
      )

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Generate tokens
      const accessToken = generateAccessToken(user)
      const refreshToken = generateRefreshToken(user.id)

      // Store refresh token
      const hashedRefreshToken = hashToken(refreshToken)
      await db.run(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [user.id, hashedRefreshToken, Date.now() + 30 * 24 * 60 * 60 * 1000] // 30 days
      )

      // Update last login
      const ipAddress = req.ip || req.connection.remoteAddress
      await db.run(
        'UPDATE users SET last_login_at = ?, last_login_ip = ? WHERE id = ?',
        [Date.now(), ipAddress, user.id]
      )

      await logSecurityEvent(user.id, '2FA_LOGIN_SUCCESS', '2FA verification successful', req)

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          profilePicture: user.profile_picture
        },
        accessToken,
        refreshToken
      })
    } else {
      await logSecurityEvent(userId, '2FA_LOGIN_FAILED', `2FA verification failed: ${result.message}`, req)
      res.status(400).json(result)
    }

  } catch (error) {
    logger.error('2FA verification error:', error)
    res.status(500).json({ error: 'Failed to verify 2FA' })
  }
}

/**
 * Disable 2FA
 */
export async function disable2FA(req, res) {
  try {
    const { password } = req.body

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const result = await TwoFactorAuthService.disableTwoFA(req.user.id, password)

    if (result.success) {
      await logSecurityEvent(req.user.id, '2FA_DISABLED', 'Two-factor authentication disabled', req)
    }

    res.json(result)

  } catch (error) {
    logger.error('2FA disable error:', error)
    res.status(500).json({ error: 'Failed to disable 2FA' })
  }
}

/**
 * Generate new backup codes
 */
export async function generateBackupCodes(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const result = await TwoFactorAuthService.generateNewBackupCodes(req.user.id)

    if (result.success) {
      await logSecurityEvent(req.user.id, '2FA_BACKUP_CODES_GENERATED', 'New backup codes generated', req)
    }

    res.json(result)

  } catch (error) {
    logger.error('Backup codes generation error:', error)
    res.status(500).json({ error: 'Failed to generate backup codes' })
  }
}

/**
 * Get 2FA status
 */
export async function get2FAStatus(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const status = await TwoFactorAuthService.getTwoFAStatus(req.user.id)

    res.json(status)

  } catch (error) {
    logger.error('2FA status error:', error)
    res.status(500).json({ error: 'Failed to get 2FA status' })
  }
}

