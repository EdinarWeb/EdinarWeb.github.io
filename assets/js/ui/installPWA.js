/**
 * Gestiona la instalación de la PWA sin acoplarla al resto de la interfaz.
 * Chrome/Edge entregan el evento beforeinstallprompt; Safari para iOS requiere
 * guiar al usuario mediante el menú Compartir.
 */
let deferredInstallPrompt = null;
let installButton = null;
let iosInstructionsModal = null;

window.addEventListener("beforeinstallprompt", event => {
    // Se evita el aviso nativo automático para mostrarlo desde nuestro botón.
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallAvailability();
});

window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    hideInstallButton();
    showInstallToast("Aplicación instalada correctamente");
});

/** Inserta y configura la interfaz cuando el DOM ya está disponible. */
export function initializeInstallPWA() {
    if (isInstalled()) return;

    installButton = createInstallButton();
    iosInstructionsModal = createIOSInstructionsModal();
    document.body.append(installButton, iosInstructionsModal);

    // Safari para iOS no implementa beforeinstallprompt.
    if (isIOSSafari()) {
        showInstallButton();
        return;
    }

    updateInstallAvailability();
    window.matchMedia("(display-mode: standalone)").addEventListener?.("change", updateInstallAvailability);
}

/** Determina si la aplicación se está ejecutando como aplicación instalada. */
function isInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

/** Detecta Safari en iPhone/iPad, incluidos iPad con identificador de escritorio. */
function isIOSSafari() {
    const { userAgent, vendor, platform, maxTouchPoints } = navigator;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
    const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(userAgent) && /Apple/i.test(vendor);
    return isIOS && isSafari;
}

/** Sin beforeinstallprompt no existe una instalación controlable fuera de Safari iOS. */
function updateInstallAvailability() {
    if (!installButton) return;
    if (isInstalled() || !deferredInstallPrompt) hideInstallButton();
    else showInstallButton();
}

function createInstallButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "install-pwa-button";
    button.hidden = true;
    button.setAttribute("aria-label", "Instalar aplicación Dia & Nit");
    button.innerHTML = `
        <svg class="install-pwa-button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>
        <span>Instalar aplicación</span>`;
    button.addEventListener("click", onInstallButtonClick);
    return button;
}

async function onInstallButtonClick() {
    if (isIOSSafari()) {
        openIOSInstructions();
        return;
    }

    if (!deferredInstallPrompt || isInstalled()) {
        updateInstallAvailability();
        return;
    }

    const installEvent = deferredInstallPrompt;
    installButton.disabled = true;

    try {
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        // Si se cancela, se mantiene el evento para que el botón siga disponible.
        if (choice.outcome === "accepted") {
            deferredInstallPrompt = null;
            hideInstallButton();
        }
    } catch (error) {
        console.warn("No se pudo mostrar el diálogo de instalación.", error);
    } finally {
        installButton.disabled = false;
        updateInstallAvailability();
    }
}

function createIOSInstructionsModal() {
    const modal = document.createElement("div");
    modal.className = "install-pwa-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "install-pwa-modal-title");
    modal.innerHTML = `
        <div class="install-pwa-modal__backdrop" data-install-close></div>
        <section class="install-pwa-modal__dialog" role="document">
            <div class="install-pwa-modal__header">
                <h2 id="install-pwa-modal-title">Instalar Dia & Nit</h2>
                <button class="install-pwa-modal__close" type="button" aria-label="Cerrar instrucciones" data-install-close>&times;</button>
            </div>
            <p>Para añadir esta aplicación a tu pantalla de inicio en Safari:</p>
            <ol class="install-pwa-steps">
                <li><span class="install-pwa-step-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V3m0 0 4 4m-4-4L8 7M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg></span><span><strong>Pulsa el botón Compartir.</strong><small>Está en la barra inferior o superior de Safari.</small></span></li>
                <li><span class="install-pwa-step-icon" aria-hidden="true">+</span><span><strong>Selecciona «Añadir a pantalla de inicio».</strong><small>Desplázate si no aparece inicialmente.</small></span></li>
                <li><span class="install-pwa-step-icon install-pwa-step-icon--check" aria-hidden="true">✓</span><span><strong>Pulsa «Añadir».</strong><small>La aplicación aparecerá como un icono en tu inicio.</small></span></li>
            </ol>
        </section>`;
    modal.querySelectorAll("[data-install-close]").forEach(element => element.addEventListener("click", closeIOSInstructions));
    modal.addEventListener("keydown", event => { if (event.key === "Escape") closeIOSInstructions(); });
    return modal;
}

function openIOSInstructions() {
    iosInstructionsModal.hidden = false;
    document.body.classList.add("install-pwa-modal-open");
    iosInstructionsModal.querySelector(".install-pwa-modal__close").focus();
}

function closeIOSInstructions() {
    iosInstructionsModal.hidden = true;
    document.body.classList.remove("install-pwa-modal-open");
    installButton.focus();
}

function showInstallButton() {
    installButton.hidden = false;
    requestAnimationFrame(() => installButton.classList.add("install-pwa-button--visible"));
}

function hideInstallButton() {
    if (!installButton) return;
    installButton.classList.remove("install-pwa-button--visible");
    window.setTimeout(() => {
        if (!installButton.classList.contains("install-pwa-button--visible")) installButton.hidden = true;
    }, 220);
}

function showInstallToast(message) {
    const toast = document.createElement("div");
    toast.className = "install-pwa-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = message;
    document.body.append(toast);
    requestAnimationFrame(() => toast.classList.add("install-pwa-toast--visible"));
    window.setTimeout(() => {
        toast.classList.remove("install-pwa-toast--visible");
        window.setTimeout(() => toast.remove(), 220);
    }, 4200);
}
