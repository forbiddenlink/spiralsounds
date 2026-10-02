// Spiral Sounds service worker.
// Pages: network first, cached copy when offline. Static assets: cache first, refreshed in
// the background. API responses are never cached, so carts and accounts are always live.

const CACHE_NAME = 'spiral-sounds-v2'
const PRECACHE = [
  '/',
  '/index.html',
  '/record.html',
  '/cart.html',
  '/saved.html',
  '/404.html',
  '/css/spiral.css',
  '/js/app/theme-boot.js',
  '/js/app/api.js',
  '/js/app/ui.js',
  '/js/app/shell.js',
  '/js/app/home.js',
  '/images/favicon-64.png',
  '/images/icon-192.png'
]

const OFFLINE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline: Spiral Sounds</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f6f3;color:#1c1a33;font:18px/1.5 system-ui,sans-serif;padding:24px}
h1{font-size:2.5rem;line-height:1;margin:0 0 12px}a{color:#b81d50}</style></head>
<body><main><h1>You are offline</h1><p>The shop needs a connection to show records and your cart.</p><p><a href="/">Try again</a></p></main></body></html>`

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => {})
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          }
          return response
        })
        .catch(() =>
          caches
            .match(request, { ignoreSearch: true })
            .then(cached => cached || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } }))
        )
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached || Response.error())
      return cached || network
    })
  )
})
