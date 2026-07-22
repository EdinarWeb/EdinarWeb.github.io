const CACHE_NAME = "dianit-v7";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/sw.js",
  "/favicon.ico",
  "/images/icon.png",
  "/images/1575x1575.png",
  "/images/512x512.png",
  "/images/384x384.png",
  "/images/192x192.png",
  "/images/128x128.png",
  "/images/96x96.png",
  "/images/92x92.png",
  "/images/72x72.png",
  "/images/48x48.png",
  "/images/apple-touch-icon.png",
];

// 1. Instalación y precaché de recursos
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`No se pudo cachear el recurso inicial: ${asset}`, err);
        }
      }
    }),
  );
  self.skipWaiting();
});

// 2. Activación y limpieza de versiones viejas
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

// 3. Intercepción de peticiones (Robusta y sin errores no capturados)
self.addEventListener("fetch", (e) => {
  // Ignorar peticiones que no sean GET
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // IMPORTANTE: Filtrar y omitir esquemas que no sean HTTP/HTTPS (extensiones de Chrome, data:, etc.)
  if (!url.protocol.startsWith("http")) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Si está en caché, lo devuelve
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en caché, hace el fetch a la red capturando posibles errores
      return fetch(e.request)
        .then((networkResponse) => {
          // Si la respuesta no es válida o proviene de una extensión/CORS opaco, simplemente la devuelve
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // Guardar copia en la caché dinámicamente
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((err) => {
          console.warn(`Fallo de red al solicitar: ${e.request.url}`, err);

          // Si falla la red y es una navegación de página, devuelve la portada en caché
          if (e.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    }),
  );
});
