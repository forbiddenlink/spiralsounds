import { logout } from './logout.js'
import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js'
import { getProducts, populateGenreSelect } from './productService.js'
import { renderProducts, applySearchFilter } from './productUI.js'
import { updateCartIcon } from './cartService.js'

document.getElementById('logout-btn').addEventListener('click', logout)

// ===== Initial Load =====

async function init() {
  populateGenreSelect()
  const products = await getProducts()
  const name = await checkAuth()
  renderGreeting(name)
  renderProducts(products)
  showHideMenuItems(name)
  if (name) {
    await updateCartIcon()
  }
}

init()


// ===== Event Listeners =====

// Enhanced search with modern UX
document.getElementById('search-input').addEventListener('input', (e) => {
  e.preventDefault()
  applySearchFilter()
})

// Add search focus enhancement
document.getElementById('search-input').addEventListener('focus', (e) => {
  e.target.parentElement.classList.add('search-focused')
})

document.getElementById('search-input').addEventListener('blur', (e) => {
  setTimeout(() => {
    e.target.parentElement.classList.remove('search-focused')
  }, 200)
})

// Prevent form submission and enhance UX
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.target.blur() // Remove focus for better UX
  }
})

document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault()
  applySearchFilter()
})

document.getElementById('genre-select').addEventListener('change', async (e) => {
  const genre = e.target.value
  const products = await getProducts(genre ? { genre } : {})
  renderProducts(products)
})


