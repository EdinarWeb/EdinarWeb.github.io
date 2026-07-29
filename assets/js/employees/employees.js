import { storage } from "../storage/storage.js";
import { createElement, createId, getElement } from "../utils/helpers.js";
import { normalizeText, validateEmployee } from "../utils/validator.js";

/** Gestiona empleados, persistencia y su panel de edición. */
export class EmployeeManager {
    constructor() { this.employees = []; this.listeners = new Set(); this.editingId = null; }

    /** Suscribe una vista a los cambios de empleados. */
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

    /** Notifica a todas las vistas suscritas. */
    notify() { this.listeners.forEach(listener => listener()); }

    /** Carga empleados o crea la plantilla inicial. */
    async load() {
        this.employees = (await storage.getAll("employees")).map(employee => ({
            ...employee,
            name: normalizeText(employee.name),
            role: employee.role || "Empleado",
            color: /^#[0-9a-f]{6}$/i.test(employee.color || "") ? employee.color : "#2E7D32",
            active: employee.active !== false
        }));
        if (!this.employees.length) await this.createDefaults();
    }

    /** Inserta los empleados iniciales solo en una base nueva. */
    async createDefaults() {
        const defaults = [["Antonio", "Empleado", "#2E7D32"], ["Raúl", "Empleado", "#1565C0"], ["Encargado", "Encargado", "#F57C00"]]
            .map(([name, role, color]) => ({ id: createId("employee"), name, role, color, avatar: "", active: true }));
        await Promise.all(defaults.map(employee => storage.save("employees", employee)));
        this.employees = defaults;
    }

    /** Devuelve únicamente empleados activos. */
    getAll() { return this.employees.filter(employee => employee.active); }

    /** Busca un empleado por ID, tolerando datos históricos numéricos. */
    getById(id) { return this.employees.find(employee => String(employee.id) === String(id)); }

    /** Determina si un nombre activo ya está en uso. */
    exists(name, excludedId = null) {
        return this.getAll().some(employee => String(employee.id) !== String(excludedId)
            && employee.name.localeCompare(name, "es", { sensitivity: "accent" }) === 0);
    }

    /** Crea un empleado validado y persistente. */
    async add(data) {
        const employee = { ...data, name: normalizeText(data.name) };
        if (!validateEmployee(employee) || this.exists(employee.name)) return false;
        const saved = { ...employee, id: createId("employee"), active: true, avatar: "" };
        await storage.save("employees", saved);
        this.employees.push(saved); this.notify(); return true;
    }

    /** Actualiza un empleado sin alterar su identidad. */
    async update(id, data) {
        const employee = this.getById(id);
        const name = normalizeText(data.name);
        if (!employee || !validateEmployee({ name }) || this.exists(name, employee.id)) return false;
        const updated = { ...employee, ...data, name };
        await storage.save("employees", updated);
        this.employees = this.employees.map(item => item.id === employee.id ? updated : item);
        this.notify(); return true;
    }

    /** Desactiva un empleado siempre que no tenga tareas asignadas. */
    async remove(id, tasks) {
        const employee = this.getById(id);
        if (!employee || tasks.some(task => String(task.employee) === String(employee.id))) return false;
        const updated = { ...employee, active: false };
        await storage.save("employees", updated);
        this.employees = this.employees.map(item => item.id === employee.id ? updated : item);
        this.notify(); return true;
    }

    /** Rellena el selector de empleado conservando la selección si es posible. */
    fillSelect(select) {
        const currentValue = select.value;
        select.replaceChildren(new Option("Seleccionar empleado", ""));
        select.options[0].disabled = true;
        this.getAll().forEach(employee => select.add(new Option(employee.name, employee.id)));
        select.value = this.getAll().some(employee => String(employee.id) === String(currentValue)) ? currentValue : "";
    }

