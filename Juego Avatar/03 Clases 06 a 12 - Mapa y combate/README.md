# 🌪️💧🌿🔥 La leyenda de AANG: Avatar.

¡Bienvenidos al repositorio de nuestro proyecto! Este es un mini juego web interactivo desarrollado por el equipo **Código Crítico** para poner en práctica nuestros conocimientos de desarrollo frontend, con un enfoque especial en la manipulación del DOM, lógica algorítmica y Programación Orientada a Objetos (POO) mediante JavaScript.

## 📖 Descripción del Proyecto
La idea central es recrear un combate básico estilo *Avatar: La Leyenda de Aang*. El jugador selecciona su maestro favorito y recorre el mapa de las Cuatro Naciones hasta chocar con un enemigo, y pelea contra él con un sistema de reglas tipo "piedra, papel o tijera" (Puño, Patada, Barrida).

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
* **Vidas distintas según el personaje:** el cuarto parámetro del constructor son las vidas, y se eligieron acompañando la habilidad de cada uno:

  | Personaje | Vidas | Por qué |
  |---|---|---|
  | Azula | 2 | "Fuego azul · frágil pero letal" |
  | Aang, Katara, Zuko, Toph, Sokka, Bumi, Ty Lee | 3 | Cantidad normal |
  | Iroh | 4 | "Dragón de Occidente · aguanta más golpes" |
  | Ozai | 5 | "Señor del Fuego · poder del cometa" (el jefe final) |

  En la pelea cada ronda perdida quita 1 vida y todos tienen los mismos 3 ataques, así que las vidas son lo único que cambia la dificultad: con Azula se pierde más rápido (y como rival se la vence fácil) y Ozai es el rival más difícil. La habilidad es solo un texto descriptivo. Los maestros creados con el formulario tienen las vidas que se elijan (3 si se deja vacío). Es un ejemplo de POO: un solo molde (la clase) y objetos con datos distintos que cambian cómo se comporta el juego.
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
* El `id` usa el índice (`avatar-0`, `avatar-1`...) porque el nombre puede tener espacios.

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

