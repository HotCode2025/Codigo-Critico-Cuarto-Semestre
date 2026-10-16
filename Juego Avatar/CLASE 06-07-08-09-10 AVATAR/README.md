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
* **La clase como "plano":** Definimos `class Avatar` con un `constructor(nombre, elemento, imagen, vidas, habilidad)` que usa `this` para guardar cada dato en una propiedad del objeto.
* **Atributos y métodos:** Cada maestro agrupa sus **atributos** (`nombre`, `elemento`, `imagen`, `habilidad`, `vidas`, y el array `ataques`) y sus **métodos** (`recibirDano()`, `estaVivo()`, `atacarAlAzar()`, `revivir()`) en un solo lugar.
* **Principio DRY:** Al mover la lógica dentro de la clase eliminamos los contadores globales repetidos. Agregar un personaje nuevo (Iroh, Azula) es una línea `new Avatar(...)` sin tocar el motor de combate.

### 1.b Instanciación y Arrays (Clase 05)
* **El template se completa con la info de cada personaje:** `constructor(nombre, elemento, imagen, vidas, habilidad)`. Cada instancia lleva sus propios datos (Iroh tiene 4 vidas, Azula 2, etc.).
* **Instanciar con `new`:** `const zuko = new Avatar('Zuko', 'fuego', 'imagenes/zuko.png', 3, 'Rayo · daño masivo')`.
* **Personajes nuevos:** además de Aang, Katara, Zuko y Toph agregamos **Iroh, Azula, Sokka y Bumi**. Los que no tienen imagen se dibujan por código (`plantillaCarta()`), así se ve que la carta se arma con los atributos del objeto.
* **Array global:** `let avatares = []` y se cargan con `avatares.push(aang, katara, zuko, toph)` y `avatares.push(iroh, azula, sokka, bumi)`.
* **`length` y recorrido:** `avatares.length` para saber cuántos hay y `forEach` para generar las cartas de selección. `console.log(avatares)` para revisar el array en el inspector.
* **Escalabilidad (100, 1000...):** un bucle `for` instancia un `ejercito` de 1000 avatares para demostrar que la misma clase escala sin límite (`console.log(ejercito)`).
* **Crear maestros desde el juego:** la carta "＋ Crear maestro" abre un formulario (nombre, elemento, vidas, habilidad). Al enviarlo se hace `new Avatar(...)` + `avatares.push(...)` + `renderizarSeleccion()`, así el jugador instancia tantos personajes como quiera y aparecen listos para combatir.

### 1.c Objetos vs Arreglos — arrays dentro de objetos (Clase 06)
* **Array vacío en el constructor:** `this.ataques = []`. Los ataques ya **no** se pasan por parámetro al instanciar.
* **Carga posterior con `push()`:** cada ataque es un objeto `{ nombre, id }`:
  ```js
  zuko.ataques.push(
      { nombre: 'Patada',  id: 'boton_patada'  },
      { nombre: 'Puño',    id: 'boton_punio'   },
      { nombre: 'Barrida', id: 'boton_barrida' }
  )
  ```
  El resto de los maestros (y los creados desde el formulario o el ejército de 1000) usan `cargarAtaques(personaje)`, así cada uno tiene **su propio** array.
* **Acceso por índice:** `zuko.ataques[0]` → `{ nombre: 'Patada', id: 'boton_patada' }`, `zuko.ataques[1]`, `zuko.ataques[2]`.
* **Array de objetos con arrays adentro:** `avatares[0].ataques[0].nombre`.
* **Botones generados desde los datos:** `renderizarAtaques()` recorre `jugadorActivo.ataques` y crea un `<button>` por ataque con `id = ataque.id` (`boton_punio`, `boton_patada`, `boton_barrida`).
* **El enemigo** elige con `atacarAlAzar()`, que devuelve el objeto completo; se usa su `.nombre` para resolver el combate.

### 1.d Ciclos: manipulando el DOM con iteradores (Clase 07)
* **Contenedor en el HTML:** `<div id="contenedorTarjetas"></div>` reemplaza a las tarjetas fijas; se captura con `const contenedorTarjetas = document.getElementById('contenedorTarjetas')`.
* **Variable global `let opcionAvatares`:** guarda el HTML de cada tarjeta.
* **`forEach()`:** recorre el array `avatares` y, por cada `avatar`, arma su tarjeta con un **template literal** (backticks y `${avatar.nombre}`, `${avatar.imagen}`...):
  ```js
  avatares.forEach((avatar, indice) => {
      opcionAvatares = `
          <input type="radio" name="personaje" id="avatar-${indice}" />
          <label class="tarjeta-de-avatar" for="avatar-${indice}">
              <p>${avatar.nombre}</p>
              <img src="${avatar.imagen}" alt="${avatar.nombre}">
          </label>`;
      contenedorTarjetas.innerHTML += opcionAvatares;
  });
  ```
