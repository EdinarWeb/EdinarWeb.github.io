import { storage } from "../storage/storage.js";
import { COPY, REMINDER_OPTIONS, TASK_PRIORITIES, TASK_STATUS, TASK_TYPES } from "../utils/constants.js";
import { createElement, createId, getElement } from "../utils/helpers.js";
import { normalizeText, validateTask } from "../utils/validator.js";
import { toLocalDate } from "../utils/date.js";

/** Gestiona la colección persistente de tareas. */
export class TaskManager {
    constructor() { this.tasks = []; this.byDate = new Map(); this.listeners = new Set(); }
    /** Suscribe una vista a los cambios de tareas. */
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    /** Notifica cambios de la colección. */
    notify() { this.listeners.forEach(listener => listener()); }
    /** Carga tareas y normaliza datos creados con versiones anteriores. */
    async load() { this.tasks = (await storage.getAll("tasks")).map(task => ({ ...task, status: task.status || TASK_STATUS.PENDING, type: TASK_TYPES.includes(task.type) ? task.type : "task", reminder: Number(task.reminder) || REMINDER_OPTIONS.none })); this.rebuildDateIndex(); }
    /** Crea y persiste una tarea validada. */
    async add(data) {
        const task = this.normalize(data);
        if (!validateTask(task)) return null;
        const saved = { ...task, id: createId("task"), status: TASK_STATUS.PENDING };
        await storage.save("tasks", saved); this.tasks.push(saved); this.indexTask(saved); this.notify(); return saved;
    }
    /** Actualiza una tarea existente. */
    async update(id, data) {
        const current = this.getById(id); const task = this.normalize(data);
        if (!current || !validateTask(task)) return null;
        const saved = { ...current, ...task };
        await storage.save("tasks", saved); this.tasks = this.tasks.map(item => item.id === current.id ? saved : item); this.rebuildDateIndex(); this.notify(); return saved;
    }
    /** Elimina definitivamente una tarea de la colección y de IndexedDB. */
    async remove(id) {
        const task = this.getById(id);
        if (!task) return false;
        await storage.transaction("tasks", "readwrite", store => store.delete(task.id));
        this.tasks = this.tasks.filter(item => item.id !== task.id); this.rebuildDateIndex(); this.notify(); return true;
    }
    /** Alterna el estado de una tarea. */
    toggleStatus(id) { const task = this.getById(id); return task && this.update(id, { ...task, status: task.status === TASK_STATUS.COMPLETED ? TASK_STATUS.PENDING : TASK_STATUS.COMPLETED }); }
    /** Busca una tarea por ID. */
    getById(id) { return this.tasks.find(task => String(task.id) === String(id)); }
    /** Devuelve tareas asociadas a una fecha. */
    getByDate(date) { return this.byDate.get(date) || []; }
    /** Devuelve tareas pendientes. */
    getPending() { return this.tasks.filter(task => task.status !== TASK_STATUS.COMPLETED); }
    /** Devuelve tareas completadas. */
    getCompleted() { return this.tasks.filter(task => task.status === TASK_STATUS.COMPLETED); }
    /** Calcula las cifras del dashboard. */
    stats() { return { today: this.getByDate(toLocalDate()).length, pending: this.getPending().length, completed: this.getCompleted().length }; }
    /** Reconstruye el índice por fecha tras una carga o actualización compleja. */
    rebuildDateIndex() { this.byDate.clear(); this.tasks.forEach(task => this.indexTask(task)); }
    /** Registra una tarea en su fecha para consultas de calendario O(1). */
    indexTask(task) { if (!task.date) return; const entries = this.byDate.get(task.date) || []; entries.push(task); this.byDate.set(task.date, entries); }
    /** Normaliza y limita los valores de una tarea recibida desde la UI. */
    normalize(data) { return { ...data, title: normalizeText(data.title), notes: normalizeText(data.notes), priority: TASK_PRIORITIES.includes(data.priority) ? data.priority : "low", type: TASK_TYPES.includes(data.type) ? data.type : "task", reminder: Number(data.reminder) || REMINDER_OPTIONS.none }; }
}

