/* eslint-disable no-restricted-globals */

// Service Worker minimaliste pour activer le mode PWA.
// Stratégie :
// - Pré-cache de quelques assets (offline.html, logo, manifest)
// - Navigation : network-first avec fallback offline
// - Assets statiques : cache-first

const CACHE_VERSION = 'thagora-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`

const PRECACHE_URLS = [
  '/offline.html',
  '/logo.jpeg',
  '/icon.svg',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await cache.addAll(PRECACHE_URLS)
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith('thagora-') && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

const isNavigationRequest = (request) =>
  request.mode === 'navigate' ||
  (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Navigation : network-first
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          // On ne met pas en cache les pages (auth/SSR) pour éviter des effets de bord.
          return response
        } catch {
          const cache = await caches.open(STATIC_CACHE)
          const offline = await cache.match('/offline.html')
          return offline || new Response('Offline', { status: 503, statusText: 'Offline' })
        }
      })()
    )
    return
  }

  // Assets : cache-first
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      const cached = await cache.match(request)
      if (cached) return cached

      try {
        const response = await fetch(request)
        // Cache uniquement les réponses valides / same-origin (avoid opaque)
        if (response && response.ok && new URL(request.url).origin === self.location.origin) {
          cache.put(request, response.clone())
        }
        return response
      } catch {
        return cached || new Response('', { status: 504, statusText: 'Gateway Timeout' })
      }
    })()
  )
})
