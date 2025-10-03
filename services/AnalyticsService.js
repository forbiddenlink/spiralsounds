import { getDBConnection } from '../db/db.js'
import { getSocketManager } from '../websocket/socketManager.js'
import { logger } from '../middleware/errorHandler.js'

export class AnalyticsService {
  static async getDashboardData() {
    const db = await getDBConnection()
    
    try {
      const [
        salesOverview,
        topProducts,
        genreAnalytics,
        userBehavior,
        revenueData,
        inventoryStatus,
        recentActivity
      ] = await Promise.all([
        this.getSalesOverview(db),
        this.getTopProducts(db),
        this.getGenreAnalytics(db),
        this.getUserBehavior(db),
        this.getRevenueData(db),
        this.getInventoryStatus(db),
        this.getRecentActivity(db)
      ])

      return {
        salesOverview,
        topProducts,
        genreAnalytics,
        userBehavior,
        revenueData,
        inventoryStatus,
        recentActivity,
        lastUpdated: new Date().toISOString()
      }
    } finally {
      await db.close()
    }
  }

  static async getSalesOverview(db) {
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [current, previous, todayStats] = await Promise.all([
      db.get(`
        SELECT 
          COUNT(DISTINCT ci.user_id) as total_customers,
          COUNT(ci.id) as total_orders,
          SUM(ci.quantity * p.price) as total_revenue,
          AVG(ci.quantity * p.price) as avg_order_value,
          SUM(ci.quantity) as total_items_sold
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE DATE(ci.created_at) BETWEEN ? AND ?
      `, [thirtyDaysAgo, today]),
      
      db.get(`
        SELECT 
          COUNT(DISTINCT ci.user_id) as total_customers,
          COUNT(ci.id) as total_orders,
          SUM(ci.quantity * p.price) as total_revenue,
          AVG(ci.quantity * p.price) as avg_order_value,
          SUM(ci.quantity) as total_items_sold
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE DATE(ci.created_at) BETWEEN ? AND ?
      `, [new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], thirtyDaysAgo]),
      
      db.get(`
        SELECT 
          COUNT(DISTINCT ci.user_id) as today_customers,
          COUNT(ci.id) as today_orders,
          SUM(ci.quantity * p.price) as today_revenue
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE DATE(ci.created_at) = ?
      `, [today])
    ])

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return 0
      return Math.round(((current - previous) / previous) * 100)
    }

    return {
      totalCustomers: current.total_customers || 0,
      totalOrders: current.total_orders || 0,
      totalRevenue: parseFloat(current.total_revenue || 0),
      avgOrderValue: parseFloat(current.avg_order_value || 0),
      totalItemsSold: current.total_items_sold || 0,
      todayCustomers: todayStats.today_customers || 0,
      todayOrders: todayStats.today_orders || 0,
      todayRevenue: parseFloat(todayStats.today_revenue || 0),
      changes: {
        customers: calculateChange(current.total_customers, previous.total_customers),
        orders: calculateChange(current.total_orders, previous.total_orders),
        revenue: calculateChange(current.total_revenue, previous.total_revenue),
        avgOrderValue: calculateChange(current.avg_order_value, previous.avg_order_value)
      }
    }
  }

  static async getTopProducts(db) {
    const results = await db.all(`
      SELECT 
        p.id,
        p.title,
        p.artist,
        p.price,
        p.image,
        p.genre,
        p.stock,
        COALESCE(SUM(ci.quantity), 0) as units_sold,
        COALESCE(SUM(ci.quantity * p.price), 0) as revenue,
        COUNT(DISTINCT ci.user_id) as unique_buyers,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM products p
      LEFT JOIN cart_items ci ON p.id = ci.product_id AND ci.created_at >= date('now', '-30 days')
      LEFT JOIN reviews r ON p.id = r.product_id
      GROUP BY p.id
      ORDER BY units_sold DESC, revenue DESC
      LIMIT 10
    `)

    return results.map(product => ({
      ...product,
      price: parseFloat(product.price),
      revenue: parseFloat(product.revenue),
      avg_rating: parseFloat(product.avg_rating),
      performance_score: this.calculateProductPerformanceScore(product)
    }))
  }

  static calculateProductPerformanceScore(product) {
    const salesWeight = 0.4
    const revenueWeight = 0.3
    const ratingWeight = 0.2
    const reviewWeight = 0.1

    const salesScore = Math.min(product.units_sold / 10, 10) // Normalize to 0-10
    const revenueScore = Math.min(product.revenue / 1000, 10) // Normalize to 0-10
    const ratingScore = product.avg_rating || 0
    const reviewScore = Math.min(product.review_count / 5, 10) // Normalize to 0-10

    return Math.round(
      (salesScore * salesWeight + 
       revenueScore * revenueWeight + 
       ratingScore * ratingWeight + 
       reviewScore * reviewWeight) * 10
    ) / 10
  }

  static async getGenreAnalytics(db) {
    const results = await db.all(`
      SELECT 
        p.genre,
        COUNT(p.id) as product_count,
        AVG(p.price) as avg_price,
        MIN(p.price) as min_price,
        MAX(p.price) as max_price,
        COALESCE(SUM(ci.quantity), 0) as total_sold,
        COALESCE(SUM(ci.quantity * p.price), 0) as genre_revenue,
        COUNT(DISTINCT ci.user_id) as unique_customers,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM products p
      LEFT JOIN cart_items ci ON p.id = ci.product_id
      LEFT JOIN reviews r ON p.id = r.product_id
      GROUP BY p.genre
      ORDER BY genre_revenue DESC
    `)

    const totalRevenue = results.reduce((sum, genre) => sum + parseFloat(genre.genre_revenue || 0), 0)

    // Get genre trends for each genre
    const genreDataWithTrends = await Promise.all(
      results.map(async (genre) => ({
        ...genre,
        avg_price: parseFloat(genre.avg_price),
        min_price: parseFloat(genre.min_price),
        max_price: parseFloat(genre.max_price),
        genre_revenue: parseFloat(genre.genre_revenue),
        avg_rating: parseFloat(genre.avg_rating),
        market_share: totalRevenue > 0 ? Math.round((parseFloat(genre.genre_revenue) / totalRevenue) * 100) : 0,
        popularity_trend: await this.getGenreTrend(db, genre.genre)
      }))
    )

    return genreDataWithTrends
  }

  static async getGenreTrend(db, genre) {
    const result = await db.get(`
      SELECT 
        COUNT(ci.id) as recent_sales,
        COUNT(ci2.id) as previous_sales
      FROM products p
      LEFT JOIN cart_items ci ON p.id = ci.product_id AND ci.created_at >= date('now', '-7 days')
      LEFT JOIN cart_items ci2 ON p.id = ci2.product_id AND ci2.created_at BETWEEN date('now', '-14 days') AND date('now', '-7 days')
      WHERE p.genre = ?
    `, [genre])

    if (result.previous_sales === 0) return 0
    return Math.round(((result.recent_sales - result.previous_sales) / result.previous_sales) * 100)
  }

  static async getUserBehavior(db) {
    const [newUsers, activeUsers, retentionRate, userEngagement] = await Promise.all([
      db.get(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE DATE(created_at) >= date('now', '-7 days')
      `),
      db.get(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM cart_items
        WHERE DATE(created_at) >= date('now', '-7 days')
      `),
      db.get(`
        SELECT 
          ROUND(
            (COUNT(DISTINCT returning.user_id) * 100.0) / NULLIF(COUNT(DISTINCT all_users.user_id), 0), 2
          ) as rate
        FROM (
          SELECT DISTINCT user_id FROM cart_items 
          WHERE DATE(created_at) >= date('now', '-30 days')
        ) all_users
        LEFT JOIN (
          SELECT DISTINCT user_id FROM cart_items 
          WHERE DATE(created_at) >= date('now', '-7 days')
        ) returning ON all_users.user_id = returning.user_id
      `),
      db.all(`
        SELECT 
          u.id,
          u.username,
          COUNT(ci.id) as order_count,
          SUM(ci.quantity * p.price) as total_spent,
          MAX(ci.created_at) as last_order,
          COUNT(DISTINCT DATE(ci.created_at)) as active_days
        FROM users u
        LEFT JOIN cart_items ci ON u.id = ci.user_id
        LEFT JOIN products p ON ci.product_id = p.id
        WHERE u.created_at >= date('now', '-30 days')
        GROUP BY u.id
        ORDER BY total_spent DESC
        LIMIT 5
      `)
    ])

    return {
      newUsersThisWeek: newUsers.count,
      activeUsersThisWeek: activeUsers.count,
      retentionRate: retentionRate.rate || 0,
      topCustomers: userEngagement.map(user => ({
        ...user,
        total_spent: parseFloat(user.total_spent || 0),
        customer_lifetime_value: parseFloat(user.total_spent || 0),
        engagement_score: this.calculateEngagementScore(user)
      }))
    }
  }

  static calculateEngagementScore(user) {
    const orderWeight = 0.4
    const spendWeight = 0.4
    const frequencyWeight = 0.2

    const orderScore = Math.min(user.order_count / 5, 10)
    const spendScore = Math.min(parseFloat(user.total_spent || 0) / 500, 10)
    const frequencyScore = Math.min(user.active_days / 15, 10)

    return Math.round(
      (orderScore * orderWeight + 
       spendScore * spendWeight + 
       frequencyScore * frequencyWeight) * 10
    ) / 10
  }

  static async getRevenueData(db) {
    const results = await db.all(`
      SELECT 
        DATE(ci.created_at) as date,
        SUM(ci.quantity * p.price) as revenue,
        COUNT(ci.id) as orders,
        COUNT(DISTINCT ci.user_id) as customers,
        SUM(ci.quantity) as items_sold,
        AVG(ci.quantity * p.price) as avg_order_value
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE DATE(ci.created_at) >= date('now', '-30 days')
      GROUP BY DATE(ci.created_at)
      ORDER BY date DESC
    `)

    return results.map(row => ({
      ...row,
      revenue: parseFloat(row.revenue),
      avg_order_value: parseFloat(row.avg_order_value),
      date: row.date
    }))
  }

  static async getInventoryStatus(db) {
    const results = await db.all(`
      SELECT 
        p.id,
        p.title,
        p.artist,
        p.genre,
        p.price,
        p.stock,
        COALESCE(SUM(ci.quantity), 0) as sold_count,
        COALESCE(MAX(ci.created_at), 'Never') as last_sold,
        CASE 
          WHEN p.stock <= 0 THEN 'out_of_stock'
          WHEN p.stock <= 5 THEN 'critical'
          WHEN p.stock <= 15 THEN 'low'
          WHEN p.stock <= 50 THEN 'medium'
          ELSE 'high'
        END as stock_level,
        CASE
          WHEN COALESCE(SUM(ci.quantity), 0) = 0 THEN 'no_sales'
          WHEN MAX(ci.created_at) < date('now', '-30 days') THEN 'slow_moving'
          WHEN MAX(ci.created_at) >= date('now', '-7 days') THEN 'fast_moving'
          ELSE 'normal'
        END as movement_status
      FROM products p
      LEFT JOIN cart_items ci ON p.id = ci.product_id
      GROUP BY p.id
      ORDER BY 
        CASE p.stock 
          WHEN 0 THEN 0
          ELSE 1 
        END,
        p.stock ASC,
        sold_count DESC
      LIMIT 50
    `)

    const stockSummary = await db.get(`
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN stock > 5 AND stock <= 15 THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN stock > 15 THEN 1 ELSE 0 END) as adequate,
        AVG(stock) as avg_stock
      FROM products
    `)

    return {
      products: results.map(product => ({
        ...product,
        price: parseFloat(product.price),
        turnover_rate: product.sold_count > 0 ? Math.round((product.sold_count / (product.stock + product.sold_count)) * 100) : 0,
        reorder_recommended: product.stock <= 10 && product.sold_count > 0
      })),
      summary: {
        ...stockSummary,
        avg_stock: parseFloat(stockSummary.avg_stock),
        stock_health_score: this.calculateStockHealthScore(stockSummary)
      }
    }
  }

  static calculateStockHealthScore(stockSummary) {
    const totalProducts = stockSummary.total_products
    if (totalProducts === 0) return 0

    const outOfStockPenalty = (stockSummary.out_of_stock / totalProducts) * 40
    const criticalPenalty = (stockSummary.critical / totalProducts) * 20
    const lowPenalty = (stockSummary.low / totalProducts) * 10

    return Math.max(0, Math.round(100 - outOfStockPenalty - criticalPenalty - lowPenalty))
  }

  static async getRecentActivity(db) {
    const [recentOrders, recentUsers, recentReviews] = await Promise.all([
      db.all(`
        SELECT 
          ci.id,
          ci.created_at,
          ci.quantity,
          ci.quantity * p.price as total,
          p.title as product_title,
          p.artist,
          u.username
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        JOIN users u ON ci.user_id = u.id
        ORDER BY ci.created_at DESC
        LIMIT 10
      `),
      db.all(`
        SELECT 
          id,
          username,
          email,
          created_at,
          is_verified
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `),
      db.all(`
        SELECT 
          r.id,
          r.rating,
          r.comment,
          r.created_at,
          p.title as product_title,
          u.username
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
        LIMIT 5
      `)
    ])

    return {
      recentOrders: recentOrders.map(order => ({
        ...order,
        total: parseFloat(order.total)
      })),
      recentUsers,
      recentReviews
    }
  }

  // Real-time metrics for WebSocket updates
  static async getRealtimeMetrics() {
    const db = await getDBConnection()
    
    try {
      // Check if created_at column exists in cart_items
      const tableInfo = await db.all("PRAGMA table_info(cart_items)")
      const hasCreatedAt = tableInfo.some(col => col.name === 'created_at')
      
      if (!hasCreatedAt) {
        // Return default values if timestamps don't exist yet
        return {
          activeUsers: 0,
          todayRevenue: 0,
          todayOrders: 0,
          onlineUsers: this.getOnlineUserCount(),
          timestamp: new Date().toISOString(),
          note: 'Analytics limited - database migration pending'
        }
      }

      const [activeUsers, todayRevenue, todayOrders, onlineUsers] = await Promise.all([
        db.get(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM cart_items
          WHERE datetime(created_at) >= datetime('now', '-1 hour')
        `),
        db.get(`
          SELECT COALESCE(SUM(ci.quantity * p.price), 0) as revenue
          FROM cart_items ci
          JOIN products p ON ci.product_id = p.id
          WHERE DATE(ci.created_at) = DATE('now')
        `),
        db.get(`
          SELECT COUNT(*) as count
          FROM cart_items
          WHERE DATE(created_at) = DATE('now')
        `),
        this.getOnlineUserCount()
      ])

      return {
        activeUsers: activeUsers.count,
        todayRevenue: parseFloat(todayRevenue.revenue),
        todayOrders: todayOrders.count,
        onlineUsers,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      // If there's any database error, return safe defaults
      logger.warn('Error in getRealtimeMetrics, returning defaults:', error.message)
      return {
        activeUsers: 0,
        todayRevenue: 0,
        todayOrders: 0,
        onlineUsers: this.getOnlineUserCount(),
        timestamp: new Date().toISOString(),
        error: 'Database error - check logs'
      }
    } finally {
      await db.close()
    }
  }

  static getOnlineUserCount() {
    const socketManager = getSocketManager()
    if (!socketManager) return 0
    
    const stats = socketManager.getConnectionStats()
    return stats.authenticatedUsers
  }

  // Automated analytics updates
  static async startRealtimeAnalytics(intervalMs = 30000) {
    const updateAnalytics = async () => {
      try {
        const metrics = await this.getRealtimeMetrics()
        const socketManager = getSocketManager()
        
        if (socketManager) {
          socketManager.broadcastAnalyticsUpdate(metrics)
        }
      } catch (error) {
        logger.error('Error updating realtime analytics:', error)
      }
    }

    // Initial update
    await updateAnalytics()
    
    // Set up interval
    return setInterval(updateAnalytics, intervalMs)
  }

  // Product performance tracking
  static async trackProductView(productId, userId = null) {
    // This would be expanded to track detailed analytics
    const socketManager = getSocketManager()
    if (socketManager) {
      socketManager.broadcastUserActivity(userId, {
        type: 'PRODUCT_VIEW',
        productId,
        timestamp: new Date().toISOString()
      })
    }
  }

  static async trackPurchase(userId, items, totalAmount) {
    const socketManager = getSocketManager()
    if (socketManager) {
      // Notify real-time dashboard
      socketManager.broadcastAnalyticsUpdate({
        type: 'PURCHASE_COMPLETED',
        userId,
        itemCount: items.length,
        totalAmount: parseFloat(totalAmount),
        timestamp: new Date().toISOString()
      })

      // Send personalized notifications
      socketManager.sendNotification(userId, {
        type: 'SUCCESS',
        title: 'Purchase Confirmed!',
        message: `Your order of ${items.length} items has been confirmed.`,
        action: {
          label: 'View Order',
          url: '/orders'
        }
      })
    }
  }
}

export default AnalyticsService