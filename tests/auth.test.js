import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import bcrypt from 'bcryptjs'
import { getDBConnection } from '../db/db.js'
import fs from 'fs'

// Set test environment before importing anything else
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-with-32-characters-minimum'
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only-with-32-characters'
process.env.NODE_ENV = 'test'
process.env.DB_PATH = './test-database.db'

describe('Authentication System', () => {
  let db

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync('./test-database.db')) {
      fs.unlinkSync('./test-database.db')
    }
    
    // Import migrator and run migrations
    const { migrator } = await import('../db/migrator.js')
    await migrator.runAllMigrations()
    
    db = await getDBConnection()
  })

  afterAll(async () => {
    // Close database connection
    if (db) {
      await db.close()
    }
    
    // Clean up test database
    if (fs.existsSync('./test-database.db')) {
      fs.unlinkSync('./test-database.db')
    }
  })

  describe('User Registration', () => {
    test('should create user with hashed password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12)
      
      await db.run(
        'INSERT INTO users (name, email, username, password, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userData.name, userData.email, userData.username, hashedPassword, false, new Date().toISOString()]
      )

      const user = await db.get('SELECT * FROM users WHERE username = ?', [userData.username])
      
      expect(user).toBeTruthy()
      expect(user.email).toBe(userData.email)
      expect(user.password).not.toBe(userData.password)
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true)
    })

    test('should enforce unique email and username', async () => {
      const userData = {
        name: 'Test User 2',
        email: 'test@example.com', // Same email as previous test
        username: 'testuser2',
        password: 'TestPassword123!'
      }

      try {
        await db.run(
          'INSERT INTO users (name, email, username, password, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [userData.name, userData.email, userData.username, await bcrypt.hash(userData.password, 12), false, new Date().toISOString()]
        )
        fail('Should have thrown constraint error')
      } catch (error) {
        expect(error.code).toBe('SQLITE_CONSTRAINT_UNIQUE')
      }
    })
  })

  describe('Password Authentication', () => {
    test('should validate correct password', async () => {
      const password = 'TestPassword123!'
      const user = await db.get('SELECT * FROM users WHERE username = ?', ['testuser'])
      
      expect(user).toBeTruthy()
      const isValid = await bcrypt.compare(password, user.password)
      expect(isValid).toBe(true)
    })

    test('should reject invalid password', async () => {
      const wrongPassword = 'wrongpassword'
      const user = await db.get('SELECT * FROM users WHERE username = ?', ['testuser'])
      
      expect(user).toBeTruthy()
      const isValid = await bcrypt.compare(wrongPassword, user.password)
      expect(isValid).toBe(false)
    })
  })

  describe('Database Operations', () => {
    test('should update user login timestamp', async () => {
      const userId = 1
      const loginTime = new Date().toISOString()
      
      await db.run('UPDATE users SET last_login = ? WHERE id = ?', [loginTime, userId])
      
      const user = await db.get('SELECT last_login FROM users WHERE id = ?', [userId])
      expect(user.last_login).toBe(loginTime)
    })

    test('should handle user verification status', async () => {
      const userId = 1
      
      await db.run('UPDATE users SET is_verified = ? WHERE id = ?', [true, userId])
      
      const user = await db.get('SELECT is_verified FROM users WHERE id = ?', [userId])
      expect(user.is_verified).toBe(1) // SQLite returns 1 for true
    })
  })
})