* **`innerHTML +=`:** concatena cada tarjeta a las anteriores, así se muestran todos los maestros. La página pasa de **estática** a **dinámica**.
* **Selección con radio + label:** al hacer clic en el `label` se marca su `input radio`; un único listener `change` en el contenedor (delegación de eventos) llama a `seleccionarPersonaje()`.
* El `id` usa el índice (`avatar-0`, `avatar-1`...) porque puede haber maestros con el mismo nombre o con espacios.

### 1.e Declaración lenta de variables y orden de ejecución (Clase 08)
* **El problema:** el navegador lee el HTML de arriba hacia abajo y después el JS. Los `<input>` de las tarjetas los crea el `forEach`, así que si se capturan con `getElementById()` **antes**, la variable queda en `null` y la selección se rompe.
* **Declaración lenta:** las variables se declaran arriba **sin valor** (`let inputAang; let inputKatara; let inputZuko; let inputToph; let inputsAvatares = [];`) y se **asignan** en `capturarInputs()`, que se llama **después** del `forEach` dentro de `renderizarSeleccion()`.
* **Se recapturan en cada renderizado:** `innerHTML` vuelve a crear las etiquetas (por ejemplo al crear un maestro), así que las referencias viejas dejan de servir.
* **Selección con `checked`:** `seleccionarPersonajeJugador()` busca qué input está `checked` y elige ese maestro; si no hay ninguno muestra un aviso.
* **Prueba en consola:** se imprime el input de Zuko antes del `forEach` (`null`) y después (el elemento).
* **Script al final del `<body>`:** `<script src="js/avatar.js"></script>` se carga cuando todo el HTML ya existe.

### 1.f Canvas: el mapa de encuentro (Clase 09)
* **Nueva sección en el HTML:** `<section id="ver-mapa">` con el título *"Recorre el mapa con tu personaje"* y un `<canvas id="mapa">`.
* **Constantes en el JS:** `const sectionVerMapa = document.getElementById('ver-mapa')` y `const mapa = document.getElementById('mapa')`.
* **Mostrar / ocultar con `style.display`:** el mapa arranca con `display = 'none'`; al elegir un maestro se muestra con `display = 'flex'` y el botón **¡A COMBATIR!** (`irAlCombate()`) lo oculta y pasa a la batalla.
* **CSS:** `#ver-mapa` en columna y centrado; `#mapa { border: 2px solid white; }`.
* **El lienzo:** `let lienzo = mapa.getContext('2d')` permite dibujar en 2 dimensiones. El plano cartesiano del canvas tiene el `(0,0)` arriba a la izquierda: `x` crece hacia la derecha e `y` hacia abajo (se dibuja una cuadrícula para verlo).
* **`fillRect(x, y, ancho, alto)`:** dibuja rectángulos (el fondo del mapa; el primer "personaje" de la clase era `fillRect(5, 15, 20, 40)`).
* **`drawImage()`:** se crea `new Image()`, se le asigna la foto que ya está en el objeto (`jugadorActivo.imagen`) y se dibuja con `lienzo.drawImage(imagen, 20, 40, 100, 160)` dentro de `onload`, para que la imagen ya esté cargada.
* Los maestros sin imagen se dibujan con un rectángulo del color de su nación y su nombre.

### 1.g Movimiento en el canvas (Clase 10)
* **Nuevos atributos en la clase `Avatar`:** `this.x = 20`, `this.y = 30`, `this.ancho = 80`, `this.alto = 128` (la posición se guarda en el objeto para después actualizarla), `this.velocidadX = 0`, `this.velocidadY = 0`.
* **La imagen se crea en el constructor:** `this.mapaFoto = new Image()` y `this.mapaFoto.src = imagen`. Ya no se hace `new Image()` cada vez que se pinta.
* **`pintarPersonaje()`:** suma la velocidad a la posición (`aang.x = aang.x + aang.velocidadX`), limpia el canvas con `lienzo.clearRect(0, 0, mapa.width, mapa.height)` y dibuja con `drawImage(jugadorActivo.mapaFoto, x, y, ancho, alto)`.
* **Botones Arriba / Izquierda / Abajo / Derecha:** usan `onmousedown` para llamar a `moverArriba()`, `moverIzquierda()`, `moverAbajo()` o `moverDerecha()`, que solo cambian la velocidad (`velocidadY = -5`, `velocidadX = -5`, `velocidadY = 5`, `velocidadX = 5`).
* **`detenerMovimiento()`:** con `onmouseup` vuelve las velocidades a `0` y el personaje se frena.
* **`setInterval(pintarPersonaje, 50)`:** guardado en la variable global `let intervalo`; repinta el mapa cada 50 ms, así el personaje se sigue moviendo mientras el botón está apretado. Al ir al combate o reiniciar se corta con `clearInterval(intervalo)`.
* Próxima clase: mover el personaje con las teclas del teclado.

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