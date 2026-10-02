import express from 'express'
import { listOrders, placeOrder } from '../../controllers/ordersController.js'
import { requireAuth } from '../../middleware/requireAuth.js'

export const ordersRouter = express.Router()

ordersRouter.use(requireAuth)
ordersRouter.get('/', listOrders)
ordersRouter.post('/', placeOrder)
