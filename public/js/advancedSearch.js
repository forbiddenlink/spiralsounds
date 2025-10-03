// Advanced Search Service
class AdvancedSearchService {
  constructor() {
    this.searchInput = null
    this.suggestionsContainer = null
    this.filtersContainer = null
    this.resultsContainer = null
    this.currentFilters = {
      search: '',
      genre: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'title',
      sortOrder: 'asc'
    }
    this.searchTimeout = null
    this.currentPage = 1
    this.sessionId = this.generateSessionId()
    this.lastSearchQuery = ''
  }

  generateSessionId() {
    return 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  init() {
    this.setupSearchUI()
    this.bindEvents()
    this.loadInitialData()
  }

  setupSearchUI() {
    // Enhanced search bar HTML
    const searchHTML = `
      <div class="advanced-search-container">
        <div class="search-bar-wrapper">
          <input 
            type="text" 
            id="advanced-search" 
            placeholder="Search by title, artist, or genre..." 
            autocomplete="off"
          >
          <button id="search-clear" class="search-clear-btn" style="display: none;">×</button>
          <div id="search-suggestions" class="search-suggestions"></div>
        </div>
        
        <div class="filters-container" id="filters-container">
          <div class="filter-group">
            <label for="genre-filter">Genre:</label>
            <select id="genre-filter">
              <option value="all">All Genres</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Price Range:</label>
            <div class="price-range">
              <input type="number" id="min-price" placeholder="Min" step="0.01">
              <span>to</span>
              <input type="number" id="max-price" placeholder="Max" step="0.01">
            </div>
          </div>
          
          <div class="filter-group">
            <label for="sort-by">Sort by:</label>
            <select id="sort-by">
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="price">Price</option>
              <option value="genre">Genre</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="sort-order">Order:</label>
            <select id="sort-order">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          
          <button id="reset-filters" class="reset-filters-btn">Reset Filters</button>
        </div>
        
        <div class="search-stats" id="search-stats"></div>
      </div>
    `

    // Find the products container and add search UI before it
    const productsSection = document.querySelector('.products-section') || document.querySelector('#products-container')
    if (productsSection) {
      productsSection.insertAdjacentHTML('afterbegin', searchHTML)
    }

    // Get references to elements
    this.searchInput = document.getElementById('advanced-search')
    this.suggestionsContainer = document.getElementById('search-suggestions')
    this.filtersContainer = document.getElementById('filters-container')
    this.resultsContainer = document.getElementById('products-container') || document.querySelector('.products-grid')
    this.statsContainer = document.getElementById('search-stats')
  }

  bindEvents() {
    if (!this.searchInput) return

    // Search input with debouncing
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim()
      this.currentFilters.search = query
      
      // Show/hide clear button
      const clearBtn = document.getElementById('search-clear')
      if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none'
      }

      // Debounced search
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.performSearch()
        if (query.length >= 2) {
          this.loadSuggestions(query)
        } else {
          this.hideSuggestions()
        }
      }, 300)
    })

    // Search suggestions
    this.searchInput.addEventListener('focus', () => {
      if (this.searchInput.value.length >= 2) {
        this.loadSuggestions(this.searchInput.value)
      }
    })

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
        this.hideSuggestions()
      }
    })

    // Clear search
    const clearBtn = document.getElementById('search-clear')
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchInput.value = ''
        this.currentFilters.search = ''
        clearBtn.style.display = 'none'
        this.hideSuggestions()
        this.performSearch()
      })
    }

    // Filter controls
    const genreFilter = document.getElementById('genre-filter')
    const minPrice = document.getElementById('min-price')
    const maxPrice = document.getElementById('max-price')
    const sortBy = document.getElementById('sort-by')
    const sortOrder = document.getElementById('sort-order')
    const resetBtn = document.getElementById('reset-filters')

    if (genreFilter) {
      genreFilter.addEventListener('change', () => {
        this.currentFilters.genre = genreFilter.value
        this.performSearch()
      })
    }

    if (minPrice) {
      minPrice.addEventListener('input', this.debounce(() => {
        this.currentFilters.minPrice = minPrice.value
        this.performSearch()
      }, 500))
    }

    if (maxPrice) {
      maxPrice.addEventListener('input', this.debounce(() => {
        this.currentFilters.maxPrice = maxPrice.value
        this.performSearch()
      }, 500))
    }

    if (sortBy) {
      sortBy.addEventListener('change', () => {
        this.currentFilters.sortBy = sortBy.value
        this.performSearch()
      })
    }

    if (sortOrder) {
      sortOrder.addEventListener('change', () => {
        this.currentFilters.sortOrder = sortOrder.value
        this.performSearch()
      })
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters()
      })
    }
  }

  async loadInitialData() {
    await this.loadGenres()
    await this.performSearch()
  }

  async loadGenres() {
    try {
      const response = await fetch('/api/products/genres')
      const genres = await response.json()
      
      const genreSelect = document.getElementById('genre-filter')
      if (genreSelect && Array.isArray(genres)) {
        // Clear existing options except "All Genres"
        genreSelect.innerHTML = '<option value="all">All Genres</option>'
        
        genres.forEach(genre => {
          const option = document.createElement('option')
          option.value = genre
          option.textContent = genre
          genreSelect.appendChild(option)
        })
      }
    } catch (error) {
      console.error('Failed to load genres:', error)
    }
  }

  async loadSuggestions(query) {
    try {
      const response = await fetch(`/api/products/search-suggestions?q=${encodeURIComponent(query)}`)
      const { suggestions } = await response.json()
      
      this.displaySuggestions(suggestions)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }

  displaySuggestions(suggestions) {
    if (!this.suggestionsContainer || suggestions.length === 0) {
      this.hideSuggestions()
      return
    }

    const suggestionsHTML = suggestions.map(suggestion => `
      <div class="suggestion-item" data-text="${suggestion.text}" data-type="${suggestion.type}">
        <span class="suggestion-text">${suggestion.text}</span>
        <span class="suggestion-type">${suggestion.type}</span>
      </div>
    `).join('')

    this.suggestionsContainer.innerHTML = suggestionsHTML
    this.suggestionsContainer.style.display = 'block'

    // Bind click events to suggestions
    this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        this.searchInput.value = item.dataset.text
        this.currentFilters.search = item.dataset.text
        this.hideSuggestions()
        this.performSearch()
      })
    })
  }

  hideSuggestions() {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.style.display = 'none'
    }
  }

  async performSearch() {
    try {
      const params = new URLSearchParams()
      
      Object.keys(this.currentFilters).forEach(key => {
        if (this.currentFilters[key]) {
          params.append(key, this.currentFilters[key])
        }
      })

      params.append('page', this.currentPage)
      params.append('limit', 20)

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()
      
      this.displayResults(data)
      this.updateStats(data)

      // Track search analytics if there's a search query
      if (this.currentFilters.search.trim()) {
        this.trackSearchAnalytics(this.currentFilters.search, this.currentFilters, data.pagination?.total || 0)
        this.lastSearchQuery = this.currentFilters.search
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  displayResults(data) {
    if (!this.resultsContainer) return

    const { products, pagination } = data

    if (products.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="no-results">
          <h3>No products found</h3>
          <p>Try adjusting your search criteria or filters.</p>
        </div>
      `
      return
    }

    // Generate product cards HTML
    const productsHTML = products.map(product => `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-image">
          <img src="/images/${product.image}" alt="${product.title}" loading="lazy">
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.title}</h3>
          <p class="product-artist">${product.artist}</p>
          <p class="product-genre">${product.genre}</p>
          <p class="product-price">$${product.price}</p>
          <button class="add-to-cart-btn" data-product-id="${product.id}">
            Add to Cart
          </button>
        </div>
      </div>
    `).join('')

    this.resultsContainer.innerHTML = productsHTML

    // Add pagination if needed
    if (pagination.pages > 1) {
      this.addPagination(pagination)
    }

    // Bind add to cart events
    this.bindAddToCartEvents()
  }

  updateStats(data) {
    if (!this.statsContainer) return

    const { pagination } = data
    const start = ((pagination.page - 1) * pagination.limit) + 1
    const end = Math.min(pagination.page * pagination.limit, pagination.total)

    this.statsContainer.innerHTML = `
      <span class="search-results-count">
        Showing ${start}-${end} of ${pagination.total} products
      </span>
    `
  }

  addPagination(pagination) {
    // Add pagination controls (simplified for now)
    const paginationHTML = `
      <div class="pagination">
        ${pagination.page > 1 ? `<button onclick="advancedSearch.goToPage(${pagination.page - 1})">Previous</button>` : ''}
        <span>Page ${pagination.page} of ${pagination.pages}</span>
        ${pagination.page < pagination.pages ? `<button onclick="advancedSearch.goToPage(${pagination.page + 1})">Next</button>` : ''}
      </div>
    `
    
    this.resultsContainer.insertAdjacentHTML('afterend', paginationHTML)
  }

  goToPage(page) {
    this.currentPage = page
    this.performSearch()
  }

  bindAddToCartEvents() {
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn')
    addToCartBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.target.dataset.productId
        
        try {
          const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId: parseInt(productId) })
          })

          if (response.ok) {
            // Show success feedback
            e.target.textContent = 'Added!'
            setTimeout(() => {
              e.target.textContent = 'Add to Cart'
            }, 1500)

            // Trigger cart update via WebSocket if available
            if (window.websocketManager) {
              window.websocketManager.trackEvent('cart_add', { productId })
            }

            // Track product click analytics
            if (this.lastSearchQuery) {
              this.trackProductClick(productId, this.lastSearchQuery)
            }
          }
        } catch (error) {
          console.error('Failed to add to cart:', error)
        }
      })
    })
  }

  resetFilters() {
    this.currentFilters = {
      search: '',
      genre: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'title',
      sortOrder: 'asc'
    }

    // Reset UI elements
    if (this.searchInput) this.searchInput.value = ''
    
    const genreFilter = document.getElementById('genre-filter')
    if (genreFilter) genreFilter.value = 'all'
    
    const minPrice = document.getElementById('min-price')
    if (minPrice) minPrice.value = ''
    
    const maxPrice = document.getElementById('max-price')
    if (maxPrice) maxPrice.value = ''
    
    const sortBy = document.getElementById('sort-by')
    if (sortBy) sortBy.value = 'title'
    
    const sortOrder = document.getElementById('sort-order')
    if (sortOrder) sortOrder.value = 'asc'

    const clearBtn = document.getElementById('search-clear')
    if (clearBtn) clearBtn.style.display = 'none'

    this.currentPage = 1
    this.performSearch()
  }

  async trackSearchAnalytics(searchQuery, filters, resultsCount) {
    try {
      await fetch('/api/products/track-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchQuery,
          filters,
          resultsCount,
          sessionId: this.sessionId
        })
      })
    } catch (error) {
      console.warn('Failed to track search analytics:', error)
    }
  }

  async trackProductClick(productId, searchQuery) {
    try {
      await fetch('/api/products/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          searchQuery,
          sessionId: this.sessionId
        })
      })
    } catch (error) {
      console.warn('Failed to track product click:', error)
    }
  }

  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }
}

// Initialize advanced search when DOM is loaded
const advancedSearch = new AdvancedSearchService()

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => advancedSearch.init())
} else {
  advancedSearch.init()
}

// Export for global access
window.advancedSearch = advancedSearch