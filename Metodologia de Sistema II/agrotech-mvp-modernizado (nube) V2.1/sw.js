const CACHE_NAME = 'agrotech-v6-2026';
const urlsToCache = [
  './',
  './login.html',
  './forgot-password.html',
  './reset-password.html',
  './index.html',
  './pantalla2.html',
  './pantalla3.html',
  './pantalla4.html',
  './pantalla5.html',
  './pantalla6.html',
  './pantalla7.html',
  './pantalla8.html',
  './styles.css',
  './api.js',
  './shared.js',
  './manifest.json',
  './img/login-bg.jpg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Obliga a instalar la nueva versión al instante
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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
    }).then(() => self.clients.claim()) // Toma el control de las pestañas abiertas
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // 1. Estrategia "Network First" para HTML (pantallas)
  // Garantiza que si hay internet, siempre se descargue la última versión de la interfaz.
  if (request.destination === 'document' || request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Si la red responde, guardamos la copia fresca y la mostramos
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // Si falla la red (offline), mostramos la vista cacheada
          return caches.match(request).then(cachedResponse => {
             return cachedResponse || caches.match('./index.html');
          });
        })
    );
  } else {
    // 2. Estrategia "Cache First" para el resto de recursos (CSS, JS, JSON)
    // Carga ultrarrápida desde el teléfono
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, fetchRes.clone());
            return fetchRes;
          });
        });
      })
    );
  }
});