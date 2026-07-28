/** Estados válidos para una tarea. */
export const TASK_STATUS = Object.freeze({ PENDING: "pending", COMPLETED: "completed" });

/** Prioridades admitidas por la interfaz. */
export const TASK_PRIORITIES = Object.freeze(["low", "medium", "high", "urgent"]);

/** Tipos de elemento que puede representar una tarea en calendario. */
export const TASK_TYPES = Object.freeze(["task", "shift", "vacation"]);

/** Opciones de recordatorio expresadas en minutos. */
export const REMINDER_OPTIONS = Object.freeze({ none: 0, fifteen: 15, hour: 60, day: 1440 });

/** Textos reutilizados por las vistas. */
export const COPY = Object.freeze({
    unassigned: "Sin asignar",
    noTasks: "No hay tareas",
    noResults: "No se encontraron resultados"
});
