import { getElement } from "../utils/helpers.js";

/** Implementa búsqueda con debounce y navegación por teclado. */
export class SearchManager {
    constructor(tasks, employees, panel, modal) { this.tasks = tasks; this.employees = employees; this.panel = panel; this.modal = modal; this.timer = null; this.results = []; this.selected = 0; }
    /** Conecta entrada y teclado del buscador. */
    mount() { const input = getElement("#search"); input.addEventListener("input", () => this.debounce(input.value)); document.addEventListener("keydown", event => { if (document.activeElement !== input) return; if (event.key === "ArrowDown") { event.preventDefault(); this.move(1); } if (event.key === "ArrowUp") { event.preventDefault(); this.move(-1); } if (event.key === "Enter") { event.preventDefault(); this.openSelected(); } }); }
    /** Programa una búsqueda para evitar filtrar en cada pulsación. */
    debounce(value) { clearTimeout(this.timer); this.timer = setTimeout(() => this.search(value), 250); }
    /** Filtra tareas por sus campos consultables. */
    search(value) { const query = value.trim().toLocaleLowerCase(); if (!query) return this.panel.close(); this.results = this.tasks.tasks.filter(task => [task.title, task.notes, task.date, task.hour, task.priority, this.employees.getById(task.employee)?.name].some(field => String(field ?? "").toLocaleLowerCase().includes(query))); this.selected = 0; this.panel.showResults(this.results, "Resultados"); this.highlight(); }
    /** Mueve la selección entre resultados. */
    move(offset) { this.selected = Math.min(Math.max(this.selected + offset, 0), this.results.length - 1); this.highlight(); }
    /** Destaca la tarjeta correspondiente al resultado actual. */
    highlight() { document.querySelectorAll(".day-task-card.selected").forEach(card => card.classList.remove("selected")); const task = this.results[this.selected]; const card = task && [...document.querySelectorAll(".day-task-card[data-task-id]")].find(element => element.dataset.taskId === String(task.id)); card?.classList.add("selected"); }
    /** Abre el resultado seleccionado en el modal. */
    openSelected() { const task = this.results[this.selected]; if (task) this.modal.openEdit(task); }
}
