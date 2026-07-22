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
let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db); // Si ya está lista, la devuelve directamente

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => {
      console.error("Error al abrir IndexedDB:", e.target.error);
      reject(e.target.error);
    };
  });
}

async function addTaskToDB(taskData) {
  if (!db) await initDB(); // Garantiza que db esté lista antes de operar

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(taskData);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getAllTasksFromDB() {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deleteTaskFromDB(id) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

// --- 3. INTERFAZ Y NAVEGACIÓN ---
const diasSemana = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
let currentSelectedDay = 0;

function renderLayout() {
  const calendarGrid = document.getElementById("calendarGrid");
  const mobileSelector = document.getElementById("mobileDaySelector");

  calendarGrid.innerHTML = "";
  mobileSelector.innerHTML = "";

  diasSemana.forEach((dia, index) => {
    const col = document.createElement("div");
    col.className = `day-column ${index === currentSelectedDay ? "active-mobile" : ""}`;
    col.id = `column-day-${index}`;
    col.innerHTML = `
      <div class="day-header"><span class="day-name">${dia}</span></div>
      <div class="day-tasks" id="day-${index}"></div>
    `;
    calendarGrid.appendChild(col);

    const tab = document.createElement("button");
    tab.className = `day-tab ${index === currentSelectedDay ? "active" : ""}`;
    tab.innerText = dia;
    tab.onclick = () => selectMobileDay(index);
    mobileSelector.appendChild(tab);
  });
}

function selectMobileDay(index) {
  currentSelectedDay = index;
  document.querySelectorAll(".day-column").forEach((col, i) => {
    col.classList.toggle("active-mobile", i === index);
  });
  document.querySelectorAll(".day-tab").forEach((tab, i) => {
    tab.classList.toggle("active", i === index);
  });
}

async function loadTasks() {
  renderLayout();
  try {
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
            <button class="btn-delete" onclick="handleDeleteTask(${task.id})">Eliminar</button>
          </div>
        `;
        dayContainer.appendChild(card);
      }
    });
  } catch (err) {
    console.error("Error cargando tareas:", err);
  }
}

function escapeHTML(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ] || tag,
  );
}

// --- 4. EVENTOS ---
const taskModal = document.getElementById("taskModal");
document.getElementById("openModalBtn").onclick = () =>
  taskModal.classList.add("active");
document.getElementById("closeModalBtn").onclick = () =>
  taskModal.classList.remove("active");

document.getElementById("taskForm").onsubmit = async (e) => {
  e.preventDefault();
  const dayValue = parseInt(document.getElementById("day").value);

  try {
    await addTaskToDB({
      employee: document.getElementById("employee").value.trim(),
      day: dayValue,
      shift: document.getElementById("shift").value,
      task: document.getElementById("task").value.trim(),
    });

    document.getElementById("taskForm").reset();
    taskModal.classList.remove("active");
    selectMobileDay(dayValue);
    await loadTasks();
  } catch (err) {
    alert("Error al guardar la tarea. Por favor reintenta.");
    console.error(err);
  }
};

window.handleDeleteTask = async (id) => {
  if (confirm("¿Deseas eliminar esta tarea?")) {
    await deleteTaskFromDB(id);
    await loadTasks();
  }
};

// Inicialización segura
initDB()
  .then(() => loadTasks())
  .catch((err) => console.error("Error de inicio:", err));