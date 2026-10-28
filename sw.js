const CACHE_NAME = 'camper-solar-v1';
const ASSETS = [
  '/camper-solar/',
  '/camper-solar/index.html',
  '/camper-solar/styles.css',
  '/camper-solar/app.js',
  '/camper-solar/manifest.json',
  '/camper-solar/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => caches.match('/camper-solar/index.html')))
  );
});
