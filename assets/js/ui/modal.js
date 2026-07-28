import { getElement } from "../utils/helpers.js";
import { normalizeText, validateTask } from "../utils/validator.js";

/** Gestiona el diálogo de alta y edición de tareas. */
export class TaskModal {
    constructor(tasks, employees) { this.tasks = tasks; this.employees = employees; this.editingId = null; }
    /** Inserta el diálogo y enlaza sus eventos. */
    mount() {
        const modal = document.createElement("div"); modal.id = "modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "modalTitle");
        modal.innerHTML = `<div class="modal-overlay"><div class="modal-window"><div class="modal-header"><h2 id="modalTitle">Nueva tarea</h2><button type="button" data-close aria-label="Cerrar ventana">×</button></div><div class="modal-body"><div class="form-group"><label for="taskTitle">Título</label><input id="taskTitle" maxlength="160" autocomplete="off"></div><div class="form-group"><label for="taskEmployee">Empleado</label><select id="taskEmployee"></select></div><div class="form-row"><div class="form-group"><label for="taskDate">Fecha</label><input id="taskDate" type="date"></div><div class="form-group"><label for="taskHour">Hora</label><input id="taskHour" type="time"></div></div><div class="form-row"><div class="form-group"><label for="taskType">Tipo</label><select id="taskType"><option value="task">Tarea</option><option value="shift">Turno</option><option value="vacation">Vacaciones</option></select></div><div class="form-group"><label for="taskReminder">Recordatorio</label><select id="taskReminder"><option value="0">Sin recordatorio</option><option value="15">15 minutos antes</option><option value="60">1 hora antes</option><option value="1440">1 día antes</option></select></div></div><div class="form-group"><label for="taskPriority">Prioridad</label><select id="taskPriority"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div><div class="form-group"><label for="taskNotes">Notas</label><textarea id="taskNotes" rows="5" maxlength="2000"></textarea></div></div><div class="modal-footer"><button type="button" data-cancel>Cancelar</button><button type="button" data-save>Guardar</button><button type="button" data-delete class="danger" hidden>Eliminar</button></div></div></div>`;
        document.body.appendChild(modal); modal.querySelector("[data-close]").addEventListener("click", () => this.close()); modal.querySelector("[data-cancel]").addEventListener("click", () => this.close()); modal.querySelector("[data-save]").addEventListener("click", () => this.save()); modal.querySelector("[data-delete]").addEventListener("click", () => this.remove()); document.addEventListener("keydown", event => { if (event.key === "Escape" && modal.style.display === "flex") this.close(); });
    }
    /** Abre el diálogo para crear una tarea en una fecha opcional. */
    openNew(date = "") { this.editingId = null; this.fill({ title: "", employee: "", date, hour: "", priority: "low", type: "task", reminder: "0", notes: "" }); getElement("#modalTitle").textContent = "Nueva tarea"; getElement("[data-save]").textContent = "Guardar"; getElement("[data-delete]").hidden = true; this.open(); }
    /** Abre el diálogo para editar una tarea existente. */
    openEdit(task) { this.editingId = task.id; this.fill(task); getElement("#modalTitle").textContent = "Editar tarea"; getElement("[data-save]").textContent = "Actualizar"; getElement("[data-delete]").hidden = false; this.open(); }
    /** Actualiza todos los campos del formulario. */
    fill(task) { ["title", "employee", "date", "hour", "priority", "type", "reminder", "notes"].forEach(name => getElement(`#task${name[0].toUpperCase()}${name.slice(1)}`).value = task[name] ?? ""); }
    /** Lee y normaliza los valores de la interfaz. */
    read() { return Object.fromEntries(["title", "employee", "date", "hour", "priority", "type", "reminder", "notes"].map(name => [name, normalizeText(getElement(`#task${name[0].toUpperCase()}${name.slice(1)}`).value)])); }
    /** Hace visible el diálogo y coloca el foco inicial. */
    open() { getElement("#modal").style.display = "flex"; getElement("#taskTitle").focus(); }
    /** Oculta el diálogo. */
    close() { getElement("#modal").style.display = "none"; }
    /** Persiste una creación o edición validada. */
    async save() { const task = this.read(); if (!validateTask(task)) return alert("Completa título, empleado, fecha y hora."); if (Number(task.reminder) > 0 && "Notification" in window && Notification.permission === "default") await Notification.requestPermission(); if (this.editingId) await this.tasks.update(this.editingId, task); else await this.tasks.add(task); this.close(); }
    /** Confirma y elimina la tarea activa. */
    async remove() { if (this.editingId && confirm("¿Eliminar esta tarea?")) { await this.tasks.remove?.(this.editingId); this.close(); } }
    /** Actualiza la lista de empleados seleccionables. */
    refreshEmployees() { this.employees.fillSelect(getElement("#taskEmployee")); }
}