    /** Crea el panel de empleados una sola vez. */
    mountPanel({ onOpen, getTasks }) {
        const panel = document.querySelector("#employeePanel") || document.createElement("aside");
        if (!panel.isConnected) {
            panel.id = "employeePanel";
            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-modal", "true");
            panel.setAttribute("aria-label", "Gestión de empleados");
            panel.innerHTML = `<div class="employee-header"><h2>Empleados</h2><button type="button" data-close aria-label="Cerrar panel de empleados">×</button></div><div id="employeeList"></div><div class="employee-footer"><button type="button" data-new>+ Nuevo empleado</button></div><div id="employeeForm" class="employee-form hidden"><label for="employeeName">Nombre</label><input id="employeeName" maxlength="100"><label for="employeeRole">Rol</label><select id="employeeRole"><option>Empleado</option><option>Encargado</option><option>Supervisor</option></select><label for="employeeColor">Color identificativo</label><input id="employeeColor" type="color" value="#2E7D32"><div class="employee-actions"><button type="button" data-delete class="danger" hidden>Eliminar</button><button type="button" data-cancel>Cancelar</button><button type="button" data-save>Guardar</button></div></div>`;
            document.body.appendChild(panel);
        }
        this.panel = panel;
        panel.querySelector("[data-close]").addEventListener("click", () => this.closePanel());
        panel.querySelector("[data-new]").addEventListener("click", () => this.showForm());
        panel.querySelector("[data-cancel]").addEventListener("click", () => this.hideForm());
        panel.querySelector("[data-save]").addEventListener("click", () => this.saveForm());
        panel.querySelector("[data-delete]").addEventListener("click", () => this.deleteForm(getTasks));
        document.querySelectorAll("[data-open-employees], #employeesButton").forEach(button => button.addEventListener("click", onOpen));
    }

    /** Pinta las tarjetas seguras del panel. */
    renderPanel() {
        const list = getElement("#employeeList"); list.replaceChildren();
        this.getAll().forEach(employee => {
            const card = createElement("button", { className: "employee-card", attributes: { type: "button" } });
            const left = createElement("span", { className: "employee-left" });
            const avatar = createElement("span", { className: "employee-avatar", text: employee.name[0]?.toUpperCase() }); avatar.style.background = employee.color;
            const info = createElement("span", { className: "employee-info" }); info.append(createElement("strong", { text: employee.name }), createElement("small", { text: employee.role }));
            const dot = createElement("span", { className: "employee-dot" }); dot.style.background = employee.color;
            left.append(avatar, info); card.append(left, dot); card.addEventListener("click", () => this.showForm(employee)); list.appendChild(card);
        });
    }

    /** Abre el panel y actualiza su listado. */
    openPanel() { this.renderPanel(); getElement("#employeePanel").classList.add("show"); }

    /** Cierra el panel y restablece el formulario. */
    closePanel() { this.hideForm(); getElement("#employeePanel").classList.remove("show"); }

    /** Muestra el formulario en modo nuevo o edición. */
    showForm(employee = null) {
        this.editingId = employee?.id ?? null;
        getElement("#employeeName").value = employee?.name ?? "";
        getElement("#employeeRole").value = employee?.role ?? "Empleado";
        getElement("#employeeColor").value = employee?.color ?? "#2E7D32";
        this.panel.querySelector("[data-save]").textContent = employee ? "Actualizar" : "Guardar";
        this.panel.querySelector("[data-delete]").hidden = !employee;
        getElement("#employeeForm").classList.remove("hidden"); getElement("#employeeName").focus();
    }

    /** Oculta y limpia el formulario de empleado. */
    hideForm() { this.editingId = null; getElement("#employeeForm").classList.add("hidden"); }

    /** Guarda los valores actuales del formulario. */
    async saveForm() {
        const data = { name: getElement("#employeeName").value, role: getElement("#employeeRole").value, color: getElement("#employeeColor").value };
        const saved = this.editingId ? await this.update(this.editingId, data) : await this.add(data);
        if (!saved) return alert("Revisa el nombre: es obligatorio y no puede repetirse.");
        this.hideForm(); this.renderPanel();
    }

    /** Solicita y ejecuta la eliminación lógica del empleado en edición. */
    async deleteForm(getTasks) {
        if (!this.editingId || !confirm("¿Eliminar este empleado?")) return;
        if (!await this.remove(this.editingId, getTasks())) return alert("No puedes eliminar un empleado con tareas asignadas.");
        this.hideForm(); this.renderPanel();
    }
}

export const employeeManager = new EmployeeManager();
