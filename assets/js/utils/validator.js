/** Recorta texto de entrada para asegurar que siempre se almacenen cadenas. */
export function normalizeText(value) {
    return String(value ?? "").trim();
}

/** Valida los datos mínimos para persistir una tarea. */
export function validateTask(task) {
    return Boolean(task.title && task.employee && task.date && task.hour);
}

/** Valida el nombre obligatorio de un empleado. */
export function validateEmployee(employee) {
    return Boolean(employee.name);
}
