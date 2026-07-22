const CACHE_NAME = 'dianit-v1.0.0';
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./sw.js",
  "./images/icon.png",
  "./images/512x512.png",
  "./images/384x384.png",
  "./images/192x192.png",
  "./images/96x96.png",
  "./images/72x72.png",
  "./images/48x48.png",
  "./images/apple-touch-icon.png"
];

// Instalación y almacenamiento en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activación y limpieza de cachés antiguas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones para trabajo Offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});