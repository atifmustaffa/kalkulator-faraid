const CACHE_NAME = 'kalkulator-faraid-v1';
const ASSETS = [
  '/kalkulator-faraid/',
  '/kalkulator-faraid/index.html',
  '/kalkulator-faraid/main.js',
  '/kalkulator-faraid/favicon/favicon.ico',
  '/kalkulator-faraid/favicon/favicon-96x96.png',
  '/kalkulator-faraid/favicon/web-app-manifest-192x192.png',
  '/kalkulator-faraid/favicon/web-app-manifest-512x512.png',
  '/kalkulator-faraid/favicon/apple-touch-icon.png',
  '/kalkulator-faraid/favicon/site.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
