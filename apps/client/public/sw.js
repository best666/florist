const CACHE_NAME = 'florist-v1'
const STATIC_ASSETS = [
  '/',
  '/static/icons/favicon-32x32.png',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  '/static/icons/apple-touch-icon.png',
  '/static/manifest.webmanifest',
]

/* ---- install: 预缓存核心静态资源 ---- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  self.skipWaiting()
})

/* ---- activate: 清理旧版本缓存 ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

/* ---- fetch: 静态资源缓存优先，API 请求走网络 ---- */
self.addEventListener('fetch', (event) => {
  const { pathname } = new URL(event.request.url)

  // API 请求：仅走网络，不缓存
  if (pathname.startsWith('/api/')) {
    return
  }

  // 静态资源：缓存优先，网络兜底
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      return cached || fetchPromise
    }),
  )
})
