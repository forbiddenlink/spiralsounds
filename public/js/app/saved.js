// Saved records: everything this account saved for later.
import * as api from './api.js'
import { initShell, session } from './shell.js'
import { esc, recordTile, skeletonTiles } from './ui.js'

const grid = document.getElementById('saved-grid')
const sub = document.getElementById('saved-sub')
const root = document.getElementById('saved')
grid.innerHTML = skeletonTiles(4)

async function render() {
  if (!session().me) {
    sub.textContent = ''
    root.innerHTML = `<div class="state"><h2>Sign in to see saved records</h2><p>Tap the heart on any record to keep it here for later.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn--primary" href="/login.html?next=%2Fsaved.html">Sign in</a><a class="btn" href="/signup.html?next=%2Fsaved.html">Create an account</a></div></div>`
    return
  }
  try {
    const items = await api.getSaved()
    root.removeAttribute('aria-busy')
    if (!items.length) {
      sub.textContent = ''
      root.innerHTML = `<div class="state"><h2>Nothing saved yet</h2><p>Tap the heart on any record to keep it here for later.</p><a class="btn btn--primary" href="/">Browse records</a></div>`
      return
    }
    sub.textContent = `${items.length} record${items.length === 1 ? '' : 's'} you are thinking about.`
    grid.innerHTML = items.map(i => recordTile({ ...i, id: i.productId }, { saved: true })).join('')
  } catch (err) {
    root.innerHTML = `<div class="state"><h2>Saved records would not load</h2><p>${esc(err.message)}</p><button class="btn" type="button" id="retry">Try again</button></div>`
    document.getElementById('retry').addEventListener('click', () => location.reload())
  }
}

initShell({ active: 'saved' }).then(render)

// Unsaving here removes the tile once the request succeeds
document.addEventListener('ss:saved', e => {
  if (e.detail.saved) return
  grid.querySelector(`.record[data-id="${e.detail.id}"]`)?.remove()
  const n = grid.children.length
  sub.textContent = n ? `${n} record${n === 1 ? '' : 's'} you are thinking about.` : ''
  if (!n) root.innerHTML = `<div class="state"><h2>Nothing saved yet</h2><p>Tap the heart on any record to keep it here for later.</p><a class="btn btn--primary" href="/">Browse records</a></div>`
})
