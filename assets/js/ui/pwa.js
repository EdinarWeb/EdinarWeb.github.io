/** Prepara actualización, Push y Background Sync sin requerir aún un servidor remoto. */
export function preparePwaArchitecture(registration) {
    navigator.serviceWorker.addEventListener("message", event => {
        if (event.data?.type === "BACKGROUND_SYNC_READY") console.info("La arquitectura de sincronización está lista para conectar una API.");
        if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") console.info("La suscripción Push cambió y está lista para sincronizarse con una API.");
    });
    return {
        /** Activa una versión nueva del service worker tras confirmación de usuario. */
        activateUpdate: () => registration.waiting?.postMessage({ type: "SKIP_WAITING" })
    };
}
