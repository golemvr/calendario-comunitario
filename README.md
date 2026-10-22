# CampusSync - Calendario Comunitario de Estudio 📅🎓

CampusSync es una aplicación web moderna diseñada para estudiantes, centros de estudiantes y equipos de estudio universitarios. Permite crear salas de estudio colaborativas donde cada grupo tiene su propio calendario comunitario con actividades, horarios de inicio/fin, títulos y descripciones.

---

## 🚀 Funcionalidades Principales

### 1. Sistema de Salas Comunitarias (Grupos)
- **Creación de Salas:** Crea una sala con nombre de materia o proyecto, carrera, color distintivo e información clave.
- **Códigos Únicos:** Cada sala genera un código alfanumérico único (ej: `EST-7482`).
- **Generación de Código QR:** Genera al instante un código QR en alta definición para proyectar en el aula o compartir con compañeros.
- **Invitaciones Directas:** Botón para copiar enlace directo (`?room=CODIGO`), compartir vía WhatsApp y descargar la imagen del QR en formato PNG.
- **Unirse a Salas:** Los compañeros pueden ingresar con el código de la sala o escaneando el código QR con su móvil o cámara web.

### 2. Calendario Interactivo
- **Vista Mensual:** Cuadrícula con visualización de días, fecha actual resaltada y actividades ordenadas.
- **Vista de Agenda:** Listado cronológico de eventos con cálculo de cuentas regresivas ("🔥 ¡Hoy!", "⚡ Mañana", etc.).
- **Filtros por Categoría:**
  - 🚨 Exámenes y Parciales
  - 📑 Entregas de Trabajos Prácticos
  - 🎓 Clases Teóricas y Prácticas
  - ☕ Sesiones de Estudio Grupal
  - 📌 Reuniones y Otros

### 3. Registro de Actividades
- **Título de la Actividad.**
- **Fecha de realización.**
- **Horario de Inicio y Horario de Fin** (con cálculo automático de duración).
- **Categoría y color temático.**
- **Autor / Quien lo anotó** (para que el grupo sepa quién agregó cada tarea).
- **Descripción detallada** (temas, bibliografía, enlaces a apuntes).
- Edición y eliminación de actividades con un solo clic.

### 4. Diseño y Estética
- Interfaz moderna con efectos de glassmorphism, modo oscuro con acentos luminosos y modo claro seleccionable.
- Tipografía moderna (*Plus Jakarta Sans* y *JetBrains Mono*).
- 100% responsiva (móviles, tablets y pantallas de escritorio).
- Persistencia local en `localStorage` (no se pierden los datos al recargar).

---

## 💻 Cómo Ejecutar el Proyecto Localmente

Para abrirlo directamente en tu navegador:
1. Puedes hacer doble clic en `index.html` en tu explorador de archivos.
2. O iniciar un servidor local rápido con Python:
   ```bash
   cd "calendario-comunitario"
   python -m http.server 3000
   ```
   Luego abre en tu navegador: `http://localhost:3000`

---

## 🌐 Despliegue en Render (Render.com)

El proyecto incluye el archivo `render.yaml` preconfigurado como **Static Site** (Sitio Estático Gratuito con CDN y SSL).

### Pasos para desplegar:
1. Inicia sesión en [Render.com](https://dashboard.render.com).
2. Haz clic en **New +** y selecciona **Static Site**.
3. Conecta tu cuenta de GitHub y elige el repositorio `golemvr/calendario-comunitario`.
4. Render leerá automáticamente la configuración:
   - **Name:** `calendario-comunitario` (o el que prefieras).
   - **Branch:** `main`
   - **Build Command:** *(dejar vacío)*
   - **Publish Directory:** `.`
5. Haz clic en **Create Static Site**.
En menos de un minuto tendrás tu enlace público `https://calendario-comunitario.onrender.com` activo y listo para compartir.

