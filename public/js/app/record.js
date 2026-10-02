// Record page: sleeve and disc, buy box, reviews, and records from the same bin.
import * as api from './api.js'
import { initShell, session, toast, isSaved } from './shell.js'
import { esc, cover, disc, sticker, tilt, recordTile, icon, rememberViewed, recentlyViewed, coverStrip } from './ui.js'

const root = document.getElementById('record')
const id = new URLSearchParams(location.search).get('id')
const ready = initShell({ active: 'shop' })

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const when = s => {
  const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z'))
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d)
}
const starRow = n => `<span class="stars" role="img" aria-label="${n} out of 5">${Array.from({ length: 5 }, (_, i) => `<span style="opacity:${i < n ? 1 : 0.2}">${icon('star')}</span>`).join('')}</span>`

function notFound(message) {
  document.title = 'Record not found: Spiral Sounds'
  root.removeAttribute('aria-busy')
  root.innerHTML = `<div class="state">
    <h1>${esc(message)}</h1>
    <p>It may have sold through or the link may be mistyped. The rest of the shop is a click away.</p>
    <a class="btn btn--primary" href="/">Browse the bins</a></div>`
}

function reviewsHtml(data, me) {
  const { rating, reviews } = data
  const mine = me && reviews.find(r => r.mine)
  const summary = rating.count
    ? `<p class="rating-big">${Number(rating.average).toFixed(1)}</p>${starRow(Math.round(rating.average))}<p class="muted">from ${rating.count} review${rating.count === 1 ? '' : 's'}</p>`
    : '<p class="muted">No reviews yet. If you own it, tell people what it sounds like.</p>'

  const form = me
    ? `<form id="review-form" class="panel" style="margin-top:24px" novalidate>
        <h3 style="font-size:var(--t-l);margin-bottom:12px">${mine ? 'Update your review' : 'Write a review'}</h3>
        <fieldset class="star-input" id="star-input"><legend class="label" style="margin-bottom:8px">Your rating</legend>
          ${[1, 2, 3, 4, 5].map(n => `<label title="${n} star${n > 1 ? 's' : ''}"><input type="radio" name="rating" value="${n}"${mine?.rating === n ? ' checked' : ''}>${icon('star')}<span class="visually-hidden">${n} star${n > 1 ? 's' : ''}</span></label>`).join('')}
        </fieldset>
        <div class="field" style="margin-top:16px"><label for="review-comment">What did you think? (optional)</label>
          <textarea class="textarea" id="review-comment" name="comment" maxlength="2000">${esc(mine?.comment || '')}</textarea></div>
        <p class="field-error" id="review-error" role="alert" hidden></p>
        <button class="btn btn--primary" type="submit" style="margin-top:16px">${mine ? 'Update review' : 'Post review'}</button>
      </form>`
    : `<p style="margin-top:24px"><a href="/login.html?next=${encodeURIComponent(location.pathname + location.search)}">Sign in</a> to write a review.</p>`

  const list = reviews.length
    ? `<ul class="review-list">${reviews
        .map(
          r => `<li class="review"><header><cite>${esc(r.author)}</cite>${starRow(r.rating)}<time class="muted" datetime="${esc(r.updated_at)}">${when(r.updated_at)}</time></header>${r.comment ? `<p class="prose">${esc(r.comment)}</p>` : ''}</li>`
        )
        .join('')}</ul>`
    : ''

  return `<section class="section reviews" aria-labelledby="reviews-title">
    <div><h2 id="reviews-title" style="font-size:var(--t-3xl);margin-bottom:16px">Reviews</h2>${summary}${form}</div>
    <div>${list}</div></section>`
}

function paintStars() {
  const checked = Number(document.querySelector('#star-input input:checked')?.value || 0)
  document.querySelectorAll('#star-input label').forEach((l, i) => l.classList.toggle('is-on', i < checked))
}

