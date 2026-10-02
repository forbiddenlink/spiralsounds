// Shared page chrome: store strip, header, menu, footer, cart drawer, toasts,
// session state, and the add-to-cart / save actions used on every page.
import * as api from './api.js'
import * as cart from './cart-store.js'
import { esc, icon, cover, formatPrice, recordUrl } from './ui.js'

const state = { me: null, count: 0, saved: new Set(), ready: null }

const NAV = [
  { href: '/', label: 'Shop', key: 'shop' },
  { href: '/saved.html', label: 'Saved', key: 'saved' },
  { href: '/cart.html', label: 'Cart', key: 'cart' }
]

function headerHtml(active) {
  const nav = NAV.filter(n => n.key !== 'cart')
    .map(n => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a>`)
    .join('')
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="strip"><div class="wrap">
    <p>Demo shop: checkout places no real order.</p>
    <p>Free shipping on every order</p>
  </div></div>
  <header class="site-header"><div class="wrap">
    <a class="brand" href="/">Spiral Sounds</a>
    <nav class="nav" aria-label="Main">${nav}</nav>
    <form class="header-search" role="search" action="/" method="get">
      <label class="visually-hidden" for="site-search">Search records</label>
      ${icon('search')}
      <input id="site-search" name="q" type="search" placeholder="Search artists, titles, bins" autocomplete="off">
    </form>
    <div class="header-actions">
      <button type="button" class="icon-btn menu-btn search-toggle" aria-label="Search" aria-expanded="false" data-shell="search-toggle">${icon('search')}</button>
      <a class="icon-btn account-link" href="/login.html" data-shell="account" aria-label="Sign in">${icon('user')}</a>
      <button type="button" class="icon-btn" data-shell="cart" aria-label="Cart, 0 records">${icon('cart')}<span class="count-sticker" data-shell="count" hidden>0</span></button>
      <button type="button" class="icon-btn menu-btn" data-shell="menu" aria-label="Menu" aria-expanded="false" aria-controls="menu-sheet">${icon('menu')}</button>
    </div>
  </div></header>
  <div class="menu-sheet" id="menu-sheet" hidden>
    <nav aria-label="Mobile">
      ${NAV.map(n => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a>`).join('')}
      <a href="/login.html" data-shell="menu-account">Sign in</a>
    </nav>
  </div>`
}

function footerHtml(genres = []) {
  const bins = genres.map(g => `<li><a href="/?genre=${encodeURIComponent(g)}">${esc(g[0].toUpperCase() + g.slice(1))}</a></li>`).join('')
  return `<footer class="site-footer"><div class="wrap">
    <p class="footer-mark" aria-hidden="true">Spiral Sounds</p>
    <div class="footer-cols">
      <div><h2>Records, by the bin</h2><p class="muted" style="color:inherit;opacity:.75;max-width:38ch">A small vinyl shop built as a full-stack project: browse, save, and fill a cart. Checkout is a demo.</p></div>
      <div><h2>Bins</h2><ul data-shell="footer-bins">${bins}</ul></div>
      <div><h2>Your account</h2><ul>
        <li><a href="/saved.html">Saved records</a></li>
        <li><a href="/cart.html">Cart</a></li>
        <li><a href="/account-settings.html">Account settings</a></li>
      </ul></div>
    </div>
    <div class="footer-legal">
      <span>© ${new Date().getFullYear()} Spiral Sounds</span>
      <span><button type="button" data-shell="theme">Theme: system</button> <button type="button" data-shell="install" hidden>Install app</button></span>
    </div>
  </div></footer>`
}

const drawerHtml = `<dialog class="drawer" id="cart-drawer" aria-labelledby="drawer-title">
  <div class="drawer-head"><h2 id="drawer-title">Your cart</h2>
    <button type="button" class="icon-btn" data-shell="drawer-close" aria-label="Close cart">${icon('close')}</button></div>
  <div class="drawer-body" data-shell="drawer-body"></div>
  <div class="drawer-foot" data-shell="drawer-foot" hidden></div>
