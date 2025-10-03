class WebSocketClient {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.listeners = new Map()
    this.messageQueue = []
    this.userId = null
    
    this.init()
  }

  async init() {
    // Get user token if authenticated
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    this.userId = this.extractUserIdFromToken(token)
    
    await this.connect(token)
    this.setupEventListeners()
  }

  extractUserIdFromToken(token) {
    if (!token) return null
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.userId
    } catch (error) {
      console.warn('Failed to extract user ID from token:', error)
      return null
    }
  }

  async connect(token = null) {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}${token ? `?token=${token}` : ''}`
      
      this.socket = new WebSocket(wsUrl)
      
      this.socket.onopen = () => {
        console.log('🔗 WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        
        // Send queued messages
        this.flushMessageQueue()
        
        // Join relevant rooms
        this.joinDefaultRooms()
        
        this.emit('connected')
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('WebSocket message parsing error:', error)
        }
      }

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected', event.code, event.reason)
        this.isConnected = false
        this.emit('disconnected')
        
        // Attempt to reconnect unless it was intentional
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect()
        }
      }

      this.socket.onerror = (error) => {
        console.error('🚨 WebSocket error:', error)
        this.emit('error', error)
      }

    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      this.attemptReconnect()
    }
  }

  attemptReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)
    
    setTimeout(() => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      this.connect(token)
    }, delay)
  }

  joinDefaultRooms() {
    // Join general rooms based on user context
    if (this.userId) {
      this.joinRoom('general')
      this.joinRoom('authenticated-users')
      
      // Join admin room if user has admin privileges
      if (this.isAdmin()) {
        this.joinRoom('admin-dashboard')
      }
    }
    
    // Join room based on current page
    const currentPage = this.getCurrentPageContext()
    if (currentPage) {
      this.joinRoom(currentPage)
    }
  }

  getCurrentPageContext() {
    const path = window.location.pathname
    
    if (path.includes('admin')) return 'admin-dashboard'
    if (path.includes('products')) return 'product-browsing'
    if (path.includes('cart')) return 'shopping-cart'
    
    return 'general'
  }

  isAdmin() {
    // Check if user has admin role (you'd implement this based on your auth system)
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.role === 'admin'
  }

  handleMessage(data) {
    console.log('📨 WebSocket message:', data.type, data)
    
    switch (data.type) {
      case 'WELCOME':
        this.handleWelcome(data)
        break
      case 'PRODUCT_UPDATE':
        this.handleProductUpdate(data)
        break
      case 'STOCK_UPDATE':
        this.handleStockUpdate(data)
        break
      case 'PRICE_UPDATE':
        this.handlePriceUpdate(data)
        break
      case 'NEW_PRODUCT':
        this.handleNewProduct(data)
        break
      case 'NOTIFICATION':
        this.handleNotification(data)
        break
      case 'ANALYTICS_UPDATE':
        this.handleAnalyticsUpdate(data)
        break
      case 'USER_ACTIVITY':
        this.handleUserActivity(data)
        break
      case 'ROOM_JOINED':
      case 'ROOM_LEFT':
      case 'USER_JOINED':
      case 'USER_LEFT':
        this.handleRoomActivity(data)
        break
      case 'PONG':
        // Heartbeat response
        break
      default:
        console.warn('Unknown WebSocket message type:', data.type)
    }
    
    // Emit to registered listeners
    this.emit(data.type, data)
  }

  handleWelcome(data) {
    this.clientId = data.clientId
    console.log('🎉 WebSocket welcome received, Client ID:', this.clientId)
  }

  handleProductUpdate(data) {
    // Update product in the UI if it's currently displayed
    const productElement = document.querySelector(`[data-product-id="${data.productId}"]`)
    if (productElement) {
      this.updateProductElement(productElement, data.data)
    }
    
    // Show toast notification if user is tracking this product
    if (this.isTrackingProduct(data.productId)) {
      this.showNotification({
        type: 'info',
        title: 'Product Updated',
        message: `${data.data.title || 'A tracked product'} has been updated`,
        duration: 5000
      })
    }
  }

  handleStockUpdate(data) {
    console.log('📦 Stock update:', data)
    
    // Update stock display
    const stockElements = document.querySelectorAll(`[data-stock-id="${data.productId}"]`)
    stockElements.forEach(element => {
      element.textContent = data.newStock
      
      // Update stock level classes
      element.className = element.className.replace(/stock-(high|medium|low|out)/, '')
      if (data.newStock === 0) {
        element.classList.add('stock-out')
      } else if (data.newStock <= 5) {
        element.classList.add('stock-low')
      } else if (data.newStock <= 15) {
        element.classList.add('stock-medium')
      } else {
        element.classList.add('stock-high')
      }
    })
    
    // Show notification for low stock
    if (data.newStock <= 5 && data.newStock > 0) {
      this.showNotification({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `Only ${data.newStock} items left!`,
        duration: 7000
      })
    } else if (data.newStock === 0) {
      this.showNotification({
        type: 'error',
        title: 'Out of Stock',
        message: 'This item is no longer available',
        duration: 10000
      })
    }
  }

  handlePriceUpdate(data) {
    console.log('💰 Price update:', data)
    
    // Update price displays
    const priceElements = document.querySelectorAll(`[data-price-id="${data.productId}"]`)
    priceElements.forEach(element => {
      const oldPriceElement = element.querySelector('.old-price')
      const currentPriceElement = element.querySelector('.current-price')
      
      if (data.discount > 0) {
        // Show discount
        if (oldPriceElement) {
          oldPriceElement.textContent = `$${data.oldPrice.toFixed(2)}`
        } else {
          const oldPrice = document.createElement('span')
          oldPrice.className = 'old-price'
          oldPrice.textContent = `$${data.oldPrice.toFixed(2)}`
          element.prepend(oldPrice)
        }
        
        currentPriceElement.textContent = `$${data.newPrice.toFixed(2)}`
        
        // Add discount badge
        let discountBadge = element.querySelector('.discount-badge')
        if (!discountBadge) {
          discountBadge = document.createElement('span')
          discountBadge.className = 'discount-badge'
          element.appendChild(discountBadge)
        }
        discountBadge.textContent = `-${data.discount}%`
        
        // Show notification
        this.showNotification({
          type: 'success',
          title: 'Price Drop! 📉',
          message: `Save ${data.discount}% on this item!`,
          duration: 8000
        })
      } else {
        currentPriceElement.textContent = `$${data.newPrice.toFixed(2)}`
      }
    })
  }

  handleNewProduct(data) {
    console.log('🆕 New product:', data.product)
    
    this.showNotification({
      type: 'info',
      title: 'New Arrival! 🎵',
      message: `${data.product.title} by ${data.product.artist} is now available`,
      duration: 8000,
      action: {
        label: 'View Product',
        callback: () => {
          window.location.href = `/products/${data.product.id}`
        }
      }
    })
  }

  handleNotification(data) {
    console.log('🔔 Notification:', data.notification)
    this.showNotification(data.notification)
  }

  handleAnalyticsUpdate(data) {
    // Update admin dashboard if it's open
    if (window.adminDashboard) {
      window.adminDashboard.updateMetrics(data.data)
    }
    
    this.emit('analytics-update', data.data)
  }

  handleUserActivity(data) {
    // Handle real-time user activity updates
    this.emit('user-activity', data)
  }

  handleRoomActivity(data) {
    console.log('🏠 Room activity:', data)
    
    // Update online user counts, etc.
    if (data.userCount !== undefined) {
      const userCountElements = document.querySelectorAll('.online-users-count')
      userCountElements.forEach(element => {
        element.textContent = data.userCount
      })
    }
  }

  // Public API methods
  send(message) {
    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    } else {
      // Queue message for later
      this.messageQueue.push(message)
    }
  }

  joinRoom(roomName) {
    this.send({
      type: 'JOIN_ROOM',
      room: roomName,
      timestamp: new Date().toISOString()
    })
  }

  leaveRoom(roomName) {
    this.send({
      type: 'LEAVE_ROOM',
      room: roomName,
      timestamp: new Date().toISOString()
    })
  }

  trackProduct(productId) {
    this.send({
      type: 'TRACK_PRODUCT',
      productId: productId,
      timestamp: new Date().toISOString()
    })
    
    // Store locally for UI updates
    const trackedProducts = JSON.parse(localStorage.getItem('trackedProducts') || '[]')
    if (!trackedProducts.includes(productId)) {
      trackedProducts.push(productId)
      localStorage.setItem('trackedProducts', JSON.stringify(trackedProducts))
    }
  }

  untrackProduct(productId) {
    this.send({
      type: 'UNTRACK_PRODUCT',
      productId: productId,
      timestamp: new Date().toISOString()
    })
    
    // Remove from local storage
    const trackedProducts = JSON.parse(localStorage.getItem('trackedProducts') || '[]')
    const index = trackedProducts.indexOf(productId)
    if (index > -1) {
      trackedProducts.splice(index, 1)
      localStorage.setItem('trackedProducts', JSON.stringify(trackedProducts))
    }
  }

  isTrackingProduct(productId) {
    const trackedProducts = JSON.parse(localStorage.getItem('trackedProducts') || '[]')
    return trackedProducts.includes(productId)
  }

  // Event system
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType).add(callback)
    
    return () => {
      this.listeners.get(eventType)?.delete(callback)
    }
  }

  emit(eventType, data = null) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in WebSocket event callback for ${eventType}:`, error)
        }
      })
    }
  }

  // Helper methods
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      this.send(message)
    }
  }

  updateProductElement(element, productData) {
    // Update various product data in the element
    if (productData.title) {
      const titleElement = element.querySelector('.product-title')
      if (titleElement) titleElement.textContent = productData.title
    }
    
    if (productData.price !== undefined) {
      const priceElement = element.querySelector('.product-price')
      if (priceElement) priceElement.textContent = `$${productData.price.toFixed(2)}`
    }
    
    if (productData.stock !== undefined) {
      const stockElement = element.querySelector('.product-stock')
      if (stockElement) stockElement.textContent = productData.stock
    }
  }

  showNotification(notification) {
    // Use existing toast system or create new notification
    if (window.showToast) {
      window.showToast(notification.message, notification.type, notification.duration)
    } else {
      // Fallback notification system
      this.createNotificationElement(notification)
    }
  }

  createNotificationElement(notification) {
    const container = this.getNotificationContainer()
    
    const element = document.createElement('div')
    element.className = `notification notification-${notification.type || 'info'}`
    element.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${notification.title || ''}</div>
        <div class="notification-message">${notification.message}</div>
        ${notification.action ? `
          <button class="notification-action" onclick="this.parentElement.parentElement.remove(); ${notification.action.callback || ''}">
            ${notification.action.label}
          </button>
        ` : ''}
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `
    
    container.appendChild(element)
    
    // Auto-remove after duration
    setTimeout(() => {
      if (element.parentElement) {
        element.remove()
      }
    }, notification.duration || 5000)
  }

  getNotificationContainer() {
    let container = document.getElementById('notification-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'notification-container'
      container.className = 'notification-container'
      document.body.appendChild(container)
    }
    return container
  }

  // Heartbeat to keep connection alive
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'HEARTBEAT', timestamp: new Date().toISOString() })
      }
    }, 30000) // Every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  setupEventListeners() {
    // Start heartbeat
    this.startHeartbeat()
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page hidden, reduce activity
        this.stopHeartbeat()
      } else {
        // Page visible, resume activity
        this.startHeartbeat()
        
        // Reconnect if disconnected
        if (!this.isConnected) {
          const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
          this.connect(token)
        }
      }
    })
    
    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
      this.disconnect()
    })
  }

  disconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000, 'Client disconnecting')
    }
    this.stopHeartbeat()
  }

  // Status methods
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      clientId: this.clientId,
      userId: this.userId,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.socket?.readyState,
      queuedMessages: this.messageQueue.length
    }
  }
}

// Initialize WebSocket client
let wsClient = null

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  wsClient = new WebSocketClient()
  
  // Make it globally available
  window.wsClient = wsClient
  
  console.log('🚀 WebSocket client initialized')
})

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSocketClient
}