async function render() {
  if (!id || !/^\d+$/.test(id)) return notFound('That record is not in the bins')
  let data
  try {
    ;[data] = await Promise.all([api.getRecord(id), ready])
  } catch (err) {
    if (err.status === 404 || err.status === 400) return notFound('That record is not in the bins')
    root.removeAttribute('aria-busy')
    root.innerHTML = `<div class="state"><h1>This record would not load</h1><p>${esc(err.message)}</p><button class="btn" type="button" id="retry">Try again</button></div>`
    document.getElementById('retry').addEventListener('click', () => location.reload())
    return
  }

  const { product: p, related } = data
  const me = session().me
  document.title = `${p.title} by ${p.artist}: Spiral Sounds`
  document.querySelector('meta[name=description]').setAttribute('content', `${p.title} by ${p.artist} (${p.year}) on vinyl. ${p.description || ''}`.trim())
  rememberViewed(p)
  const saved = isSaved(p.id)

  root.removeAttribute('aria-busy')
  root.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><ol>
      <li><a href="/">Shop</a></li>
      <li><a href="/?genre=${encodeURIComponent(p.genre)}" style="text-transform:capitalize">${esc(p.genre)}</a></li>
      <li aria-current="page">${esc(p.title)}</li></ol></nav>
    <article class="record-hero">
      <div class="on-counter" id="art"><span class="sleeve">${cover(p, { eager: true })}</span>${disc(p)}</div>
      <div>
        <h1>${esc(p.title)}</h1>
        <p class="record-byline">${esc(p.artist)}</p>
        <div class="buy-box">
          <div class="buy-row">
            <span style="--tilt:${tilt(p.id)}">${sticker(p.price, 'sticker--large')}</span>
            <button type="button" class="btn ${p.stock === 0 ? 'is-soldout' : 'btn--primary'}" data-action="add" data-id="${p.id}" data-title="${esc(p.title)}"${p.stock === 0 ? ' disabled' : ''}>${p.stock === 0 ? 'Sold out' : 'Add to cart'}</button>
            <button type="button" class="btn save-btn" data-action="save" data-id="${p.id}" aria-pressed="${saved}" aria-label="${saved ? 'Unsave' : 'Save'} ${esc(p.title)}">${icon('heart')}<span>Save</span></button>
          </div>
          ${p.description ? `<p class="prose" style="font-size:var(--t-l);line-height:1.45">${esc(p.description)}</p>` : ''}
          <dl class="facts">
            <dt>Artist</dt><dd>${esc(p.artist)}</dd>
            <dt>Released</dt><dd>${esc(p.year ?? 'Unknown')}</dd>
            <dt>In stock</dt><dd>${p.stock === 0 ? 'Sold out' : `${esc(p.stock)} ${p.stock === 1 ? 'copy' : 'copies'}`}</dd>
            <dt>Bin</dt><dd class="cap"><a href="/?genre=${encodeURIComponent(p.genre)}">${esc(p.genre)}</a></dd>
            <dt>Format</dt><dd>Vinyl LP</dd>
            <dt>Shipping</dt><dd>Free on every order</dd>
          </dl>
        </div>
      </div>
    </article>
    <div id="reviews">${reviewsHtml(data, me)}</div>
    ${
      related.length
        ? `<section class="section" aria-labelledby="related-title"><div class="section-head"><h2 id="related-title">${related.every(r => r.genre === p.genre) ? 'From the same bin' : 'More to dig through'}</h2><a href="/?genre=${encodeURIComponent(p.genre)}">See all ${esc(p.genre)}</a></div>
      <ul class="records">${related.map(r => recordTile(r, { saved: isSaved(r.id) })).join('')}</ul></section>`
        : ''
    }
    ${(() => {
      const recent = recentlyViewed(p.id)
      return recent.length ? `<section class="section" aria-labelledby="recent-title"><div class="section-head"><h2 id="recent-title">You looked at these</h2></div>${coverStrip(recent)}</section>` : ''
    })()}`

  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('art').classList.add('is-out')))
  bindReview()
}

function bindReview() {
  const form = document.getElementById('review-form')
  if (!form) return
  paintStars()
  form.addEventListener('change', paintStars)
  form.addEventListener('submit', async e => {
    e.preventDefault()
    const err = document.getElementById('review-error')
    const rating = Number(form.rating.value)
    if (!rating) {
      err.textContent = 'Choose a rating from 1 to 5 stars.'
      err.hidden = false
      form.querySelector('#star-input input').focus()
      return
    }
    err.hidden = true
    const btn = form.querySelector('button[type=submit]')
    btn.disabled = true
    btn.textContent = 'Posting…'
    try {
      await api.saveReview(id, { rating, comment: form.comment.value })
      const data = await api.getRecord(id)
      document.getElementById('reviews').innerHTML = reviewsHtml(data, session().me)
      bindReview()
      toast('Review posted')
    } catch (e2) {
      err.textContent = e2.message
      err.hidden = false
      btn.disabled = false
      btn.textContent = 'Post review'
    }
  })
}

render()

