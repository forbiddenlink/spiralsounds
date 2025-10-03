import { getDBConnection } from '../db/db.js'

export async function getGenres(req, res) {

  try {

    const db = await getDBConnection()

    const genreRows = await db.all('SELECT DISTINCT genre FROM products')
    const genres = genreRows.map(row => row.genre)
    res.json({
      success: true,
      data: genres
    })

  } catch (err) {

    res.status(500).json({error: 'Failed to fetch genres', details: err.message})

  }
}

export async function getProducts(req, res) {
  try {
    const db = await getDBConnection()
    
    const {
      search = '',
      genre,
      minPrice,
      maxPrice,
      sortBy = 'title',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = req.query

    // Build the WHERE clause
    const conditions = []
    const params = []

    // Full-text search across multiple fields
    if (search.trim()) {
      conditions.push('(title LIKE ? OR artist LIKE ? OR genre LIKE ? OR description LIKE ?)')
      const searchPattern = `%${search.trim()}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    // Genre filter
    if (genre && genre !== 'all') {
      conditions.push('genre = ?')
      params.push(genre)
    }

    // Price range filters
    if (minPrice && !isNaN(parseFloat(minPrice))) {
      conditions.push('price >= ?')
      params.push(parseFloat(minPrice))
    }

    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
      conditions.push('price <= ?')
      params.push(parseFloat(maxPrice))
    }

    // Build the complete query
    let query = 'SELECT * FROM products'
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    // Add sorting
    const validSortFields = ['title', 'artist', 'price', 'genre', 'id']
    const validSortOrders = ['asc', 'desc']
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`
    } else {
      query += ' ORDER BY title ASC'
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit)
    query += ' LIMIT ? OFFSET ?'
    params.push(parseInt(limit), offset)

    // Get products
    const products = await db.all(query, params)

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM products'
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`
    }
    
    // Remove LIMIT/OFFSET params for count query
    const countParams = params.slice(0, -2)
    const { total } = await db.get(countQuery, countParams)

    // Get price range for the current filtered results
    let priceRangeQuery = 'SELECT MIN(price) as minPrice, MAX(price) as maxPrice FROM products'
    if (conditions.length > 0) {
      priceRangeQuery += ` WHERE ${conditions.join(' AND ')}`
    }
    const priceRange = await db.get(priceRangeQuery, countParams)

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          priceRange: {
            min: priceRange.minPrice || 0,
            max: priceRange.maxPrice || 0
          }
        }
      }
    })

  } catch (err) {
    res.status(500).json({error: 'Failed to fetch products', details: err.message})
  }
}

// New endpoint for search suggestions/autocomplete
export async function getSearchSuggestions(req, res) {
  try {
    const db = await getDBConnection()
    const { q = '' } = req.query

    if (q.trim().length < 2) {
      return res.json({ suggestions: [] })
    }

    const searchPattern = `%${q.trim()}%`
    
    // Get suggestions from titles, artists, and genres
    const suggestions = await db.all(`
      SELECT DISTINCT 
        title as text, 'title' as type FROM products WHERE title LIKE ? 
      UNION 
      SELECT DISTINCT 
        artist as text, 'artist' as type FROM products WHERE artist LIKE ?
      UNION
      SELECT DISTINCT 
        genre as text, 'genre' as type FROM products WHERE genre LIKE ?
      LIMIT 10
    `, [searchPattern, searchPattern, searchPattern])

    res.json({ suggestions })
  } catch (err) {
    res.status(500).json({error: 'Failed to fetch search suggestions', details: err.message})
  }
}

// Track search analytics
export async function trackSearch(req, res) {
  try {
    const db = await getDBConnection()
    const {
      searchQuery,
      filters,
      resultsCount,
      sessionId
    } = req.body

    const userId = req.session?.userId || null
    const filtersJson = JSON.stringify(filters || {})

    await db.run(`
      INSERT INTO search_analytics (
        user_id, search_query, filters_applied, 
        results_count, session_id
      ) VALUES (?, ?, ?, ?, ?)
    `, [userId, searchQuery, filtersJson, resultsCount, sessionId])

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({error: 'Failed to track search', details: err.message})
  }
}

// Track product click from search results
export async function trackProductClick(req, res) {
  try {
    const db = await getDBConnection()
    const { productId, searchQuery, sessionId } = req.body
    const userId = req.session?.userId || null

    // Find the most recent search entry to update
    const searchEntry = await db.get(`
      SELECT id FROM search_analytics 
      WHERE search_query = ? AND session_id = ? 
      ORDER BY search_timestamp DESC 
      LIMIT 1
    `, [searchQuery, sessionId])

    if (searchEntry) {
      await db.run(`
        UPDATE search_analytics 
        SET clicked_product_id = ? 
        WHERE id = ?
      `, [productId, searchEntry.id])
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({error: 'Failed to track product click', details: err.message})
  }
}