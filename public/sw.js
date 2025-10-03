/**
 * Spiral Sounds Service Worker
 * Provides offline functionality and caching for better performance
 */

const CACHE_NAME = 'spiral-sounds-v1.0.0'
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/cart.html',
  '/css/index.css',
  '/js/index.js',
  '/js/theme.js',
  '/js/productUI.js',
  '/js/productService.js',
  '/js/authUI.js',
  '/js/cartService.js',
  '/manifest.json'
]

const FALLBACK_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Spiral Sounds</title>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
            color: #F8FAFC;
            margin: 0;
            padding: 2rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .offline-container {
            max-width: 400px;
            padding: 2rem;
            background: rgba(30, 41, 59, 0.8);
            border-radius: 1rem;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        h1 { color: #06B6D4; margin-bottom: 1rem; }
        .vinyl-icon { font-size: 4rem; margin-bottom: 1rem; }
        .retry-btn {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #06B6D4 0%, #0891B2 100%);
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 600;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="vinyl-icon">🎵</div>
        <h1>You're Offline</h1>
        <p>It looks like you're not connected to the internet. Some features may not be available.</p>
        <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
    </div>
</body>
</html>
`

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.log('✅ Static assets cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error)
      })
  )
})

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch Event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Handle API requests with network-first strategy
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful API responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache for API requests
          return caches.match(request)
        })
    )
    return
  }

  // Handle page requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response.ok) {
              return response
            }

            // Clone and cache the response
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })

            return response
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return new Response(FALLBACK_HTML, {
                headers: { 'Content-Type': 'text/html' }
              })
            }

            // Return a generic offline response for other requests
            return new Response('Offline', { status: 503 })
          })
      })
  )
})

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)

  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCartData())
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received')

  const options = {
    body: 'Check out our latest vinyl arrivals!',
    icon: '/images/spiral_logo.png',
    badge: '/images/spiral_logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/?utm_source=push_notification'
    },
    actions: [
      {
        action: 'view',
        title: 'View Collection',
        icon: '/images/vinyl1.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('New Arrivals at Spiral Sounds!', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window if no existing window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Helper function to sync cart data
async function syncCartData() {
  try {
    // This would sync any offline cart changes when back online
    console.log('🛒 Syncing cart data...')
    // Implementation would depend on your cart storage strategy
    return Promise.resolve()
  } catch (error) {
    console.error('❌ Cart sync failed:', error)
    throw error
  }
}