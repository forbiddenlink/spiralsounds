import express from 'express'
import { getCurrentUser } from '../../controllers/meController.js'
import { requireAuth } from '../../middleware/requireAuth.js'

export const meRouter = express.Router()

// All user profile endpoints require authentication
meRouter.use(requireAuth)

// User profile endpoints
meRouter.get('/', getCurrentUser)

// Future user management endpoints
// meRouter.put('/', updateUserProfile)
// meRouter.put('/password', changePassword)
// meRouter.delete('/', deleteAccount)
// meRouter.get('/activity', getUserActivity)
// meRouter.get('/orders', getUserOrders)