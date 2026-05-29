// Sentinel Pro Service Worker v3
// Minimal SW — network first for everything, no caching of assets
const CACHE_NAME = 'sentinel-pro-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL old caches on activate
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Network only — no caching at all
// Vercel CDN handles caching, we don't need SW cache
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
