import { BaseRepository } from './BaseRepository.js'
import { ConflictError, NotFoundError } from '../utils/errors.js'
import bcrypt from 'bcryptjs'
import { generateSecureToken, hashToken } from '../utils/jwt.js'

export class UserRepository extends BaseRepository {
  constructor() {
    super('users')
  }

  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(emailOrUsername) {
    const query = 'SELECT * FROM users WHERE email = ? OR username = ?'
    return await this.executeGetQuery(query, [emailOrUsername, emailOrUsername])
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?'
    return await this.executeGetQuery(query, [email])
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = ?'
    return await this.executeGetQuery(query, [username])
  }

  /**
   * Check if user exists by email or username
   */
  async existsByEmailOrUsername(email, username) {
    const query = 'SELECT id, email, username FROM users WHERE email = ? OR username = ?'
    return await this.executeGetQuery(query, [email, username])
  }

  /**
   * Create a new user with password hashing
   */
  async createUser(userData) {
    const { name, email, username, password } = userData
    
    // Check for existing user
    const existing = await this.existsByEmailOrUsername(email, username)
    if (existing) {
      const field = existing.email === email ? 'email' : 'username'
      throw new ConflictError(`${field.charAt(0).toUpperCase() + field.slice(1)} already in use`, field)
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Generate email verification token
    const verificationToken = generateSecureToken()
    const hashedVerificationToken = hashToken(verificationToken)

    const user = await this.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      email_verification_token: hashedVerificationToken,
      is_verified: false,
      created_at: new Date().toISOString()
    })

    return {
      ...user,
      verificationToken // Return plain token for email sending
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(userId, password) {
    const user = await this.findById(userId)
    if (!user) {
      throw new NotFoundError('User', userId)
    }

    return await bcrypt.compare(password, user.password)
  }

  /**
   * Update user last login
   */
  async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login = ? WHERE id = ?'
    return await this.executeRunQuery(query, [new Date().toISOString(), userId])
  }

  /**
   * Update user password
   */
  async updatePassword(userId, newPassword) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    
    const query = 'UPDATE users SET password = ?, updated_at = ? WHERE id = ?'
    return await this.executeRunQuery(query, [hashedPassword, new Date().toISOString(), userId])
  }

  /**
   * Verify email address
   */
  async verifyEmail(verificationToken) {
    const hashedToken = hashToken(verificationToken)
    
    const user = await this.findOneWhere(
      'email_verification_token = ? AND is_verified = 0',
      [hashedToken]
    )

    if (!user) {
      throw new NotFoundError('Verification token')
    }

    // Update user as verified
    await this.updateById(user.id, {
      is_verified: true,
      email_verification_token: null,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    return user
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(email) {
    const user = await this.findByEmail(email)
    if (!user) {
      throw new NotFoundError('User with email')
    }

    const resetToken = generateSecureToken()
    const hashedToken = hashToken(resetToken)
    const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1 hour

    const query = `
      UPDATE users 
      SET password_reset_token = ?, password_reset_expires = ?, updated_at = ?
      WHERE id = ?
    `
    
    await this.executeRunQuery(query, [hashedToken, expiresAt, new Date().toISOString(), user.id])

    return {
      user,
      resetToken // Return plain token for email
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetToken, newPassword) {
    const hashedToken = hashToken(resetToken)
    
    const user = await this.findOneWhere(
      'password_reset_token = ? AND password_reset_expires > ?',
      [hashedToken, new Date().toISOString()]
    )

    if (!user) {
      throw new NotFoundError('Valid password reset token')
    }

    // Update password and clear reset token
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    const query = `
      UPDATE users 
      SET password = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = ?
      WHERE id = ?
    `
    
    await this.executeRunQuery(query, [hashedPassword, new Date().toISOString(), user.id])

    return user
  }

  /**
   * Get user profile (safe fields only)
   */
  async getUserProfile(userId) {
    const query = `
      SELECT id, name, email, username, is_verified, created_at, last_login, updated_at
      FROM users 
      WHERE id = ?
    `
    const user = await this.executeGetQuery(query, [userId])
    
    if (!user) {
      throw new NotFoundError('User', userId)
    }

    return user
  }

  /**
   * Search users (admin function)
   */
  async searchUsers(searchTerm, limit = 10, offset = 0) {
    const query = `
      SELECT id, name, email, username, is_verified, created_at, last_login
      FROM users 
      WHERE name LIKE ? OR email LIKE ? OR username LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    const searchPattern = `%${searchTerm}%`
    return await this.executeQuery(query, [searchPattern, searchPattern, searchPattern, limit, offset])
  }
}