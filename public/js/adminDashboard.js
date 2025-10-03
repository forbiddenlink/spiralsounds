class AdminDashboard {
  constructor() {
    this.charts = new Map()
    this.refreshInterval = null
    this.websocket = null
    this.isLoading = false
    this.lastUpdate = null
    
    this.init()
  }

  async init() {
    console.log('🚀 Initializing Admin Dashboard')
    
    // Check authentication
    if (!this.checkAuth()) {
      window.location.href = '/login.html'
      return
    }
    
    // Wait for WebSocket client to be ready
    if (window.wsClient) {
      this.setupWebSocket()
    } else {
      // Wait for WebSocket to initialize
      setTimeout(() => this.init(), 100)
      return
    }
    
    await this.loadInitialData()
    this.setupCharts()
    this.setupEventListeners()
    this.startAutoRefresh()
    
    console.log('✅ Admin Dashboard initialized')
  }

  checkAuth() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    if (!token) return false
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp > Date.now() / 1000
    } catch {
      return false
    }
  }

  setupWebSocket() {
    this.websocket = window.wsClient
    
    // Join admin room for real-time updates
    this.websocket.joinRoom('admin-dashboard')
    
    // Listen for analytics updates
    this.websocket.on('ANALYTICS_UPDATE', (data) => {
      this.handleRealtimeUpdate(data)
    })
    
    // Listen for connection stats
    this.websocket.on('connected', () => {
      this.updateConnectionStatus(true)
    })
    
    this.websocket.on('disconnected', () => {
      this.updateConnectionStatus(false)
    })
  }

  async loadInitialData() {
    this.showLoading()
    
    try {
      const [dashboardData, realtimeMetrics, connectionStats] = await Promise.all([
        this.fetchDashboardData(),
        this.fetchRealtimeMetrics(),
        this.fetchConnectionStats()
      ])
      
      this.updateDashboard(dashboardData)
      this.updateRealtimeMetrics(realtimeMetrics)
      this.updateConnectionStats(connectionStats)
      
      this.lastUpdate = new Date()
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      this.showError('Failed to load dashboard data')
    } finally {
      this.hideLoading()
    }
  }

  async fetchDashboardData() {
    const response = await fetch('/api/analytics/dashboard', {
      headers: this.getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data
  }

  async fetchRealtimeMetrics() {
    const response = await fetch('/api/analytics/realtime', {
      headers: this.getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data
  }

  async fetchConnectionStats() {
    const response = await fetch('/api/analytics/connections', {
      headers: this.getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data
  }

  getAuthHeaders() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  updateDashboard(data) {
    // Update key metrics
    this.updateElement('today-revenue', this.formatCurrency(data.salesOverview.todayRevenue))
    this.updateElement('today-orders', data.salesOverview.todayOrders)
    this.updateElement('total-customers', data.salesOverview.totalCustomers)
    this.updateElement('avg-order-value', this.formatCurrency(data.salesOverview.avgOrderValue))
    this.updateElement('retention-rate', `${data.userBehavior.retentionRate}%`)
    
    // Update change indicators
    this.updateChangeIndicator('revenue-change', data.salesOverview.changes.revenue)
    this.updateChangeIndicator('orders-change', data.salesOverview.changes.orders)
    
    // Update charts
    this.updateRevenueChart(data.revenueData)
    this.updateGenreChart(data.genreAnalytics)
    this.updateProductsChart(data.topProducts)
    
    // Update activity feed
    this.updateActivityFeed(data.recentActivity)
    
    // Update inventory alerts
    this.updateInventoryAlerts(data.inventoryStatus)
  }

  updateRealtimeMetrics(data) {
    this.updateElement('active-users', data.activeUsers)
    
    // Calculate conversion rate (simplified)
    const conversionRate = data.todayOrders > 0 && data.activeUsers > 0 
      ? Math.round((data.todayOrders / data.activeUsers) * 100) 
      : 0
    this.updateElement('conversion-rate', `${conversionRate}%`)
  }

  updateConnectionStats(data) {
    this.updateElement('total-connections', data.totalConnections)
    this.updateElement('authenticated-users', data.authenticatedUsers)
  }

  updateElement(id, value) {
    const element = document.getElementById(id)
    if (element) {
      // Add animation for value changes
      if (element.textContent !== value.toString()) {
        element.style.transform = 'scale(1.1)'
        element.style.color = '#06B6D4'
        
        setTimeout(() => {
          element.textContent = value
          element.style.transform = 'scale(1)'
          element.style.color = ''
        }, 200)
      }
    }
  }

  updateChangeIndicator(id, changePercent) {
    const element = document.getElementById(id)
    if (!element) return
    
    const isPositive = changePercent > 0
    const isNegative = changePercent < 0
    
    element.className = `metric-change ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`
    
    const arrow = isPositive ? '↗' : isNegative ? '↘' : '→'
    const sign = isPositive ? '+' : ''
    element.innerHTML = `<span>${arrow} ${sign}${changePercent}%</span>`
  }

  setupCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenue-chart').getContext('2d')
    this.charts.set('revenue', new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Revenue',
          data: [],
          borderColor: '#06B6D4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#06B6D4',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#94A3B8' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: {
              color: '#94A3B8',
              callback: value => this.formatCurrency(value)
            }
          }
        }
      }
    }))

    // Genre Chart
    const genreCtx = document.getElementById('genre-chart').getContext('2d')
    this.charts.set('genre', new Chart(genreCtx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444',
            '#10B981', '#F97316', '#EC4899', '#6366F1'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94A3B8', padding: 20 }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            callbacks: {
              label: (context) => {
                const value = this.formatCurrency(context.parsed)
                const percentage = Math.round((context.parsed / context.dataset.data.reduce((a, b) => a + b, 0)) * 100)
                return `${context.label}: ${value} (${percentage}%)`
              }
            }
          }
        }
      }
    }))

    // Products Chart
    const productsCtx = document.getElementById('products-chart').getContext('2d')
    this.charts.set('products', new Chart(productsCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Units Sold',
          data: [],
          backgroundColor: 'rgba(6, 182, 212, 0.8)',
          borderColor: '#06B6D4',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { 
              color: '#94A3B8',
              maxRotation: 45,
              callback: function(value) {
                const label = this.getLabelForValue(value)
                return label.length > 15 ? label.substr(0, 15) + '...' : label
              }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#94A3B8' }
          }
        }
      }
    }))
  }

  updateRevenueChart(revenueData) {
    const chart = this.charts.get('revenue')
    if (!chart || !revenueData) return
    
    const last30Days = revenueData.slice(0, 30).reverse()
    
    chart.data.labels = last30Days.map(item => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )
    chart.data.datasets[0].data = last30Days.map(item => item.revenue)
    
    chart.update('none')
  }

  updateGenreChart(genreData) {
    const chart = this.charts.get('genre')
    if (!chart || !genreData) return
    
    const topGenres = genreData.slice(0, 6)
    
    chart.data.labels = topGenres.map(genre => genre.genre)
    chart.data.datasets[0].data = topGenres.map(genre => genre.genre_revenue)
    
    chart.update('none')
  }

  updateProductsChart(productData) {
    const chart = this.charts.get('products')
    if (!chart || !productData) return
    
    const topProducts = productData.slice(0, 8)
    
    chart.data.labels = topProducts.map(product => `${product.title} - ${product.artist}`)
    chart.data.datasets[0].data = topProducts.map(product => product.units_sold)
    
    chart.update('none')
  }

  updateActivityFeed(activityData) {
    const container = document.getElementById('recent-activity')
    if (!container || !activityData) return
    
    const activities = [
      ...activityData.recentOrders.map(order => ({
        type: 'order',
        icon: '🛒',
        title: `New order: ${order.product_title}`,
        subtitle: `${order.username} - ${this.formatCurrency(order.total)}`,
        time: this.formatTimeAgo(order.created_at)
      })),
      ...activityData.recentUsers.map(user => ({
        type: 'user',
        icon: '👤',
        title: `New user registered`,
        subtitle: user.username,
        time: this.formatTimeAgo(user.created_at)
      })),
      ...activityData.recentReviews.map(review => ({
        type: 'review',
        icon: '⭐',
        title: `New review: ${review.product_title}`,
        subtitle: `${review.username} - ${review.rating}/5 stars`,
        time: this.formatTimeAgo(review.created_at)
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
    
    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-time">${activity.subtitle} • ${activity.time}</div>
        </div>
      </div>
    `).join('')
  }

  updateInventoryAlerts(inventoryData) {
    const container = document.getElementById('inventory-alerts')
    if (!container || !inventoryData) return
    
    const alerts = inventoryData.products
      .filter(product => product.stock_level === 'critical' || product.stock_level === 'out_of_stock')
      .slice(0, 10)
    
    if (alerts.length === 0) {
      container.innerHTML = '<div class="activity-item"><div class="activity-content"><div class="activity-title">✅ All products have adequate stock</div></div></div>'
      return
    }
    
    container.innerHTML = alerts.map(product => `
      <div class="inventory-item">
        <div class="inventory-info">
          <div class="inventory-title">${product.title}</div>
          <div class="inventory-artist">${product.artist}</div>
        </div>
        <div class="stock-badge stock-${product.stock_level}">
          ${product.stock === 0 ? 'Out of Stock' : `${product.stock} left`}
        </div>
      </div>
    `).join('')
  }

  setupEventListeners() {
    // Refresh buttons
    document.getElementById('refresh-revenue')?.addEventListener('click', () => {
      this.refreshMetrics()
    })
    
    document.getElementById('refresh-chart')?.addEventListener('click', () => {
      this.refreshCharts()
    })
    
    // Auto-refresh on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.lastUpdate) {
        const timeSinceUpdate = Date.now() - this.lastUpdate.getTime()
        if (timeSinceUpdate > 60000) { // Refresh if last update was > 1 minute ago
          this.loadInitialData()
        }
      }
    })
  }

  async refreshMetrics() {
    try {
      const realtimeMetrics = await this.fetchRealtimeMetrics()
      this.updateRealtimeMetrics(realtimeMetrics)
    } catch (error) {
      console.error('Error refreshing metrics:', error)
    }
  }

  async refreshCharts() {
    try {
      const dashboardData = await this.fetchDashboardData()
      this.updateRevenueChart(dashboardData.revenueData)
      this.updateGenreChart(dashboardData.genreAnalytics)
      this.updateProductsChart(dashboardData.topProducts)
    } catch (error) {
      console.error('Error refreshing charts:', error)
    }
  }

  startAutoRefresh() {
    // Refresh metrics every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshMetrics()
    }, 30000)
    
    // Refresh full dashboard every 5 minutes
    setInterval(() => {
      this.loadInitialData()
    }, 300000)
  }

  handleRealtimeUpdate(data) {
    console.log('📊 Real-time analytics update:', data)
    
    if (data.type === 'PURCHASE_COMPLETED') {
      // Update today's metrics
      this.incrementCounter('today-orders')
      this.incrementValue('today-revenue', data.totalAmount)
      
      // Show notification
      this.showNotification('🎉 New purchase completed!', 'success')
    }
    
    // Update general metrics
    if (data.todayRevenue !== undefined) {
      this.updateElement('today-revenue', this.formatCurrency(data.todayRevenue))
    }
    
    if (data.todayOrders !== undefined) {
      this.updateElement('today-orders', data.todayOrders)
    }
    
    if (data.activeUsers !== undefined) {
      this.updateElement('active-users', data.activeUsers)
    }
  }

  incrementCounter(elementId) {
    const element = document.getElementById(elementId)
    if (element) {
      const current = parseInt(element.textContent) || 0
      this.updateElement(elementId, current + 1)
    }
  }

  incrementValue(elementId, amount) {
    const element = document.getElementById(elementId)
    if (element) {
      const current = parseFloat(element.textContent.replace(/[$,]/g, '')) || 0
      this.updateElement(elementId, this.formatCurrency(current + amount))
    }
  }

  updateConnectionStatus(isConnected) {
    const indicator = document.querySelector('.status-dot')
    const text = document.querySelector('.realtime-text')
    
    if (indicator && text) {
      if (isConnected) {
        indicator.style.background = '#10B981'
        text.textContent = 'Real-time updates enabled'
      } else {
        indicator.style.background = '#EF4444'
        text.textContent = 'Connection lost - attempting to reconnect...'
      }
    }
  }

  showLoading() {
    this.isLoading = true
    // You could add loading spinners here
  }

  hideLoading() {
    this.isLoading = false
  }

  showError(message) {
    console.error('Dashboard error:', message)
    // You could show an error toast here
  }

  showNotification(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type, 3000)
    } else {
      console.log(`Notification (${type}): ${message}`)
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  formatTimeAgo(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
    
    // Destroy charts
    this.charts.forEach(chart => chart.destroy())
    this.charts.clear()
    
    // Leave WebSocket room
    if (this.websocket) {
      this.websocket.leaveRoom('admin-dashboard')
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard()
})

// Handle cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.adminDashboard) {
    window.adminDashboard.destroy()
  }
})