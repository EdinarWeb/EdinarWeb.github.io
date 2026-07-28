import { getElement } from "../utils/helpers.js";
import { toLocalDate } from "../utils/date.js";

/** Actualiza métricas y registra las acciones del dashboard. */
export class Dashboard {
    constructor(tasks, employees, panel, openEmployees) { this.tasks = tasks; this.employees = employees; this.panel = panel; this.openEmployees = openEmployees; }
    /** Conecta las tarjetas de métricas una única vez. */
    mount() {
        getElement("#cardToday").addEventListener("click", () => this.panel.open(toLocalDate()));
        getElement("#cardPending").addEventListener("click", () => this.panel.showResults(this.tasks.getPending(), "Pendientes"));
        getElement("#cardCompleted").addEventListener("click", () => this.panel.showResults(this.tasks.getCompleted(), "Completadas"));
        getElement("#cardEmployees").addEventListener("click", this.openEmployees);
    }
    /** Refresca los contadores visibles. */
    update() { const stats = this.tasks.stats(); getElement("#todayTasks").textContent = stats.today; getElement("#pendingTasks").textContent = stats.pending; getElement("#completedTasks").textContent = stats.completed; getElement("#employeeCount").textContent = this.employees.getAll().length; }
}
