import express from 'express'
import AnalyticsService from '../../services/AnalyticsService.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { logger } from '../../middleware/errorHandler.js'
import { requirePermission, PERMISSIONS, requireAdmin } from '../../middleware/rbac.js'

export const analyticsRouter = express.Router()

// Dashboard endpoints (admin only)
analyticsRouter.get('/dashboard', requireAuth, requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
  try {
    const dashboardData = await AnalyticsService.getDashboardData()
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Analytics dashboard error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    })
  }
})

// Search analytics endpoints (admin only)
analyticsRouter.get('/searches', requireAuth, requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query
    const searches = await AnalyticsService.getSearchAnalytics(parseInt(limit), parseInt(offset))
    res.json({
      success: true,
      data: searches,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    })
  } catch (error) {
    logger.error('Search analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search analytics'
    })
  }
})

// User activity endpoints (admin only)
analyticsRouter.get('/activity', requireAuth, requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query
    const activity = await AnalyticsService.getUserActivity(timeframe)
    res.json({
      success: true,
      data: activity,
      timeframe
    })
  } catch (error) {
    logger.error('User activity error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    })
  }
})

// Real-time metrics endpoints (admin only)
analyticsRouter.get('/realtime', requireAuth, requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
  try {
    const metrics = await AnalyticsService.getRealTimeMetrics()
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Real-time metrics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time metrics'
    })
  }
})