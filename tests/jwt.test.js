import { describe, test, expect } from '@jest/globals'
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken,
  generateSecureToken,
  hashToken
} from '../utils/jwt.js'

// Set environment variable for testing before importing jwt module
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-with-32-characters-minimum'

describe('JWT Utilities', () => {
  const testPayload = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com'
  }

  describe('generateAccessToken', () => {
    test('should generate a valid access token', () => {
      const token = generateAccessToken(testPayload)
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    test('should include correct claims in token', () => {
      const token = generateAccessToken(testPayload)
      const decoded = verifyToken(token)
      
      expect(decoded.id).toBe(testPayload.id)
      expect(decoded.username).toBe(testPayload.username)
      expect(decoded.email).toBe(testPayload.email)
      expect(decoded.iss).toBe('spiral-sounds')
      expect(decoded.aud).toBe('spiral-sounds-client')
    })
  })

  describe('generateRefreshToken', () => {
    test('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testPayload)
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })
  })

  describe('verifyToken', () => {
    test('should verify valid token', () => {
      const token = generateAccessToken(testPayload)
      const decoded = verifyToken(token)
      expect(decoded.id).toBe(testPayload.id)
    })

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here')
      }).toThrow()
    })
  })

  describe('generateSecureToken', () => {
    test('should generate random hex token', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()
      
      expect(typeof token1).toBe('string')
      expect(token1.length).toBe(64) // 32 bytes = 64 hex chars
      expect(token1).not.toBe(token2)
      expect(/^[a-f0-9]+$/i.test(token1)).toBe(true)
    })
  })

  describe('hashToken', () => {
    test('should hash token consistently', () => {
      const token = 'test-token'
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)
      
      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe('string')
      expect(hash1.length).toBe(64) // SHA-256 = 64 hex chars
    })

    test('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1')
      const hash2 = hashToken('token2')
      
      expect(hash1).not.toBe(hash2)
    })
  })
})