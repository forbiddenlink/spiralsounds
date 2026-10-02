import express from 'express'
import { getGenres, getProducts, getSearchSuggestions, trackSearch, trackProductClick, getProductById, upsertReview } from '../../controllers/productsController.js'
import { authenticateToken as requireAuth, optionalAuth } from '../../utils/jwt.js'

export const productsRouter = express.Router()

// Product catalog endpoints
productsRouter.get('/', getProducts)
productsRouter.get('/genres', getGenres)

// Search functionality
productsRouter.get('/search/suggestions', getSearchSuggestions)

// Analytics tracking (optional auth for better tracking)
productsRouter.post('/analytics/search', trackSearch)
productsRouter.post('/analytics/click', trackProductClick)

// Product detail and reviews (after the static paths above so they are not shadowed)
productsRouter.get('/:id', optionalAuth, getProductById)
productsRouter.post('/:id/reviews', requireAuth, upsertReview)

// Future product management endpoints (admin only)
// productsRouter.post('/', requireAuth, requireAdmin, createProduct)
// productsRouter.put('/:id', requireAuth, requireAdmin, updateProduct)
// productsRouter.delete('/:id', requireAuth, requireAdmin, deleteProduct)
