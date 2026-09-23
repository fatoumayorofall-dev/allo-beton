// Service worker Fabima Store : ouverture rapide et consultation même avec une connexion faible.
const VERSION = 'fabima-v2'; // v2 : nouveau logo et nouvelles icônes
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/fonts/manrope-latin.woff2', '/fonts/cormorant-garamond-latin.woff2'];
const RUNTIME = `${VERSION}-runtime`;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API (commandes, compte, IA…) : toujours en direct
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // Pages : le réseau d'abord, la dernière version connue si hors ligne
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('/', copy));
        return res;
      }).catch(() => caches.match('/')),
    );
    return;
  }

  // Fichiers du site (noms versionnés) : la mémoire d'abord
  if (url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/fonts/'))) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    })));
    return;
  }

  // Polices et photos : version en mémoire tout de suite, mise à jour en arrière-plan
  if (/fonts\.(googleapis|gstatic)\.com$|images\.pexels\.com$/.test(url.hostname)) {
    event.respondWith(caches.open(RUNTIME).then(async cache => {
      const hit = await cache.match(req);
      const network = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); trim(RUNTIME, 150); }
        return res;
      }).catch(() => hit);
      return hit || network;
    }));
  }
});
