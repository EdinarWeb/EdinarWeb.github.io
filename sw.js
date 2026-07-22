const CACHE_NAME = "dianit-v3";
const ASSETS = [
  "/",
  "/https://dia-i-nit-organizador-de-tareas.netlify.app/",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/sw.js",
  "/images/icon.png",
  "/images/512x512.png",
  "/images/384x384.png",
  "/images/192x192.png",
  "/images/96x96.png",
  "/images/72x72.png",
  "/images/48x48.png",
  "/images/apple-touch-icon.png",
];

// Instalación y almacenamiento tolerante a fallos
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`No se pudo cachear el recurso: ${asset}`, err);
        }
      }
    }),
  );
  self.skipWaiting();
});

// Activación y limpieza de cachés antiguas
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// Intercepción de peticiones para modo Offline
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});
