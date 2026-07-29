const VERSION = "v9";
const SHELL_CACHE = `dia-nit-shell-${VERSION}`;
const RUNTIME_CACHE = `dia-nit-runtime-${VERSION}`;
const OFFLINE_URL = "./offline.html";
const APP_SHELL = [
    "./", "./index.html", OFFLINE_URL, "./manifest.json",
    "./assets/css/style.css", "./assets/css/base/variables.css", "./assets/css/base/reset.css", "./assets/css/base/typography.css", "./assets/css/base/animations.css", "./assets/css/base/utilities.css",
    "./assets/css/layout/sidebar.css", "./assets/css/layout/header.css", "./assets/css/layout/dashboard.css",
    "./assets/css/components/button.css", "./assets/css/components/card.css", "./assets/css/components/modal.css", "./assets/css/components/install-button.css", "./assets/css/components/badge.css", "./assets/css/components/form.css",
    "./assets/css/pages/calendar.css", "./assets/css/pages/employees.css", "./assets/css/pages/tasks.css",
    "./assets/css/responsive/mobile.css", "./assets/css/responsive/tablet.css", "./assets/css/responsive/desktop.css",
    "./assets/js/core/app.js", "./assets/js/storage/storage.js", "./assets/js/calendar/calendar.js", "./assets/js/calendar/calendar-render.js", "./assets/js/calendar/calendar-events.js",
    "./assets/js/employees/employees.js", "./assets/js/tasks/tasks.js", "./assets/js/dashboard/dashboard.js", "./assets/js/ui/modal.js", "./assets/js/ui/theme.js", "./assets/js/ui/reminders.js", "./assets/js/ui/search.js", "./assets/js/ui/pwa.js", "./assets/js/ui/installPWA.js",
    "./assets/js/utils/helpers.js", "./assets/js/utils/constants.js", "./assets/js/utils/date.js", "./assets/js/utils/validator.js",
    "./assets/icons/icon-72.png", "./assets/icons/icon-96.png", "./assets/icons/icon-128.png", "./assets/icons/icon-144.png", "./assets/icons/icon-152.png", "./assets/icons/icon-192.png", "./assets/icons/icon-384.png", "./assets/icons/icon-512.png"
];

/** Precachea la aplicación necesaria para el primer uso sin conexión. */
self.addEventListener("install", event => {
    event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL)));
});

/** Elimina caches obsoletas y asume control de clientes actuales. */
self.addEventListener("activate", event => {
    event.waitUntil(Promise.all([
        caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("dia-nit-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)))),
        enableNavigationPreload(),
        self.clients.claim()
    ]));
});

/** Aplica una estrategia específica para navegación y recursos estáticos. */
self.addEventListener("fetch", event => {
    const { request } = event;
    if (request.method !== "GET") return;
    if (request.mode === "navigate") return event.respondWith(networkFirstNavigation(event));
    if (new URL(request.url).origin === self.location.origin) event.respondWith(staleWhileRevalidate(request));
});

/** Prioriza contenido actualizado para documentos y entrega offline cuando no hay red. */
async function networkFirstNavigation(event) {
    const { request } = event;
    try {
        // Chrome Android puede iniciar la petición en paralelo con el arranque del SW.
        const response = await event.preloadResponse || await fetch(request);
        cacheResponse(SHELL_CACHE, request, response.clone());
        return response;
    } catch {
        return (await caches.match(request, { ignoreSearch: true })) || (await caches.match("./index.html")) || (await caches.match(OFFLINE_URL));
    }
}

/** Activa Navigation Preload cuando Chrome lo ofrece para acelerar navegaciones. */
async function enableNavigationPreload() {
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
}

/** Sirve recursos cacheados de inmediato mientras refresca la cache en segundo plano. */
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const network = fetch(request).then(response => {
        cacheResponse(RUNTIME_CACHE, request, response.clone());
        return response;
    }).catch(() => cached || new Response("Sin conexión", { status: 503, statusText: "Offline" }));
    return cached || network;
}

/** Guarda únicamente respuestas válidas del mismo origen. */
function cacheResponse(cacheName, request, response) {
    if (response?.ok && response.type === "basic") caches.open(cacheName).then(cache => cache.put(request, response));
}

/** Recibe notificaciones push cuando un servidor se conecte a la suscripción VAPID. */
self.addEventListener("push", event => {
    const payload = safePayload(event.data);
    event.waitUntil(self.registration.showNotification(payload.title || "Dia & Nit", {
        body: payload.body || "Tienes una actualización pendiente.",
        icon: "./assets/icons/icon-192.png",
        badge: "./assets/icons/icon-72.png",
        data: { url: payload.url || "./" },
        tag: payload.tag || "dia-nit-notification",
        renotify: Boolean(payload.renotify)
    }));
});

/** Abre o enfoca la aplicación desde una notificación. */
self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
        const existing = clientList.find(client => "focus" in client);
        return existing ? existing.focus() : clients.openWindow(event.notification.data?.url || "./");
    }));
});

/** Informa a la aplicación cuando un navegador renueva una suscripción Push. */
self.addEventListener("pushsubscriptionchange", event => {
    event.waitUntil(broadcast({ type: "PUSH_SUBSCRIPTION_CHANGED" }));
});

/** Punto de extensión para sincronización diferida con una futura API remota. */
self.addEventListener("sync", event => {
    if (event.tag === "dia-nit-sync") event.waitUntil(broadcast({ type: "BACKGROUND_SYNC_READY" }));
});

/** Gestiona activación explícita de versiones y solicitudes futuras de sync. */
self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
    if (event.data?.type === "REQUEST_BACKGROUND_SYNC" && self.registration.sync) event.waitUntil(self.registration.sync.register("dia-nit-sync"));
});

/** Publica un mensaje a todas las ventanas visibles de la aplicación. */
async function broadcast(message) { const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true }); clientList.forEach(client => client.postMessage(message)); }

/** Convierte de forma segura el contenido opcional de una notificación push. */
function safePayload(data) { try { return data?.json() || {}; } catch { return { body: data?.text() || "" }; } }
