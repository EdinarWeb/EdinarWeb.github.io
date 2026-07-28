import { renderCalendar } from "./calendar-render.js";
import { bindCalendarEvents } from "./calendar-events.js";

/** Mantiene las vistas, fecha visible y filtros del calendario profesional. */
export class Calendar {
    constructor(tasks, employees, handlers) {
        this.tasks = tasks;
        this.employees = employees;
        this.handlers = handlers;
        this.cursor = new Date();
        this.view = "month";
        this.filters = { employee: "", priority: "", type: "" };
    }

    /** Nombre localizado del mes de la fecha visible. */
    get monthName() { return new Intl.DateTimeFormat("es-ES", { month: "long" }).format(this.cursor); }
    /** Año visible. */
    get year() { return this.cursor.getFullYear(); }
    /** Renderiza la vista y enlaza sus controles. */
    render() { renderCalendar(this, this.tasks, this.employees); bindCalendarEvents(this, this.handlers); }
    /** Cambia la vista conservando la fecha seleccionada. */
    setView(view) { this.view = view; this.render(); }
    /** Avanza o retrocede según la granularidad de la vista. */
    move(offset) {
        const date = new Date(this.cursor);
        if (this.view === "month") date.setMonth(date.getMonth() + offset, 1);
        else date.setDate(date.getDate() + offset * (this.view === "day" ? 1 : 7));
        this.cursor = date;
        this.render();
    }
    /** Actualiza un filtro del calendario. */
    setFilter(name, value) { this.filters[name] = value; this.render(); }
    /** Decide si una tarea cumple el estado de filtros activo. */
    matches(task) { return (!this.filters.employee || String(task.employee) === this.filters.employee) && (!this.filters.priority || task.priority === this.filters.priority) && (!this.filters.type || task.type === this.filters.type); }
    /** Produce una fecha ISO local para un día concreto. */
    formatDate(day, date = this.cursor) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
    /** Devuelve el lunes de la semana visible. */
    weekStart() { const date = new Date(this.cursor); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date; }
}
