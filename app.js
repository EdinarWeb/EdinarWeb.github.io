// --- 1. REGISTRO Y DETECCIÓN ULTRA-RÁPIDA DE PWA ---
let deferredPrompt;
const installPwaBtn = document.getElementById("installPwaBtn");

// Registrar el Service Worker inmediatamente
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("SW activo:", reg.scope))
      .catch((err) => console.error("Error en SW:", err));
  });
}

// Capturar la disponibilidad de instalación (Android / Chrome)
window.addEventListener("beforeinstallprompt", (e) => {
  // Prevenir que el navegador muestre el banner predeterminado feo
  e.preventDefault();
  deferredPrompt = e;

  // Forzar la aparición de nuestro botón personalizado en el Header
  if (installPwaBtn) {
    installPwaBtn.style.display = "inline-flex";
  }
});

// Evento al hacer clic en nuestro botón "Descargar App"
if (installPwaBtn) {
  installPwaBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Respuesta de instalación: ${outcome}`);
      if (outcome === "accepted") {
        installPwaBtn.style.display = "none";
      }
      deferredPrompt = null;
    } else {
      // Si por alguna razón el prompt no responde, le da instrucciones directas al usuario
      alert(
        'Para instalar la App:\n\n1. Pulsa los 3 puntos del navegador (o el botón Compartir en iPhone).\n2. Selecciona "Añadir a la pantalla de inicio".',
      );
    }
  });
}

// Ocultar botón si la App YA está instalada y ejecutándose en modo standalone
window.addEventListener("DOMContentLoaded", () => {
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  ) {
    if (installPwaBtn) installPwaBtn.style.display = "none";
  }
});

// --- 2. BASE DE DATOS LOCAL (IndexedDB) ---
const DB_NAME = "DiaNitDB";
const DB_VERSION = 1;
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
    request.onerror = (e) => reject("Error en DB:", e);
  });
}

function addTaskToDB(taskData) {
  return new Promise((resolve) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    tx.objectStore(STORE_NAME).add(taskData);
    tx.oncomplete = () => resolve();
  });
}

function getAllTasksFromDB() {
  return new Promise((resolve) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

function deleteTaskFromDB(id) {
  return new Promise((resolve) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
  });
}

// --- 3. INTERFAZ Y NAVEGACIÓN DÍA A DÍA ---
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

  if (!calendarGrid || !mobileSelector) return;

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

// --- 4. EVENTOS DEL FORMULARIO Y MODAL ---
const taskModal = document.getElementById("taskModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

if (openModalBtn)
  openModalBtn.onclick = () => taskModal.classList.add("active");
if (closeModalBtn)
  closeModalBtn.onclick = () => taskModal.classList.remove("active");

const taskForm = document.getElementById("taskForm");
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
    taskModal.classList.remove("active");
    selectMobileDay(dayValue);
    loadTasks();
  };
}

window.handleDeleteTask = async (id) => {
  if (confirm("¿Deseas eliminar esta tarea?")) {
    await deleteTaskFromDB(id);
    loadTasks();
  }
};

// Arrancar la app
initDB().then(() => loadTasks());
