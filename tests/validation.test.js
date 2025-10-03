import { describe, test, expect } from '@jest/globals'
import { 
  registerSchema, 
  loginSchema, 
  passwordResetRequestSchema 
} from '../utils/validation.js'

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    test('should validate correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!'
      }

      const { error } = registerSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    test('should reject invalid email format', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        username: 'johndoe',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!'
      }

      const { error } = registerSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('email')
    })

    test('should reject weak password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'weak',
        confirmPassword: 'weak'
      }

      const { error } = registerSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('password')
    })

    test('should reject mismatched password confirmation', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!'
      }

      const { error } = registerSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('confirmPassword')
    })
  })

  describe('loginSchema', () => {
    test('should validate correct login data', () => {
      const validData = {
        username: 'johndoe',
        password: 'anypassword'
      }

      const { error } = loginSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    test('should reject missing username', () => {
      const invalidData = {
        password: 'anypassword'
      }

      const { error } = loginSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('username')
    })
  })

  describe('passwordResetRequestSchema', () => {
    test('should validate correct reset request', () => {
      const validData = {
        email: 'john@example.com'
      }

      const { error } = passwordResetRequestSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    test('should reject invalid email in reset request', () => {
      const invalidData = {
        email: 'invalid-email'
      }

      const { error } = passwordResetRequestSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('email')
    })
  })
})