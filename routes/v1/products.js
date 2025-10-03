import express from 'express'
import { getGenres, getProducts, getSearchSuggestions, trackSearch, trackProductClick } from '../../controllers/productsController.js'
import { authenticateToken as requireAuth } from '../../utils/jwt.js'

export const productsRouter = express.Router()

// Product catalog endpoints
productsRouter.get('/', getProducts)
productsRouter.get('/genres', getGenres)

// Search functionality
productsRouter.get('/search/suggestions', getSearchSuggestions)

// Analytics tracking (optional auth for better tracking)
productsRouter.post('/analytics/search', trackSearch)
productsRouter.post('/analytics/click', trackProductClick)

// Future product management endpoints (admin only)
// productsRouter.post('/', requireAuth, requireAdmin, createProduct)
// productsRouter.put('/:id', requireAuth, requireAdmin, updateProduct)
// productsRouter.delete('/:id', requireAuth, requireAdmin, deleteProduct)
// productsRouter.get('/:id', getProductById)