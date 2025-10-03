// ===== Fetching products =====

export async function getProducts(filters = {}) {
  const queryParams = new URLSearchParams(filters)
  const res = await fetch(`/api/v1/products?${queryParams}`)
  const data = await res.json()
  return data.products || data // Handle both old and new response formats
}

// ===== Populate the genre dropdown =====

export async function populateGenreSelect() {
  const res = await fetch('/api/v1/products/genres')
  const data = await res.json()
  const genres = data.genres || data // Handle both old and new response formats
  const select = document.getElementById('genre-select')

  genres.forEach(genre => {
    const option = document.createElement('option')
    option.value = genre
    option.textContent = genre
    select.appendChild(option)
  })
}