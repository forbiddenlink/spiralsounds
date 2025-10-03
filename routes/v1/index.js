import express from 'express'
import { authRouter } from './auth.js'
import { productsRouter } from './products.js'
import { cartRouter } from './cart.js'
import { meRouter } from './me.js'
import { analyticsRouter } from './analytics.js'

export const v1Router = express.Router()

// API v1 routes with consistent structure
v1Router.use('/auth', authRouter)
v1Router.use('/products', productsRouter)
v1Router.use('/cart', cartRouter)
v1Router.use('/me', meRouter)
v1Router.use('/analytics', analyticsRouter)

// API v1 Health check
v1Router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    version: 'v1',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API v1 Info endpoint
v1Router.get('/info', (req, res) => {
  res.json({
    version: 'v1',
    name: 'Vinyl Store API',
    description: 'RESTful API for vinyl record store with authentication, cart, and analytics',
    endpoints: {
      auth: '/api/v1/auth',
      products: '/api/v1/products',
      cart: '/api/v1/cart',
      user: '/api/v1/me',
      analytics: '/api/v1/analytics'
    },
    documentation: '/api/v1/docs' // Future Swagger docs
  })
})