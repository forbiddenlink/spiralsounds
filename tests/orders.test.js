import { beforeAll, describe, expect, test } from '@jest/globals'
import request from 'supertest'

// Stock and checkout: carts cannot exceed stock, and placing an order records
// it, takes the copies out of stock, and empties the cart in one step.
let app
let auth
let db
let productId

const setStock = (n) => db.run('UPDATE products SET stock = ? WHERE id = ?', [n, productId])
const emptyCart = () => request(app).delete('/api/v1/cart/items').set('Authorization', auth)

beforeAll(async () => {
  const express = (await import('express')).default
  const cookieParser = (await import('cookie-parser')).default
  const { DatabaseSeeder } = await import('../db/seeder.js')
  const { getDBConnection } = await import('../db/db.js')
  const { generateAccessToken } = await import('../utils/jwt.js')
  const { v1Router } = await import('../routes/v1/index.js')
  const { errorHandler } = await import('../middleware/errorHandler.js')

  await new DatabaseSeeder().seedProducts()
  db = await getDBConnection()
  const { lastID: userId } = await db.run(
    'INSERT INTO users (name, email, username, password, created_at) VALUES (?, ?, ?, ?, ?)',
    ['Order Tester', 'orders@example.com', 'ordertester', 'x', new Date().toISOString()]
  )
  productId = (await db.get('SELECT id FROM products ORDER BY id LIMIT 1')).id
  auth = `Bearer ${generateAccessToken({ userId, username: 'ordertester', email: 'orders@example.com' })}`

  app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/v1', v1Router)
  app.use(errorHandler)
})

describe('stock', () => {
  test('seeded records carry stock and the detail endpoint returns it', async () => {
    const res = await request(app).get(`/api/v1/products/${productId}`)
    expect(res.body.data.product.stock).toBe(12)
  })

  test('a sold-out record cannot be added to the cart', async () => {
    await setStock(0)
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', auth)
      .send({ product_id: productId })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/sold out/i)
    await setStock(12)
  })

  test('adding past the last copy is refused', async () => {
    await emptyCart()
    await setStock(1)
    expect(
      (
        await request(app)
          .post('/api/v1/cart/items')
          .set('Authorization', auth)
          .send({ product_id: productId })
      ).status
    ).toBe(200)
    const second = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', auth)
      .send({ product_id: productId })
    expect(second.status).toBe(409)
    await setStock(12)
  })

  test('quantity cannot be raised above stock', async () => {
    const cart = await request(app).get('/api/v1/cart').set('Authorization', auth)
    const line = cart.body.items[0]
    expect(line.stock).toBe(12)
    await setStock(2)
    const res = await request(app)
      .patch(`/api/v1/cart/items/${line.cartItemId}`)
      .set('Authorization', auth)
      .send({ quantity: 3 })
    expect(res.status).toBe(409)
    await setStock(12)
  })

  test('adding an unknown record is a 404', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', auth)
      .send({ product_id: 999999 })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/v1/orders', () => {
  test('requires sign-in', async () => {
    expect((await request(app).post('/api/v1/orders')).status).toBe(401)
  })

  test('refuses an empty cart', async () => {
    await emptyCart()
    const res = await request(app).post('/api/v1/orders').set('Authorization', auth)
    expect(res.status).toBe(400)
  })

  test('places the order, takes copies out of stock, and empties the cart', async () => {
    await emptyCart()
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', auth)
      .send({ product_id: productId })
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', auth)
      .send({ product_id: productId })
    const price = (await db.get('SELECT price FROM products WHERE id = ?', [productId])).price

    const res = await request(app).post('/api/v1/orders').set('Authorization', auth)
    expect(res.status).toBe(201)
    expect(res.body.order.itemCount).toBe(2)
    expect(res.body.order.total).toBeCloseTo(price * 2, 2)

    expect((await db.get('SELECT stock FROM products WHERE id = ?', [productId])).stock).toBe(10)
    expect(
      (await request(app).get('/api/v1/cart').set('Authorization', auth)).body.items
    ).toHaveLength(0)

    const list = await request(app).get('/api/v1/orders').set('Authorization', auth)
    expect(list.body.orders[0].id).toBe(res.body.order.id)
    expect(list.body.orders[0].items[0]).toMatchObject({ productId, quantity: 2 })
    await setStock(12)
  })

  test('refuses the whole order when stock ran out after adding, and keeps the cart', async () => {
    await emptyCart()
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', auth)
      .send({ product_id: productId })
    await setStock(0)
    const res = await request(app).post('/api/v1/orders').set('Authorization', auth)
    expect(res.status).toBe(409)
    expect(res.body.items[0]).toMatchObject({ productId, stock: 0 })
    expect(
      (await request(app).get('/api/v1/cart').set('Authorization', auth)).body.items
    ).toHaveLength(1)
    expect(await db.get('SELECT COUNT(*) AS n FROM orders WHERE total = 0')).toMatchObject({ n: 0 })
    await setStock(12)
  })
})
