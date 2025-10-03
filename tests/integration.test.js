import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import { getDBConnection } from '../db/db.js'
import fs from 'fs'

// Set test environment
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-with-32-characters-minimum'
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only-with-32-characters'
process.env.NODE_ENV = 'test'
process.env.DB_PATH = './test-integration.db'

// Import app after setting environment
let app
let server

beforeAll(async () => {
  // Clean up any existing test database
  if (fs.existsSync('./test-integration.db')) {
    fs.unlinkSync('./test-integration.db')
  }
  
  // Import and setup app
  const { createServer } = await import('http')
  const express = await import('express')
  
  // Create a simple test app
  app = express.default()
  app.use(express.default.json())
  
  // Import and run migrations
  const { migrator } = await import('../db/migrator.js')
  await migrator.runAllMigrations()
  
  // Import routes
  const { v1Router } = await import('../routes/v1/index.js')
  app.use('/api/v1', v1Router)
  
  server = createServer(app)
})

afterAll(async () => {
  // Close database connection
  const db = await getDBConnection()
  if (db) {
    await db.close()
  }
  
  // Clean up test database
  if (fs.existsSync('./test-integration.db')) {
    fs.unlinkSync('./test-integration.db')
  }
  
  if (server) {
    server.close()
  }
})

describe('API Integration Tests', () => {
  let authToken
  let testUserId

  beforeEach(async () => {
    // Clean up test data
    const db = await getDBConnection()
    await db.run('DELETE FROM cart_items')
    await db.run('DELETE FROM users WHERE email LIKE ?', ['test%'])
  })

  describe('Authentication Flow', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.user.password).toBeUndefined() // Password should not be returned
    })

    test('should login user and return JWT token', async () => {
      // First register a user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)

      // Then login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.user.email).toBe(userData.email)
      
      authToken = response.body.data.token
      testUserId = response.body.data.user.id
    })

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })
  })

  describe('Product Endpoints', () => {
    test('should get all products', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.products)).toBe(true)
      expect(response.body.data.pagination).toBeDefined()
    })

    test('should search products', async () => {
      const response = await request(app)
        .get('/api/v1/products?search=rock')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.products)).toBe(true)
    })

    test('should filter products by genre', async () => {
      const response = await request(app)
        .get('/api/v1/products?genre=Rock')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.products)).toBe(true)
    })

    test('should get product genres', async () => {
      const response = await request(app)
        .get('/api/v1/products/genres')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })
  })

  describe('Cart Endpoints', () => {
    beforeEach(async () => {
      // Register and login a user for cart tests
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })

      authToken = loginResponse.body.data.token
      testUserId = loginResponse.body.data.user.id
    })

    test('should add item to cart', async () => {
      const cartData = {
        product_id: 1,
        quantity: 2
      }

      const response = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cartData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.item).toBeDefined()
    })

    test('should get cart items', async () => {
      // First add an item
      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ product_id: 1, quantity: 1 })

      const response = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.items)).toBe(true)
    })

    test('should require authentication for cart operations', async () => {
      const response = await request(app)
        .get('/api/v1/cart')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    })
  })

  describe('User Profile Endpoints', () => {
    beforeEach(async () => {
      // Register and login a user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })

      authToken = loginResponse.body.data.token
    })

    test('should get user profile', async () => {
      const response = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.user.email).toBe('test@example.com')
    })

    test('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      }

      const response = await request(app)
        .put('/api/v1/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.name).toBe(updateData.name)
    })
  })

  describe('System Endpoints', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('healthy')
    })

    test('should return API info', async () => {
      const response = await request(app)
        .get('/api/v1/info')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBeDefined()
      expect(response.body.data.version).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })

    test('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '', // Invalid empty name
          email: 'invalid-email', // Invalid email format
          username: '', // Invalid empty username
          password: '123' // Invalid short password
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Rate Limiting', () => {
    test('should enforce rate limiting on auth endpoints', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      }

      // Make multiple rapid requests
      const promises = Array(10).fill().map(() => 
        request(app)
          .post('/api/v1/auth/login')
          .send({ username: 'nonexistent', password: 'wrong' })
      )

      const responses = await Promise.all(promises)
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })
})
