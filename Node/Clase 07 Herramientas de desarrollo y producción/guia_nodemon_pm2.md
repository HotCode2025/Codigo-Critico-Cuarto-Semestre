# Guía de Herramientas Node.js: Nodemon y PM2

## 1. Nodemon (Entorno de Desarrollo)
Nodemon es una herramienta que reemplaza al comando estándar `node` durante el ciclo de creación de la aplicación.

* **Instalación local:** `npm install --save-dev nodemon`
* **Ejecución básica:** `npx nodemon index.js`
* **Beneficio principal:** Detecta cambios en los archivos con extensiones `.js`, `.json`, entre otras, y reinicia el proceso automáticamente para reflejar las modificaciones en tiempo real sin intervención manual.

## 2. PM2 (Entorno de Producción)
PM2 es un gestor de procesos en segundo plano (daemon) que asegura que la aplicación esté siempre disponible.

* **Instalación global:** `sudo npm install -g pm2`
* **Iniciar una aplicación:** `pm2 start index.js --name "MiApp"`
* **Listar procesos activos:** `pm2 list`
* **Ver consumo de recursos (CPU/RAM):** `pm2 monit`
* **Detener un proceso:** `pm2 stop MiApp`
* **Beneficio principal:** Mantiene la aplicación viva ante caídas imprevistas o reinicios del servidor, permitiendo la gestión eficiente de múltiples procesos concurrentes.
