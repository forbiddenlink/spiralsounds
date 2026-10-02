// Shop dashboard for staff accounts (analytics:view permission).
import * as api from './api.js'
import { initShell } from './shell.js'
import { esc, formatPrice } from './ui.js'

const root = document.getElementById('admin')
const sub = document.getElementById('admin-sub')
const num = new Intl.NumberFormat('en-US')
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

const bars = (rows, value, label, fmt = v => num.format(v)) => {
  const max = Math.max(1, ...rows.map(value))
  return `<ul style="list-style:none;margin:0;padding:0;display:grid;gap:12px">${rows
    .map(
      r => `<li><div style="display:flex;justify-content:space-between;font-size:var(--t-s)"><span style="text-transform:capitalize">${esc(label(r))}</span><strong>${esc(fmt(value(r)))}</strong></div>
      <div style="height:10px;border-radius:999px;background:var(--sleeve-2);margin-top:4px"><div style="height:100%;width:${(value(r) / max) * 100}%;border-radius:999px;background:var(--spiral)"></div></div></li>`
    )
    .join('')}</ul>`
}

async function render() {
  let data
  try {
    data = (await api.api('/analytics/dashboard')).data
  } catch (err) {
    root.removeAttribute('aria-busy')
    if (err.status === 401) {
      location.replace('/login.html?next=%2Fadmin.html')
      return
    }
    root.innerHTML =
      err.status === 403
        ? '<div class="state"><h2>This page is for shop staff</h2><p>Your account does not have access to the dashboard. If you think it should, ask the shop owner to add the analytics permission.</p><a class="btn" href="/">Back to the shop</a></div>'
        : `<div class="state"><h2>The dashboard would not load</h2><p>${esc(err.message)}</p><button class="btn" type="button" id="retry">Try again</button></div>`
    document.getElementById('retry')?.addEventListener('click', render)
    return
  }
  const s = data.salesOverview
  const u = data.userBehavior
  sub.textContent = `Updated ${timeFmt.format(new Date(data.lastUpdated))}. Orders count demo checkouts, which clear carts.`
  root.removeAttribute('aria-busy')
  const reviews = data.recentActivity?.recentReviews || []
  root.innerHTML = `
    <dl class="stat-grid">
      <div class="stat"><dt>Customers</dt><dd>${num.format(s.totalCustomers)}</dd></div>
      <div class="stat"><dt>Records in carts</dt><dd>${num.format(s.totalItemsSold)}</dd></div>
      <div class="stat"><dt>Cart value</dt><dd>${formatPrice(s.totalRevenue)}</dd></div>
      <div class="stat"><dt>New accounts this week</dt><dd>${num.format(u.newUsersThisWeek)}</dd></div>
    </dl>
    <div class="chart-grid">
      <section class="panel" aria-labelledby="g1"><h2 id="g1">Records per bin</h2><p>How the catalog is spread across genres.</p>
        ${bars(data.genreAnalytics, g => g.product_count, g => g.genre)}</section>
      <section class="panel" aria-labelledby="g2"><h2 id="g2">Average price per bin</h2><p>Mean list price in each genre.</p>
        ${bars(data.genreAnalytics, g => g.avg_price, g => g.genre, formatPrice)}</section>
      <section class="panel" aria-labelledby="g3"><h2 id="g3">Best performing records</h2><p>Ranked by sales, then ratings.</p>
        <table class="table"><thead><tr><th scope="col">Record</th><th scope="col">Sold</th><th scope="col">Rating</th></tr></thead><tbody>
        ${data.topProducts.slice(0, 6).map(p => `<tr><td><a href="/record.html?id=${p.id}">${esc(p.title)}</a><br><span class="muted">${esc(p.artist)}</span></td><td>${num.format(p.units_sold)}</td><td>${p.review_count ? `${Number(p.avg_rating).toFixed(1)} (${p.review_count})` : '<span class="muted">None</span>'}</td></tr>`).join('')}
        </tbody></table></section>
      <section class="panel" aria-labelledby="g4"><h2 id="g4">Latest reviews</h2><p>What buyers are saying.</p>
        ${reviews.length ? `<ul class="review-list">${reviews.slice(0, 4).map(r => `<li class="review"><header><strong>${esc(r.product_title || r.title || 'Record')}</strong><span class="muted">${esc(r.rating)} of 5</span></header>${r.comment ? `<p>${esc(r.comment)}</p>` : ''}</li>`).join('')}</ul>` : '<p class="muted">No reviews yet.</p>'}</section>
    </div>
    ${data.inventoryStatus ? '' : '<p class="notice" style="margin-top:16px">Stock levels are not tracked yet: the products table has no stock column. Adding one is listed for approval.</p>'}`
}

initShell({ active: 'account' }).then(state => {
  if (!state.me) {
    location.replace('/login.html?next=%2Fadmin.html')
    return
  }
  render()
})
