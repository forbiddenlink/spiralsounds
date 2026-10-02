import { describe, test, expect, beforeAll } from '@jest/globals'
import request from 'supertest'
import bcrypt from 'bcryptjs'

process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-with-32-characters-minimum'
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only-with-32-characters'
process.env.NODE_ENV = 'test'

// Storefront endpoints the redesigned UI depends on: product detail,
// reviews, saved records (wishlist), and cart quantity updates.
let app
let auth
let productId
let genre

beforeAll(async () => {
  const express = (await import('express')).default
  const cookieParser = (await import('cookie-parser')).default
  const { migrator } = await import('../db/migrator.js')
  const { DatabaseSeeder } = await import('../db/seeder.js')
  const { getDBConnection } = await import('../db/db.js')
  const { generateAccessToken } = await import('../utils/jwt.js')
  const { v1Router } = await import('../routes/v1/index.js')
  const { errorHandler } = await import('../middleware/errorHandler.js')

  await migrator.runAllMigrations()
  await new DatabaseSeeder().seedProducts()

  const db = await getDBConnection()
  const username = `storefront_${Date.now()}`
  const hash = await bcrypt.hash('StorefrontPass1!', 4)
  const { lastID: userId } = await db.run(
    'INSERT INTO users (name, email, username, password, created_at) VALUES (?, ?, ?, ?, ?)',
    ['Store Front', `${username}@example.com`, username, hash, new Date().toISOString()]
  )
  const product = await db.get('SELECT id, genre FROM products ORDER BY id LIMIT 1')
  productId = product.id
  genre = product.genre
  await db.close()

  auth = `Bearer ${generateAccessToken({ userId, username, email: `${username}@example.com` })}`

  app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/v1', v1Router)
  app.use(errorHandler)
})

describe('GET /api/v1/products/:id', () => {
  test('returns the product with rating summary, reviews, and same-genre picks', async () => {
    const res = await request(app).get(`/api/v1/products/${productId}`)
    expect(res.status).toBe(200)
    const { product, rating, reviews, related } = res.body.data
    expect(product.id).toBe(productId)
    expect(typeof rating.count).toBe('number')
    expect(Array.isArray(reviews)).toBe(true)
    expect(related.every((p) => p.id !== productId)).toBe(true)
    expect(related.length).toBeGreaterThan(0)
    expect(related[0].genre).toBe(genre)
  })

  test('404s for an unknown product', async () => {
    const res = await request(app).get('/api/v1/products/999999')
    expect(res.status).toBe(404)
  })

  test('400s for a non-numeric id', async () => {
    const res = await request(app).get('/api/v1/products/abc')
    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/products/:id/reviews', () => {
  test('requires sign-in', async () => {
    const res = await request(app).post(`/api/v1/products/${productId}/reviews`).send({ rating: 5 })
    expect(res.status).toBe(401)
  })

  test('rejects a rating outside 1-5', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set('Authorization', auth)
      .send({ rating: 6, comment: 'too good' })
    expect(res.status).toBe(400)
  })

  test('saves one review per user and updates it on resubmit', async () => {
    const before = (await request(app).get(`/api/v1/products/${productId}`)).body.data.rating.count
    const first = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set('Authorization', auth)
      .send({ rating: 4, comment: 'Warm pressing.' })
    expect(first.status).toBe(201)
    const second = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set('Authorization', auth)
      .send({ rating: 2, comment: 'Changed my mind.' })
    expect(second.status).toBe(201)
    const after = (await request(app).get(`/api/v1/products/${productId}`)).body.data
    expect(after.rating.count).toBe(before + 1)
    expect(after.reviews.some((r) => r.comment === 'Changed my mind.' && r.rating === 2)).toBe(true)
  })
})

describe('/api/v1/wishlist', () => {
  test('requires sign-in', async () => {
    const res = await request(app).get('/api/v1/wishlist')
    expect(res.status).toBe(401)
  })

  test('saves a record once, lists it with product details, and removes it', async () => {
    const add = () =>
      request(app)
        .post('/api/v1/wishlist')
        .set('Authorization', auth)
        .send({ product_id: productId })
    expect((await add()).status).toBe(201)
    expect((await add()).status).toBe(201)

    const list = await request(app).get('/api/v1/wishlist').set('Authorization', auth)
    expect(list.status).toBe(200)
    const saved = list.body.data.items.filter((i) => i.productId === productId)
    expect(saved).toHaveLength(1)
    expect(saved[0].title).toBeTruthy()

    const del = await request(app)
      .delete(`/api/v1/wishlist/${productId}`)
      .set('Authorization', auth)
    expect(del.status).toBe(204)
    const after = await request(app).get('/api/v1/wishlist').set('Authorization', auth)
    expect(after.body.data.items.some((i) => i.productId === productId)).toBe(false)
  })

  test('404s for an unknown product', async () => {
    const res = await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', auth)
      .send({ product_id: 999999 })
    expect(res.status).toBe(404)
  })
})

describe('cart quantity and item details', () => {
  test('cart items include product id and cover image', async () => {
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', auth)
      .send({ product_id: productId })
    const res = await request(app).get('/api/v1/cart').set('Authorization', auth)
    const item = res.body.items.find((i) => i.productId === productId)
    expect(item).toBeTruthy()
    expect(item.image).toMatch(/\.(png|webp|jpg)$/)
  })

  test('PATCH sets an exact quantity', async () => {
    const { items } = (await request(app).get('/api/v1/cart').set('Authorization', auth)).body
    const item = items.find((i) => i.productId === productId)
    const res = await request(app)
      .patch(`/api/v1/cart/items/${item.cartItemId}`)
      .set('Authorization', auth)
      .send({ quantity: 3 })
    expect(res.status).toBe(200)
    const again = (await request(app).get('/api/v1/cart').set('Authorization', auth)).body.items
    expect(again.find((i) => i.cartItemId === item.cartItemId).quantity).toBe(3)
  })

  test('PATCH rejects quantities outside 1-10', async () => {
    const { items } = (await request(app).get('/api/v1/cart').set('Authorization', auth)).body
    const res = await request(app)
      .patch(`/api/v1/cart/items/${items[0].cartItemId}`)
      .set('Authorization', auth)
      .send({ quantity: 0 })
    expect(res.status).toBe(400)
  })
})
