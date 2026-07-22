const CACHE_NAME = "dianit-v3";
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

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
