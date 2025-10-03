import express from 'express'
import { 
  addToCart, 
  getCartCount, 
  getAll, 
  deleteItem, 
  deleteAll 
} from '../../controllers/cartController.js'
import { requireAuth } from '../../middleware/requireAuth.js'

export const cartRouter = express.Router()

// All cart endpoints require authentication
cartRouter.use(requireAuth)

// Cart management endpoints
cartRouter.get('/', getAll)
cartRouter.post('/items', addToCart)
cartRouter.delete('/items/:itemId', deleteItem)
cartRouter.delete('/items', deleteAll)

// Cart summary endpoints
cartRouter.get('/count', getCartCount)

// Future cart endpoints
// cartRouter.put('/items/:itemId', updateCartItem) // Update quantity
// cartRouter.post('/checkout', checkoutCart) // Checkout process
// cartRouter.get('/summary', getCartSummary) // Total price, tax, etc.