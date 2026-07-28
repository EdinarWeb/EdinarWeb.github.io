/** Obtiene un elemento requerido y falla con un error explicativo si no existe. */
export function getElement(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`No existe el elemento requerido: ${selector}`);
    return element;
}

/** Crea un elemento con propiedades seguras y contenido textual opcional. */
export function createElement(tagName, { className, text, attributes = {} } = {}) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
}

/** Genera un identificador único con degradación segura para navegadores antiguos. */
export function createId(prefix) {
    const uuid = globalThis.crypto?.randomUUID?.();
    return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
