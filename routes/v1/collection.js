/**
 * Collection Routes
 * /api/v1/collection/*
 */

import express from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import {
  getCollection,
  getCollectionItem,
  addToCollection,
  updateCollectionItem,
  removeFromCollection,
  recordPlay,
  getFolders,
  createFolder,
  deleteFolder,
  getWantlist,
  addToWantlist,
  removeFromWantlist,
  getCollectionStats,
  recordValueSnapshot,
  getValueHistory
} from '../../controllers/collectionController.js'

export const collectionRouter = express.Router()

// All collection routes require authentication
collectionRouter.use(requireAuth)

// ========== Static Routes (must come before /:id) ==========

/**
 * @route GET /api/v1/collection
 * @desc Get user's vinyl collection
 * @query folder_id - Filter by folder
 * @query search - Search in title, artist, label
 * @query genre - Filter by genre
 * @query condition - Filter by media condition (M, NM, VG+, etc.)
 * @query sort_by - Sort field (title, artist, year, created_at, purchase_date, current_value, play_count)
 * @query sort_order - asc or desc
 * @query page - Page number
 * @query limit - Items per page
 * @access Private
 */
collectionRouter.get('/', getCollection)

/**
 * @route POST /api/v1/collection
 * @desc Add record to collection
 * @body title - Record title (required unless discogs_release_id provided)
 * @body artist - Artist name (required unless discogs_release_id provided)
 * @body discogs_release_id - Discogs release ID (will auto-fetch metadata)
 * @body year - Release year
 * @body format - Format (Vinyl, LP, etc.)
 * @body label - Record label
 * @body catalog_number - Catalog number
 * @body country - Country of release
 * @body genres - Genres (comma-separated)
 * @body styles - Styles (comma-separated)
 * @body cover_image - Cover image URL
 * @body notes - Personal notes
 * @body media_condition - Media condition code (M, NM, VG+, VG, G+, G, F, P)
 * @body sleeve_condition - Sleeve condition code
 * @body purchase_price - Purchase price
 * @body purchase_date - Purchase date (YYYY-MM-DD)
 * @body purchase_location - Where purchased
 * @body current_value - Current estimated value
 * @body folder_id - Folder ID (default: 1)
 * @body is_for_sale - Mark as for sale
 * @body asking_price - Asking price if for sale
 * @access Private
 */
collectionRouter.post('/', addToCollection)

/**
 * @route GET /api/v1/collection/stats
 * @desc Get collection statistics
 * @access Private
 */
collectionRouter.get('/stats', getCollectionStats)

/**
 * @route GET /api/v1/collection/value-history
 * @desc Get collection value history
 * @query days - Number of days to look back (default: 30)
 * @access Private
 */
collectionRouter.get('/value-history', getValueHistory)

/**
 * @route POST /api/v1/collection/value-snapshot
 * @desc Record current collection value snapshot
 * @access Private
 */
collectionRouter.post('/value-snapshot', recordValueSnapshot)

// ========== Folders (static routes) ==========

/**
 * @route GET /api/v1/collection/folders
 * @desc Get collection folders
 * @access Private
 */
collectionRouter.get('/folders', getFolders)

/**
 * @route POST /api/v1/collection/folders
 * @desc Create new folder
 * @body name - Folder name (required)
 * @body description - Folder description
 * @access Private
 */
collectionRouter.post('/folders', createFolder)

/**
 * @route DELETE /api/v1/collection/folders/:id
 * @desc Delete folder (items moved to default)
 * @param id - Folder ID
 * @access Private
 */
collectionRouter.delete('/folders/:id', deleteFolder)

// ========== Wantlist (static routes) ==========

/**
 * @route GET /api/v1/collection/wantlist
 * @desc Get user's wantlist
 * @query sort_by - Sort field (title, artist, year, priority, created_at)
 * @query sort_order - asc or desc
 * @query page - Page number
 * @query limit - Items per page
 * @access Private
 */
collectionRouter.get('/wantlist', getWantlist)

/**
 * @route POST /api/v1/collection/wantlist
 * @desc Add release to wantlist
 * @body title - Release title (required unless discogs_release_id provided)
 * @body artist - Artist name (required unless discogs_release_id provided)
 * @body discogs_release_id - Discogs release ID
 * @body year - Release year
 * @body format - Format
 * @body label - Record label
 * @body cover_image - Cover image URL
 * @body notes - Notes
 * @body priority - Priority 1-5 (1 = highest)
 * @body max_price - Maximum price willing to pay
 * @body desired_condition - Minimum acceptable condition
 * @access Private
 */
collectionRouter.post('/wantlist', addToWantlist)

/**
 * @route DELETE /api/v1/collection/wantlist/:id
 * @desc Remove from wantlist
 * @param id - Wantlist item ID
 * @access Private
 */
collectionRouter.delete('/wantlist/:id', removeFromWantlist)

// ========== Dynamic Routes (must come after static routes) ==========

/**
 * @route GET /api/v1/collection/:id
 * @desc Get single collection item
 * @param id - Collection item ID
 * @access Private
 */
collectionRouter.get('/:id', getCollectionItem)

/**
 * @route PUT /api/v1/collection/:id
 * @desc Update collection item
 * @param id - Collection item ID
 * @body Any editable fields from POST
 * @access Private
 */
collectionRouter.put('/:id', updateCollectionItem)

/**
 * @route DELETE /api/v1/collection/:id
 * @desc Remove record from collection
 * @param id - Collection item ID
 * @access Private
 */
collectionRouter.delete('/:id', removeFromCollection)

/**
 * @route POST /api/v1/collection/:id/play
 * @desc Record a play of this record
 * @param id - Collection item ID
 * @access Private
 */
collectionRouter.post('/:id/play', recordPlay)
