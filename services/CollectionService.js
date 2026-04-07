/**
 * Collection Service
 * Manages user vinyl collections with local database storage
 */

import { getDBConnection } from '../db/db.js'
import { getDiscogsService } from './DiscogsService.js'
import { GRADES, SLEEVE_GRADES, calculateGradedPrice } from '../utils/grading.js'
import { logger } from '../middleware/errorHandler.js'

export class CollectionService {
  constructor() {
    this.discogs = getDiscogsService()
  }

  /**
   * Initialize collection tables
   */
  async initializeTables() {
    const db = await getDBConnection()

    try {
      // User collection items table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS collection_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          discogs_release_id INTEGER,
          product_id INTEGER,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          year INTEGER,
          format TEXT,
          label TEXT,
          catalog_number TEXT,
          country TEXT,
          genres TEXT,
          styles TEXT,
          cover_image TEXT,
          notes TEXT,
          media_condition TEXT DEFAULT 'VG+',
          sleeve_condition TEXT DEFAULT 'VG+',
          purchase_price DECIMAL(10,2),
          purchase_date DATE,
          purchase_location TEXT,
          current_value DECIMAL(10,2),
          folder_id INTEGER DEFAULT 1,
          play_count INTEGER DEFAULT 0,
          last_played DATE,
          is_for_sale BOOLEAN DEFAULT FALSE,
          asking_price DECIMAL(10,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        )
      `)

      // Collection folders table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS collection_folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, name)
        )
      `)

      // Wantlist table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS wantlist_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          discogs_release_id INTEGER,
          discogs_master_id INTEGER,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          year INTEGER,
          format TEXT,
          label TEXT,
          cover_image TEXT,
          notes TEXT,
          priority INTEGER DEFAULT 3,
          max_price DECIMAL(10,2),
          desired_condition TEXT DEFAULT 'VG+',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, discogs_release_id)
        )
      `)

      // Collection value history for tracking
      await db.exec(`
        CREATE TABLE IF NOT EXISTS collection_value_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          total_items INTEGER NOT NULL,
          total_value DECIMAL(12,2) NOT NULL,
          recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)

      // Indexes for performance
      await db.exec('CREATE INDEX IF NOT EXISTS idx_collection_user_id ON collection_items(user_id)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_collection_folder ON collection_items(user_id, folder_id)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_collection_discogs ON collection_items(discogs_release_id)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_wantlist_user_id ON wantlist_items(user_id)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_wantlist_discogs ON wantlist_items(discogs_release_id)')

      logger.info('Collection tables initialized')
    } finally {
      await db.close()
    }
  }

  /**
   * Get user collection with filtering and pagination
   */
  async getCollection(userId, options = {}) {
    const db = await getDBConnection()

    try {
      const {
        folderId,
        search,
        genre,
        condition,
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 25
      } = options

      const conditions = ['user_id = ?']
      const params = [userId]

      if (folderId !== undefined) {
        conditions.push('folder_id = ?')
        params.push(folderId)
      }

      if (search) {
        conditions.push('(title LIKE ? OR artist LIKE ? OR label LIKE ?)')
        const searchPattern = `%${search}%`
        params.push(searchPattern, searchPattern, searchPattern)
      }

      if (genre) {
        conditions.push('genres LIKE ?')
        params.push(`%${genre}%`)
      }

      if (condition) {
        conditions.push('media_condition = ?')
        params.push(condition)
      }

      const validSortFields = ['title', 'artist', 'year', 'created_at', 'purchase_date', 'current_value', 'play_count']
      const validSortOrders = ['asc', 'desc']
      const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at'
      const order = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC'

      const offset = (parseInt(page) - 1) * parseInt(limit)

      const query = `
        SELECT * FROM collection_items
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderBy} ${order}
        LIMIT ? OFFSET ?
      `
      params.push(parseInt(limit), offset)

      const items = await db.all(query, params)

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM collection_items
        WHERE ${conditions.slice(0, -2).join(' AND ') || '1=1'}
      `
      const countParams = params.slice(0, -2)
      const { total } = await db.get(countQuery, countParams.length ? countParams : undefined)

      return {
        items: items.map(this.normalizeCollectionItem),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    } finally {
      await db.close()
    }
  }

  /**
   * Get single collection item
   */
  async getCollectionItem(userId, itemId) {
    const db = await getDBConnection()

    try {
      const item = await db.get(
        'SELECT * FROM collection_items WHERE id = ? AND user_id = ?',
        [itemId, userId]
      )

      if (!item) {
        return null
      }

      return this.normalizeCollectionItem(item)
    } finally {
      await db.close()
    }
  }

  /**
   * Add item to collection
   */
  async addToCollection(userId, data) {
    const db = await getDBConnection()

    try {
      // If discogs_release_id provided, fetch full details
      let releaseData = {}
      if (data.discogs_release_id) {
        try {
          const release = await this.discogs.getRelease(data.discogs_release_id)
          releaseData = {
            title: release.title,
            artist: release.artistsSort,
            year: release.year,
            format: release.formats?.[0]?.name,
            label: release.labels?.[0]?.name,
            catalog_number: release.labels?.[0]?.catno,
            country: release.country,
            genres: release.genres?.join(', '),
            styles: release.styles?.join(', '),
            cover_image: release.images?.[0]?.uri
          }
        } catch (err) {
          logger.warn('Failed to fetch Discogs release:', err.message)
        }
      }

      // Merge with provided data (provided data takes precedence)
      const itemData = { ...releaseData, ...data }

      // Calculate current value based on condition if not provided
      if (!itemData.current_value && itemData.purchase_price) {
        itemData.current_value = calculateGradedPrice(
          itemData.purchase_price,
          itemData.media_condition || 'VG+'
        )
      }

      const result = await db.run(`
        INSERT INTO collection_items (
          user_id, discogs_release_id, product_id, title, artist, year,
          format, label, catalog_number, country, genres, styles,
          cover_image, notes, media_condition, sleeve_condition,
          purchase_price, purchase_date, purchase_location, current_value,
          folder_id, is_for_sale, asking_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        itemData.discogs_release_id || null,
        itemData.product_id || null,
        itemData.title,
        itemData.artist,
        itemData.year || null,
        itemData.format || null,
        itemData.label || null,
        itemData.catalog_number || null,
        itemData.country || null,
        itemData.genres || null,
        itemData.styles || null,
        itemData.cover_image || null,
        itemData.notes || null,
        itemData.media_condition || 'VG+',
        itemData.sleeve_condition || 'VG+',
        itemData.purchase_price || null,
        itemData.purchase_date || null,
        itemData.purchase_location || null,
        itemData.current_value || null,
        itemData.folder_id || 1,
        itemData.is_for_sale || false,
        itemData.asking_price || null
      ])

      return {
        id: result.lastID,
        ...itemData
      }
    } finally {
      await db.close()
    }
  }

  /**
   * Update collection item
   */
  async updateCollectionItem(userId, itemId, updates) {
    const db = await getDBConnection()

    try {
      // Build dynamic update query
      const allowedFields = [
        'title', 'artist', 'year', 'format', 'label', 'catalog_number',
        'country', 'genres', 'styles', 'cover_image', 'notes',
        'media_condition', 'sleeve_condition', 'purchase_price',
        'purchase_date', 'purchase_location', 'current_value',
        'folder_id', 'is_for_sale', 'asking_price'
      ]

      const setClauses = []
      const params = []

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          setClauses.push(`${key} = ?`)
          params.push(value)
        }
      }

      if (setClauses.length === 0) {
        throw new Error('No valid fields to update')
      }

      setClauses.push('updated_at = CURRENT_TIMESTAMP')
      params.push(itemId, userId)

      const result = await db.run(`
        UPDATE collection_items
        SET ${setClauses.join(', ')}
        WHERE id = ? AND user_id = ?
      `, params)

      return result.changes > 0
    } finally {
      await db.close()
    }
  }

  /**
   * Remove item from collection
   */
  async removeFromCollection(userId, itemId) {
    const db = await getDBConnection()

    try {
      const result = await db.run(
        'DELETE FROM collection_items WHERE id = ? AND user_id = ?',
        [itemId, userId]
      )

      return result.changes > 0
    } finally {
      await db.close()
    }
  }

  /**
   * Record a play of a record
   */
  async recordPlay(userId, itemId) {
    const db = await getDBConnection()

    try {
      const result = await db.run(`
        UPDATE collection_items
        SET play_count = play_count + 1,
            last_played = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `, [itemId, userId])

      return result.changes > 0
    } finally {
      await db.close()
    }
  }

  /**
   * Get collection folders
   */
  async getFolders(userId) {
    const db = await getDBConnection()

    try {
      // Ensure default folder exists
      await db.run(`
        INSERT OR IGNORE INTO collection_folders (user_id, name, description, sort_order)
        VALUES (?, 'All', 'All records in collection', 0)
      `, [userId])

      const folders = await db.all(`
        SELECT f.*, COUNT(c.id) as item_count
        FROM collection_folders f
        LEFT JOIN collection_items c ON c.user_id = f.user_id AND c.folder_id = f.id
        WHERE f.user_id = ?
        GROUP BY f.id
        ORDER BY f.sort_order, f.name
      `, [userId])

      return folders
    } finally {
      await db.close()
    }
  }

  /**
   * Create folder
   */
  async createFolder(userId, name, description = null) {
    const db = await getDBConnection()

    try {
      const result = await db.run(`
        INSERT INTO collection_folders (user_id, name, description)
        VALUES (?, ?, ?)
      `, [userId, name, description])

      return {
        id: result.lastID,
        user_id: userId,
        name,
        description,
        item_count: 0
      }
    } finally {
      await db.close()
    }
  }

  /**
   * Delete folder (moves items to default folder)
   */
  async deleteFolder(userId, folderId) {
    const db = await getDBConnection()

    try {
      // Move items to default folder (id = 1)
      await db.run(`
        UPDATE collection_items SET folder_id = 1
        WHERE user_id = ? AND folder_id = ?
      `, [userId, folderId])

      const result = await db.run(
        'DELETE FROM collection_folders WHERE id = ? AND user_id = ? AND id != 1',
        [folderId, userId]
      )

      return result.changes > 0
    } finally {
      await db.close()
    }
  }

  /**
   * Get wantlist
   */
  async getWantlist(userId, options = {}) {
    const db = await getDBConnection()

    try {
      const { page = 1, limit = 25, sortBy = 'priority', sortOrder = 'asc' } = options

      const validSortFields = ['title', 'artist', 'year', 'priority', 'created_at']
      const orderBy = validSortFields.includes(sortBy) ? sortBy : 'priority'
      const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      const offset = (parseInt(page) - 1) * parseInt(limit)

      const items = await db.all(`
        SELECT * FROM wantlist_items
        WHERE user_id = ?
        ORDER BY ${orderBy} ${order}
        LIMIT ? OFFSET ?
      `, [userId, parseInt(limit), offset])

      const { total } = await db.get(
        'SELECT COUNT(*) as total FROM wantlist_items WHERE user_id = ?',
        [userId]
      )

      return {
        items: items.map(this.normalizeWantlistItem),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    } finally {
      await db.close()
    }
  }

  /**
   * Add to wantlist
   */
  async addToWantlist(userId, data) {
    const db = await getDBConnection()

    try {
      // Fetch Discogs data if available
      let releaseData = {}
      if (data.discogs_release_id) {
        try {
          const release = await this.discogs.getRelease(data.discogs_release_id)
          releaseData = {
            title: release.title,
            artist: release.artistsSort,
            year: release.year,
            format: release.formats?.[0]?.name,
            label: release.labels?.[0]?.name,
            cover_image: release.images?.[0]?.uri,
            discogs_master_id: release.masterId
          }
        } catch (err) {
          logger.warn('Failed to fetch Discogs release:', err.message)
        }
      }

      const itemData = { ...releaseData, ...data }

      const result = await db.run(`
        INSERT INTO wantlist_items (
          user_id, discogs_release_id, discogs_master_id, title, artist,
          year, format, label, cover_image, notes, priority, max_price,
          desired_condition
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        itemData.discogs_release_id || null,
        itemData.discogs_master_id || null,
        itemData.title,
        itemData.artist,
        itemData.year || null,
        itemData.format || null,
        itemData.label || null,
        itemData.cover_image || null,
        itemData.notes || null,
        itemData.priority || 3,
        itemData.max_price || null,
        itemData.desired_condition || 'VG+'
      ])

      return {
        id: result.lastID,
        ...itemData
      }
    } finally {
      await db.close()
    }
  }

  /**
   * Remove from wantlist
   */
  async removeFromWantlist(userId, itemId) {
    const db = await getDBConnection()

    try {
      const result = await db.run(
        'DELETE FROM wantlist_items WHERE id = ? AND user_id = ?',
        [itemId, userId]
      )

      return result.changes > 0
    } finally {
      await db.close()
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(userId) {
    const db = await getDBConnection()

    try {
      const stats = await db.get(`
        SELECT
          COUNT(*) as total_items,
          SUM(purchase_price) as total_spent,
          SUM(current_value) as total_value,
          SUM(play_count) as total_plays,
          AVG(purchase_price) as avg_purchase_price,
          COUNT(DISTINCT artist) as unique_artists,
          MIN(year) as oldest_year,
          MAX(year) as newest_year
        FROM collection_items
        WHERE user_id = ?
      `, [userId])

      // Genre distribution
      const genres = await db.all(`
        SELECT genres, COUNT(*) as count
        FROM collection_items
        WHERE user_id = ? AND genres IS NOT NULL AND genres != ''
        GROUP BY genres
        ORDER BY count DESC
        LIMIT 10
      `, [userId])

      // Condition distribution
      const conditions = await db.all(`
        SELECT media_condition as condition, COUNT(*) as count
        FROM collection_items
        WHERE user_id = ?
        GROUP BY media_condition
      `, [userId])

      // Most played
      const mostPlayed = await db.all(`
        SELECT id, title, artist, play_count, cover_image
        FROM collection_items
        WHERE user_id = ? AND play_count > 0
        ORDER BY play_count DESC
        LIMIT 5
      `, [userId])

      // Recent additions
      const recentAdditions = await db.all(`
        SELECT id, title, artist, created_at, cover_image
        FROM collection_items
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [userId])

      return {
        totals: {
          items: stats.total_items || 0,
          spent: stats.total_spent || 0,
          value: stats.total_value || 0,
          plays: stats.total_plays || 0,
          avgPurchasePrice: stats.avg_purchase_price || 0,
          uniqueArtists: stats.unique_artists || 0,
          yearRange: stats.oldest_year && stats.newest_year
            ? { oldest: stats.oldest_year, newest: stats.newest_year }
            : null
        },
        genres: genres.map(g => ({
          name: g.genres.split(',')[0].trim(),
          count: g.count
        })),
        conditions: conditions.map(c => ({
          condition: c.condition,
          label: GRADES[c.condition]?.label || c.condition,
          count: c.count
        })),
        mostPlayed,
        recentAdditions
      }
    } finally {
      await db.close()
    }
  }

  /**
   * Record collection value snapshot
   */
  async recordValueSnapshot(userId) {
    const db = await getDBConnection()

    try {
      const stats = await db.get(`
        SELECT COUNT(*) as total_items, SUM(current_value) as total_value
        FROM collection_items WHERE user_id = ?
      `, [userId])

      await db.run(`
        INSERT INTO collection_value_history (user_id, total_items, total_value)
        VALUES (?, ?, ?)
      `, [userId, stats.total_items, stats.total_value || 0])

      return {
        totalItems: stats.total_items,
        totalValue: stats.total_value || 0
      }
    } finally {
      await db.close()
    }
  }

  /**
   * Get value history
   */
  async getValueHistory(userId, days = 30) {
    const db = await getDBConnection()

    try {
      const history = await db.all(`
        SELECT total_items, total_value, recorded_at
        FROM collection_value_history
        WHERE user_id = ? AND recorded_at >= datetime('now', '-${days} days')
        ORDER BY recorded_at ASC
      `, [userId])

      return history
    } finally {
      await db.close()
    }
  }

  /**
   * Normalize collection item for API response
   */
  normalizeCollectionItem(item) {
    return {
      id: item.id,
      discogsReleaseId: item.discogs_release_id,
      productId: item.product_id,
      title: item.title,
      artist: item.artist,
      year: item.year,
      format: item.format,
      label: item.label,
      catalogNumber: item.catalog_number,
      country: item.country,
      genres: item.genres?.split(',').map(g => g.trim()).filter(Boolean) || [],
      styles: item.styles?.split(',').map(s => s.trim()).filter(Boolean) || [],
      coverImage: item.cover_image,
      notes: item.notes,
      mediaCondition: {
        code: item.media_condition,
        label: GRADES[item.media_condition]?.label || item.media_condition,
        description: GRADES[item.media_condition]?.description
      },
      sleeveCondition: {
        code: item.sleeve_condition,
        label: SLEEVE_GRADES[item.sleeve_condition]?.label || item.sleeve_condition,
        description: SLEEVE_GRADES[item.sleeve_condition]?.description
      },
      purchasePrice: item.purchase_price,
      purchaseDate: item.purchase_date,
      purchaseLocation: item.purchase_location,
      currentValue: item.current_value,
      folderId: item.folder_id,
      playCount: item.play_count,
      lastPlayed: item.last_played,
      isForSale: Boolean(item.is_for_sale),
      askingPrice: item.asking_price,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }
  }

  /**
   * Normalize wantlist item for API response
   */
  normalizeWantlistItem(item) {
    return {
      id: item.id,
      discogsReleaseId: item.discogs_release_id,
      discogsMasterId: item.discogs_master_id,
      title: item.title,
      artist: item.artist,
      year: item.year,
      format: item.format,
      label: item.label,
      coverImage: item.cover_image,
      notes: item.notes,
      priority: item.priority,
      maxPrice: item.max_price,
      desiredCondition: {
        code: item.desired_condition,
        label: GRADES[item.desired_condition]?.label || item.desired_condition
      },
      createdAt: item.created_at
    }
  }
}

// Singleton instance
let collectionService = null

export function getCollectionService() {
  if (!collectionService) {
    collectionService = new CollectionService()
  }
  return collectionService
}

export default CollectionService
