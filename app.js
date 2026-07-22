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

// --- 2. CONFIGURACIÓN E INICIALIZACIÓN DE INDEXEDDB ---
const DB_NAME = "Super24DB";
const DB_VERSION = 6;
const STORE_NAME = "tareas";
let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

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
  if (!db) await initDB();

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

  if (!calendarGrid || !mobileSelector) {
    console.warn("No se encontraron 'calendarGrid' o 'mobileDaySelector' en el DOM.");
    return;
  }

  calendarGrid.innerHTML = "";
  mobileSelector.innerHTML = "";

  diasSemana.forEach((dia, index) => {
    // Columna para el grid principal
    const col = document.createElement("div");
    col.className = `day-column ${index === currentSelectedDay ? "active-mobile" : ""}`;
    col.id = `column-day-${index}`;
    col.innerHTML = `
      <div class="day-header"><span class="day-name">${dia}</span></div>
      <div class="day-tasks" id="day-${index}"></div>
    `;
    calendarGrid.appendChild(col);

    // Botón para la vista móvil
    const tab = document.createElement("button");
    tab.className = `day-tab ${index === currentSelectedDay ? "active" : ""}`;
    tab.innerText = dia;
    tab.onclick = () => selectMobileDay(index);
    mobileSelector.appendChild(tab);
  });
}

function selectMobileDay(index) {
  currentSelectedDay = index;

  // Actualizar columnas en móvil
  diasSemana.forEach((_, i) => {
    const col = document.getElementById(`column-day-${i}`);
    if (col) {
      if (i === index) {
        col.classList.add("active-mobile");
      } else {
        col.classList.remove("active-mobile");
      }
    }
  });

  // Actualizar pestañas móviles
  const tabs = document.querySelectorAll(".day-tab");
  tabs.forEach((tab, i) => {
    if (i === index) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

async function loadTasks() {
  try {
    const tasks = await getAllTasksFromDB();

    // Limpiar contenedores de tareas
    diasSemana.forEach((_, index) => {
      const dayContainer = document.getElementById(`day-${index}`);
      if (dayContainer) dayContainer.innerHTML = "";
    });

    // Renderizar cada tarea en su respectivo día
    tasks.forEach((item) => {
      const dayContainer = document.getElementById(`day-${item.day}`);
      if (!dayContainer) return;

      const shiftLabel = item.shift === "manana" ? "Mañana" : "Tarde";

      const card = document.createElement("div");
      card.className = `task-card ${item.shift}`;
      card.innerHTML = `
        <div class="task-header">
          <span class="employee-name">${item.employee}</span>
          <span class="shift-tag">${shiftLabel}</span>
        </div>
        <div class="task-desc">${item.task}</div>
        <div class="task-footer">
          <button class="btn-delete" onclick="deleteTask(${item.id})">🗑️ Eliminar</button>
        </div>
      `;

      dayContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error al cargar tareas:", err);
  }
}

async function deleteTask(id) {
  if (confirm("¿Seguro que deseas eliminar esta tarea?")) {
    await deleteTaskFromDB(id);
    await loadTasks();
  }
}

// --- 4. INICIALIZACIÓN CUANDO EL DOM ESTÉ LISTO ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Dibujar estructura inicial del calendario
  renderLayout();

  // 2. Configurar modal y formulario
  const openBtn = document.getElementById("openModalBtn");
  const closeBtn = document.getElementById("closeModalBtn");
  const taskModal = document.getElementById("taskModal");
  const taskForm = document.getElementById("taskForm");

  if (openBtn && taskModal) {
    openBtn.onclick = () => taskModal.classList.add("active");
  }

  if (closeBtn && taskModal) {
    closeBtn.onclick = () => taskModal.classList.remove("active");
  }

  if (taskForm) {
    taskForm.onsubmit = async (e) => {
      e.preventDefault();
      const dayValue = parseInt(document.getElementById("day").value);

      await addTaskToDB({
        employee: document.getElementById("employee").value.trim(),
        day: dayValue,
        shift: document.getElementById("shift").value,
        task: document.getElementById("task").value.trim(),
      });

      taskForm.reset();
      if (taskModal) taskModal.classList.remove("active");
      selectMobileDay(dayValue);
      await loadTasks();
    };
  }

  // 3. Inicializar DB y cargar tareas guardadas
  initDB()
    .then(() => loadTasks())
    .catch((err) => console.error("Error al iniciar DB:", err));
});