import express from 'express'
import { getGenres, getProducts, getSearchSuggestions, trackSearch, trackProductClick } from '../controllers/productsController.js'

export const productsRouter = express.Router()

productsRouter.get('/genres', getGenres)
productsRouter.get('/search-suggestions', getSearchSuggestions)
productsRouter.post('/track-search', trackSearch)
productsRouter.post('/track-click', trackProductClick)
productsRouter.get('/', getProducts)