// Cart page: lines with quantity steppers, order summary, and the demo checkout.
import * as api from './api.js'
import * as cart from './cart-store.js'
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
  const signedIn = Boolean(session().me)
  let items
  try {
    items = await cart.lines(signedIn)
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
  const short = items.some(i => i.quantity > i.stock)
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
      ${short ? '<p class="stock-note" role="alert">Remove or reduce the records marked above to check out.</p>' : ''}
      ${
        signedIn
          ? `<button class="btn btn--primary btn--block" type="button" id="checkout"${short ? ' disabled' : ''}>Place demo order</button>
      <p class="muted" style="font-size:var(--t-xs)">This shop is a demo. Your order is saved to your account, but no payment is taken and nothing ships.</p>`
          : `<a class="btn btn--primary btn--block" href="/login.html?next=%2Fcart.html">Sign in to check out</a>
      <a class="btn btn--block" href="/signup.html?next=%2Fcart.html">Create an account</a>
      <p class="muted" style="font-size:var(--t-xs)">Your cart moves into your account when you sign in. Until then it stays in this browser.</p>`
      }
    </aside></div>`
  bindLines(document.getElementById('lines'), render)
  document.getElementById('checkout')?.addEventListener('click', checkout)
  root.removeAttribute('aria-busy')
}

async function checkout(e) {
  const btn = e.currentTarget
  btn.disabled = true
  btn.textContent = 'Placing order…'
  try {
    const order = await api.placeOrder()
    await refreshCount()
    sub.textContent = ''
    root.innerHTML = `<div class="state"><h2>Order ${esc(order.id)} placed</h2>
      <p>${order.itemCount} record${order.itemCount === 1 ? '' : 's'}, ${formatPrice(order.total)}. It is saved to your account. Because this is a demo shop, no payment was taken and nothing will ship.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn--primary" href="/">Back to the bins</a><a class="btn" href="/account-settings.html#orders">See your orders</a></div></div>`
    root.querySelector('h2').setAttribute('tabindex', '-1')
    root.querySelector('h2').focus()
  } catch (err) {
    toast(err.message, { tone: 'error' })
    // Stock may have changed under the cart; redraw so the lines show it
    if (err.status === 409) return render()
    btn.disabled = false
    btn.textContent = 'Place demo order'
  }
}

ready.then(render)
