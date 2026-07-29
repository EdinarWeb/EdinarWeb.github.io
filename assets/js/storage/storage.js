/** Repositorio IndexedDB para tareas y empleados. */
class StorageManager {
    constructor() {
        this.name = "DiaNitDB";
        this.version = 2;
        this.connection = null;
        this.fallback = false;
    }

    /** Abre una única conexión compartida con la base local. */
    open() {
        if (this.connection) return this.connection;
        if (!globalThis.indexedDB) {
            this.enableFallback();
            return this.connection;
        }
        this.connection = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);
            request.onupgradeneeded = event => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains("tasks")) database.createObjectStore("tasks", { keyPath: "id" });
                if (!database.objectStoreNames.contains("employees")) database.createObjectStore("employees", { keyPath: "id" });
            };
            request.onsuccess = () => {
                request.result.onversionchange = () => {
                    request.result.close();
                    this.connection = null;
                };
                resolve(request.result);
            };
            request.onerror = () => { this.enableFallback(); resolve(null); };
            request.onblocked = () => { this.enableFallback(); resolve(null); };
        });
        return this.connection;
    }

    /** Ejecuta una operación y espera al cierre correcto de su transacción. */
    async transaction(storeName, mode, operation) {
        if (this.fallback) return this.localTransaction(storeName, mode, operation);
        const database = await this.open();
        if (!database) return this.localTransaction(storeName, mode, operation);
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, mode);
            const request = operation(transaction.objectStore(storeName));
            transaction.oncomplete = () => resolve(request?.result);
            transaction.onerror = () => reject(transaction.error || request?.error);
            transaction.onabort = () => reject(transaction.error || request?.error);
        });
    }

    /** Guarda una entidad por su identificador. */
    save(storeName, entity) { return this.transaction(storeName, "readwrite", store => store.put(entity)); }

    /** Recupera entidades y migra datos compatibles de localStorage si aún no existen en IndexedDB. */
    async getAll(storeName) {
        const records = await this.transaction(storeName, "readonly", store => store.getAll());
        if (records.length || this.fallback) return records;
        try {
            const legacy = JSON.parse(localStorage.getItem(`dia-nit-${storeName}`) || localStorage.getItem(storeName) || "[]");
            if (!Array.isArray(legacy) || !legacy.length) return records;
            await Promise.all(legacy.filter(item => item?.id !== undefined).map(item => this.save(storeName, item)));
            return legacy;
        } catch { return records; }
    }

    /** Ofrece persistencia compatible con localStorage cuando IndexedDB no está disponible. */
    localTransaction(storeName, mode, operation) {
        const key = `dia-nit-${storeName}`;
        const records = this.readLocalCollection(key, storeName);
        const store = {
            put: entity => { const index = records.findIndex(item => String(item.id) === String(entity.id)); if (index >= 0) records[index] = entity; else records.push(entity); return { result: entity.id }; },
            getAll: () => ({ result: records }),
            delete: id => { const index = records.findIndex(item => String(item.id) === String(id)); if (index >= 0) records.splice(index, 1); return { result: undefined }; }
        };
        const request = operation(store);
        if (mode === "readwrite") localStorage.setItem(key, JSON.stringify(records));
        return Promise.resolve(request?.result);
    }

    /** Activa la persistencia de respaldo sin dejar una conexión fallida en memoria. */
    enableFallback() {
        this.fallback = true;
        this.connection = Promise.resolve(null);
    }

    /** Lee datos heredados corruptos de forma segura para no bloquear el arranque. */
    readLocalCollection(primaryKey, legacyKey) {
        try {
            const records = JSON.parse(localStorage.getItem(primaryKey) || localStorage.getItem(legacyKey) || "[]");
            return Array.isArray(records) ? records : [];
        } catch {
            return [];
        }
    }
}

export const storage = new StorageManager();
