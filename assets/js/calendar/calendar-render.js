import { COPY, TASK_PRIORITIES, TASK_STATUS } from "../utils/constants.js";
import { createElement, getElement } from "../utils/helpers.js";
import { toLocalDate } from "../utils/date.js";

/** Construye la barra de herramientas y la vista activa del calendario. */
export function renderCalendar(calendar, tasks, employees) {
    const container = getElement("#calendar"); container.replaceChildren();
    const root = createElement("section", { className: `calendar calendar--${calendar.view}` });
    root.append(createToolbar(calendar, employees), createView(calendar, tasks, employees));
    container.appendChild(root);
}

/** Crea controles de navegación, vista y filtros. */
function createToolbar(calendar, employees) {
    const toolbar = createElement("header", { className: "calendar-toolbar" });
    const navigation = createElement("div", { className: "calendar-navigation" });
    navigation.append(createElement("button", { text: "‹", attributes: { type: "button", "data-calendar-prev": "", "aria-label": "Periodo anterior" } }), createElement("h2", { text: title(calendar) }), createElement("button", { text: "›", attributes: { type: "button", "data-calendar-next": "", "aria-label": "Periodo siguiente" } }));
    const views = createElement("div", { className: "calendar-views", attributes: { role: "group", "aria-label": "Vistas de calendario" } });
    [["month", "Mes"], ["week", "Semana"], ["day", "Día"], ["agenda", "Agenda"]].forEach(([value, label]) => views.appendChild(createElement("button", { text: label, className: calendar.view === value ? "active" : "", attributes: { type: "button", "data-calendar-view": value, "aria-pressed": String(calendar.view === value) } })));
    const filters = createElement("div", { className: "calendar-filters" });
    filters.append(createSelect("calendarFilterEmployee", "Todos", calendar.filters.employee, employees.getAll().map(employee => [employee.id, employee.name])), createSelect("calendarFilterPriority", "Prioridad", calendar.filters.priority, [["low", "Baja"], ["medium", "Media"], ["high", "Alta"], ["urgent", "Urgente"]]), createSelect("calendarFilterType", "Tipo", calendar.filters.type, [["task", "Tareas"], ["shift", "Turnos"], ["vacation", "Vacaciones"]]));
    toolbar.append(navigation, views, filters); return toolbar;
}

/** Genera un selector de filtro sin interpolar datos dinámicos como HTML. */
function createSelect(id, placeholder, value, options) {
    const select = createElement("select", { attributes: { id, "aria-label": placeholder } }); select.add(new Option(placeholder, "")); options.forEach(([optionValue, label]) => select.add(new Option(label, optionValue))); select.value = value; return select;
}

/** Renderiza la vista elegida. */
function createView(calendar, tasks, employees) {
    if (calendar.view === "week") return createWeek(calendar, tasks, employees);
    if (calendar.view === "day") return createDayView(calendar, tasks, employees);
    if (calendar.view === "agenda") return createAgenda(calendar, tasks, employees);
    return createMonth(calendar, tasks, employees);
}

/** Renderiza la cuadrícula mensual. */
function createMonth(calendar, tasks, employees) {
    const grid = createElement("div", { className: "calendar-days" }); ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach(name => grid.appendChild(createElement("div", { className: "day-name", text: name })));
    const first = new Date(calendar.cursor.getFullYear(), calendar.cursor.getMonth(), 1); const start = (first.getDay() + 6) % 7; const total = new Date(calendar.cursor.getFullYear(), calendar.cursor.getMonth() + 1, 0).getDate();
    for (let index = 0; index < start; index += 1) grid.appendChild(createElement("div", { className: "day empty" }));
    for (let day = 1; day <= total; day += 1) grid.appendChild(createDayCell(calendar, calendar.formatDate(day), String(day), tasks, employees));
    return grid;
}

/** Renderiza los siete días de la semana visible. */
function createWeek(calendar, tasks, employees) {
    const grid = createElement("div", { className: "calendar-week" }); const start = calendar.weekStart();
    for (let offset = 0; offset < 7; offset += 1) { const date = new Date(start); date.setDate(start.getDate() + offset); const label = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric" }).format(date); grid.appendChild(createDayCell(calendar, toLocalDate(date), label, tasks, employees)); }
    return grid;
}

/** Renderiza el detalle de un único día. */
function createDayView(calendar, tasks, employees) { const date = toLocalDate(calendar.cursor); const view = createElement("div", { className: "calendar-day-view" }); view.appendChild(createDayCell(calendar, date, new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(calendar.cursor), tasks, employees)); return view; }

/** Renderiza una agenda ordenada de los próximos treinta días. */
function createAgenda(calendar, tasks, employees) {
    const list = createElement("div", { className: "calendar-agenda" }); const start = new Date(calendar.cursor); start.setHours(0, 0, 0, 0);
    const upcoming = tasks.tasks.filter(task => task.date >= toLocalDate(start) && calendar.matches(task)).sort((a, b) => `${a.date}${a.hour}`.localeCompare(`${b.date}${b.hour}`));
    if (!upcoming.length) list.appendChild(createElement("p", { className: "empty-day", text: COPY.noTasks }));
    upcoming.forEach(task => { const item = createTaskItem(task, employees, true); list.appendChild(item); }); return list;
}

/** Crea una celda accesible, receptora de drag & drop. */
function createDayCell(calendar, date, label, tasks, employees) {
    const cell = createElement("article", { className: `day${date === toLocalDate() ? " today" : ""}`, attributes: { "data-date": date, tabindex: "0", role: "button", "aria-label": `Ver tareas del ${label}` } }); cell.appendChild(createElement("span", { text: label }));
    tasks.getByDate(date).filter(task => calendar.matches(task)).forEach(task => cell.appendChild(createTaskItem(task, employees))); return cell;
}

/** Construye una tarea con color de empleado y señales de tipo/prioridad. */
function createTaskItem(task, employees, agenda = false) {
    const employee = employees.getById(task.employee); const priority = TASK_PRIORITIES.includes(task.priority) ? task.priority : "low"; const item = createElement("button", { className: `task-badge ${priority} task-type-${task.type || "task"}${task.status === TASK_STATUS.COMPLETED ? " completed" : ""}${agenda ? " agenda-item" : ""}`, attributes: { type: "button", draggable: "true", "data-task-id": task.id, title: task.notes || task.title } });
    const assignee = createElement("span", { className: "task-employee", text: employee?.name || COPY.unassigned }); assignee.style.color = employee?.color || "var(--text-tertiary)";
    const prefix = task.type === "vacation" ? "Vacaciones · " : task.type === "shift" ? "Turno · " : "";
    item.append(assignee, createElement("strong", { text: `${task.hour || "Sin hora"} · ${prefix}${task.title}` })); if (agenda) item.appendChild(createElement("span", { text: task.date })); return item;
}

/** Devuelve el encabezado contextual de la vista. */
function title(calendar) { if (calendar.view === "day") return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(calendar.cursor); if (calendar.view === "week") return `Semana del ${new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(calendar.weekStart())}`; if (calendar.view === "agenda") return "Agenda"; return `${calendar.monthName} ${calendar.year}`; }
