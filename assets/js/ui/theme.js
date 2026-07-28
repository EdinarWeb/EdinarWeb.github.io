/** Inicializa y permite alternar los temas visuales sin afectar datos ni flujos de negocio. */
export function initializeTheme() {
    const root = document.documentElement;
    const toggle = document.querySelector("#themeToggle");
    const savedTheme = localStorage.getItem("dia-nit-theme");
    const systemTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

    /** Aplica el tema solicitado y actualiza controles del navegador. */
    const applyTheme = theme => {
        root.dataset.theme = theme;
        localStorage.setItem("dia-nit-theme", theme);
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#171522" : "#5B2DCB");
        toggle?.setAttribute("aria-label", theme === "dark" ? "Activar modo claro" : "Activar modo oscuro");
        if (toggle) toggle.textContent = theme === "dark" ? "☀" : "◐";
    };

    applyTheme(savedTheme || systemTheme);
    toggle?.addEventListener("click", () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark"));
}
