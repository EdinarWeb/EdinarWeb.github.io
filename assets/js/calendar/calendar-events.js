import { getElement } from "../utils/helpers.js";

/** Enlaza navegación, filtros, cambios de vista, apertura y drag & drop. */
export function bindCalendarEvents(calendar, { onDay, onTask, onDrop }) {
    const root = getElement("#calendar");
    root.querySelector("[data-calendar-prev]").addEventListener("click", () => calendar.move(-1));
    root.querySelector("[data-calendar-next]").addEventListener("click", () => calendar.move(1));
    root.querySelectorAll("[data-calendar-view]").forEach(button => button.addEventListener("click", () => calendar.setView(button.dataset.calendarView)));
    ["employee", "priority", "type"].forEach(name => root.querySelector(`#calendarFilter${name[0].toUpperCase()}${name.slice(1)}`).addEventListener("change", event => calendar.setFilter(name, event.target.value)));
    root.querySelectorAll("[data-day-open]").forEach(button => {
        button.addEventListener("click", () => onDay(button.dataset.dayOpen));
    });
    root.querySelectorAll("[data-date]").forEach(day => {
        day.addEventListener("dragover", event => { event.preventDefault(); day.classList.add("drag-over"); });
        day.addEventListener("dragleave", () => day.classList.remove("drag-over"));
        day.addEventListener("drop", event => { event.preventDefault(); day.classList.remove("drag-over"); const id = event.dataTransfer.getData("text/plain"); if (id) onDrop(id, day.dataset.date); });
    });
    root.querySelectorAll("[data-task-id]").forEach(item => {
        item.addEventListener("click", event => { event.stopPropagation(); onTask(item.dataset.taskId); });
        item.addEventListener("dragstart", event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.dataset.taskId); });
    });
}
