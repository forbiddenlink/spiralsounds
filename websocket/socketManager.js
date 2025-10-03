import { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import { logger } from '../middleware/errorHandler.js'

export class SocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({ 
      server,
      verifyClient: this.verifyClient.bind(this)
    })
    this.clients = new Map()
    this.rooms = new Map() // For grouping users by interests
    this.userSockets = new Map() // userId -> Set of sockets
    
    this.setupWebSocketServer()
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const userId = req.user?.userId
      logger.info(`New WebSocket connection - User: ${userId || 'Anonymous'}`)
      
      // Store client info
      const clientInfo = {
        id: this.generateClientId(),
        userId: userId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        rooms: new Set(),
        trackedProducts: new Set()
      }
      
      this.clients.set(ws, clientInfo)
      
      // Track user sockets
      if (userId) {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set())
        }
        this.userSockets.get(userId).add(ws)
      }

      // Send welcome message
      this.sendToClient(ws, {
        type: 'WELCOME',
        clientId: clientInfo.id,
        timestamp: new Date().toISOString()
      })
      
      ws.on('message', (message) => {
        this.handleMessage(ws, message)
      })

      ws.on('close', () => {
        this.removeClient(ws)
      })

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error)
        this.removeClient(ws)
      })

      // Setup heartbeat
      ws.isAlive = true
      ws.on('pong', () => {
        ws.isAlive = true
      })
    })

    // Setup heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          return ws.terminate()
        }
        ws.isAlive = false
        ws.ping()
      })
    }, 30000) // 30 seconds
  }

  verifyClient(info) {
    try {
      const url = new URL(info.req.url, 'http://localhost')
      const token = url.searchParams.get('token')
      
      if (token) {
        // Import JWT verification dynamically to avoid circular dependencies
        import('../utils/jwt.js').then(({ verifyToken }) => {
          try {
            const decoded = verifyToken(token)
            // Token is valid, store user info for later use
            info.req.user = decoded
            return true
          } catch (error) {
            console.warn('Invalid WebSocket token:', error.message)
            return false
          }
        })
      }
      
      // Allow connections without tokens but mark as anonymous
      return true
    } catch (error) {
      console.error('WebSocket verification error:', error)
      return false
    }
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message)
      const clientInfo = this.clients.get(ws)
      
      if (!clientInfo) return
      
      clientInfo.lastActivity = new Date()
      
      switch (data.type) {
        case 'JOIN_ROOM':
          this.joinRoom(ws, data.room)
          break
        case 'LEAVE_ROOM':
          this.leaveRoom(ws, data.room)
          break
        case 'TRACK_PRODUCT':
          this.trackProduct(ws, data.productId)
          break
        case 'UNTRACK_PRODUCT':
          this.untrackProduct(ws, data.productId)
          break
        case 'USER_TYPING':
          this.broadcastToRoom(data.room, {
            type: 'USER_TYPING',
            userId: clientInfo.userId,
            timestamp: new Date().toISOString()
          }, ws)
          break
        case 'HEARTBEAT':
          this.sendToClient(ws, { type: 'PONG', timestamp: new Date().toISOString() })
          break
        default:
          logger.warn('Unknown WebSocket message type:', data.type)
      }
    } catch (error) {
      logger.error('WebSocket message handling error:', error)
    }
  }

  joinRoom(ws, roomName) {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo) return

    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set())
    }
    
    this.rooms.get(roomName).add(ws)
    clientInfo.rooms.add(roomName)
    
    this.sendToClient(ws, {
      type: 'ROOM_JOINED',
      room: roomName,
      userCount: this.rooms.get(roomName).size,
      timestamp: new Date().toISOString()
    })

    // Notify others in the room
    this.broadcastToRoom(roomName, {
      type: 'USER_JOINED',
      userId: clientInfo.userId,
      userCount: this.rooms.get(roomName).size,
      timestamp: new Date().toISOString()
    }, ws)
  }

  leaveRoom(ws, roomName) {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo || !this.rooms.has(roomName)) return

    this.rooms.get(roomName).delete(ws)
    clientInfo.rooms.delete(roomName)
    
    if (this.rooms.get(roomName).size === 0) {
      this.rooms.delete(roomName)
    }

    this.sendToClient(ws, {
      type: 'ROOM_LEFT',
      room: roomName,
      timestamp: new Date().toISOString()
    })
  }

  trackProduct(ws, productId) {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo) return

    clientInfo.trackedProducts.add(productId)
    
    this.sendToClient(ws, {
      type: 'PRODUCT_TRACKED',
      productId: productId,
      timestamp: new Date().toISOString()
    })
  }

  untrackProduct(ws, productId) {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo) return

    clientInfo.trackedProducts.delete(productId)
    
    this.sendToClient(ws, {
      type: 'PRODUCT_UNTRACKED',
      productId: productId,
      timestamp: new Date().toISOString()
    })
  }

  // Broadcasting methods
  broadcastProductUpdate(productId, updateData) {
    const message = {
      type: 'PRODUCT_UPDATE',
      productId,
      data: updateData,
      timestamp: new Date().toISOString()
    }

    this.broadcast(message, (ws) => {
      const clientInfo = this.clients.get(ws)
      return clientInfo && clientInfo.trackedProducts.has(productId)
    })
  }

  broadcastStockUpdate(productId, newStock, oldStock) {
    const message = {
      type: 'STOCK_UPDATE',
      productId,
      newStock,
      oldStock,
      timestamp: new Date().toISOString()
    }

    this.broadcast(message, (ws) => {
      const clientInfo = this.clients.get(ws)
      return clientInfo && clientInfo.trackedProducts.has(productId)
    })
  }

  broadcastPriceUpdate(productId, newPrice, oldPrice) {
    const message = {
      type: 'PRICE_UPDATE',
      productId,
      newPrice,
      oldPrice,
      discount: oldPrice > newPrice ? Math.round(((oldPrice - newPrice) / oldPrice) * 100) : 0,
      timestamp: new Date().toISOString()
    }

    this.broadcast(message)
  }

  broadcastNewProduct(product) {
    const message = {
      type: 'NEW_PRODUCT',
      product,
      timestamp: new Date().toISOString()
    }

    this.broadcastToRoom('new-releases', message)
  }

  broadcastUserActivity(userId, activity) {
    const message = {
      type: 'USER_ACTIVITY',
      userId,
      activity,
      timestamp: new Date().toISOString()
    }

    this.broadcast(message, (ws) => {
      const clientInfo = this.clients.get(ws)
      return clientInfo && clientInfo.userId && clientInfo.userId !== userId
    })
  }

  sendNotification(userId, notification) {
    const message = {
      type: 'NOTIFICATION',
      notification: {
        ...notification,
        id: this.generateNotificationId(),
        timestamp: new Date().toISOString()
      }
    }

    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).forEach(ws => {
        this.sendToClient(ws, message)
      })
    }
  }

  // Live analytics updates
  broadcastAnalyticsUpdate(analyticsData) {
    const message = {
      type: 'ANALYTICS_UPDATE',
      data: analyticsData,
      timestamp: new Date().toISOString()
    }

    this.broadcastToRoom('admin-dashboard', message)
  }

  // Generic broadcasting
  broadcast(message, filter = null) {
    const messageStr = JSON.stringify(message)
    
    this.wss.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        if (!filter || filter(client)) {
          client.send(messageStr)
        }
      }
    })
  }

  broadcastToRoom(roomName, message, excludeWs = null) {
    if (!this.rooms.has(roomName)) return

    const messageStr = JSON.stringify(message)
    
    this.rooms.get(roomName).forEach(client => {
      if (client.readyState === client.OPEN && client !== excludeWs) {
        client.send(messageStr)
      }
    })
  }

  sendToClient(ws, message) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  // Connection management
  removeClient(ws) {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo) return

    // Remove from rooms
    clientInfo.rooms.forEach(room => {
      if (this.rooms.has(room)) {
        this.rooms.get(room).delete(ws)
        if (this.rooms.get(room).size === 0) {
          this.rooms.delete(room)
        } else {
          // Notify remaining users
          this.broadcastToRoom(room, {
            type: 'USER_LEFT',
            userId: clientInfo.userId,
            userCount: this.rooms.get(room).size,
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    // Remove from user sockets
    if (clientInfo.userId && this.userSockets.has(clientInfo.userId)) {
      this.userSockets.get(clientInfo.userId).delete(ws)
      if (this.userSockets.get(clientInfo.userId).size === 0) {
        this.userSockets.delete(clientInfo.userId)
      }
    }

    this.clients.delete(ws)
    logger.info(`WebSocket client disconnected - User: ${clientInfo.userId || 'Anonymous'}`)
  }

  // Analytics
  getConnectionStats() {
    const totalConnections = this.clients.size
    const authenticatedUsers = Array.from(this.clients.values())
      .filter(client => client.userId).length
    const roomStats = {}
    
    this.rooms.forEach((clients, roomName) => {
      roomStats[roomName] = clients.size
    })

    return {
      totalConnections,
      authenticatedUsers,
      anonymousUsers: totalConnections - authenticatedUsers,
      rooms: roomStats,
      timestamp: new Date().toISOString()
    }
  }

  // Utility methods
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Cleanup
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    this.wss.clients.forEach(client => {
      client.terminate()
    })
    
    this.clients.clear()
    this.rooms.clear()
    this.userSockets.clear()
  }
}

// Singleton instance
let socketManager = null

export function initializeSocketManager(server) {
  if (!socketManager) {
    socketManager = new SocketManager(server)
  }
  return socketManager
}

export function getSocketManager() {
  return socketManager
}