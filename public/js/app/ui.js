// Small rendering helpers shared by every page.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ESC[ch])

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const formatPrice = n => money.format(Number(n) || 0)

// Sticker splits dollars and cents so the big number stays readable at small sizes
export function sticker(price, extraClass = '') {
  const [dollars, cents] = Number(price).toFixed(2).split('.')
  return `<span class="sticker ${extraClass}"><span class="visually-hidden">Price ${esc(formatPrice(price))}</span><span aria-hidden="true"><small>$</small>${dollars}<small>.${cents}</small></span></span>`
}

// Deterministic tilt per record so stickers look hand-applied but never jump between renders
export const tilt = id => `${((Number(id) * 37) % 13) - 10}deg`

const base = image => String(image || '').replace(/\.(png|jpe?g|webp)$/i, '')

// Covers ship as WebP with the original PNG as fallback
export function cover(product, { size = 'lg', eager = false, alt } = {}) {
  const name = base(product.image)
  const webp = size === 'sm' ? `/images/${name}-sm.webp` : `/images/${name}.webp`
  const dim = size === 'sm' ? 160 : 400
  const altText = alt ?? `${product.title} by ${product.artist}, album cover`
  return `<picture><source srcset="${esc(webp)}" type="image/webp"><img src="/images/${esc(product.image)}" alt="${esc(altText)}" width="${dim}" height="${dim}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`
}

export const recordUrl = id => `/record.html?id=${encodeURIComponent(id)}`

export function starsSummary(avg, count) {
  if (!count) return ''
  return `<span class="stars"><span class="visually-hidden">Rated ${esc(Number(avg).toFixed(1))} out of 5 from ${count} review${count === 1 ? '' : 's'}</span><span aria-hidden="true">${icon('star')}${esc(Number(avg).toFixed(1))} <span class="muted">(${count})</span></span></span>`
}

const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.8 1.1-1.7 2.7-2.8 4.7-2.8 3.3 0 5.7 3.1 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
  star: '<path fill="currentColor" stroke="none" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4L2.8 9.5l6.4-.8L12 2.8Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
}

export const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`

export const disc = product =>
  `<div class="disc" aria-hidden="true"><div class="disc-label">${cover(product, { size: 'sm', alt: '' })}</div></div>`

// One record in a grid. Cover and title share one link; add and save are separate buttons.
export function recordTile(p, { saved = false, eager = false } = {}) {
  return `<li class="record" data-id="${esc(p.id)}">
    <span class="record-cover" style="--tilt:${tilt(p.id)}">${cover(p, { eager })}${sticker(p.price)}</span>
    <div class="record-meta">
      <h3 class="record-title"><a href="${recordUrl(p.id)}">${esc(p.title)}</a></h3>
      <p class="record-artist">${esc(p.artist)}</p>
      <p class="record-facts"><span>${esc(p.year ?? '')}</span>${starsSummary(p.rating_avg, p.rating_count)}</p>
    </div>
    <div class="record-actions">
      <button type="button" class="btn btn--small" data-action="add" data-id="${esc(p.id)}" data-title="${esc(p.title)}">Add to cart</button>
      <button type="button" class="icon-btn save-btn" data-action="save" data-id="${esc(p.id)}" aria-pressed="${saved}" aria-label="Save ${esc(p.title)}">${icon('heart')}</button>
    </div>
  </li>`
}

export const skeletonTiles = n =>
  Array.from(
    { length: n },
    () =>
      '<li class="record is-skeleton" aria-hidden="true"><span class="record-cover"></span><div class="record-meta"><div class="skel" style="width:80%"></div><div class="skel" style="width:50%;margin-top:8px"></div></div></li>'
  ).join('')

// ----- Recently viewed (this device only) -----
const RECENT_KEY = 'ss:recent'
export function rememberViewed(p) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(r => r.id !== p.id)
    list.unshift({ id: p.id, title: p.title, artist: p.artist, image: p.image })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)))
  } catch {
    // storage blocked: recently viewed simply stays empty
  }
}

export function recentlyViewed(excludeId) {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(r => r.id !== excludeId)
  } catch {
    return []
  }
}

export const coverStrip = items =>
  `<ul class="cover-strip">${items
    .map(
      p =>
        `<li><a href="${recordUrl(p.id)}">${cover(p, { size: 'sm' })}<span>${esc(p.title)}</span><span class="muted">${esc(p.artist)}</span></a></li>`
    )
    .join('')}</ul>`
