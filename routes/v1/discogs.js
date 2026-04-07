/**
 * Discogs API Routes
 * /api/v1/discogs/*
 */

import express from 'express'
import {
  searchReleases,
  getRelease,
  getMasterRelease,
  getMasterVersions,
  getArtist,
  getArtistReleases,
  searchArtists,
  getLabel,
  getMarketplaceListings,
  getPriceSuggestions,
  getGradingSystem,
  importRelease
} from '../../controllers/discogsController.js'

export const discogsRouter = express.Router()

/**
 * @route GET /api/v1/discogs/search
 * @desc Search for vinyl releases on Discogs
 * @query q - Search query
 * @query artist - Filter by artist
 * @query title - Filter by release title
 * @query format - Format (default: Vinyl)
 * @query genre - Genre filter
 * @query year - Release year
 * @query country - Country of release
 * @query label - Record label
 * @query barcode - Barcode search
 * @query catno - Catalog number
 * @query page - Page number (default: 1)
 * @query per_page - Results per page (default: 25)
 * @access Public
 */
discogsRouter.get('/search', searchReleases)

/**
 * @route GET /api/v1/discogs/releases/:id
 * @desc Get detailed information about a release
 * @param id - Discogs release ID
 * @access Public
 */
discogsRouter.get('/releases/:id', getRelease)

/**
 * @route GET /api/v1/discogs/releases/:id/listings
 * @desc Get marketplace listings for a release
 * @param id - Discogs release ID
 * @query condition - Filter by condition (M, NM, VG+, VG, G+, G, F, P)
 * @query sort - Sort field
 * @query sort_order - asc or desc
 * @query page - Page number
 * @query per_page - Results per page
 * @access Public
 */
discogsRouter.get('/releases/:id/listings', getMarketplaceListings)

/**
 * @route GET /api/v1/discogs/releases/:id/prices
 * @desc Get price suggestions by condition for a release
 * @param id - Discogs release ID
 * @access Public
 */
discogsRouter.get('/releases/:id/prices', getPriceSuggestions)

/**
 * @route POST /api/v1/discogs/releases/:id/import
 * @desc Import release data for creating a local product
 * @param id - Discogs release ID
 * @body Additional product data (price, stock, etc.)
 * @access Public
 */
discogsRouter.post('/releases/:id/import', importRelease)

/**
 * @route GET /api/v1/discogs/masters/:id
 * @desc Get master release information
 * @param id - Discogs master ID
 * @access Public
 */
discogsRouter.get('/masters/:id', getMasterRelease)

/**
 * @route GET /api/v1/discogs/masters/:id/versions
 * @desc Get all versions of a master release
 * @param id - Discogs master ID
 * @query page - Page number
 * @query per_page - Results per page
 * @access Public
 */
discogsRouter.get('/masters/:id/versions', getMasterVersions)

/**
 * @route GET /api/v1/discogs/artists/search
 * @desc Search for artists
 * @query q - Search query
 * @query page - Page number
 * @query per_page - Results per page
 * @access Public
 */
discogsRouter.get('/artists/search', searchArtists)

/**
 * @route GET /api/v1/discogs/artists/:id
 * @desc Get artist information
 * @param id - Discogs artist ID
 * @access Public
 */
discogsRouter.get('/artists/:id', getArtist)

/**
 * @route GET /api/v1/discogs/artists/:id/releases
 * @desc Get artist's releases
 * @param id - Discogs artist ID
 * @query page - Page number
 * @query per_page - Results per page
 * @query sort - Sort field (year, title)
 * @query sort_order - asc or desc
 * @access Public
 */
discogsRouter.get('/artists/:id/releases', getArtistReleases)

/**
 * @route GET /api/v1/discogs/labels/:id
 * @desc Get label information
 * @param id - Discogs label ID
 * @access Public
 */
discogsRouter.get('/labels/:id', getLabel)

/**
 * @route GET /api/v1/discogs/grading
 * @desc Get grading system reference (Goldmine standard)
 * @access Public
 */
discogsRouter.get('/grading', getGradingSystem)
