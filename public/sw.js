/**
 * ALLO BETON — Service Worker (basique)
 * Cache-first pour les assets statiques, network-first pour les pages HTML et l'API
 */

const CACHE_VERSION = 'allobeton-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Assets à précharger
const PRECACHE_URLS = [
  '/',
  '/shop',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/logo-allo-beton.svg',
  '/logo-icon.svg',
];

// Installation : précharge les assets critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activation : supprime les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Jamais cacher les requêtes non-GET ni les autres origines non-autorisées
  if (request.method !== 'GET') return;

  // Jamais cacher l'API (données fraîches)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first pour le HTML (navigation)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/shop')))
    );
    return;
  }

  // Cache-first pour assets (js/css/images/fonts)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});

// Message channel pour skip waiting (update instantané)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