/** Presenta tareas por día, filtros y resultados de búsqueda. */
export class TaskPanel {
    constructor(tasks, employees, modal) { this.tasks = tasks; this.employees = employees; this.modal = modal; this.date = null; this.resultsMode = false; this.resultTasks = []; this.resultTitle = "Resultados"; this.filters = { employee: "", status: "", priority: "" }; }
    /** Crea el panel lateral y sus eventos. */
    mount() {
        const panel = document.createElement("aside"); panel.id = "dayPanel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-label", "Panel de tareas");
        panel.innerHTML = `<div class="day-filters"><label class="sr-only" for="filterEmployee">Empleado</label><select id="filterEmployee"></select><label class="sr-only" for="filterStatus">Estado</label><select id="filterStatus"><option value="">Todos los estados</option><option value="pending">Pendientes</option><option value="completed">Completadas</option></select><label class="sr-only" for="filterPriority">Prioridad</label><select id="filterPriority"><option value="">Todas las prioridades</option><option value="urgent">Urgente</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></div><div class="day-panel-header"><h2 id="dayPanelTitle">Tareas</h2><button type="button" data-close aria-label="Cerrar panel de tareas">×</button></div><div id="dayTaskList"></div><div class="day-panel-footer"><button type="button" id="newDayTask">+ Nueva tarea</button></div>`;
        document.body.appendChild(panel); panel.querySelector("[data-close]").addEventListener("click", () => this.close());
        getElement("#newDayTask").addEventListener("click", () => this.modal.openNew(this.date || ""));
        ["employee", "status", "priority"].forEach(name => getElement(`#filter${name[0].toUpperCase()}${name.slice(1)}`).addEventListener("change", event => { this.filters[name] = event.target.value; this.render(); }));
    }
    /** Refresca las opciones de filtro de empleado. */
    refreshEmployees() { this.employees.fillSelect(getElement("#filterEmployee")); getElement("#filterEmployee").options[0].textContent = "Todos los empleados"; }
    /** Abre el panel para una fecha concreta. */
    open(date) { this.date = date; this.resultsMode = false; this.resultTasks = []; this.render(); this.showPanel(); }
    /** Cierra el panel. */
    close() { getElement("#dayPanel").classList.remove("show"); }
    /** Muestra tareas de búsqueda o de una métrica del dashboard. */
    showResults(tasks, title) { this.resultsMode = true; this.resultTasks = tasks; this.resultTitle = title; this.render(); this.showPanel(); }

    /** Muestra el panel tras renderizarlo para que sus controles sean accesibles. */
    showPanel() { getElement("#dayPanel").classList.add("show"); }
    /** Renderiza el día activo aplicando filtros. */
    render() {
        if (this.resultsMode) {
            const tasks = this.filter(this.resultTasks);
            this.renderList(tasks, this.resultTitle, `${tasks.length} resultados`, true);
            return;
        }
        if (!this.date) return;
        const tasks = this.filter(this.tasks.getByDate(this.date)); const completed = tasks.filter(task => task.status === TASK_STATUS.COMPLETED).length;
        this.renderList(tasks, this.date, `${tasks.length - completed} pendientes · ${completed} completadas`);
    }
    /** Filtra una colección con el estado actual de la interfaz. */
    filter(tasks) { return tasks.filter(task => (!this.filters.employee || String(task.employee) === this.filters.employee) && (!this.filters.status || task.status === this.filters.status) && (!this.filters.priority || task.priority === this.filters.priority)); }
    /** Pinta una colección de tarjetas de tarea. */
    renderList(tasks, title, summary, showDate = false) {
        const heading = getElement("#dayPanelTitle"); heading.replaceChildren(document.createTextNode(title), createElement("small", { text: summary }));
        const list = getElement("#dayTaskList"); list.replaceChildren(); const ordered = [...tasks].sort((a, b) => (a.hour || "").localeCompare(b.hour || ""));
        if (!ordered.length) { list.appendChild(createElement("p", { className: "empty-day", text: this.resultsMode ? COPY.noResults : COPY.noTasks })); return; }
        ordered.forEach(task => list.appendChild(this.createCard(task, showDate)));
    }
    /** Crea una tarjeta segura con acciones de edición y estado. */
    createCard(task, showDate) {
        const employee = this.employees.getById(task.employee); const card = createElement("article", { className: "day-task-card", attributes: { "data-task-id": task.id } });
        const top = createElement("div", { className: "day-task-top" }); top.append(createElement("div", { className: "day-task-hour", text: task.hour || "Sin hora" }), createElement("span", { className: `day-task-status ${task.status}`, text: task.status === TASK_STATUS.COMPLETED ? "Completada" : "Pendiente" }));
        card.append(top, createElement("div", { className: `day-task-title${task.status === TASK_STATUS.COMPLETED ? " completed" : ""}`, text: task.title }));
        const assignee = createElement("div", { className: "day-task-employee", text: employee?.name || COPY.unassigned }); assignee.style.color = employee?.color || "var(--text-tertiary)"; card.appendChild(assignee);
        if (showDate) card.appendChild(createElement("div", { className: "day-task-date", text: task.date || "Sin fecha" }));
        if (task.notes) card.appendChild(createElement("div", { className: "day-task-notes", text: task.notes }));
        const actions = createElement("div", { className: "day-task-buttons" }); const edit = createElement("button", { className: "edit-task", text: "Editar", attributes: { type: "button" } }); const toggle = createElement("button", { className: "complete-task", text: task.status === TASK_STATUS.COMPLETED ? "Reabrir" : "Completar", attributes: { type: "button" } });
        edit.addEventListener("click", event => { event.stopPropagation(); this.modal.openEdit(task); }); toggle.addEventListener("click", async event => { event.stopPropagation(); await this.tasks.toggleStatus(task.id); }); actions.append(edit, toggle); card.appendChild(actions); card.addEventListener("click", () => this.modal.openEdit(task)); return card;
    }
}

export const taskManager = new TaskManager();
