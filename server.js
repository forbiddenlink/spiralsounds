import express from 'express'
import session from 'express-session'
import helmet from 'helmet'
import cors from 'cors'
import dotenv from 'dotenv'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { sanitizeRequestBody } from './utils/sanitization.js'
import { requireSameOrigin } from './middleware/sameOrigin.js'
import { apiLimiter, mountAuthLimits } from './middleware/rateLimits.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8000
const secret = process.env.SESSION_SECRET

if (!secret) {
  throw new Error('SESSION_SECRET environment variable is required for security')
}

// Trust proxy for accurate IP addresses (needed for rate limiting)
app.set('trust proxy', 1)

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.url}`)
    }
    next()
  })
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:8000',
  credentials: true
}))

// Rate limiting (middleware/rateLimits.js)
app.use('/api/', apiLimiter())
mountAuthLimits(app)

// Body parsing and compression
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Refuse cross-site state changes on the cookie-authenticated API
app.use('/api', requireSameOrigin)

// XSS Protection - sanitize all incoming request bodies
app.use(sanitizeRequestBody)

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'))
}

app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
  }
}))



// extensions: email links use /reset-password and /verify-email without .html
app.use(express.static('public', { extensions: ['html'] }))

// Import error handlers and migrations
import { errorHandler, notFoundHandler, logger } from './middleware/errorHandler.js'
import { runMigrations } from './migrate.js'
import { runSeeding } from './seed.js'
import { initializeSocketManager } from './websocket/socketManager.js'
import AnalyticsService from './services/AnalyticsService.js'
import { createServer } from 'http'

// Import versioned API routes
import { v1Router } from './routes/v1/index.js'

// API Versioning
app.use('/api/v1', v1Router)

// Legacy routes (deprecated - redirect to v1). 308 keeps the method and body,
// so an old client's POST still arrives as a POST instead of turning into a GET.
app.use('/api/products', (req, res) => {
  res.redirect(308, '/api/v1/products' + req.url)
})
app.use('/api/auth', (req, res) => {
  res.redirect(308, '/api/v1/auth' + req.url)
})
app.use('/api/cart', (req, res) => {
  res.redirect(308, '/api/v1/cart' + req.url)
})
app.use('/api/analytics', (req, res) => {
  res.redirect(308, '/api/v1/analytics' + req.url)
})

// Main API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Vinyl Store API',
    version: 'v1',
    description: 'RESTful API for vinyl record store',
    availableVersions: ['v1'],
    currentVersion: '/api/v1',
    documentation: '/api/v1/info',
    health: '/api/v1/health'
  })
})

// Legacy health check (redirect to v1)
app.get('/api/health', (req, res) => {
  res.status(301).redirect('/api/v1/health')
})

// Unknown pages get the shop's 404 page; unknown API paths keep the JSON 404 below
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && req.accepts('html')) {
    return res.status(404).sendFile('404.html', { root: 'public' })
  }
  next()
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

// Initialize server with migrations
async function startServer() {
  try {
    // Run database migrations
    await runMigrations()

    // Run database seeding in development
    if (process.env.NODE_ENV !== 'production') {
      await runSeeding()
    }

    // Create HTTP server for WebSocket support
    const server = createServer(app)

    // Initialize WebSocket manager
    const socketManager = initializeSocketManager(server)
    logger.info('📡 WebSocket server initialized')

    // Start real-time analytics
    const analyticsInterval = await AnalyticsService.startRealtimeAnalytics()
    logger.info('📊 Real-time analytics started')

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Spiral Sounds server running at http://localhost:${PORT}`)
      logger.info(`🔗 WebSocket server ready for connections`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    }).on('error', (err) => {
      logger.error('Failed to start server:', err)
      process.exit(1)
    })

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('🛑 Shutting down gracefully...')
      
      if (analyticsInterval) {
        clearInterval(analyticsInterval)
      }
      
      if (socketManager) {
        socketManager.destroy()
      }
      
      server.close(() => {
        logger.info('✅ Server shut down complete')
        process.exit(0)
      })
    })

  } catch (error) {
    logger.error('Failed to initialize server:', error)
    process.exit(1)
  }
}

startServer() 