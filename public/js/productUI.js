import { addBtnListeners } from './cartService.js'
import { getProducts } from './productService.js'

// ===== Enhanced Product Rendering with Animations =====

export function renderProducts(products, showLoadingState = false) {
  const albumsContainer = document.getElementById('products-container')

  if (showLoadingState) {
    showLoadingSpinner()
    return
  }

  // Clear container with fade out animation
  albumsContainer.style.opacity = '0.6'

  setTimeout(() => {
    const cards = products.map((album, index) => {
      return `
        <div class="product-card" style="animation-delay: ${index * 0.1}s;">
          <div class="product-image-container">
            <img src="./images/${album.image}" alt="${album.title}" loading="lazy">
            <div class="image-overlay">
              <button class="quick-view-btn" data-id="${album.id}">
                <span>👁️</span> Quick View
              </button>
            </div>
          </div>
          <div class="product-info">
            <h3 class="product-title">${album.title}</h3>
            <p class="product-artist">${album.artist}</p>
            <div class="price-rating">
              <span class="price">$${album.price}</span>
              <div class="rating">
                ${'⭐'.repeat(Math.floor(Math.random() * 2) + 4)}
              </div>
            </div>
            <button class="btn btn-primary add-btn" data-id="${album.id}">
              <span class="btn-text">Add to Cart</span>
              <span class="btn-icon">🛒</span>
            </button>
          </div>
          <div class="product-meta">
            <span class="genre-label">${album.genre}</span>
            <button class="wishlist-btn" data-id="${album.id}" title="Add to Wishlist">
              <span class="heart">🤍</span>
            </button>
          </div>
        </div>
      `
    }).join('')

    albumsContainer.innerHTML = cards

    // Ensure cards are visible (fallback)
    setTimeout(() => {
      document.querySelectorAll('.product-card').forEach(card => {
        card.classList.add('loaded')
      })
    }, 100)

    // Fade back in with stagger animation
    albumsContainer.style.opacity = '1'

    // Add enhanced event listeners
    addBtnListeners()
    addWishlistListeners()
    addQuickViewListeners()

    // Show results count
    showSearchResults(products.length)
  }, 200)
}

// ===== Loading State =====
function showLoadingSpinner() {
  const albumsContainer = document.getElementById('products-container')
  albumsContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Finding amazing vinyl for you...</p>
    </div>
  `
}

// ===== Enhanced Search with Debouncing =====
let searchTimeout = null
let isSearching = false

export async function applySearchFilter() {
  const searchInput = document.getElementById('search-input')
  const search = searchInput.value.trim()

  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // Add loading state to input
  searchInput.classList.add('searching')

  // Debounce search
  searchTimeout = setTimeout(async () => {
    try {
      isSearching = true

      // Show loading state for longer searches
      if (search.length > 2) {
        renderProducts([], true)
      }

      const filters = {}
      if (search) filters.search = search

      const products = await getProducts(filters)
      renderProducts(products)

      // Update URL without reloading page
      const url = new URL(window.location)
      if (search) {
        url.searchParams.set('search', search)
      } else {
        url.searchParams.delete('search')
      }
      history.replaceState({}, '', url)

    } catch (error) {
      console.error('Search failed:', error)
      showSearchError()
    } finally {
      isSearching = false
      searchInput.classList.remove('searching')
    }
  }, 300) // 300ms debounce
}

// ===== Enhanced Event Listeners =====
function addWishlistListeners() {
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      toggleWishlist(btn)
    })
  })
}

function addQuickViewListeners() {
  document.querySelectorAll('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const productId = btn.dataset.id
      openQuickView(productId)
    })
  })
}

function toggleWishlist(btn) {
  const heart = btn.querySelector('.heart')
  const isLiked = heart.textContent === '❤️'

  heart.textContent = isLiked ? '🤍' : '❤️'
  btn.classList.toggle('liked', !isLiked)

  // Add animation
  btn.style.transform = 'scale(1.3)'
  setTimeout(() => {
    btn.style.transform = ''
  }, 200)

  // Show toast notification
  showToast(isLiked ? 'Removed from wishlist' : 'Added to wishlist', 'success')
}

function openQuickView(productId) {
  // Placeholder for modal functionality
  showToast('Quick view coming soon!', 'info')
}

function showSearchResults(count) {
  const existingCount = document.querySelector('.search-results-count')
  if (existingCount) existingCount.remove()

  if (count > 0) {
    const countElement = document.createElement('div')
    countElement.className = 'search-results-count'
    countElement.innerHTML = `
      <span>Found ${count} record${count !== 1 ? 's' : ''}</span>
    `

    const container = document.getElementById('products-container')
    container.parentNode.insertBefore(countElement, container)
  }
}

function showSearchError() {
  const albumsContainer = document.getElementById('products-container')
  albumsContainer.innerHTML = `
    <div class="error-container">
      <div class="error-icon">🎵</div>
      <h3>Oops! Something went wrong</h3>
      <p>We couldn't find any records right now. Please try again.</p>
      <button class="main-btn" onclick="location.reload()">Refresh</button>
    </div>
  `
}

function showToast(message, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(toast => toast.remove())

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span class="toast-message">${message}</span>
    </div>
  `

  document.body.appendChild(toast)

  // Animate in
  setTimeout(() => toast.classList.add('show'), 100)

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}
