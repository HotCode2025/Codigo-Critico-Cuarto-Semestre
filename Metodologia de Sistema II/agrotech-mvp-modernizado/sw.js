const CACHE_NAME = 'agrotech-v2-2026';
const urlsToCache = [
  './',
  './index.html',
  './pantalla2.html',
  './pantalla3.html',
  './pantalla4.html',
  './pantalla5.html',
  './pantalla6.html',
  './pantalla7.html',
  './styles.css',
  './shared.js',
  './demo-data.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).catch(() => {
        // Si es una página HTML y no hay red, mostrar offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
