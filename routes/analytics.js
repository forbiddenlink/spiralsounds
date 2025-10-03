import express from 'express'
import AnalyticsService from '../services/AnalyticsService.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { logger } from '../middleware/errorHandler.js'

const analyticsRouter = express.Router()

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  // In a real app, you'd check user roles from the database
  // For now, we'll allow access if authenticated
  // You should implement proper role-based access control
  next()
}

// Get dashboard data
analyticsRouter.get('/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const dashboardData = await AnalyticsService.getDashboardData()
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching dashboard data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message
    })
  }
})

// Get real-time metrics
analyticsRouter.get('/realtime', requireAuth, requireAdmin, async (req, res) => {
  try {
    const realtimeMetrics = await AnalyticsService.getRealtimeMetrics()
    res.json({
      success: true,
      data: realtimeMetrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching realtime metrics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch realtime metrics',
      message: error.message
    })
  }
})

// Get sales overview
analyticsRouter.get('/sales', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getDBConnection } = await import('../db/db.js')
    const db = await getDBConnection()
    
    try {
      const salesData = await AnalyticsService.getSalesOverview(db)
      res.json({
        success: true,
        data: salesData,
        timestamp: new Date().toISOString()
      })
    } finally {
      await db.close()
    }
  } catch (error) {
    logger.error('Error fetching sales data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales data',
      message: error.message
    })
  }
})

// Get product analytics
analyticsRouter.get('/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = 20, offset = 0, sortBy = 'units_sold', sortOrder = 'DESC' } = req.query
    
    const { getDBConnection } = await import('../db/db.js')
    const db = await getDBConnection()
    
    try {
      const topProducts = await AnalyticsService.getTopProducts(db)
      res.json({
        success: true,
        data: topProducts,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: topProducts.length
        },
        timestamp: new Date().toISOString()
      })
    } finally {
      await db.close()
    }
  } catch (error) {
    logger.error('Error fetching product analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product analytics',
      message: error.message
    })
  }
})

// Get genre analytics
analyticsRouter.get('/genres', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getDBConnection } = await import('../db/db.js')
    const db = await getDBConnection()
    
    try {
      const genreData = await AnalyticsService.getGenreAnalytics(db)
      res.json({
        success: true,
        data: genreData,
        timestamp: new Date().toISOString()
      })
    } finally {
      await db.close()
    }
  } catch (error) {
    logger.error('Error fetching genre analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch genre analytics',
      message: error.message
    })
  }
})

// Get user behavior analytics
analyticsRouter.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getDBConnection } = await import('../db/db.js')
    const db = await getDBConnection()
    
    try {
      const userBehavior = await AnalyticsService.getUserBehavior(db)
      res.json({
        success: true,
        data: userBehavior,
        timestamp: new Date().toISOString()
      })
    } finally {
      await db.close()
    }
  } catch (error) {
    logger.error('Error fetching user behavior analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user behavior analytics',
      message: error.message
    })
  }
})

// Get inventory analytics
analyticsRouter.get('/inventory', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getDBConnection } = await import('../db/db.js')
    const db = await getDBConnection()
    
    try {
      const inventoryStatus = await AnalyticsService.getInventoryStatus(db)
      res.json({
        success: true,
        data: inventoryStatus,
        timestamp: new Date().toISOString()
      })
    } finally {
      await db.close()
    }
  } catch (error) {
    logger.error('Error fetching inventory analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory analytics',
      message: error.message
    })
  }
})

// Get revenue data with date range
analyticsRouter.get('/revenue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query
    
    const { getDBConnection } = await import('../db/db.js')
    const db = await getDBConnection()
    
    try {
      let query = `
        SELECT 
          DATE(ci.created_at) as date,
          SUM(ci.quantity * p.price) as revenue,
          COUNT(ci.id) as orders,
          COUNT(DISTINCT ci.user_id) as customers,
          SUM(ci.quantity) as items_sold,
          AVG(ci.quantity * p.price) as avg_order_value
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
      `
      
      const params = []
      
      if (startDate && endDate) {
        query += ' WHERE DATE(ci.created_at) BETWEEN ? AND ?'
        params.push(startDate, endDate)
      } else {
        query += ' WHERE DATE(ci.created_at) >= date(\'now\', \'-30 days\')'
      }
      
      query += ' GROUP BY DATE(ci.created_at) ORDER BY date DESC'
      
      const revenueData = await db.all(query, params)
      
      res.json({
        success: true,
        data: revenueData.map(row => ({
          ...row,
          revenue: parseFloat(row.revenue),
          avg_order_value: parseFloat(row.avg_order_value)
        })),
        params: { startDate, endDate, groupBy },
        timestamp: new Date().toISOString()
      })
    } finally {
      await db.close()
    }
  } catch (error) {
    logger.error('Error fetching revenue data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue data',
      message: error.message
    })
  }
})

// Track product view (for analytics)
analyticsRouter.post('/track/product-view', async (req, res) => {
  try {
    const { productId } = req.body
    const userId = req.user?.userId || null
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      })
    }
    
    await AnalyticsService.trackProductView(productId, userId)
    
    res.json({
      success: true,
      message: 'Product view tracked',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error tracking product view:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to track product view',
      message: error.message
    })
  }
})

// Track purchase (called from cart completion)
analyticsRouter.post('/track/purchase', requireAuth, async (req, res) => {
  try {
    const { items, totalAmount } = req.body
    const userId = req.user.userId
    
    if (!items || !Array.isArray(items) || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Items and total amount are required'
      })
    }
    
    await AnalyticsService.trackPurchase(userId, items, totalAmount)
    
    res.json({
      success: true,
      message: 'Purchase tracked',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error tracking purchase:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to track purchase',
      message: error.message
    })
  }
})

// Get connection statistics
analyticsRouter.get('/connections', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getSocketManager } = await import('../websocket/socketManager.js')
    const socketManager = getSocketManager()
    
    if (!socketManager) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket manager not available'
      })
    }
    
    const stats = socketManager.getConnectionStats()
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching connection stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connection stats',
      message: error.message
    })
  }
})

export { analyticsRouter }