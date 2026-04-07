/**
 * Collection Controller
 * Handles user vinyl collection management endpoints
 */

import { getCollectionService } from '../services/CollectionService.js'
import { GRADES, SLEEVE_GRADES, GRADE_ORDER } from '../utils/grading.js'
import { logger } from '../middleware/errorHandler.js'

const collectionService = getCollectionService()

/**
 * Get user's collection
 */
export async function getCollection(req, res) {
  try {
    const userId = req.user.id

    const {
      folder_id,
      search,
      genre,
      condition,
      sort_by,
      sort_order,
      page,
      limit
    } = req.query

    const result = await collectionService.getCollection(userId, {
      folderId: folder_id !== undefined ? parseInt(folder_id) : undefined,
      search,
      genre,
      condition,
      sortBy: sort_by,
      sortOrder: sort_order,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 25
    })

    res.json({
      success: true,
      data: result
    })
  } catch (err) {
    logger.error('Get collection error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collection',
      details: err.message
    })
  }
}

/**
 * Get single collection item
 */
export async function getCollectionItem(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid item ID is required'
      })
    }

    const item = await collectionService.getCollectionItem(userId, parseInt(id))

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Collection item not found'
      })
    }

    res.json({
      success: true,
      data: item
    })
  } catch (err) {
    logger.error('Get collection item error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collection item',
      details: err.message
    })
  }
}

/**
 * Add item to collection
 */
export async function addToCollection(req, res) {
  try {
    const userId = req.user.id
    const data = req.body

    // Validate required fields
    if (!data.title || !data.artist) {
      // If discogs_release_id is provided, we can fetch the data
      if (!data.discogs_release_id) {
        return res.status(400).json({
          success: false,
          error: 'Title and artist are required, or provide discogs_release_id'
        })
      }
    }

    // Validate condition codes
    if (data.media_condition && !GRADES[data.media_condition]) {
      return res.status(400).json({
        success: false,
        error: `Invalid media condition. Valid codes: ${GRADE_ORDER.join(', ')}`
      })
    }

    if (data.sleeve_condition && !SLEEVE_GRADES[data.sleeve_condition]) {
      return res.status(400).json({
        success: false,
        error: `Invalid sleeve condition. Valid codes: ${Object.keys(SLEEVE_GRADES).join(', ')}`
      })
    }

    const item = await collectionService.addToCollection(userId, data)

    res.status(201).json({
      success: true,
      data: item,
      message: 'Record added to collection'
    })
  } catch (err) {
    logger.error('Add to collection error:', err)

    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        error: 'This release is already in your collection'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add to collection',
      details: err.message
    })
  }
}

/**
 * Update collection item
 */
export async function updateCollectionItem(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params
    const updates = req.body

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid item ID is required'
      })
    }

    // Validate condition codes if provided
    if (updates.media_condition && !GRADES[updates.media_condition]) {
      return res.status(400).json({
        success: false,
        error: `Invalid media condition. Valid codes: ${GRADE_ORDER.join(', ')}`
      })
    }

    if (updates.sleeve_condition && !SLEEVE_GRADES[updates.sleeve_condition]) {
      return res.status(400).json({
        success: false,
        error: `Invalid sleeve condition. Valid codes: ${Object.keys(SLEEVE_GRADES).join(', ')}`
      })
    }

    const success = await collectionService.updateCollectionItem(userId, parseInt(id), updates)

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Collection item not found or no changes made'
      })
    }

    // Fetch updated item
    const item = await collectionService.getCollectionItem(userId, parseInt(id))

    res.json({
      success: true,
      data: item,
      message: 'Collection item updated'
    })
  } catch (err) {
    logger.error('Update collection item error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to update collection item',
      details: err.message
    })
  }
}

/**
 * Remove item from collection
 */
export async function removeFromCollection(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid item ID is required'
      })
    }

    const success = await collectionService.removeFromCollection(userId, parseInt(id))

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Collection item not found'
      })
    }

    res.json({
      success: true,
      message: 'Record removed from collection'
    })
  } catch (err) {
    logger.error('Remove from collection error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to remove from collection',
      details: err.message
    })
  }
}

/**
 * Record a play
 */
export async function recordPlay(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid item ID is required'
      })
    }

    const success = await collectionService.recordPlay(userId, parseInt(id))

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Collection item not found'
      })
    }

    res.json({
      success: true,
      message: 'Play recorded'
    })
  } catch (err) {
    logger.error('Record play error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to record play',
      details: err.message
    })
  }
}

