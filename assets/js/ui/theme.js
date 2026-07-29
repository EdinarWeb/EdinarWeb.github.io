/** Inicializa y permite alternar los temas visuales sin afectar datos ni flujos de negocio. */
export function initializeTheme() {
    const root = document.documentElement;
    const toggle = document.querySelector("#themeToggle");
    let savedTheme = null;
    try { savedTheme = localStorage.getItem("dia-nit-theme"); } catch { /* El tema del sistema sigue disponible. */ }
    const systemTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

    /** Aplica el tema solicitado y actualiza controles del navegador. */
    const applyTheme = theme => {
        root.dataset.theme = theme;
        try { localStorage.setItem("dia-nit-theme", theme); } catch { /* El modo privado puede bloquear almacenamiento. */ }
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#171522" : "#5B2DCB");
        toggle?.setAttribute("aria-label", theme === "dark" ? "Activar modo claro" : "Activar modo oscuro");
        if (toggle) toggle.textContent = theme === "dark" ? "☀" : "◐";
    };

    applyTheme(savedTheme || systemTheme);
    toggle?.addEventListener("click", () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark"));
}