### 1.h Movimiento desde el teclado y fondo del mapa (Clase 11)
* **`iniciarMapa()`:** junta todo lo que arranca el mapa: `mapa.width = 800`, `mapa.height = 600`, `personajeJugadorObjeto = obtenerObjetoPersonaje(personajeJugador)`, `intervalo = setInterval(pintarCanvas, 50)` y los eventos del teclado. Se llama desde `seleccionarPersonaje()` junto con `sectionVerMapa.style.display = 'flex'`.
* **Eventos del teclado:** `window.addEventListener('keydown', sePresionoUnaTecla)` y `window.addEventListener('keyup', detenerMovimiento)`.
* **`sePresionoUnaTecla(event)`:** el evento es un objeto y `event.key` dice qué tecla se presionó. Un `switch (event.key)` llama a `moverArriba()`, `moverAbajo()`, `moverIzquierda()` o `moverDerecha()` según la flecha (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`). Con `event.preventDefault()` las flechas no mueven la página.
* **Fondo del mapa:** `let mapaBackground = new Image()` con `mapaBackground.src = 'imagenes/mapa/mapa.svg'`, dibujado con `lienzo.drawImage(mapaBackground, 0, 0, mapa.width, mapa.height)`. Es un mapa ilustrado de las Cuatro Naciones (Reino Tierra con Ba Sing Se, Nación del Fuego, Tribus Agua del Norte y del Sur, Templos del Aire). Es un SVG de pocos KB, así no pesa en GitHub.
* **`pintarPersonaje()` → `pintarCanvas()`:** cambia de nombre porque ahora pinta todo el canvas: el fondo, el enemigo y el jugador (cada uno con su nombre arriba, usando `dibujarPersonaje()`).
* **`obtenerObjetoPersonaje()`:** recorre `avatares` con un `for` y, cuando `personajeJugador === avatares[i].nombre`, hace `return avatares[i]`: devuelve el objeto completo del maestro elegido. Ese objeto se guarda en `let personajeJugadorObjeto` y reemplaza a Aang en `moverArriba()`, `moverAbajo()`, `moverIzquierda()`, `moverDerecha()`, `detenerMovimiento()` y `pintarCanvas()`.
* **Nombres únicos:** como el objeto se busca por nombre, al crear un maestro se valida que no exista otro con el mismo nombre.
* **El enemigo en el mapa:** se dibuja en el Reino Tierra, cerca de Ba Sing Se.
* **Personajes de cuerpo entero:** en el mapa ya no se ve la carta sino el personaje completo. Aang, Katara, Zuko, Toph, Iroh, Azula, Sokka, Bumi, Ozai y Ty Lee usan dibujos recortados con fondo transparente (`imagenes/mapa/*.png`), y los maestros creados desde el formulario usan el de su nación (`aire.svg`, `agua.svg`, `fuego.svg`, `tierra.svg`). El constructor recibe la ruta como sexto parámetro (`fotoMapa`).
* **Cartas con el dibujo del personaje:** los personajes sin carta ilustrada (Iroh, Azula, Sokka, Bumi, Ozai, Ty Lee y los maestros creados desde el formulario) muestran en la carta el mismo dibujo que en el mapa: `plantillaCarta()` usa `personaje.mapaFoto.src` en un `<img class="gen-figura">`, con el símbolo de la nación en la esquina. Así los creados muestran el muñeco genérico de su nación (`aire.svg`, `agua.svg`, `fuego.svg`, `tierra.svg`), tanto en la selección como en la pelea.
* **Personajes genéricos por nación:** si al constructor no se le pasa `fotoMapa`, usa `'imagenes/mapa/' + elemento + '.svg'`. Son 4 dibujos SVG de cuerpo entero, con contorno oscuro y sombreado como los PNG, cada uno con la ropa y el poder de su nación:
  * **Aire** (`aire.svg`): monje nómada con túnica amarilla y banda naranja, flecha azul en la cabeza, bastón planeador y un remolino de aire.
  * **Agua** (`agua.svg`): guerrero de la Tribu Agua con parka azul y piel blanca, coleta y un látigo de agua.
  * **Fuego** (`fuego.svg`): túnica roja con hombreras, rodete con corona dorada y una llama en la mano.
  * **Tierra** (`tierra.svg`): túnica verde, sombrero de paja y una roca flotando.
* **Proporción de cada dibujo:** todos miden `110` px de alto en el mapa y el ancho se calcula en `mapaFoto.onload` con `naturalWidth / naturalHeight`, así ninguno se deforma (Sokka agachado es más ancho que Zuko parado).
* **Nuevos maestros:** **Ozai** (5 vidas) y **Ty Lee** (3 vidas), de la Nación del Fuego.
* **Al salir del mapa** (combatir o reiniciar) `detenerMapa()` corta el `setInterval` y saca los eventos del teclado con `removeEventListener`.

### 1.i Enemigos en el mapa, colisiones y ataques (Clase 12)
* **Parámetros con valor por default:** `constructor(nombre, elemento, imagen, vidas, habilidad, fotoMapa, x = 20, y = 30)`. Dentro del constructor `this.x = x` y `this.y = y`; si no se pasan, el personaje arranca en (20, 30).
* **Enemigos en el mapa:** objetos nuevos con la palabra `Enemigo` (`zukoEnemigo`, `kataraEnemigo`, `aangEnemigo`, `tophEnemigo`, `irohEnemigo`...) que solo cambian su posición: `new Avatar('Zuko', 'fuego', 'imagenes/zuko.png', 3, 'Rayo · daño masivo', 'imagenes/mapa/zuko.png', 205, 275)`. Cada uno espera en su nación y se guardan en el array `enemigos`. No se pinta el enemigo igual al maestro elegido.
* **Posiciones de los enemigos** (x, y en el canvas de 800 × 600):

  | Enemigo | x | y | Lugar del mapa |
  |---|---|---|---|
  | Ozai | 45 | 285 | Nación del Fuego |
  | Azula | 95 | 370 | Nación del Fuego |
  | Zuko | 205 | 275 | Nación del Fuego (costa este) |
  | Katara | 300 | 470 | Mar del sur |
  | Ty Lee | 375 | 310 | Desierto Si Wong |
  | Toph | 440 | 200 | Reino Tierra |
  | Sokka | 460 | 470 | Isla Kyoshi |
  | Iroh | 560 | 360 | Reino Tierra, al sur de Ba Sing Se |
  | Aang | 615 | 175 | Reino Tierra (noreste) |
  | Bumi | 680 | 260 | Reino Tierra (este) |

  Ty Lee y Sokka se corrieron (antes estaban en 320, 300 y 410, 470) porque quedaban a menos de 75 px de Zuko y Katara: al ir hacia ellos desde la derecha se chocaba primero con el de al lado.
* **Método `pintarAvatares()`:** el `lienzo.drawImage(this.mapaFoto, this.x, this.y, this.ancho, this.alto)` pasa a ser un método de la clase. En `pintarCanvas()` se llama `personajeJugadorObjeto.pintarAvatares()` y lo mismo para cada enemigo.
* **`revisarColision(enemigo)`:** calcula los 4 bordes (`arriba`, `abajo`, `derecha`, `izquierda`) del enemigo y del personaje. Si `abajoPersonaje < arribaEnemigo || arribaPersonaje > abajoEnemigo || derechaPersonaje < izquierdaEnemigo || izquierdaPersonaje > derechaEnemigo` no se tocan y hace `return`. Si no, hay colisión.
* **Solo con movimiento:** `pintarCanvas()` revisa colisiones cuando `velocidadX !== 0 || velocidadY !== 0`.
* **De la colisión a la pelea:** al chocar se llama `detenerMovimiento()` y `clearInterval(intervalo)`, se oculta el mapa (`sectionVerMapa.style.display = 'none'`), se muestra la sección de ataques y se llama `seleccionarPersonajeEnemigo(enemigo)`: ya no se sortea el rival, peleás contra el que chocaste. El botón "¡A COMBATIR!" se quitó.
* **Ataques de los enemigos:** cada enemigo carga sus ataques con `push()` repitiendo su favorito (Zuko y Toph más Puño, Katara más Barrida, Aang más Patada), así `atacarAlAzar()` lo elige más seguido.
* **Flechas en plena pelea:** la pantalla de selección solo se vuelve transparente, así que el radio del maestro elegido seguía con el foco y las flechas lo cambiaban al llegar al combate (volvía a aparecer el mapa). Se corrigió con `blur()` en `seleccionarPersonajeJugador()` y se ignora el `change` si la selección está oculta (`is-hidden`).

### 2. Manipulación del DOM
* **Captura Eficiente:** Uso sistemático de `document.getElementById()` para la referencia rápida de elementos.
* **Inyección Dinámica:** Modificación de `innerHTML` y manipulación de clases (`className`) extraídas directamente de los objetos para cambiar personajes, actualizar marcadores de vida y mostrar resultados de combate en tiempo real.
* **Creación de Nodos:** Generación de logs de batalla dinámicos para mantener un historial legible y estilizado.

### 3. Lógica de Juego y Eventos
* **Aleatoriedad:** `Math.random()` en `atacarAlAzar()` para el ataque del enemigo, garantizando partidas únicas en cada sesión.
* **Control de Estado:** Deshabilitación de botones (`disabled = true`) al detectar la condición de victoria o derrota consultando los métodos de los objetos.
* **Interfaz de Usuario (UI):** Uso de modales para las reglas del juego y para el resultado final, más botones interactivos para una experiencia fluida.

### 4. Rediseño visual
* **Pantalla de intro:** una portada con el lore de las cuatro naciones y un botón "Comenzar" (`comenzarJuego()`) antes de la selección de maestros.
* **Tema por nación:** La paleta de la interfaz (`--accent`) cambia según el elemento del maestro elegido: Aire, Agua, Fuego o Tierra.
* **Animaciones de combate:** Choque de ataques en el panel central (`@keyframes clashPop`), sacudida de la carta al recibir daño (`hitShake`) y transiciones entre pantallas.
* **HUD de vidas:** Marcadores circulares con glow del color de la nación en lugar de emojis.

## ✅ Pruebas antes de la presentación
Probamos el juego completo en el navegador, llamando a las funciones del juego desde la consola. Usamos 14 maestros: los 10 del juego y 4 creados con el formulario (uno por nación).

| Prueba | Qué se verificó | Resultado |
|---|---|---|
| Peleas completas | Cada maestro contra cada rival del mapa: arranca la pelea, se oculta el mapa, aparecen las dos cartas y los 3 ataques, termina con victoria o derrota, se desactivan los botones y "Reiniciar" vuelve a la selección. | 130 de 130 |
| Cambio de maestro en plena pelea | Con la pelea en curso se fuerza el cambio del radio: el combate no se altera y el mapa no vuelve a aparecer. | 130 de 130 |
| Acercarse caminando | Cada maestro camina hacia cada enemigo desde los 4 lados, paso a paso como con las flechas: la pelea arranca contra el enemigo al que iba. | 520 de 520 |
| Imágenes | Cargan las 14 cartas (ilustradas, con figura o con el muñeco de su nación) y las 24 figuras del mapa. | Sin errores |
| Arranque y bordes | El jugador no arranca tocando a un enemigo y no puede salir del canvas. | Sin errores |

Las pruebas con el teclado físico (apretar las flechas al chocar con un enemigo) se hacen jugando una partida a mano.

## 💻 Cómo Ejecutar
1. Clona este repositorio en tu equipo local.
2. Asegúrate de tener los archivos organizados según la estructura:
   * `index.html` (Raíz)
   * `js/avatar.js`
   * `imagenes/` (Carpeta con assets de los personajes)
   * `imagenes/mapa/` (Fondo del mapa, personajes de cuerpo entero en PNG y genéricos por nación en SVG)
   * `audio/` (Carpeta con `batalla_oriental.mp3`)
3. Abre `index.html` en tu navegador favorito o mediante una extensión como Live Server.

---

### Desarrollado por: **Grupo Código Crítico**
*Este proyecto es parte de nuestro proceso de aprendizaje continuo y práctica técnica.*