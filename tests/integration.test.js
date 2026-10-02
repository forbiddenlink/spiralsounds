import { beforeAll, describe, expect, test } from '@jest/globals'
import request from 'supertest'

// End-to-end checks of the v1 API as the site uses it: register, sign in,
// cart, profile, system endpoints, error shapes, and the auth rate limit.
// Runs against the throwaway database tests/setup.js creates for this file.
let app
let limitedApp
let productId

const PASSWORD = 'TestPassword123!'
let userCounter = 0
const newUser = () => {
  userCounter += 1
  const username = `integration${userCounter}`
  return {
    name: 'Integration User',
    email: `${username}@example.com`,
    username,
    password: PASSWORD,
    confirmPassword: PASSWORD,
  }
}

const signedInToken = async () => {
  const user = newUser()
  await request(app).post('/api/v1/auth/register').send(user)
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: user.username, password: PASSWORD })
  return { token: res.body.accessToken, user }
}

beforeAll(async () => {
  const express = (await import('express')).default
  const cookieParser = (await import('cookie-parser')).default
  const session = (await import('express-session')).default
  const { DatabaseSeeder } = await import('../db/seeder.js')
  const { getDBConnection } = await import('../db/db.js')
  const { v1Router } = await import('../routes/v1/index.js')
  const { errorHandler, notFoundHandler } = await import('../middleware/errorHandler.js')
  const { mountAuthLimits } = await import('../middleware/rateLimits.js')

  await new DatabaseSeeder().seedProducts()
  const db = await getDBConnection()
  productId = (await db.get('SELECT id FROM products ORDER BY id LIMIT 1')).id
  await db.close()

  const build = ({ limits }) => {
    const a = express()
    a.use(express.json())
    a.use(cookieParser())
    a.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }))
    if (limits) mountAuthLimits(a)
    a.use('/api/v1', v1Router)
    a.use(notFoundHandler)
    a.use(errorHandler)
    return a
  }
  app = build({ limits: false })
  limitedApp = build({ limits: true })
})

describe('Authentication flow', () => {
  test('registers a new user without returning the password', async () => {
    const user = newUser()
    const res = await request(app).post('/api/v1/auth/register').send(user).expect(201)
    expect(res.body.success).toBe(true)
    expect(res.body.user.email).toBe(user.email)
    expect(res.body.user.password).toBeUndefined()
  })

  test('signs in and returns an access token and cookie', async () => {
    const user = newUser()
    await request(app).post('/api/v1/auth/register').send(user)
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password: PASSWORD })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.user.email).toBe(user.email)
    expect((res.headers['set-cookie'] || []).join(';')).toMatch(/accessToken=/)
  })

  test('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'nonexistent', password: 'wrongpassword' })
      .expect(401)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })
})

describe('Product endpoints', () => {
  test('lists products with pagination', async () => {
    const res = await request(app).get('/api/v1/products').expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.products.length).toBeGreaterThan(0)
    expect(res.body.data.pagination).toBeDefined()
  })

  test('searches products', async () => {
    const res = await request(app).get('/api/v1/products?search=rock').expect(200)
    expect(Array.isArray(res.body.data.products)).toBe(true)
  })

  test('filters products by genre', async () => {
    const res = await request(app).get('/api/v1/products?genre=rock').expect(200)
    expect(res.body.data.products.every((p) => p.genre === 'rock')).toBe(true)
  })

  test('lists genres', async () => {
    const res = await request(app).get('/api/v1/products/genres').expect(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('Cart endpoints', () => {
  test('adds an item to the cart', async () => {
    const { token } = await signedInToken()
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId })
      .expect(200)
    expect(res.body.message).toBe('Added to cart')
  })

  test('lists cart items', async () => {
    const { token } = await signedInToken()
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId })
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0]).toMatchObject({ productId, quantity: 1 })
  })

  test('requires sign-in', async () => {
    const res = await request(app).get('/api/v1/cart').expect(401)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('TOKEN_REQUIRED')
  })
})

describe('Profile endpoints', () => {
  test('returns the signed-in user', async () => {
    const { token, user } = await signedInToken()
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body).toMatchObject({ isLoggedIn: true, name: user.name })
  })

  test('updates the display name', async () => {
    const { token } = await signedInToken()
    await request(app)
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Updated Name' })
      .expect(200)
    const res = await request(app)
      .get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${token}`)
    expect(res.body.name).toBe('Updated Name')
  })
})

describe('System endpoints', () => {
  test('reports health', async () => {
    const res = await request(app).get('/api/v1/health').expect(200)
    expect(res.body.status).toBe('OK')
  })

  test('describes the API', async () => {
    const res = await request(app).get('/api/v1/info').expect(200)
    expect(res.body.name).toBeDefined()
    expect(res.body.version).toBe('v1')
  })
})

describe('Error handling', () => {
  test('404s unknown routes as JSON', async () => {
    const res = await request(app).get('/api/v1/nonexistent').expect(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  test('reports validation errors per field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: '', email: 'invalid-email', username: '', password: '123' })
      .expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details.validationErrors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['email', 'password'])
    )
  })
})

describe('Rate limiting', () => {
  test('limits failed sign-ins on the v1 login path to 5 per window', async () => {
    const statuses = []
    for (let i = 0; i < 7; i++) {
      statuses.push(
        (
          await request(limitedApp)
            .post('/api/v1/auth/login')
            .send({ username: 'nonexistent', password: 'wrong' })
        ).status
      )
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true)
    expect(statuses.slice(5)).toEqual([429, 429])
  })
})
