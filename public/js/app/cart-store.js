// One cart interface for both kinds of visitor. Signed in, the cart lives on
// the server. Signed out, it lives in this browser (product ids and quantities
// only; prices and stock are always read fresh) and moves into the account at
// sign-in. Guest line ids are "g<productId>" so they never collide with server ids.
import * as api from './api.js'

const KEY = 'ss:guest-cart'
const MAX_PER_LINE = 10

function readGuest() {
  try {
    const lines = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(lines) ? lines.filter(l => Number.isInteger(l.productId) && l.quantity > 0) : []
  } catch {
    return []
  }
}

function writeGuest(lines) {
  try {
    if (lines.length) localStorage.setItem(KEY, JSON.stringify(lines))
    else localStorage.removeItem(KEY)
  } catch {
    // storage blocked (private mode): the guest cart lasts for this page only
  }
}

const guestId = productId => `g${productId}`
const fromGuestId = lineId => Number(String(lineId).slice(1))
const isGuestLine = lineId => String(lineId).startsWith('g')

export const hasGuestItems = () => readGuest().length > 0

export async function count(signedIn) {
  if (signedIn) return api.getCartCount()
  return readGuest().reduce((n, l) => n + l.quantity, 0)
}

export async function lines(signedIn) {
  if (signedIn) return api.getCart()
  const guest = readGuest()
  const records = await Promise.all(guest.map(l => api.getRecord(l.productId).then(d => d.product).catch(() => null)))
  // Records that no longer exist drop out of the guest cart quietly
  const kept = guest.filter((_, i) => records[i])
  if (kept.length !== guest.length) writeGuest(kept)
  return kept.map(l => {
    const p = records[guest.indexOf(l)]
    return { cartItemId: guestId(p.id), productId: p.id, title: p.title, artist: p.artist, price: p.price, image: p.image, genre: p.genre, year: p.year, stock: p.stock, quantity: l.quantity }
  })
}

export async function add(productId, signedIn) {
  if (signedIn) return api.addToCart(productId)
  const id = Number(productId)
  const { product } = await api.getRecord(id)
  const guest = readGuest()
  const line = guest.find(l => l.productId === id)
  const next = (line?.quantity || 0) + 1
  if (next > product.stock) {
    throw new api.ApiError(product.stock === 0 ? 'This record is sold out' : `Only ${product.stock} in stock`, 409)
  }
  if (line) line.quantity = Math.min(next, MAX_PER_LINE)
  else guest.push({ productId: id, quantity: 1 })
  writeGuest(guest)
}

export async function setQuantity(lineId, quantity) {
  if (!isGuestLine(lineId)) return api.setQuantity(lineId, quantity)
  const id = fromGuestId(lineId)
  const { product } = await api.getRecord(id)
  if (quantity > product.stock) throw new api.ApiError(`Only ${product.stock} in stock`, 409)
  writeGuest(readGuest().map(l => (l.productId === id ? { ...l, quantity: Math.max(1, Math.min(quantity, MAX_PER_LINE)) } : l)))
}

export async function remove(lineId) {
  if (!isGuestLine(lineId)) return api.removeLine(lineId)
  const id = fromGuestId(lineId)
  writeGuest(readGuest().filter(l => l.productId !== id))
}

// Move the guest cart into the signed-in account. Copies the shop no longer
// has are skipped and reported; the guest cart is cleared either way so it is
// never merged twice.
export async function mergeIntoAccount() {
  const guest = readGuest()
  writeGuest([])
  let moved = 0
  const skipped = []
  for (const line of guest) {
    for (let i = 0; i < line.quantity; i++) {
      try {
        await api.addToCart(line.productId)
        moved += 1
      } catch (err) {
        if (err.status === 401) {
          writeGuest(guest)
          throw err
        }
        skipped.push(line.productId)
        break
      }
    }
  }
  return { moved, skipped: [...new Set(skipped)] }
}
