const CACHE_NAME = 'agrotech-v37-2026';
const urlsToCache = [
  './',
  './login.html',
  './forgot-password.html',
  './reset-password.html',
  './verificar-email.html',
  './index.html',
  './gastos.html',
  './ingresos.html',
  './balance.html',
  './inversiones.html',
  './n8n.html',
  './configuracion.html',
  './red.html',
  './envios.html',
  './ventas.html',
  './campo.html',
  './simulador.js',
  './campo-cosecha.js',
  './campo-stock.js',
  './clima.js',
  './campo-maquinaria.js',
  './envios-bins.js',
  './styles.css',
  './api.js',
  './icons.js',
  './shared.js',
  './manifest.json',
  './img/login-bg.jpg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Obliga a instalar la nueva versión al instante
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
      })
      .then(() => self.clients.claim()) // Toma el control de las pestañas abiertas
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 0. Las llamadas a la API nunca se cachean: son datos dinámicos y
  // deben viajar siempre a la red (evita servir respuestas viejas para
  // siempre, como pasó con /api/config/n8n).
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('onrender.com')) {
    event.respondWith(fetch(request));
    return;
  }

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
  } else if (url.origin === self.location.origin) {
    // 2. "Network First" también para el CSS y el JS propios: si el HTML es nuevo, sus scripts
    // tienen que ser los de la misma versión. Con "Cache First", un api.js guardado durante un
    // deploy quedaba viejo para siempre y la pantalla nueva fallaba ("... is not a function").
    // Sin conexión se usa la copia guardada.
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }))
    );
  } else {
    // 3. "Cache First" para las librerías de CDN (Chart.js, jsPDF): tienen la versión en la URL
    // y nunca cambian.
    event.respondWith(
      caches.match(request).then(response => {
        return (
          response ||
          fetch(request).then(fetchRes => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(request, fetchRes.clone());
              return fetchRes;
            });
          })
        );
      })
    );
  }
});
