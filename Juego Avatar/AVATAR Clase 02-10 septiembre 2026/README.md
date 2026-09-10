# 🌪️💧🌿🔥 La leyenda de AANG: Avatar.

¡Bienvenidos al repositorio de nuestro proyecto! Este es un mini juego web interactivo desarrollado por el equipo **Código Crítico** para poner en práctica nuestros conocimientos de desarrollo frontend, con un enfoque especial en la manipulación del DOM, lógica algorítmica y Programación Orientada a Objetos (POO) mediante JavaScript.

## 📖 Descripción del Proyecto
La idea central es recrear un combate básico estilo *Avatar: La Leyenda de Aang*. El jugador selecciona su maestro favorito y se enfrenta a un oponente generado aleatoriamente por el sistema, utilizando un sistema de reglas tipo "piedra, papel o tijera" (Puño, Patada, Barrida).

El proyecto destaca por su capacidad de actualizar la interfaz en tiempo real sin necesidad de recargar la página, utilizando el DOM como puente principal entre la lógica y el usuario.

## 🛠️ Tecnologías Implementadas
* **HTML5:** Estructura semántica de la interfaz.
* **CSS3:** Diseño responsivo, uso de Flexbox, animaciones (`@keyframes`) para una experiencia inmersiva y estilización personalizada de botones y modales.
* **JavaScript (ES6+):** Núcleo lógico del juego, implementación de clases (POO) y manipulación dinámica del DOM.

## 🚀 Características Técnicas
Para asegurar un flujo de trabajo limpio y profesional, implementamos las siguientes soluciones:

### 1. POO — Clase `Avatar` (Clase 04)
* **La clase como "plano":** Definimos `class Avatar` con un `constructor(nombre, elemento, imagen, habilidad, vidas)` que usa `this` para guardar cada dato en una propiedad del objeto.
* **Atributos y métodos:** Cada maestro agrupa sus **atributos** (`nombre`, `elemento`, `imagen`, `habilidad`, `vidas`, y el array `ataques`) y sus **métodos** (`recibirDano()`, `estaVivo()`, `atacarAlAzar()`, `revivir()`) en un solo lugar.
* **Principio DRY:** Al mover la lógica dentro de la clase eliminamos los contadores globales repetidos. Agregar un personaje nuevo (Iroh, Azula) es una línea `new Avatar(...)` sin tocar el motor de combate.

### 1.b Instanciación y Arrays (Clase 05)
* **El template se completa con la info de cada personaje:** `constructor(nombre, elemento, imagen, ataques, vidas, habilidad)`. Cada instancia lleva sus propios datos (Iroh tiene 4 vidas, Azula 2, etc.).
* **Instanciar con `new`:** `const zuko = new Avatar('Zuko', 'fuego', 'imagenes/zuko.png', ATAQUES_BASICOS, 3, 'Rayo · daño masivo')`.
* **Personajes nuevos:** además de Aang, Katara, Zuko y Toph agregamos **Iroh, Azula, Sokka y Bumi**. Los que no tienen imagen se dibujan por código (`plantillaCarta()`), así se ve que la carta se arma con los atributos del objeto.
* **Array global:** `let avatares = []` y se cargan con `avatares.push(aang, katara, zuko, toph)` y `avatares.push(iroh, azula, sokka, bumi)`.
* **`length` y recorrido:** `avatares.length` para saber cuántos hay y `forEach` para generar las cartas de selección. `console.log(avatares)` para revisar el array en el inspector.
* **Escalabilidad (100, 1000...):** un bucle `for` instancia un `ejercito` de 1000 avatares para demostrar que la misma clase escala sin límite (`console.log(ejercito)`).
* **Crear maestros desde el juego:** la carta "＋ Crear maestro" abre un formulario (nombre, elemento, vidas, habilidad). Al enviarlo se hace `new Avatar(...)` + `avatares.push(...)` + `renderizarSeleccion()`, así el jugador instancia tantos personajes como quiera y aparecen listos para combatir.

### 2. Manipulación del DOM
* **Captura Eficiente:** Uso sistemático de `document.getElementById()` para la referencia rápida de elementos.
* **Inyección Dinámica:** Modificación de `innerHTML` y manipulación de clases (`className`) extraídas directamente de los objetos para cambiar personajes, actualizar marcadores de vida y mostrar resultados de combate en tiempo real.
* **Creación de Nodos:** Generación de logs de batalla dinámicos para mantener un historial legible y estilizado.

### 3. Lógica de Juego y Eventos
* **Aleatoriedad:** Implementación de `Math.random()` para la selección del enemigo, garantizando partidas únicas en cada sesión.
* **Control de Estado:** Deshabilitación de botones (`disabled = true`) al detectar la condición de victoria o derrota consultando los métodos de los objetos.
* **Interfaz de Usuario (UI):** Uso de modales para las reglas del juego y para el resultado final, más botones interactivos para una experiencia fluida.

### 4. Rediseño visual
* **Pantalla de intro:** una portada con el lore de las cuatro naciones y un botón "Comenzar" (`comenzarJuego()`) antes de la selección de maestros.
* **Tema por nación:** La paleta de la interfaz (`--accent`) cambia según el elemento del maestro elegido: Aire, Agua, Fuego o Tierra.
* **Animaciones de combate:** Choque de ataques en el panel central (`@keyframes clashPop`), sacudida de la carta al recibir daño (`hitShake`) y transiciones entre pantallas.
* **HUD de vidas:** Marcadores circulares con glow del color de la nación en lugar de emojis.

## 💻 Cómo Ejecutar
1. Clona este repositorio en tu equipo local.
2. Asegúrate de tener los archivos organizados según la estructura:
   * `index.html` (Raíz)
   * `js/avatar.js`
   * `imagenes/` (Carpeta con assets de los personajes)
   * `audio/` (Carpeta con `batalla_oriental.mp3`)
3. Abre `index.html` en tu navegador favorito o mediante una extensión como Live Server.

---

### Desarrollado por: **Grupo Código Crítico**
*Este proyecto es parte de nuestro proceso de aprendizaje continuo y práctica técnica.*