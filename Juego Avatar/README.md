# 🌪️💧🌿🔥 La leyenda de AANG: Avatar.

¡Bienvenidos al repositorio de nuestro proyecto! Este es un mini juego web interactivo desarrollado por el equipo **Código Crítico** para poner en práctica nuestros conocimientos de desarrollo frontend, con un enfoque especial en la manipulación del DOM, lógica algorítmica y gestión de estados mediante JavaScript.

## 📖 Descripción del Proyecto
La idea central es recrear un combate básico estilo *Avatar: La Leyenda de Aang*. El jugador selecciona su maestro favorito y se enfrenta a un oponente generado aleatoriamente por el sistema, utilizando un sistema de reglas tipo "piedra, papel o tijera" (Puño, Patada, Barrida).

El proyecto destaca por su capacidad de actualizar la interfaz en tiempo real sin necesidad de recargar la página, utilizando el DOM como puente principal entre la lógica y el usuario.

## 🛠️ Tecnologías Implementadas
* **HTML5:** Estructura semántica de la interfaz.
* **CSS3:** Diseño responsivo, uso de Flexbox, animaciones (`@keyframes`) para una experiencia inmersiva y estilización personalizada de botones y modales.
* **JavaScript (ES6+):** Núcleo lógico del juego, gestión de sesiones y manipulación dinámica del DOM.

## 🚀 Características Técnicas
Para asegurar un flujo de trabajo limpio y profesional, implementamos las siguientes soluciones:

### 1. Carga y Gestión de Sesión
* **Introducción Dinámica:** Utilizamos `sessionStorage` para verificar si la intro del video ya fue vista, evitando interrupciones innecesarias al reiniciar la partida.
* **Carga Segura:** Implementación de `window.onload` para garantizar que el DOM esté completamente listo antes de disparar cualquier lógica de interacción.

### 2. Manipulación del DOM
* **Captura Eficiente:** Uso sistemático de `document.getElementById()` para la referencia rápida de elementos.
* **Inyección Dinámica:** Modificación de `innerHTML` y manipulación de clases (`className`) para cambiar personajes, actualizar marcadores de vida y mostrar resultados de combate en tiempo real.
* **Creación de Nodos:** Generación de logs de batalla mediante la creación de elementos dinámicos, manteniendo un historial legible y estilizado.

### 3. Lógica de Juego y Eventos
* **Aleatoriedad:** Implementación de `Math.random()` para la selección del enemigo, garantizando partidas únicas en cada sesión.
* **Control de Estado:** Sistema de vidas con variables globales y deshabilitación de botones (`disabled = true`) al detectar la condición de victoria o derrota.
* **Interfaz de Usuario (UI):** Uso de modales para las reglas del juego y botones interactivos para una experiencia de usuario (UX) fluida.

## 💻 Cómo Ejecutar
1. Clona este repositorio en tu equipo local.
2. Asegúrate de tener los archivos organizados según la estructura:
   * `index.html` (Raíz)
   * `js/avatar.js`
   * `imagenes/` (Carpeta con assets de los personajes)
   * `video/` (Carpeta con `intro.mp4`)
   * `audio/` (Carpeta con `batalla_oriental.mp3`)
3. Abre `index.html` en tu navegador favorito.

---

### Desarrollado por: **Grupo Código Crítico**
*Este proyecto es parte de nuestro proceso de aprendizaje continuo y práctica técnica.*
