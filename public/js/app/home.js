// Home: wordmark hero with the featured record, the bins, and browse rows.
import * as api from './api.js'
import { initShell, session } from './shell.js'
import { esc, cover, disc, sticker, recordTile, skeletonTiles, recordUrl, starsSummary, recentlyViewed, coverStrip, tilt } from './ui.js'

const $ = id => document.getElementById(id)
const params = new URLSearchParams(location.search)
const view = {
  genre: params.get('genre') || '',
  q: params.get('q') || '',
  sort: params.get('sort') || 'title:asc',
  price: params.get('price') || ''
}

const ready = initShell({ active: 'shop' })
let request = 0

function syncUrl() {
  const url = new URL(location.href)
  for (const [k, v] of Object.entries(view)) {
    if (v && !(k === 'sort' && v === 'title:asc')) url.searchParams.set(k, v)
    else url.searchParams.delete(k)
  }
  history.replaceState(null, '', url)
}

async function loadGrid() {
  const grid = $('grid')
  const count = $('result-count')
  const mine = ++request
  grid.setAttribute('aria-busy', 'true')
  if (!grid.children.length || grid.querySelector('.is-skeleton')) grid.innerHTML = skeletonTiles(8)
  else grid.style.opacity = '0.5'

  const [sortBy, sortOrder] = view.sort.split(':')
  const [minPrice, maxPrice] = view.price.split(':')
  try {
    const data = await api.getProducts({ genre: view.genre, search: view.q, sortBy, sortOrder, minPrice, maxPrice, limit: 48 })
    if (mine !== request) return
    const state = session()
    const items = data.products
    grid.innerHTML = items.map((p, i) => recordTile(p, { saved: state.saved.has(p.id), eager: i < 4 && !view.q && !view.genre })).join('')
    const where = view.genre ? ` in ${esc(view.genre)}` : ''
    const matching = view.q ? ` matching “${esc(view.q)}”` : ''
    const filtered = view.q || view.genre || view.price
    count.innerHTML = `${data.pagination.total} record${data.pagination.total === 1 ? '' : 's'}${where}${matching}${filtered ? '<button type="button" class="link-btn" id="clear-filters">Show everything</button>' : ''}`
    if (!items.length) {
      grid.innerHTML = `<li class="state" style="grid-column:1/-1">
        <h2>Nothing in this bin${view.q ? ' for that search' : ''}</h2>
        <p>Try a different spelling, another bin, or a wider price range.</p>
        <button type="button" class="btn" data-clear>Show every record</button></li>`
    }
  } catch (err) {
    if (mine !== request) return
    count.textContent = ''
    grid.innerHTML = `<li class="state" style="grid-column:1/-1">
      <h2>The bins would not open</h2><p>${esc(err.message)}</p>
      <button type="button" class="btn" data-retry>Try again</button></li>`
  } finally {
    if (mine === request) {
      grid.style.opacity = ''
      grid.setAttribute('aria-busy', 'false')
    }
  }
}

function paintBins() {
  document.querySelectorAll('.bin').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.genre === view.genre)))
}

async function loadBins() {
  try {
    const [genres, all] = await Promise.all([api.getGenres(), api.getProducts({ limit: 100 })])
    const counts = all.products.reduce((m, p) => ((m[p.genre] = (m[p.genre] || 0) + 1), m), {})
    $('bins').innerHTML =
      `<button type="button" class="bin" data-genre="">All<span class="bin-count">${all.pagination.total}</span></button>` +
      genres
        .sort()
        .map(g => `<button type="button" class="bin" data-genre="${esc(g)}">${esc(g)}<span class="bin-count">${counts[g] || 0}</span></button>`)
        .join('')
    paintBins()
    return all.products
  } catch {
    return []
  }
}

function paintFeature(p) {
  const art = $('feature-art')
  art.innerHTML = `<span class="sleeve">${cover(p, { eager: true, alt: '' })}</span>${disc(p)}`
  // one orchestrated moment: the record slides out of its sleeve, then turns
  requestAnimationFrame(() => requestAnimationFrame(() => art.classList.add('is-out')))
  $('featured-note').innerHTML = `
    <p class="kicker">${p.rating_count ? 'Buyers’ favorite right now' : 'Newest release in the shop'}</p>
    <h2><a href="${recordUrl(p.id)}">${esc(p.title)}</a></h2>
    <p>${esc(p.artist)}, ${esc(p.year)} ${starsSummary(p.rating_avg, p.rating_count)}</p>
    <div class="row">
      <span style="--tilt:${tilt(p.id)}">${sticker(p.price)}</span>
      <button type="button" class="btn btn--primary" data-action="add" data-id="${p.id}" data-title="${esc(p.title)}">Add to cart</button>
      <a class="btn" href="${recordUrl(p.id)}">Read about it</a>
    </div>`
}

function paintTopRated(all) {
  const top = all.filter(p => p.rating_count > 0).sort((a, b) => b.rating_avg - a.rating_avg || b.rating_count - a.rating_count).slice(0, 4)
  if (top.length < 2) return
  const state = session()
  $('top-grid').innerHTML = top.map(p => recordTile(p, { saved: state.saved.has(p.id) })).join('')
  $('top-rated').hidden = false
}

function paintRecent() {
  const items = recentlyViewed()
  $('recent').hidden = !items.length
  if (items.length) $('recent-list').innerHTML = coverStrip(items)
}

// ----- events -----
$('bins').addEventListener('click', e => {
  const b = e.target.closest('.bin')
  if (!b) return
  view.genre = b.dataset.genre
  paintBins()
  syncUrl()
  loadGrid()
})

$('sort').addEventListener('change', e => {
  view.sort = e.target.value
  syncUrl()
  loadGrid()
})

$('price').addEventListener('change', e => {
  view.price = e.target.value
  syncUrl()
  loadGrid()
})

function clearAll() {
  Object.assign(view, { genre: '', q: '', price: '' })
  $('price').value = ''
  const s = document.getElementById('site-search')
  if (s) s.value = ''
  paintBins()
  syncUrl()
  loadGrid()
}

document.addEventListener('click', e => {
  if (e.target.closest('#clear-filters, [data-clear]')) clearAll()
  if (e.target.closest('[data-retry]')) loadGrid()
  if (e.target.closest('#recent-clear')) {
    try {
      localStorage.removeItem('ss:recent')
    } catch {}
    paintRecent()
  }
})

// Live search from the header field while on the home page
let debounce
document.addEventListener('input', e => {
  if (e.target.id !== 'site-search') return
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    view.q = e.target.value.trim()
    syncUrl()
    loadGrid()
  }, 250)
})
document.addEventListener('submit', e => {
  if (!e.target.matches('.header-search')) return
  e.preventDefault()
  view.q = document.getElementById('site-search').value.trim()
  syncUrl()
  loadGrid()
  $('shop').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
})

// ----- boot -----
$('sort').value = view.sort
$('price').value = view.price
$('grid').innerHTML = skeletonTiles(8)
if (view.q || view.genre) {
  // arriving from a search or bin link elsewhere: go straight to results
  requestAnimationFrame(() => $('shop').scrollIntoView())
}

const allPromise = loadBins()
ready.then(async () => {
  loadGrid()
  const all = await allPromise
  const featured = [...all].sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0) || b.year - a.year)[0]
  if (featured) paintFeature(featured)
  paintTopRated(all)
  paintRecent()
})
