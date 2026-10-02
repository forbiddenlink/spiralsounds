// Cart page: lines with quantity steppers, order summary, and the demo checkout.
import * as api from './api.js'
import { initShell, session, bindLines, lineHtml, refreshCount, toast } from './shell.js'
import { esc, formatPrice, recordTile } from './ui.js'

const root = document.getElementById('cart')
const sub = document.getElementById('cart-sub')
const ready = initShell({ active: 'cart' })

async function suggestions() {
  try {
    const data = await api.getProducts({ sortBy: 'rating', sortOrder: 'desc', limit: 4 })
    return `<section class="section" aria-labelledby="suggest-title"><div class="section-head"><h2 id="suggest-title">Buyers’ favorites</h2><a href="/">Browse every bin</a></div>
      <ul class="records">${data.products.map(p => recordTile(p, { saved: session().saved.has(p.id) })).join('')}</ul></section>`
  } catch {
    return ''
  }
}

async function render() {
  root.setAttribute('aria-busy', 'true')
  if (!session().me) {
    sub.textContent = ''
    root.innerHTML = `<div class="state"><h2>Sign in to see your cart</h2><p>Carts are saved to your account so they follow you between devices.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn--primary" href="/login.html?next=%2Fcart.html">Sign in</a><a class="btn" href="/signup.html?next=%2Fcart.html">Create an account</a></div></div>`
    root.removeAttribute('aria-busy')
    return
  }
  let items
  try {
    items = await api.getCart()
  } catch (err) {
    root.innerHTML = `<div class="state"><h2>Your cart would not load</h2><p>${esc(err.message)}</p><button class="btn" type="button" id="retry">Try again</button></div>`
    document.getElementById('retry').addEventListener('click', render)
    root.removeAttribute('aria-busy')
    return
  }
  const count = items.reduce((n, i) => n + i.quantity, 0)
  if (!items.length) {
    sub.textContent = 'Nothing here yet.'
    root.innerHTML = `<div class="state"><h2>Your cart is empty</h2><p>Dig through the bins and add something that catches your ear.</p><a class="btn btn--primary" href="/">Browse records</a></div>${await suggestions()}`
    root.removeAttribute('aria-busy')
    return
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  sub.textContent = `${count} record${count === 1 ? '' : 's'}, ready when you are.`
  root.innerHTML = `<div class="cart-layout">
    <div><ul class="lines" id="lines">${items.map(i => lineHtml(i)).join('')}</ul>
      <p style="margin-top:24px"><a href="/">Keep browsing</a></p></div>
    <aside class="summary" aria-labelledby="summary-title">
      <h2 id="summary-title">Order summary</h2>
      <div class="totals">
        <div><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        <div><span>Shipping</span><span>Free</span></div>
        <div class="grand"><span>Total</span><span>${formatPrice(subtotal)}</span></div>
      </div>
      <button class="btn btn--primary btn--block" type="button" id="checkout">Place demo order</button>
      <p class="muted" style="font-size:var(--t-xs)">This shop is a demo. Placing an order clears your cart; no payment is taken and nothing ships.</p>
    </aside></div>`
  bindLines(document.getElementById('lines'), render)
  document.getElementById('checkout').addEventListener('click', checkout)
  root.removeAttribute('aria-busy')
}

async function checkout(e) {
  const btn = e.currentTarget
  btn.disabled = true
  btn.textContent = 'Placing order…'
  try {
    await api.clearCart()
    await refreshCount()
    sub.textContent = ''
    root.innerHTML = `<div class="state"><h2>Order placed</h2><p>Thanks for digging. Because this is a demo shop, no payment was taken and nothing will ship.</p><a class="btn btn--primary" href="/">Back to the bins</a></div>`
    root.querySelector('h2').setAttribute('tabindex', '-1')
    root.querySelector('h2').focus()
  } catch (err) {
    btn.disabled = false
    btn.textContent = 'Place demo order'
    toast(err.message, { tone: 'error' })
  }
}

ready.then(render)
