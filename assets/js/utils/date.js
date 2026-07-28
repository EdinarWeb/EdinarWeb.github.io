/** Devuelve una fecha local ISO corta, evitando el desfase UTC de toISOString. */
export function toLocalDate(date = new Date()) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/** Capitaliza el primer carácter de un texto. */
export function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** Formatea la fecha actual para la cabecera en español. */
export function formatToday() {
    return capitalize(new Date().toLocaleDateString("es-ES", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
    }));
}
