import { BaseRepository } from './BaseRepository.js'
import { NotFoundError } from '../utils/errors.js'

export class ProductRepository extends BaseRepository {
  constructor() {
    super('products')
  }

  /**
   * Get products with search and filtering
   */
  async getProducts(filters = {}) {
    const { search, genre, sort = 'title', order = 'ASC', limit, offset = 0 } = filters
    
    let query = 'SELECT * FROM products WHERE 1=1'
    const params = []

    // Search filter
    if (search) {
      query += ' AND (title LIKE ? OR artist LIKE ? OR album LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    // Genre filter
    if (genre && genre !== 'all') {
      query += ' AND genre = ?'
      params.push(genre)
    }

    // Sorting
    const validSortFields = ['title', 'artist', 'album', 'price', 'year', 'created_at']
    const validOrders = ['ASC', 'DESC']
    
    if (validSortFields.includes(sort) && validOrders.includes(order.toUpperCase())) {
      query += ` ORDER BY ${sort} ${order.toUpperCase()}`
    }

    // Pagination
    if (limit) {
      query += ' LIMIT ? OFFSET ?'
      params.push(limit, offset)
    }

    return await this.executeQuery(query, params)
  }

  /**
   * Get product count with filters
   */
  async getProductCount(filters = {}) {
    const { search, genre } = filters
    
    let query = 'SELECT COUNT(*) as count FROM products WHERE 1=1'
    const params = []

    if (search) {
      query += ' AND (title LIKE ? OR artist LIKE ? OR album LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    if (genre && genre !== 'all') {
      query += ' AND genre = ?'
      params.push(genre)
    }

    const result = await this.executeGetQuery(query, params)
    return result.count
  }

  /**
   * Get all unique genres
   */
  async getGenres() {
    const query = 'SELECT DISTINCT genre FROM products ORDER BY genre'
    const results = await this.executeQuery(query)
    return results.map(row => row.genre).filter(Boolean)
  }

  /**
   * Get search suggestions based on title, artist, album
   */
  async getSearchSuggestions(searchTerm, limit = 10) {
    const query = `
      SELECT DISTINCT 
        title, artist, album
      FROM products 
      WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
      LIMIT ?
    `
    const searchPattern = `%${searchTerm}%`
    return await this.executeQuery(query, [searchPattern, searchPattern, searchPattern, limit])
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 8) {
    const query = `
      SELECT * FROM products 
      WHERE featured = 1 
      ORDER BY created_at DESC 
      LIMIT ?
    `
    return await this.executeQuery(query, [limit])
  }

  /**
   * Get products by genre
   */
  async getProductsByGenre(genre, limit = null, offset = 0) {
    let query = 'SELECT * FROM products WHERE genre = ? ORDER BY title'
    const params = [genre]

    if (limit) {
      query += ' LIMIT ? OFFSET ?'
      params.push(limit, offset)
    }

    return await this.executeQuery(query, params)
  }

  /**
   * Get recently added products
   */
  async getRecentProducts(limit = 10) {
    const query = `
      SELECT * FROM products 
      ORDER BY created_at DESC 
      LIMIT ?
    `
    return await this.executeQuery(query, [limit])
  }

  /**
   * Get product with reviews (if reviews exist)
   */
  async getProductWithDetails(id) {
    const product = await this.findById(id)
    if (!product) {
      throw new NotFoundError('Product', id)
    }

    // Get average rating if reviews table exists
    try {
      const ratingQuery = `
        SELECT 
          AVG(rating) as averageRating,
          COUNT(*) as reviewCount
        FROM reviews 
        WHERE product_id = ?
      `
      const ratingData = await this.executeGetQuery(ratingQuery, [id])
      
      return {
        ...product,
        averageRating: ratingData?.averageRating || 0,
        reviewCount: ratingData?.reviewCount || 0
      }
    } catch (error) {
      // Reviews table might not exist, return product without rating
      return product
    }
  }

  /**
   * Update product stock/inventory
   */
  async updateStock(productId, quantity) {
    const product = await this.findById(productId)
    if (!product) {
      throw new NotFoundError('Product', productId)
    }

    const query = 'UPDATE products SET stock = ?, updated_at = ? WHERE id = ?'
    return await this.executeRunQuery(query, [quantity, new Date().toISOString(), productId])
  }

  /**
   * Check product availability
   */
  async checkAvailability(productId, requestedQuantity = 1) {
    const product = await this.findById(productId)
    if (!product) {
      throw new NotFoundError('Product', productId)
    }

    return {
      available: product.stock >= requestedQuantity,
      currentStock: product.stock,
      requestedQuantity
    }
  }

  /**
   * Get low stock products (admin function)
   */
  async getLowStockProducts(threshold = 5) {
    const query = 'SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC'
    return await this.executeQuery(query, [threshold])
  }

  /**
   * Increment product view count (analytics)
   */
  async incrementViewCount(productId) {
    const query = `
      UPDATE products 
      SET view_count = COALESCE(view_count, 0) + 1 
      WHERE id = ?
    `
    return await this.executeRunQuery(query, [productId])
  }

  /**
   * Get popular products based on views or sales
   */
  async getPopularProducts(limit = 10) {
    const query = `
      SELECT * FROM products 
      WHERE view_count > 0 OR sales_count > 0
      ORDER BY (COALESCE(view_count, 0) + COALESCE(sales_count, 0) * 10) DESC
      LIMIT ?
    `
    return await this.executeQuery(query, [limit])
  }
}