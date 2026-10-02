import { createRequire } from 'node:module'
import { beforeAll, describe, expect, test } from '@jest/globals'
import bcrypt from 'bcryptjs'
import request from 'supertest'

// Sign-in for accounts with 2FA on: a correct password returns a short-lived
// challenge and no cookies; only challenge + current code starts a session.
const require = createRequire(import.meta.url)
const speakeasy = require('speakeasy')

let app
let secret
let plainUserId
const PASSWORD = 'TwoFactor1!'

const login = (username) =>
  request(app).post('/api/v1/auth/login').send({ username, password: PASSWORD })
const verify = (body) => request(app).post('/api/v1/auth/2fa/verify').send(body)
const code = () => speakeasy.totp({ secret, encoding: 'base32' })
const cookies = (res) => (res.headers['set-cookie'] || []).join(';')

beforeAll(async () => {
  const express = (await import('express')).default
  const cookieParser = (await import('cookie-parser')).default
  const { getDBConnection } = await import('../db/db.js')
  const { v1Router } = await import('../routes/v1/index.js')
  const { errorHandler } = await import('../middleware/errorHandler.js')

  secret = speakeasy.generateSecret({ length: 20 }).base32
  const hash = await bcrypt.hash(PASSWORD, 4)
  const db = await getDBConnection()
  await db.run(
    'INSERT INTO users (name, email, username, password, is_verified, two_fa_enabled, two_fa_secret, created_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?)',
    ['Two Factor', 'twofa@example.com', 'twofauser', hash, secret, new Date().toISOString()]
  )
  ;({ lastID: plainUserId } = await db.run(
    'INSERT INTO users (name, email, username, password, is_verified, created_at) VALUES (?, ?, ?, ?, 1, ?)',
    ['Plain User', 'plain@example.com', 'plainuser', hash, new Date().toISOString()]
  ))
  await db.close()

  app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/v1', v1Router)
  app.use(errorHandler)
})

describe('password sign-in', () => {
  test('without 2FA still sets session cookies directly', async () => {
    const res = await login('plainuser')
    expect(res.status).toBe(200)
    expect(cookies(res)).toMatch(/accessToken=/)
  })

  test('with 2FA returns a challenge and sets no cookies', async () => {
    const res = await login('twofauser')
    expect(res.status).toBe(200)
    expect(res.body.requires2FA).toBe(true)
    expect(typeof res.body.challengeToken).toBe('string')
    expect(res.body.accessToken).toBeUndefined()
    expect(cookies(res)).not.toMatch(/accessToken=/)
  })

  test('the challenge is not accepted as an access token', async () => {
    const { challengeToken } = (await login('twofauser')).body
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${challengeToken}`)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/auth/2fa/verify', () => {
  test('no longer trusts a bare userId', async () => {
    const res = await verify({ userId: plainUserId, token: '123456' })
    expect(res.status).toBe(400)
    expect(cookies(res)).not.toMatch(/accessToken=/)
  })

  test('rejects a forged or expired challenge', async () => {
    const res = await verify({ challengeToken: 'not-a-token', token: code() })
    expect(res.status).toBe(401)
  })

  test('a wrong code fails and reports tries left', async () => {
    const { challengeToken } = (await login('twofauser')).body
    const res = await verify({ challengeToken, token: '000000' })
    expect(res.status).toBe(400)
    expect(res.body.attemptsLeft).toBe(4)
  })

  test('challenge + current code sets cookies, once', async () => {
    const { challengeToken } = (await login('twofauser')).body
    const res = await verify({ challengeToken, token: code() })
    expect(res.status).toBe(200)
    expect(cookies(res)).toMatch(/accessToken=/)
    expect(res.body.refreshToken).toBeUndefined()

    const again = await verify({ challengeToken, token: code() })
    expect(again.status).toBe(429)
  })

  test('locks the challenge after five wrong codes', async () => {
    const { challengeToken } = (await login('twofauser')).body
    for (let i = 0; i < 5; i++) await verify({ challengeToken, token: '000000' })
    const res = await verify({ challengeToken, token: code() })
    expect(res.status).toBe(429)
    expect(cookies(res)).not.toMatch(/accessToken=/)
  })
})
