# Dia & Nit

Progressive Web App para gestionar tareas, empleados, turnos, vacaciones y recordatorios. Está construida con HTML5, CSS puro y módulos JavaScript ES2023; no utiliza frameworks ni dependencias de producción.

PUEDES PROBARLA !AQUÍ¡

## Características  

- Dashboard con métricas de tareas y empleados.
- Calendario profesional con vistas mensual, semanal, diaria y agenda.
- Filtros por empleado, prioridad y tipo; búsqueda global con navegación por teclado.
- Drag & Drop de tareas entre fechas en navegadores de escritorio.
- Tareas, turnos y vacaciones con colores por empleado y prioridades.
- Paneles de tareas y empleados, edición, estados y recordatorios locales.
- Tema claro/oscuro persistente.
- PWA instalable, navegación offline, actualización controlada y caché versionada.

## Ejecutar localmente

Los módulos ES y el service worker requieren servir la carpeta mediante HTTP(S); no se debe abrir `index.html` con `file://`.

```powershell
npx serve .
```

Abra la dirección indicada por el servidor, normalmente `http://localhost:3000`. Para probar instalación, notificaciones o service worker en producción utilice HTTPS.

## Arquitectura

```text
assets/
  css/                 Design System por capas, componentes y responsive
  js/
    core/              Arranque y coordinación de módulos
    storage/           IndexedDB y compatibilidad con localStorage
    calendar/          Vistas, renderizado, eventos y Drag & Drop
    employees/         Gestión de empleados y su panel
    tasks/             Dominio de tareas, índice por fecha y panel diario
    dashboard/         Métricas y accesos rápidos
    ui/                Modal, búsqueda, tema, instalación PWA y recordatorios
    utils/             Fechas, validación, constantes y DOM seguro
  icons/               Iconos declarados en el manifest
```

## Datos y compatibilidad

La fuente principal es IndexedDB (`DiaNitDB`). Si IndexedDB no está disponible, la aplicación usa `localStorage` como fallback. También migra automáticamente colecciones heredadas desde estas claves si IndexedDB aún no contiene datos:

- `tasks` / `employees`
- `dia-nit-tasks` / `dia-nit-employees`

No se envían datos a ningún servidor.

## PWA y offline

`service-worker.js` usa dos caches versionadas:

- `dia-nit-shell-v13`: aplicación esencial, estilos, módulos, manifest e iconos.
- `dia-nit-runtime-v13`: recursos del mismo origen actualizados en segundo plano.

Las navegaciones usan **network-first** con fallback a la aplicación cacheada y a `offline.html`. Los recursos estáticos usan **stale-while-revalidate** para responder rápido y actualizar el cache sin bloquear la interfaz.

Las actualizaciones se detectan automáticamente y se aplican solo tras confirmación del usuario, evitando perder cambios durante una sesión.

## Notificaciones y sincronización futura

Los recordatorios locales solicitan permiso de notificación únicamente cuando se guarda una tarea con recordatorio. La PWA también tiene preparados:

- Evento `push` y gestión de clic de notificación en el service worker.
- Evento `pushsubscriptionchange` preparado para conectarlo a una API de suscripciones.
- Tag `dia-nit-sync` para una futura cola de sincronización remota.

Para activar Push real será necesario un backend HTTPS, una clave VAPID pública y un endpoint que persista las suscripciones. Para sincronización en segundo plano será necesario definir la API remota y la cola de operaciones.

## Calidad y rendimiento

- Sin dependencias externas ni JavaScript bloqueante adicional.
- Módulos nativos ES2023 y carga desde un único punto de entrada.
- Renderizado seguro mediante nodos DOM y `textContent` para datos del usuario.
- Índice de tareas por fecha para consultas de calendario O(1).
- Tokens CSS, Grid, Flexbox, `clamp()` y modo oscuro.
- Soporte de movimiento reducido, foco visible y etiquetas accesibles.

## Verificación realizada

Se validaron la sintaxis de todos los módulos ES, el service worker, el JSON del manifest, las rutas cacheadas y las dimensiones cuadradas de los iconos. Una ejecución local de Lighthouse con Chrome obtuvo: **Rendimiento 92**, **Accesibilidad 96**, **Buenas prácticas 100** y **SEO 100**. La única incidencia de accesibilidad era el contraste del tema oscuro; se corrigió después de la medición y se verificó una relación de **5.41:1**. La penalización restante de cache HTTP y minificación procede del servidor temporal de desarrollo; el service worker ya proporciona cache runtime y shell para la aplicación instalada.

## Cambios de la auditoría final

- Se eliminaron páginas HTML vacías, una copia JavaScript obsoleta y módulos CSS/JS sin referencias.
- Se eliminaron utilidades JavaScript sin uso y una variable CSS obsoleta.
- Se corrigieron atributos ARIA en paneles y controles de vista del calendario.
- Se ajustó el contraste del tema oscuro para cumplir el umbral AA en días destacados.
- Se actualizó la caché PWA a `v13` tras incorporar los recursos de instalación, la página offline segura y las mejoras de accesibilidad.