/**
 * Get collection folders
 */
export async function getFolders(req, res) {
  try {
    const userId = req.user.id

    const folders = await collectionService.getFolders(userId)

    res.json({
      success: true,
      data: folders
    })
  } catch (err) {
    logger.error('Get folders error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch folders',
      details: err.message
    })
  }
}

/**
 * Create folder
 */
export async function createFolder(req, res) {
  try {
    const userId = req.user.id
    const { name, description } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      })
    }

    const folder = await collectionService.createFolder(userId, name.trim(), description)

    res.status(201).json({
      success: true,
      data: folder,
      message: 'Folder created'
    })
  } catch (err) {
    logger.error('Create folder error:', err)

    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        error: 'A folder with this name already exists'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create folder',
      details: err.message
    })
  }
}

/**
 * Delete folder
 */
export async function deleteFolder(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid folder ID is required'
      })
    }

    if (parseInt(id) === 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the default folder'
      })
    }

    const success = await collectionService.deleteFolder(userId, parseInt(id))

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      })
    }

    res.json({
      success: true,
      message: 'Folder deleted. Items moved to default folder.'
    })
  } catch (err) {
    logger.error('Delete folder error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to delete folder',
      details: err.message
    })
  }
}

/**
 * Get wantlist
 */
export async function getWantlist(req, res) {
  try {
    const userId = req.user.id
    const { sort_by, sort_order, page, limit } = req.query

    const result = await collectionService.getWantlist(userId, {
      sortBy: sort_by,
      sortOrder: sort_order,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 25
    })

    res.json({
      success: true,
      data: result
    })
  } catch (err) {
    logger.error('Get wantlist error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wantlist',
      details: err.message
    })
  }
}

/**
 * Add to wantlist
 */
export async function addToWantlist(req, res) {
  try {
    const userId = req.user.id
    const data = req.body

    // Validate required fields
    if (!data.title || !data.artist) {
      if (!data.discogs_release_id) {
        return res.status(400).json({
          success: false,
          error: 'Title and artist are required, or provide discogs_release_id'
        })
      }
    }

    // Validate priority
    if (data.priority !== undefined && (data.priority < 1 || data.priority > 5)) {
      return res.status(400).json({
        success: false,
        error: 'Priority must be between 1 (highest) and 5 (lowest)'
      })
    }

    // Validate desired condition
    if (data.desired_condition && !GRADES[data.desired_condition]) {
      return res.status(400).json({
        success: false,
        error: `Invalid desired condition. Valid codes: ${GRADE_ORDER.join(', ')}`
      })
    }

    const item = await collectionService.addToWantlist(userId, data)

    res.status(201).json({
      success: true,
      data: item,
      message: 'Added to wantlist'
    })
  } catch (err) {
    logger.error('Add to wantlist error:', err)

    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        error: 'This release is already on your wantlist'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add to wantlist',
      details: err.message
    })
  }
}

/**
 * Remove from wantlist
 */
export async function removeFromWantlist(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid item ID is required'
      })
    }

    const success = await collectionService.removeFromWantlist(userId, parseInt(id))

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Wantlist item not found'
      })
    }

    res.json({
      success: true,
      message: 'Removed from wantlist'
    })
  } catch (err) {
    logger.error('Remove from wantlist error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to remove from wantlist',
      details: err.message
    })
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(req, res) {
  try {
    const userId = req.user.id

    const stats = await collectionService.getCollectionStats(userId)

    res.json({
      success: true,
      data: stats
    })
  } catch (err) {
    logger.error('Get collection stats error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collection statistics',
      details: err.message
    })
  }
}

/**
 * Record value snapshot
 */
export async function recordValueSnapshot(req, res) {
  try {
    const userId = req.user.id

    const snapshot = await collectionService.recordValueSnapshot(userId)

    res.json({
      success: true,
      data: snapshot,
      message: 'Value snapshot recorded'
    })
  } catch (err) {
    logger.error('Record value snapshot error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to record value snapshot',
      details: err.message
    })
  }
}

/**
 * Get value history
 */
export async function getValueHistory(req, res) {
  try {
    const userId = req.user.id
    const { days = 30 } = req.query

    const history = await collectionService.getValueHistory(userId, parseInt(days))

    res.json({
      success: true,
      data: history
    })
  } catch (err) {
    logger.error('Get value history error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch value history',
      details: err.message
    })
  }
}
