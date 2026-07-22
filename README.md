# 🛒 Dia & Nit 24H - Gestor de Turnos y Tareas

Una **Progressive Web App (PWA)** moderna, responsiva e instalable en dispositivos **Android** e **iOS/Apple**, diseñada para la gestión rápida de turnos y tareas diarias de empleados en un supermercado 24 horas.

---

## ✨ Características Principales

* **📲 App Instalable (PWA):** Se descarga e instala directamente desde el navegador en iOS (Safari) y Android (Chrome) sin pasar por tiendas de aplicaciones.
* **🌐 Funcionamiento Offline:** Utiliza un *Service Worker* para mantener la aplicación disponible incluso sin conexión a Internet.
* **💾 Persistencia Local:** Almacenamiento rápido y seguro en el navegador mediante **IndexedDB**.
* **📱 Diseño Adaptable (Responsive):**
  * **Escritorio / Tablet:** Vista general de cuadrícula con los 7 días de la semana a golpe de vista.
  * **Móvil (Smartphones):** Pestañas horizontales para navegar día a día sin saturación visual.
  * **iOS Ready:** Compatible con márgenes de seguridad (*Safe Areas*) de iPhone con notch e island.

---

## 📂 Estructura del Proyecto

```text
├── index.html       # Estructura principal y meta-etiquetas PWA
├── styles.css       # Estilos CSS responsivos, temas y variables
├── app.js           # Lógica de tareas, IndexedDB y registro PWA
├── manifest.json    # Configuración de la PWA (icono, colores, nombre)
└── sw.js            # Service Worker para caché y soporte offline
