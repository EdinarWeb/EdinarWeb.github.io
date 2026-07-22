// --- 1. REGISTRO DEL SERVICE WORKER (PWA) ---
let deferredPrompt;
const installPwaBtn = document.getElementById("installPwaBtn");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("Service Worker registrado con éxito", reg))
      .catch((err) => console.error("Error al registrar SW:", err));
  });
}

// Capturar el evento de instalación (Android/Chrome)
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installPwaBtn) installPwaBtn.style.display = "inline-flex";
});

if (installPwaBtn) {
  installPwaBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        installPwaBtn.style.display = "none";
      }
      deferredPrompt = null;
    }
  });
}

// --- 1. CONFIGURACIÓN E INICIALIZACIÓN DE INDEXEDDB ---
const DB_NAME = "Super24DB";
const DB_VERSION = 3;
const STORE_NAME = "tareas";
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => reject("Error al abrir la base de datos:", e);
  });
}

// Operaciones CRUD en IndexedDB
function addTaskToDB(taskData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(taskData);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllTasksFromDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteTaskFromDB(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- 2. GESTIÓN DE LA INTERFAZ DE USUARIO (UI) ---
const diasSemana = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const calendarGrid = document.getElementById("calendarGrid");
const taskModal = document.getElementById("taskModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const taskForm = document.getElementById("taskForm");

// Generar estructura vacía del calendario
function renderLayout() {
  calendarGrid.innerHTML = "";
  diasSemana.forEach((dia, index) => {
    const col = document.createElement("div");
    col.className = "day-column";
    col.innerHTML = `
      <div class="day-header">
        <span class="day-name">${dia}</span>
      </div>
      <div class="day-tasks" id="day-${index}"></div>
    `;
    calendarGrid.appendChild(col);
  });
}

// Cargar y mostrar tareas guardadas
async function loadTasks() {
  renderLayout();
  const tasks = await getAllTasksFromDB();

  tasks.forEach((task) => {
    const dayContainer = document.getElementById(`day-${task.day}`);
    if (dayContainer) {
      const card = document.createElement("div");
      card.className = `task-card ${task.shift}`;
      card.innerHTML = `
        <div class="task-header">
          <span class="employee-name">${escapeHTML(task.employee)}</span>
          <span class="shift-tag">${task.shift}</span>
        </div>
        <div class="task-desc">${escapeHTML(task.task)}</div>
        <div class="task-footer">
          <span></span>
          <button class="btn-delete" onclick="handleDeleteTask(${task.id})">Eliminar</button>
        </div>
      `;
      dayContainer.appendChild(card);
    }
  });
}

// Sanitización contra vulnerabilidades XSS
function escapeHTML(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ] || tag,
  );
}

// --- 3. EVENTOS DE INTERACCIÓN ---
openModalBtn.addEventListener("click", () => taskModal.classList.add("active"));
closeModalBtn.addEventListener("click", () =>
  taskModal.classList.remove("active"),
);

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newTask = {
    employee: document.getElementById("employee").value.trim(),
    day: parseInt(document.getElementById("day").value),
    shift: document.getElementById("shift").value,
    task: document.getElementById("task").value.trim(),
  };

  await addTaskToDB(newTask);
  taskForm.reset();
  taskModal.classList.remove("active");
  loadTasks();
});

// Función global para eliminar tareas
window.handleDeleteTask = async (id) => {
  if (confirm("¿Estás seguro de que deseas eliminar esta tarea?")) {
    await deleteTaskFromDB(id);
    loadTasks();
  }
};

// Inicialización
initDB().then(() => {
  loadTasks();
});
