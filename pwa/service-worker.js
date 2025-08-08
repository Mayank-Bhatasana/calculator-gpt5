const CACHE = 'calc-cache-v1';
const ASSETS = [
  '../index.html',
  '../css/styles.css',
  '../js/app.js',
  '../js/storage.js',
  '../js/i18n.js',
  '../js/ui.js',
  '../js/history.js',
  '../js/memory.js',
  '../js/calculator-core.js',
  '../js/programmer.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : Promise.resolve()));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (req.method === 'GET' && res.ok && new URL(req.url).origin === location.origin) {
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});