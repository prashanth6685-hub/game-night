// Game Night service worker — offline-first for the app shell and game chunks.
// Same-device games work fully offline after the first visit.
const VERSION = 'gn-v1';
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
// Static assets: cache-first, then network.
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
  event.respondWith(
    caches.match(request).then((hit) => hit ?? fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(request, copy));
      return res;
    })),
  );
});
