import { BaseRepository } from './BaseRepository.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'

export class CartRepository extends BaseRepository {
  constructor() {
    super('cart_items')
  }

  /**
   * Get user's cart items with product details
   */
  async getCartItems(userId) {
    const query = `
      SELECT 
        ci.*,
        p.title,
        p.artist,
        p.album,
        p.price,
        p.image_url,
        p.stock,
        (ci.quantity * p.price) as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `
    return await this.executeQuery(query, [userId])
  }

  /**
   * Get cart item count for user
   */
  async getCartCount(userId) {
    const query = 'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = ?'
    const result = await this.executeGetQuery(query, [userId])
    return result.count || 0
  }

  /**
   * Get cart total for user
   */
  async getCartTotal(userId) {
    const query = `
      SELECT 
        COALESCE(SUM(ci.quantity * p.price), 0) as total,
        COUNT(ci.id) as itemCount
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `
    const result = await this.executeGetQuery(query, [userId])
    return {
      total: result.total || 0,
      itemCount: result.itemCount || 0
    }
  }

  /**
   * Add item to cart or update quantity if exists
   */
  async addToCart(userId, productId, quantity = 1) {
    // Check if item already exists in cart
    const existingItem = await this.findOneWhere(
      'user_id = ? AND product_id = ?',
      [userId, productId]
    )

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity
      return await this.updateCartItemQuantity(existingItem.id, newQuantity)
    } else {
      // Add new item
      return await this.create({
        user_id: userId,
        product_id: productId,
        quantity,
        created_at: new Date().toISOString()
      })
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
      return await this.deleteById(cartItemId)
    }

    return await this.updateById(cartItemId, {
      quantity,
      updated_at: new Date().toISOString()
    })
  }

  /**
   * Remove specific item from cart
   */
  async removeFromCart(userId, cartItemId) {
    const item = await this.findOneWhere(
      'id = ? AND user_id = ?',
      [cartItemId, userId]
    )

    if (!item) {
      throw new NotFoundError('Cart item', cartItemId)
    }

    return await this.deleteById(cartItemId)
  }

  /**
   * Clear entire cart for user
   */
  async clearCart(userId) {
    const query = 'DELETE FROM cart_items WHERE user_id = ?'
    return await this.executeRunQuery(query, [userId])
  }

  /**
   * Get cart item by ID with user verification
   */
  async getCartItem(userId, cartItemId) {
    const query = `
      SELECT 
        ci.*,
        p.title,
        p.artist,
        p.price,
        p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = ? AND ci.user_id = ?
    `
    
    const item = await this.executeGetQuery(query, [cartItemId, userId])
    if (!item) {
      throw new NotFoundError('Cart item', cartItemId)
    }

    return item
  }

  /**
   * Validate cart items (check stock availability)
   */
  async validateCartItems(userId) {
    const cartItems = await this.getCartItems(userId)
    const validationErrors = []

    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        validationErrors.push({
          itemId: item.id,
          productId: item.product_id,
          productTitle: item.title,
          requested: item.quantity,
          available: item.stock,
          message: `Only ${item.stock} units available for ${item.title}`
        })
      }
    }

    if (validationErrors.length > 0) {
      throw new ValidationError('Some cart items are not available in requested quantity', validationErrors)
    }

    return cartItems
  }

  /**
   * Transfer cart items to order (for checkout)
   */
  async transferToOrder(userId, orderId) {
    // Get validated cart items
    const cartItems = await this.validateCartItems(userId)

    // Insert into order_items (assuming this table exists)
    const orderItemPromises = cartItems.map(item => {
      const orderItemQuery = `
        INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
      return this.executeRunQuery(orderItemQuery, [
        orderId,
        item.product_id,
        item.quantity,
        item.price,
        new Date().toISOString()
      ])
    })

    await Promise.all(orderItemPromises)

    // Clear the cart after successful transfer
    await this.clearCart(userId)

    return cartItems
  }

  /**
   * Get cart summary with totals
   */
  async getCartSummary(userId) {
    const items = await this.getCartItems(userId)
    const totals = await this.getCartTotal(userId)
    
    // Calculate tax (assuming 8.25% tax rate, configurable via env)
    const taxRate = parseFloat(process.env.TAX_RATE) || 0.0825
    const subtotal = totals.total
    const tax = subtotal * taxRate
    const total = subtotal + tax

    return {
      items,
      summary: {
        itemCount: totals.itemCount,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        taxRate,
        total: parseFloat(total.toFixed(2))
      }
    }
  }

  /**
   * Update cart item (quantity update with validation)
   */
  async updateCartItem(userId, cartItemId, updates) {
    const item = await this.getCartItem(userId, cartItemId)
    
    if (updates.quantity !== undefined) {
      // Validate quantity
      if (updates.quantity <= 0) {
        return await this.removeFromCart(userId, cartItemId)
      }
      
      if (updates.quantity > item.stock) {
        throw new ValidationError(`Only ${item.stock} units available for ${item.title}`)
      }
    }

    return await this.updateById(cartItemId, {
      ...updates,
      updated_at: new Date().toISOString()
    })
  }
}