</dialog>
<div class="toaster" role="status" aria-live="polite" data-shell="toaster"></div>`

// ---------- Toasts ----------
export function toast(message, { action, href, onAction, tone } = {}) {
  const box = document.querySelector('[data-shell=toaster]')
  if (!box) return
  box.replaceChildren()
  const el = document.createElement('div')
  el.className = `toast${tone === 'error' ? ' toast--error' : ''}`
  el.innerHTML = `<span>${esc(message)}</span>`
  if (action && href) el.insertAdjacentHTML('beforeend', `<a href="${esc(href)}">${esc(action)}</a>`)
  if (action && onAction) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = action
    b.addEventListener('click', onAction)
    el.append(b)
  }
  box.append(el)
  clearTimeout(toast.t)
  toast.t = setTimeout(() => el.remove(), 5000)
}

const signInHref = () => `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`

// ---------- Cart count ----------
function paintCount(bump = false) {
  const el = document.querySelector('[data-shell=count]')
  const btn = document.querySelector('[data-shell=cart]')
  if (!el) return
  el.textContent = String(state.count)
  el.hidden = state.count === 0
  btn.setAttribute('aria-label', `Cart, ${state.count} record${state.count === 1 ? '' : 's'}`)
  if (bump && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.classList.remove('bump')
    void el.offsetWidth
    el.classList.add('bump')
  }
}

export async function refreshCount(bump = false) {
  try {
    state.count = await cart.count(Boolean(state.me))
    paintCount(bump)
  } catch {
    // count is decorative; leave the last known value
  }
}

// ---------- Cart drawer ----------
async function renderDrawer(highlightId) {
  const body = document.querySelector('[data-shell=drawer-body]')
  const foot = document.querySelector('[data-shell=drawer-foot]')
  body.innerHTML = '<p class="muted" style="padding:24px 0">Loading your cart…</p>'
  try {
    const items = await cart.lines(Boolean(state.me))
    if (!items.length) {
      body.innerHTML = `<div class="state"><h2>Nothing in the cart yet</h2><p>Dig through the bins and add something that catches your ear.</p><a class="btn" href="/">Browse records</a></div>`
      foot.hidden = true
      return
    }
    body.innerHTML = `<ul class="lines">${items.map(i => lineHtml(i, i.productId === highlightId)).join('')}</ul>`
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    foot.hidden = false
    foot.innerHTML = `<div class="totals"><div><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div><div class="muted"><span>Shipping</span><span>Free</span></div></div>
      <a class="btn btn--primary btn--block" href="/cart.html">Review and check out</a>${state.me ? '' : '<p class="muted" style="font-size:var(--t-xs);margin:0">You will sign in at checkout. This cart stays in this browser until then.</p>'}`
  } catch (err) {
    body.innerHTML = `<div class="notice notice--error">${esc(err.message)}</div>`
  }
}

export function lineHtml(i, highlight = false) {
  return `<li class="line" data-line="${esc(i.cartItemId)}"${highlight ? ' aria-current="true"' : ''}>
    <a href="${recordUrl(i.productId)}" tabindex="-1" aria-hidden="true">${cover(i, { size: 'sm', alt: '' })}</a>
    <div>
      <p class="line-title"><a href="${recordUrl(i.productId)}">${esc(i.title)}</a></p>
      <p class="line-artist">${esc(i.artist)}</p>${i.stock != null && i.quantity > i.stock ? `<p class="stock-note">${i.stock === 0 ? 'Sold out since you added it' : `Only ${i.stock} left`}</p>` : ''}
      <div class="line-controls">
        <div class="stepper" role="group" aria-label="Quantity of ${esc(i.title)}">
          <button type="button" data-qty="-1" aria-label="One fewer" ${i.quantity <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
          <output aria-live="polite">${esc(i.quantity)}</output>
          <button type="button" data-qty="1" aria-label="One more" ${i.quantity >= Math.min(10, i.stock ?? 10) ? 'disabled' : ''}>${icon('plus')}</button>
        </div>
        <button type="button" class="link-btn muted" data-remove>Remove</button>
      </div>
    </div>
    <p class="line-price">${formatPrice(i.price * i.quantity)}</p>
  </li>`
}

// Quantity and remove controls work the same in the drawer and on the cart page
export function bindLines(root, onChange) {
  root.addEventListener('click', async e => {
    const line = e.target.closest('[data-line]')
    if (!line) return
    const id = line.dataset.line
    const qtyBtn = e.target.closest('[data-qty]')
    const removeBtn = e.target.closest('[data-remove]')
    if (!qtyBtn && !removeBtn) return
    line.style.opacity = '0.55'
    try {
      if (qtyBtn) {
        const current = Number(line.querySelector('output').textContent)
        await cart.setQuantity(id, current + Number(qtyBtn.dataset.qty))
      } else {
        await cart.remove(id)
        toast('Removed from your cart')
      }
      await refreshCount()
      await onChange()
    } catch (err) {
      line.style.opacity = ''
      toast(err.message, { tone: 'error' })
    }
  })
}

export function openDrawer(highlightId) {
  const dlg = document.getElementById('cart-drawer')
  if (!dlg.open) dlg.showModal()
  return renderDrawer(highlightId)
}

// ---------- Actions ----------
export async function addRecord(productId, title, btn) {
  const label = btn?.textContent
  if (btn) {
    btn.disabled = true
    btn.textContent = 'Adding…'
  }
  try {
    await cart.add(productId, Boolean(state.me))
    await refreshCount(true)
    if (btn) {
      btn.classList.add('is-done')
      btn.textContent = 'In your cart'
    }
    await openDrawer(Number(productId))
  } catch (err) {
    toast(err.status === 401 ? 'Your session ended. Sign in again.' : err.message, { tone: 'error' })
    if (btn) btn.textContent = label
  } finally {
    if (btn) {
      btn.disabled = false
      setTimeout(() => {
        btn.classList.remove('is-done')
        btn.textContent = label
      }, 2400)
    }
  }
}

export async function toggleSave(productId, btn) {
  if (!state.me) {
    toast('Sign in to save records', { action: 'Sign in', href: signInHref() })
    return false
  }
  const id = Number(productId)
  const wasSaved = state.saved.has(id)
  const title = btn?.getAttribute('aria-label')?.replace(/^(Save|Unsave) /, '') || 'Record'
  try {
    if (wasSaved) {
      await api.unsaveRecord(id)
      state.saved.delete(id)
    } else {
      await api.saveRecord(id)
      state.saved.add(id)
    }
    document.querySelectorAll(`[data-action=save][data-id="${id}"]`).forEach(b => {
      b.setAttribute('aria-pressed', String(!wasSaved))
      b.setAttribute('aria-label', `${wasSaved ? 'Save' : 'Unsave'} ${title}`)
    })
    document.dispatchEvent(new CustomEvent('ss:saved', { detail: { id, saved: !wasSaved } }))
    toast(wasSaved ? 'Removed from saved records' : 'Saved for later', wasSaved ? {} : { action: 'View saved', href: '/saved.html' })
    return !wasSaved
  } catch (err) {
    toast(err.message, { tone: 'error' })
    return wasSaved
  }
}

export const isSaved = id => state.saved.has(Number(id))
export const session = () => state

// ---------- Theme ----------
const THEMES = ['system', 'light', 'dark']
function paintTheme() {
  let t = 'system'
  try {
    t = localStorage.getItem('ss:theme') || 'system'
  } catch {}
  const btn = document.querySelector('[data-shell=theme]')
  if (btn) btn.textContent = `Theme: ${t}`
  if (t === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
}

// ---------- Service worker ----------
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.hostname === '') return
  navigator.serviceWorker
    .register('/sw.js')
    .then(reg => {
      reg.addEventListener('updatefound', () => {
        const next = reg.installing
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            toast('A new version of the shop is ready', { action: 'Reload', onAction: () => location.reload() })
          }
        })
      })
    })
    .catch(() => {})
  let deferred
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferred = e
    const b = document.querySelector('[data-shell=install]')
    if (b) b.hidden = false
  })
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-shell=install]') || !deferred) return
    deferred.prompt()
    await deferred.userChoice
    deferred = null
    e.target.hidden = true
  })
}

// ---------- Init ----------
export function initShell({ active } = {}) {
  const top = document.getElementById('shell-top')
  const foot = document.getElementById('shell-foot')
  if (top) top.outerHTML = headerHtml(active)
  if (foot) foot.outerHTML = footerHtml()
  document.body.insertAdjacentHTML('beforeend', drawerHtml)

  const q = new URLSearchParams(location.search).get('q')
  const search = document.getElementById('site-search')
  if (q && search) search.value = q

  const header = document.querySelector('.site-header')
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8)
  addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  const menuBtn = document.querySelector('[data-shell=menu]')
  const sheet = document.getElementById('menu-sheet')
  menuBtn.addEventListener('click', () => {
    const open = sheet.hidden
    sheet.hidden = !open
    menuBtn.setAttribute('aria-expanded', String(open))
    menuBtn.innerHTML = icon(open ? 'close' : 'menu')
  })
  const searchToggle = document.querySelector('[data-shell=search-toggle]')
  searchToggle.addEventListener('click', () => {
    const form = document.querySelector('.header-search')
    const open = form.classList.toggle('is-open')
    searchToggle.setAttribute('aria-expanded', String(open))
    if (open) search.focus()
  })

  document.querySelector('[data-shell=cart]').addEventListener('click', () => openDrawer())
  const dlg = document.getElementById('cart-drawer')
  dlg.querySelector('[data-shell=drawer-close]').addEventListener('click', () => dlg.close())
  dlg.addEventListener('click', e => {
    if (e.target === dlg) dlg.close()
  })
  bindLines(dlg.querySelector('[data-shell=drawer-body]'), () => renderDrawer())

  document.querySelector('[data-shell=theme]')?.addEventListener('click', () => {
    let t = 'system'
    try {
      t = localStorage.getItem('ss:theme') || 'system'
      localStorage.setItem('ss:theme', THEMES[(THEMES.indexOf(t) + 1) % THEMES.length])
    } catch {}
    paintTheme()
  })
  paintTheme()

  // Record actions anywhere on the page
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]')
    if (!b) return
    if (b.dataset.action === 'add') addRecord(b.dataset.id, b.dataset.title, b)
    if (b.dataset.action === 'save') toggleSave(b.dataset.id, b)
  })

  registerServiceWorker()

  api.getGenres().then(genres => {
    const ul = document.querySelector('[data-shell=footer-bins]')
    if (ul) ul.innerHTML = genres.map(g => `<li><a href="/?genre=${encodeURIComponent(g)}">${esc(g[0].toUpperCase() + g.slice(1))}</a></li>`).join('')
  }).catch(() => {})

  state.ready = (async () => {
    try {
      state.me = await api.getMe()
    } catch {
      state.me = null
    }
    const account = document.querySelector('[data-shell=account]')
    const menuAccount = document.querySelector('[data-shell=menu-account]')
    if (state.me) {
      account.href = '/account-settings.html'
      account.setAttribute('aria-label', `Account: ${state.me.name}`)
      menuAccount.href = '/account-settings.html'
      menuAccount.textContent = 'Account'
      // A cart built before signing in joins the account's cart
      if (cart.hasGuestItems()) {
        try {
          const { moved, skipped } = await cart.mergeIntoAccount()
          if (moved) toast(`${moved} record${moved === 1 ? '' : 's'} from before you signed in ${moved === 1 ? 'is' : 'are'} in your cart`)
          if (skipped.length) toast('Some records you added earlier sold out and were left out', { tone: 'error' })
        } catch {
          // keep the guest cart for the next page load
        }
      }
      const [, saved] = await Promise.all([refreshCount(), api.getSaved().catch(() => [])])
      state.saved = new Set(saved.map(s => s.productId))
      document.querySelectorAll('[data-action=save]').forEach(b => {
        b.setAttribute('aria-pressed', String(state.saved.has(Number(b.dataset.id))))
      })
    } else {
      await refreshCount()
    }
    return state
  })()
  return state.ready
}

export async function signOut() {
  try {
    await api.logout()
  } catch {
    // clear client state either way
  }
  location.href = '/'
}
