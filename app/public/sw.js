const CACHE = 'dnevnik-plovtsa-v31'
const BASE_PATH = self.location.pathname.replace(/sw\.js$/, '')
const APP_SHELL = [BASE_PATH, `${BASE_PATH}index.html`, `${BASE_PATH}manifest.webmanifest`]
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())))
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())))
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const saveToCache = (response) => {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(event.request, copy))
    return response
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(saveToCache).catch(() => caches.match(`${BASE_PATH}index.html`)))
    return
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then(saveToCache).catch(() => caches.match(`${BASE_PATH}index.html`))))
})
