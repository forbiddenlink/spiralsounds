import express from 'express'
import { getWishlist, addToWishlist, removeFromWishlist } from '../../controllers/wishlistController.js'
import { requireAuth } from '../../middleware/requireAuth.js'

export const wishlistRouter = express.Router()

wishlistRouter.use(requireAuth)

wishlistRouter.get('/', getWishlist)
wishlistRouter.post('/', addToWishlist)
wishlistRouter.delete('/:productId', removeFromWishlist)
