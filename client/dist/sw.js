// Game Night service worker — offline-first for the app shell and game chunks.
// Same-device games work fully offline after the first visit.
// Bump VERSION on every deploy-affecting change: phones holding the old
// cache get a clean slate instead of stale game chunks that fail to load.
const VERSION = 'gn-v2';
const CORE = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Navigation: network-first, fall back to cached index.html (hash routing keeps it working).
// JS/CSS (hashed chunks): network-first so a new deploy is picked up
// immediately; cache is only the offline fallback. Other assets: cache-first.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // let API hit the network
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html')),
    );
    return;
  }
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((hit) => hit ?? fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(request, copy));
      return res;
    })),
  );
});
