/** Programa recordatorios locales para las tareas próximas del usuario. */
export class ReminderManager {
    constructor() { this.timers = new Map(); }

    /** Recalcula todos los recordatorios programables sin duplicar temporizadores. */
    schedule(tasks) {
        this.timers.forEach(timer => clearTimeout(timer)); this.timers.clear();
        tasks.forEach(task => {
            const minutes = Number(task.reminder);
            if (!minutes || !task.date || !task.hour) return;
            const triggerAt = new Date(`${task.date}T${task.hour}`).getTime() - minutes * 60_000;
            const delay = triggerAt - Date.now();
            if (delay <= 0 || delay > 2_147_483_647) return;
            this.timers.set(task.id, setTimeout(() => this.notify(task), delay));
        });
    }

    /** Notifica usando la API disponible sin bloquear la interfaz. */
    notify(task) {
        if ("Notification" in window && Notification.permission === "granted") new Notification("Dia & Nit", { body: `Recordatorio: ${task.title}` });
        else console.info(`Recordatorio: ${task.title}`);
    }
}
