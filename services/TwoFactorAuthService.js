/**
 * Two-Factor Authentication Service
 * Implements TOTP (Time-based One-Time Password) authentication
 * with backup codes and QR code generation
 */

import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { getDBConnection } from '../db/db.js'
import { logger } from '../middleware/errorHandler.js'

class TwoFactorAuthService {
  /**
   * Generate a new 2FA secret for a user
   */
  static async generateSecret(userId, userEmail, displayName) {
    let db;
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${process.env.TWO_FA_SERVICE_NAME || 'Spiral Sounds'} (${userEmail})`,
        issuer: process.env.TWO_FA_ISSUER || 'Spiral Sounds Vinyl Shop',
        length: 32
      })

      // Generate backup codes
      const backupCodes = this.generateBackupCodes()

      // Store in database (but don't enable 2FA yet)
      const db = await getDBConnection()
      await db.run(
        'UPDATE users SET two_fa_secret = ?, two_fa_backup_codes = ? WHERE id = ?',
        [secret.base32, JSON.stringify(backupCodes), userId]
      )

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url)

      logger.info(`2FA secret generated for user: ${userId}`)

      return {
        secret: secret.base32,
        qrCode: qrCodeDataURL,
        manualEntryKey: secret.base32,
        backupCodes: backupCodes
      }

    } catch (error) {
      logger.error('Error generating 2FA secret:', error)
      throw new Error('Failed to generate 2FA secret')
    } finally {
      if (db) await db.close()
    }
  }

  /**
   * Verify TOTP token and enable 2FA
   */
  static async enableTwoFA(userId, token) {
    try {
      const db = await getDBConnection()
      const user = await db.get(
        'SELECT two_fa_secret FROM users WHERE id = ?',
        [userId]
      )

      if (!user || !user.two_fa_secret) {
        throw new Error('2FA secret not found')
      }

      // Verify the token
      const isValid = speakeasy.totp.verify({
        secret: user.two_fa_secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow some time drift
      })

      if (!isValid) {
        logger.warn(`Invalid 2FA token for user: ${userId}`)
        return { success: false, message: 'Invalid authentication code' }
      }

      // Enable 2FA
      await db.run(
        'UPDATE users SET two_fa_enabled = 1, two_fa_setup_at = ? WHERE id = ?',
        [Date.now(), userId]
      )

      logger.info(`2FA enabled for user: ${userId}`)

      return {
        success: true,
        message: 'Two-factor authentication enabled successfully'
      }

    } catch (error) {
      logger.error('Error enabling 2FA:', error)
      return {
        success: false,
        message: 'Failed to enable two-factor authentication'
      }
    }
  }

  /**
   * Verify TOTP token during login
   */
  static async verifyToken(userId, token) {
    try {
      const user = await db.get(
        'SELECT two_fa_secret, two_fa_enabled, two_fa_backup_codes FROM users WHERE id = ?',
        [userId]
      )

      if (!user || !user.two_fa_enabled) {
        return { success: false, message: 'Two-factor authentication not enabled' }
      }

      // Check if it's a backup code
      if (token.length === 8 && /^[0-9]{8}$/.test(token)) {
        return this.verifyBackupCode(userId, token, user.two_fa_backup_codes)
      }

      // Verify TOTP token
      const isValid = speakeasy.totp.verify({
        secret: user.two_fa_secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow some time drift
      })

      if (!isValid) {
        logger.warn(`Invalid 2FA token for user: ${userId}`)
        return { success: false, message: 'Invalid authentication code' }
      }

      logger.info(`Valid 2FA token for user: ${userId}`)
      return { success: true, message: 'Authentication code verified' }

    } catch (error) {
      logger.error('Error verifying 2FA token:', error)
      return { success: false, message: 'Failed to verify authentication code' }
    }
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId, code, backupCodesJson) {
    try {
      const backupCodes = JSON.parse(backupCodesJson || '[]')
      const codeIndex = backupCodes.findIndex(bc => bc.code === code && !bc.used)

      if (codeIndex === -1) {
        logger.warn(`Invalid backup code for user: ${userId}`)
        return { success: false, message: 'Invalid backup code' }
      }

      // Mark backup code as used
      backupCodes[codeIndex].used = true
      backupCodes[codeIndex].usedAt = Date.now()

      await db.run(
        'UPDATE users SET two_fa_backup_codes = ? WHERE id = ?',
        [JSON.stringify(backupCodes), userId]
      )

      logger.info(`Backup code used for user: ${userId}`)
      return {
        success: true,
        message: 'Backup code verified',
        isBackupCode: true,
        remainingCodes: backupCodes.filter(bc => !bc.used).length
      }

    } catch (error) {
      logger.error('Error verifying backup code:', error)
      return { success: false, message: 'Failed to verify backup code' }
    }
  }

  /**
   * Disable 2FA for a user
   */
  static async disableTwoFA(userId, password = null) {
    try {
      // If password is provided, verify it first
      if (password) {
        const user = await db.get('SELECT password FROM users WHERE id = ?', [userId])
        if (!user || !await bcrypt.compare(password, user.password)) {
          return { success: false, message: 'Invalid password' }
        }
      }

      await db.run(
        'UPDATE users SET two_fa_enabled = 0, two_fa_secret = NULL, two_fa_backup_codes = NULL, two_fa_setup_at = NULL WHERE id = ?',
        [userId]
      )

      logger.info(`2FA disabled for user: ${userId}`)

      return {
        success: true,
        message: 'Two-factor authentication disabled successfully'
      }

    } catch (error) {
      logger.error('Error disabling 2FA:', error)
      return { success: false, message: 'Failed to disable two-factor authentication' }
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateNewBackupCodes(userId) {
    try {
      const backupCodes = this.generateBackupCodes()

      await db.run(
        'UPDATE users SET two_fa_backup_codes = ? WHERE id = ?',
        [JSON.stringify(backupCodes), userId]
      )

      logger.info(`New backup codes generated for user: ${userId}`)

      return {
        success: true,
        backupCodes: backupCodes.map(bc => bc.code)
      }

    } catch (error) {
      logger.error('Error generating backup codes:', error)
      return { success: false, message: 'Failed to generate backup codes' }
    }
  }

  /**
   * Get 2FA status for a user
   */
  static async getTwoFAStatus(userId) {
    try {
      const user = await db.get(
        'SELECT two_fa_enabled, two_fa_setup_at, two_fa_backup_codes FROM users WHERE id = ?',
        [userId]
      )

      if (!user) {
        return { enabled: false }
      }

      let remainingBackupCodes = 0
      if (user.two_fa_backup_codes) {
        const backupCodes = JSON.parse(user.two_fa_backup_codes)
        remainingBackupCodes = backupCodes.filter(bc => !bc.used).length
      }

      return {
        enabled: !!user.two_fa_enabled,
        setupAt: user.two_fa_setup_at,
        remainingBackupCodes: remainingBackupCodes
      }

    } catch (error) {
      logger.error('Error getting 2FA status:', error)
      return { enabled: false }
    }
  }

  /**
   * Generate backup codes (private method)
   */
  static generateBackupCodes() {
    const codes = []
    for (let i = 0; i < 10; i++) {
      codes.push({
        code: crypto.randomInt(10000000, 99999999).toString(),
        used: false,
        createdAt: Date.now()
      })
    }
    return codes
  }

  /**
   * Check if user needs 2FA verification
   */
  static async requiresTwoFA(userId) {
    try {
      const user = await db.get(
        'SELECT two_fa_enabled FROM users WHERE id = ?',
        [userId]
      )
      
      return user && user.two_fa_enabled === 1
    } catch (error) {
      logger.error('Error checking 2FA requirement:', error)
      return false
    }
  }
}

export default TwoFactorAuthService