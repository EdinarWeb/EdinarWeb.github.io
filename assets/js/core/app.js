import { storage } from "../storage/storage.js";
import { employeeManager } from "../employees/employees.js";
import { TaskPanel, taskManager } from "../tasks/tasks.js";
import { Calendar } from "../calendar/calendar.js";
import { Dashboard } from "../dashboard/dashboard.js";
import { TaskModal } from "../ui/modal.js";
import { SearchManager } from "../ui/search.js";
import { initializeTheme } from "../ui/theme.js";
import { ReminderManager } from "../ui/reminders.js";
import { preparePwaArchitecture } from "../ui/pwa.js";
import { initializeInstallPWA } from "../ui/installPWA.js";
import { formatToday } from "../utils/date.js";
import { getElement } from "../utils/helpers.js";

/** Arranca y coordina los módulos independientes de la aplicación. */
async function startApplication() {
    try {
        initializeTheme(); getElement("#today").textContent = formatToday(); await storage.open(); await employeeManager.load(); await taskManager.load();
        const modal = new TaskModal(taskManager, employeeManager); modal.mount();
        const panel = new TaskPanel(taskManager, employeeManager, modal); panel.mount();
        employeeManager.mountPanel({ onOpen: () => employeeManager.openPanel(), getTasks: () => taskManager.tasks });
        const calendar = new Calendar(taskManager, employeeManager, { onDay: date => { panel.open(date); modal.openNew(date); }, onTask: id => { const task = taskManager.getById(id); if (task) modal.openEdit(task); }, onDrop: async (id, date) => { const task = taskManager.getById(id); if (task && task.date !== date) await taskManager.update(id, { ...task, date }); } });
        const dashboard = new Dashboard(taskManager, employeeManager, panel, () => employeeManager.openPanel()); dashboard.mount();
        const search = new SearchManager(taskManager, employeeManager, panel, modal); search.mount();

        const reminders = new ReminderManager();
        const refreshTasks = () => { calendar.render(); dashboard.update(); panel.render(); reminders.schedule(taskManager.tasks); };
        const refreshEmployees = () => { modal.refreshEmployees(); panel.refreshEmployees(); employeeManager.renderPanel(); calendar.render(); dashboard.update(); panel.render(); };
        taskManager.subscribe(refreshTasks); employeeManager.subscribe(refreshEmployees);
        refreshEmployees(); refreshTasks();
    } catch (error) {
        console.error("No se pudo iniciar la aplicación.", error);
        alert("No se pudieron cargar los datos locales.");
    }
}

/** Registra el service worker cuando el navegador lo soporta. */
function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("./service-worker.js");
            const pwa = preparePwaArchitecture(registration);
            let refreshing = false;
            navigator.serviceWorker.addEventListener("controllerchange", () => { if (!refreshing) { refreshing = true; window.location.reload(); } });
            const offerUpdate = () => {
                if (registration.waiting && confirm("Hay una nueva versión disponible. ¿Actualizar ahora?")) pwa.activateUpdate();
            };
            registration.addEventListener("updatefound", () => {
                const installing = registration.installing;
                if (!installing) return;
                installing.addEventListener("statechange", () => {
                    if (installing.state === "installed" && navigator.serviceWorker.controller) offerUpdate();
                });
            });
            offerUpdate();
        } catch (error) { console.error("No se pudo registrar el Service Worker.", error); }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeInstallPWA();
    startApplication();
});
registerServiceWorker();
