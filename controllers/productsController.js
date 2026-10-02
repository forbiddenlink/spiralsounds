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
// Product detail: the record, its rating summary, reviews, and same-genre picks
export async function getProductById(req, res) {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid product ID' })
  }

  const db = await getDBConnection()
  try {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [id])
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' })
    }

    const rating = await db.get(
      'SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS average FROM reviews WHERE product_id = ?',
      [id]
    )
    const reviews = await db.all(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at,
              COALESCE(u.display_name, u.name, u.username) AS author
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ?
       ORDER BY r.updated_at DESC`,
      [id]
    )
    const related = await db.all(
      `SELECT * FROM products WHERE id != ?
       ORDER BY (genre = ?) DESC, ABS(COALESCE(year, 0) - ?) ASC
       LIMIT 4`,
      [id, product.genre, product.year || 0]
    )

    res.json({
      success: true,
      data: {
        product,
        rating: { count: rating.count, average: rating.average || 0 },
        reviews,
        related
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product', details: err.message })
  } finally {
    await db.close()
  }
}

// Create or replace the signed-in user's review of a product
export async function upsertReview(req, res) {
  const productId = Number.parseInt(req.params.id, 10)
  const rating = Number(req.body.rating)
  const comment = typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 2000) : ''

  if (Number.isNaN(productId)) {
    return res.status(400).json({ success: false, error: 'Invalid product ID' })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be a whole number from 1 to 5' })
  }

  const db = await getDBConnection()
  try {
    const product = await db.get('SELECT id FROM products WHERE id = ?', [productId])
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' })
    }

    await db.run(
      `INSERT INTO reviews (user_id, product_id, rating, comment, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, product_id)
       DO UPDATE SET rating = excluded.rating, comment = excluded.comment, updated_at = CURRENT_TIMESTAMP`,
      [req.user.userId, productId, rating, comment]
    )

    res.status(201).json({ success: true, message: 'Review saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save review', details: err.message })
  } finally {
    await db.close()
  }
}
