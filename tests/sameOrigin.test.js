import { beforeAll, describe, expect, test } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import { requireSameOrigin } from '../middleware/sameOrigin.js'

let app

beforeAll(() => {
  app = express()
  app.use(requireSameOrigin)
  app.all('/thing', (req, res) => res.json({ ok: true }))
})

describe('requireSameOrigin', () => {
  test('lets reads through from anywhere', async () => {
    const res = await request(app).get('/thing').set('Origin', 'https://evil.example')
    expect(res.status).toBe(200)
  })

  test('refuses a cross-site POST', async () => {
    const res = await request(app).post('/thing').set('Origin', 'https://evil.example')
    expect(res.status).toBe(403)
  })

  test('refuses a cross-site DELETE identified only by Referer', async () => {
    const res = await request(app).delete('/thing').set('Referer', 'https://evil.example/page')
    expect(res.status).toBe(403)
  })

  test('allows a same-origin POST', async () => {
    const res = await request(app)
      .post('/thing')
      .set('Host', 'shop.example')
      .set('Origin', 'https://shop.example')
    expect(res.status).toBe(200)
  })

  test('allows requests with no Origin or Referer (non-browser clients)', async () => {
    expect((await request(app).post('/thing')).status).toBe(200)
  })

  test('refuses a malformed Origin', async () => {
    expect((await request(app).post('/thing').set('Origin', 'null')).status).toBe(403)
  })
})
