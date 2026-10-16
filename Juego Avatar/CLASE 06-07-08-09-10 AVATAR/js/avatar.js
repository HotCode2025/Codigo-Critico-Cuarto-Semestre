// =====================================================================
//  LA LEYENDA DE AANG: AVATAR  —  Motor del juego
// ---------------------------------------------------------------------
//  Clase 04  ->  Programación Orientada a Objetos (POO)
//                Definimos la CLASE "Avatar" (el molde/plano) con sus
//                ATRIBUTOS (variables del objeto) y sus MÉTODOS (acciones).
//
//  Clase 05  ->  Instanciación y Arrays
//                Creamos los OBJETOS con la palabra reservada  new
//                y los agrupamos dentro de un ARRAY  (avatares = [])
//                usando  push()  /  length.
//
//  Clase 06  ->  Objetos vs Arreglos (arrays dentro de objetos)
//                El atributo  ataques  arranca como array VACÍO en el
//                constructor y se carga después con  push()  usando
//                objetos { nombre, id }. Accedemos con  ataques[0], [1]...
//
//  Clase 07  ->  Ciclos: manipulando el DOM con iteradores
//                Recorremos el array  avatares  con  forEach()  y armamos
//                el HTML de cada tarjeta con TEMPLATE LITERALS (backticks
//                y ${...}). Lo inyectamos con  innerHTML +=  dentro de
//                <div id="contenedorTarjetas">: la página pasa de
//                estática a dinámica.
//
//  Clase 08  ->  Declaración lenta de variables / orden de ejecución
//                Los <input> de las tarjetas NO existen hasta que corre
//                el forEach. Por eso las variables que los capturan se
//                DECLARAN arriba (sin valor) y se ASIGNAN después del
//                forEach. El <script> va al final del <body>.
//
//  Clase 09  ->  Canvas: el mapa de encuentro
//                Nueva <section id="ver-mapa"> con un <canvas id="mapa">.
//                Con  getContext('2d')  obtenemos el "lienzo" y dibujamos
//                con  fillRect()  y  drawImage()  usando el plano
//                cartesiano del canvas: (0,0) arriba a la izquierda,
//                x crece hacia la derecha e y hacia abajo.
//
//  Clase 10  ->  Movimiento en el canvas
//                El objeto guarda su posición (x, y), su tamaño (ancho,
//                alto), su velocidad (velocidadX, velocidadY) y su imagen
//                para el mapa (mapaFoto). Los botones cambian la velocidad
//                con onmousedown y la vuelven a 0 con onmouseup. Un
//                setInterval() llama a pintarPersonaje() cada 50 ms: suma
//                la velocidad a la posición, limpia el canvas con
//                clearRect() y vuelve a dibujar.
// =====================================================================


// =====================================================================
// 1. CLASE  Avatar   (Clase 04: el "plano" para construir personajes)
// =====================================================================
class Avatar {

    // El constructor recibe, EN ORDEN, la información propia de cada
    // personaje (nombre, elemento, vidas...) y la guarda dentro de sus
    // propiedades usando  this  ("el objeto actual donde estoy parado").
    // Con este molde podemos instanciar 4, 100 o 1000 personajes.
    constructor(nombre, elemento, imagen, vidas, habilidad) {
        this.nombre    = nombre;      // Atributo: nombre del maestro
        this.elemento  = elemento;    // Atributo: nación / elemento
        this.imagen    = imagen;      // Atributo: ruta de la carta (puede ir vacío)
        this.ataques   = [];          // Atributo tipo ARRAY (Clase 06): NO viene por
                                      // parámetro, arranca vacío y se carga con push()
        this.vidasMax  = vidas;       // Atributo: vidas iniciales
        this.vidas     = vidas;       // Atributo: vidas actuales (estado)
        this.habilidad = habilidad || '';  // Atributo opcional: habilidad especial

        // Clase 10: datos para dibujarlo y moverlo dentro del canvas.
        this.x = 20;           // este será el valor por defecto
        this.y = 30;
        this.ancho = 80;
        this.alto  = 128;      // las cartas son verticales: 80 x 128 no deforma la foto
        this.velocidadX = 0;   // cuántos px se mueve en x en cada repintado
        this.velocidadY = 0;

        // La imagen del mapa se crea UNA vez, dentro del constructor.
        // (Los maestros sin foto se dibujan con figuras del canvas.)
        this.mapaFoto = new Image();
        if (imagen) {
            this.mapaFoto.src = imagen;
        }
    }

    // ---------------- MÉTODOS (acciones del objeto) -------------------

    // Reduce en 1 las vidas de ESTE personaje (si todavía le quedan).
    recibirDano() {
        if (this.vidas > 0) {
            this.vidas--;
        }
    }

    // Devuelve true mientras el personaje conserve al menos 1 vida.
    estaVivo() {
        return this.vidas > 0;
    }

    // Elige al azar uno de los ataques del propio array del objeto.
    // Usamos  this.ataques.length  para saber cuántos ataques hay.
    // Devuelve el OBJETO completo: { nombre: 'Puño', id: 'boton_punio' }.
    atacarAlAzar() {
        const indice = Math.floor(Math.random() * this.ataques.length);
        return this.ataques[indice];
    }

    // Restaura al personaje a su estado inicial (para "Reiniciar").
    revivir() {
        this.vidas = this.vidasMax;
        // Clase 10: también vuelve a su lugar de partida en el mapa.
        this.x = 20;
        this.y = 30;
        this.velocidadX = 0;
        this.velocidadY = 0;
    }
}


// =====================================================================
// 2. INSTANCIACIÓN + ARRAY   (Clase 05: crear los objetos con  new )
// =====================================================================

// --- Cada personaje es una INSTANCIA (un objeto) creado con  new  ---
// El "template" (la clase) se completa con la info de cada uno.
// Los ataques YA NO se pasan acá: se cargan después con push().
//            nombre,  elemento, imagen,               vidas, habilidad
const aang   = new Avatar('Aang',   'aire',   'imagenes/aan.png',    3, 'Planeador · aumenta la esquiva');
const katara = new Avatar('Katara', 'agua',   'imagenes/katara.png', 3, 'Curación · restaura vida');
const zuko   = new Avatar('Zuko',   'fuego',  'imagenes/zuko.png',   3, 'Rayo · daño masivo');
const toph   = new Avatar('Toph',   'tierra', 'imagenes/toph.png',   3, 'Armadura de Piedra · absorbe daño');

// Personajes NUEVOS: sin imagen propia, la carta se dibuja por código.
// Cada uno lleva DISTINTA información (vidas, habilidad) desde el mismo molde.
const iroh  = new Avatar('Iroh',  'fuego',  '', 4, 'Dragón de Occidente · aguanta más golpes');
const azula = new Avatar('Azula', 'fuego',  '', 2, 'Fuego azul · frágil pero letal');
const sokka = new Avatar('Sokka', 'agua',   '', 3, 'Bumerang · guerrero de la Tribu Agua');
const bumi  = new Avatar('Bumi',  'tierra', '', 3, 'Rey de Omashu · espera el momento justo');

// ---------------------------------------------------------------------
// ARRAYS DENTRO DE OBJETOS  (Clase 06)
// Cargamos el array  ataques  de cada personaje con  push().  Cada
// ataque es a su vez un OBJETO { nombre, id }: el  id  es el del botón
// que se dibuja en el footer de batalla.
// ---------------------------------------------------------------------
zuko.ataques.push(
    { nombre: 'Patada',  id: 'boton_patada'  },
    { nombre: 'Puño',    id: 'boton_punio'   },
    { nombre: 'Barrida', id: 'boton_barrida' }
);

// Accedemos a cada ataque con  []  y su índice (empieza en 0).
console.log(zuko.ataques[0]);   // { nombre: 'Patada',  id: 'boton_patada'  }
console.log(zuko.ataques[1]);   // { nombre: 'Puño',    id: 'boton_punio'   }
console.log(zuko.ataques[2]);   // { nombre: 'Barrida', id: 'boton_barrida' }

// El resto de los maestros recibe sus ataques con la misma función.
// Cada uno guarda SUS PROPIOS objetos de ataque (no comparten el array).
function cargarAtaques(personaje) {
    personaje.ataques.push(
        { nombre: 'Puño',    id: 'boton_punio'   },
        { nombre: 'Patada',  id: 'boton_patada'  },
        { nombre: 'Barrida', id: 'boton_barrida' }
    );
}

[aang, katara, toph, iroh, azula, sokka, bumi].forEach(cargarAtaques);

// Creamos el ARRAY vacío de alcance global (una "caja" que guarda datos).
let avatares = [];

// Cargamos las instancias DENTRO del array con el método  push().
avatares.push(aang, katara, zuko, toph);   // personajes originales
avatares.push(iroh, azula, sokka, bumi);   // personajes nuevos

// Verificación pedida en la Issue #43: mirar el inspector del navegador.
// Ahora es un ARRAY DE OBJETOS y cada objeto tiene OTRO ARRAY adentro.
console.log('Array avatares (' + avatares.length + ' personajes):', avatares);
console.log('Primer ataque de ' + avatares[0].nombre + ':', avatares[0].ataques[0].nombre);

// ---------------------------------------------------------------------
// ESCALABILIDAD: con la misma clase podemos instanciar 100, 1000, etc.
// Generamos un "ejército" con un bucle y lo guardamos en su propio
// array (no entra a la selección para no saturar la interfaz).
// ---------------------------------------------------------------------
const ELEMENTOS = ['aire', 'agua', 'fuego', 'tierra'];
const ejercito = [];
for (let i = 1; i <= 1000; i++) {
    const recluta = new Avatar('Recluta ' + i, ELEMENTOS[i % 4], '', 3);
    cargarAtaques(recluta);
    ejercito.push(recluta);
}
console.log('Escalabilidad POO → ejército de ' + ejercito.length + ' avatares:', ejercito);


// Objetos que van a estar combatiendo (se completan al elegir personaje).
let jugadorActivo = null;
let enemigoActivo = null;
let juegoTerminado = false;


// =====================================================================
// 3. REFERENCIAS AL DOM
// =====================================================================
const pantallaIntro     = document.getElementById('intro-screen');
const pantallaSeleccion = document.getElementById('selection-screen');
// Capturamos el contenedor donde se renderizan las tarjetas (Clase 07).
const contenedorTarjetas = document.getElementById('contenedorTarjetas');
const escenarioBatalla   = document.getElementById('battle-stage');
const footerAcciones      = document.getElementById('action-footer');
const contenedorAtaques   = document.getElementById('action-btns');

// Clase 09: sección del mapa y el canvas donde dibujamos.
const sectionVerMapa = document.getElementById('ver-mapa');
const mapa           = document.getElementById('mapa');

// El "lienzo": nos permite dibujar dentro del canvas en 2 dimensiones.
let lienzo = mapa.getContext('2d');

// Clase 10: guarda el setInterval que repinta el mapa constantemente.
let intervalo;

const elPlayerCard = document.getElementById('player-card');
const elEnemyCard  = document.getElementById('enemy-card');
const elVidasJugador = document.getElementById('vidas-jugador');
const elVidasEnemigo = document.getElementById('vidas-enemigo');
const elHistory = document.getElementById('battle-history');
const elClash   = document.getElementById('clash');

const btnReiniciar = document.getElementById('btn-reiniciar');
const musicaFondo  = document.getElementById('musica-fondo');
const btnMusica    = document.getElementById('btn-musica');

const modalReglas = document.getElementById('modal-reglas');
const modalFin    = document.getElementById('modal-fin');
const modalCrear  = document.getElementById('modal-crear');
const formCrear   = document.getElementById('form-crear');


// Datos visuales de cada nación (símbolo y título del maestro).
const NACIONES = {
    aire:   { crest: '🌀', titulo: 'del Aire' },
    agua:   { crest: '💧', titulo: 'del Agua' },
    fuego:  { crest: '🔥', titulo: 'del Fuego' },
    tierra: { crest: '⛰️', titulo: 'de la Tierra' },
};

// Devuelve el HTML de una carta dibujada por código (personajes sin imagen).
function plantillaCarta(personaje) {
    const nacion = NACIONES[personaje.elemento];
    return `
        <span class="gen-crest">${nacion.crest}</span>
        <span class="gen-name">${personaje.nombre}</span>
        <span class="gen-titulo">Maestro/a ${nacion.titulo}</span>
        <span class="gen-stats">❤ ${personaje.vidasMax} vidas · ${personaje.ataques.length} ataques</span>`;
}

// =====================================================================
// 4. RENDERIZADO DE LAS TARJETAS CON forEach  (Clase 07)
//    Recorremos el ARRAY de avatares y, por cada objeto, generamos su
//    HTML con un template literal. Cada vez que se crea un maestro
//    nuevo, se vuelve a renderizar.
// =====================================================================

// Variable global donde guardamos el HTML de cada tarjeta.
let opcionAvatares;

// ---------------------------------------------------------------------
// DECLARACIÓN LENTA DE VARIABLES  (Clase 08)
// Declaramos las variables de los inputs SIN valor. Si hiciéramos acá
//     const inputZuko = document.getElementById('avatar-2');
// obtendríamos  null : ese input todavía no fue creado por el forEach.
// Se les asigna valor recién en  capturarInputs(),  después del forEach.
// ---------------------------------------------------------------------
let inputAang;
let inputKatara;
let inputZuko;
let inputToph;
let inputsAvatares = [];   // todos los inputs, incluidos los maestros creados

// Prueba en consola: antes del forEach el input NO existe.
console.log('Antes del forEach → input de Zuko:', document.getElementById('avatar-2'));   // null

function renderizarSeleccion() {
    contenedorTarjetas.innerHTML = '';

    // forEach: "por cada avatar del array, hacé algo". Recibe una función
    // con el objeto en singular (avatar) y su posición (indice).
    avatares.forEach((avatar, indice) => {
        // La imagen va como <img>; si el maestro no tiene, se dibuja por código.
        const contenido = avatar.imagen
            ? `<img src="${avatar.imagen}" alt="${avatar.nombre}">`
            : plantillaCarta(avatar);

        // Template literal: HTML escrito como texto con ${...} para
        // insertar los ATRIBUTOS del objeto. El id usa el índice porque
        // puede haber dos maestros con el mismo nombre.
        opcionAvatares = `
            <input type="radio" name="personaje" id="avatar-${indice}" value="${indice}" />
            <label class="tarjeta-de-avatar select-card nacion-${avatar.elemento} ${avatar.imagen ? '' : 'card--generado'}"
                   for="avatar-${indice}" title="${avatar.nombre}${avatar.habilidad ? ' — ' + avatar.habilidad : ''}">
                <p class="tarjeta-nombre">${avatar.nombre}</p>
                ${contenido}
            </label>
        `;

        // innerHTML += concatena cada tarjeta a las anteriores.
        contenedorTarjetas.innerHTML += opcionAvatares;
    });

    // Carta especial: "＋ Crear maestro" (abre el formulario).
    contenedorTarjetas.innerHTML += `
        <button type="button" class="select-card select-card--nuevo" id="btn-nuevo-maestro">
            <span class="nuevo-mas">＋</span><span class="nuevo-txt">CREAR MAESTRO</span>
        </button>`;

    // Recién ahora los inputs existen en el DOM: los capturamos.
    capturarInputs();
}

// Asigna las variables declaradas arriba, DESPUÉS de que el forEach
// creó las etiquetas. Se llama en cada renderizado porque  innerHTML
// vuelve a crear los elementos (los anteriores dejan de servir).
function capturarInputs() {
    inputAang   = document.getElementById('avatar-' + avatares.indexOf(aang));
    inputKatara = document.getElementById('avatar-' + avatares.indexOf(katara));
    inputZuko   = document.getElementById('avatar-' + avatares.indexOf(zuko));
    inputToph   = document.getElementById('avatar-' + avatares.indexOf(toph));

    inputsAvatares = avatares.map((avatar, indice) => document.getElementById('avatar-' + indice));
}

// Revisa qué input quedó  checked  y devuelve el maestro que le corresponde.
function seleccionarPersonajeJugador() {
    const indice = inputsAvatares.findIndex(input => input.checked);

    if (indice === -1) {
        alert('Selecciona un maestro');
        return;
    }

    seleccionarPersonaje(avatares[indice]);
}

// Los eventos se escuchan UNA vez en el contenedor (delegación), porque
// innerHTML += vuelve a crear los elementos en cada renderizado.
contenedorTarjetas.addEventListener('change', (evento) => {
    if (evento.target.name === 'personaje') {
        seleccionarPersonajeJugador();
    }
});
contenedorTarjetas.addEventListener('click', (evento) => {
    if (evento.target.closest('#btn-nuevo-maestro')) {
        abrirModal(modalCrear);
    }
});

renderizarSeleccion();

// Después del forEach el input SÍ existe.
console.log('Después del forEach → input de Zuko:', inputZuko, '| checked:', inputZuko.checked);

// ---------------------------------------------------------------------
// CREAR UN MAESTRO NUEVO: instanciamos con  new  y lo metemos al array
// con  push().  Es exactamente la consigna: crear tantos como queramos.
// ---------------------------------------------------------------------
function crearMaestro(evento) {
    evento.preventDefault();

    const datos = new FormData(formCrear);
    const nombre    = (datos.get('nombre') || '').trim() || 'Maestro ' + (avatares.length + 1);
    const elemento  = datos.get('elemento');
    const vidas     = Number(datos.get('vidas')) || 3;
    const habilidad = (datos.get('habilidad') || '').trim();

    // 1) Instanciamos un objeto nuevo a partir de la clase Avatar.
    const nuevoMaestro = new Avatar(nombre, elemento, '', vidas, habilidad);
    cargarAtaques(nuevoMaestro);

    // 2) Lo agregamos al final del array con push().
    avatares.push(nuevoMaestro);
    console.log('Maestro creado → avatares tiene ' + avatares.length + ' personajes:', nuevoMaestro);

    // 3) Redibujamos la grilla para que aparezca su carta.
    renderizarSeleccion();
    formCrear.reset();
    cerrarModal(modalCrear);
}

formCrear.addEventListener('submit', crearMaestro);


// =====================================================================
// 5. LÓGICA E INTERFAZ
// =====================================================================

function toggleMusica() {
    if (musicaFondo.paused) {
        musicaFondo.play().catch(() => {});
        btnMusica.classList.add('is-on');
    } else {
        musicaFondo.pause();
        btnMusica.classList.remove('is-on');
    }
}

function abrirModal(modal)  { modal.classList.add('is-open'); }
function cerrarModal(modal) { modal.classList.remove('is-open'); }

// Oculta la intro y muestra la pantalla de selección de maestros.
function comenzarJuego() {
    pantallaIntro.classList.add('is-hidden');
    sectionVerMapa.style.display = 'none';   // el mapa arranca oculto
}

// Ocultamos el mapa también al cargar la página.
sectionVerMapa.style.display = 'none';

function seleccionarPersonaje(personajeElegido) {
    jugadorActivo = personajeElegido;

    // Enemigo: filtramos el array para excluir al jugador y sorteamos.
    const rivales = avatares.filter(p => p !== jugadorActivo);
    enemigoActivo = rivales[Math.floor(Math.random() * rivales.length)];

    // Reseteamos el estado de ambos objetos por si se jugó antes.
    jugadorActivo.revivir();
    enemigoActivo.revivir();
    juegoTerminado = false;

    // Pintamos el tema de la interfaz con el elemento del jugador.
    document.body.dataset.nacion = jugadorActivo.elemento;

    // Cambiamos de pantalla: primero se muestra el MAPA (Clase 09).
    pantallaSeleccion.classList.add('is-hidden');
    btnReiniciar.classList.add('is-visible');
    sectionVerMapa.style.display = 'flex';
    // Clase 10: setInterval(función, milisegundos) llama a pintarPersonaje
    // cada 50 ms. Así vemos el movimiento mientras cambia la velocidad.
    clearInterval(intervalo);
    intervalo = setInterval(pintarPersonaje, 50);

    // Volcamos los ATRIBUTOS de los objetos al DOM.
    pintarCombatiente(elPlayerCard, jugadorActivo);
    pintarCombatiente(elEnemyCard,  enemigoActivo);
    renderizarAtaques(jugadorActivo);

    elHistory.innerHTML = '';
    agregarLog('system', `${jugadorActivo.nombre} desafía a ${enemigoActivo.nombre}. ¡Que empiece el Agni Kai!`);
    actualizarVidas();
    habilitarAtaques(true);

    musicaFondo.play().then(() => btnMusica.classList.add('is-on')).catch(() => {});
}

// =====================================================================
// 6. MAPA CON CANVAS  (Clase 09)
// =====================================================================

// Colores del suelo del mapa según la nación del jugador.
const COLOR_NACION = {
    aire:   '#7dd3fc',
    agua:   '#60a5fa',
    fuego:  '#f87171',
    tierra: '#86efac',
};

// Fondo del mapa: lo repintamos en cada vuelta del setInterval.
function pintarMapa() {
    // fillRect(x, y, ancho, alto) dibuja un rectángulo. Con uno del
    // tamaño del canvas pintamos el fondo del mapa.
    lienzo.fillStyle = '#1b2027';
    lienzo.fillRect(0, 0, mapa.width, mapa.height);

    // Cuadrícula: ayuda a ver el plano cartesiano del canvas.
    lienzo.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    for (let x = 0; x <= mapa.width; x += 40) {
        lienzo.beginPath(); lienzo.moveTo(x, 0); lienzo.lineTo(x, mapa.height); lienzo.stroke();
    }
    for (let y = 0; y <= mapa.height; y += 40) {
        lienzo.beginPath(); lienzo.moveTo(0, y); lienzo.lineTo(mapa.width, y); lienzo.stroke();
    }
    lienzo.fillStyle = 'rgba(255, 255, 255, 0.5)';
    lienzo.font = '12px serif';
    lienzo.fillText('(0,0)', 4, 14);
}

// Clase 10: dibuja al jugador en su posición actual.
// Ya no creamos  new Image()  acá: la imagen vive en  jugadorActivo.mapaFoto.
function pintarPersonaje() {
    // Ajustamos para ir actualizando dependiendo de la velocidad.
    jugadorActivo.x = jugadorActivo.x + jugadorActivo.velocidadX;
    jugadorActivo.y = jugadorActivo.y + jugadorActivo.velocidadY;

    // clearRect limpia todo el canvas para no dejar "rastro" del dibujo anterior.
    lienzo.clearRect(0, 0, mapa.width, mapa.height);
    pintarMapa();

    if (jugadorActivo.imagen) {
        lienzo.drawImage(
            jugadorActivo.mapaFoto,   // cambiamos cada parámetro por los del objeto
            jugadorActivo.x,
            jugadorActivo.y,
            jugadorActivo.ancho,
            jugadorActivo.alto
        );
    } else {
        // Maestros sin imagen: los dibujamos con figuras del canvas.
        lienzo.fillStyle = COLOR_NACION[jugadorActivo.elemento];
        lienzo.fillRect(jugadorActivo.x, jugadorActivo.y, jugadorActivo.ancho, jugadorActivo.alto);
        lienzo.fillStyle = '#12151a';
        lienzo.font = 'bold 13px serif';
        lienzo.textAlign = 'center';
        lienzo.fillText(jugadorActivo.nombre, jugadorActivo.x + jugadorActivo.ancho / 2, jugadorActivo.y + jugadorActivo.alto / 2);
        lienzo.textAlign = 'start';
    }
}

// Las funciones de movimiento ya NO pintan: solo cambian la velocidad.
// El setInterval se encarga de repintar mientras el botón siga apretado.
function moverDerecha() {
    jugadorActivo.velocidadX = 5;
}

function moverIzquierda() {
    jugadorActivo.velocidadX = -5;
}

function moverAbajo() {
    jugadorActivo.velocidadY = 5;
}

function moverArriba() {
    jugadorActivo.velocidadY = -5;
}

// Al soltar el botón la velocidad vuelve a cero y el personaje se frena.
function detenerMovimiento() {
    jugadorActivo.velocidadX = 0;
    jugadorActivo.velocidadY = 0;
}

// Del mapa pasamos al combate.
function irAlCombate() {
    clearInterval(intervalo);   // dejamos de repintar el mapa
    sectionVerMapa.style.display = 'none';
    escenarioBatalla.classList.add('is-visible');
    footerAcciones.classList.add('is-visible');
}

function pintarCombatiente(elCard, personaje) {
    elCard.className = 'card nacion-' + personaje.elemento;
    if (personaje.imagen) {
        elCard.style.backgroundImage = `url("${personaje.imagen}")`;
        elCard.innerHTML = '';
    } else {
        elCard.style.backgroundImage = 'none';
        elCard.classList.add('card--generado');
        elCard.innerHTML = plantillaCarta(personaje);
    }
}

function atacar(ataqueJugador) {
    if (juegoTerminado) return;

    // El enemigo (objeto) elige su ataque con su propio método.
    // Nos devuelve un objeto { nombre, id }; usamos su  nombre.
    const ataqueEnemigo = enemigoActivo.atacarAlAzar().nombre;

    const empate = ataqueJugador === ataqueEnemigo;
    const ganaJugador =
        (ataqueJugador === 'Puño'    && ataqueEnemigo === 'Barrida') ||
        (ataqueJugador === 'Patada'  && ataqueEnemigo === 'Puño')    ||
        (ataqueJugador === 'Barrida' && ataqueEnemigo === 'Patada');

    const resultado = empate ? 'EMPATE' : (ganaJugador ? 'GANASTE' : 'PERDISTE');

    // Aplicamos daño mediante los MÉTODOS de los objetos.
    if (resultado === 'GANASTE') {
        enemigoActivo.recibirDano();
        golpear(elEnemyCard);
    } else if (resultado === 'PERDISTE') {
        jugadorActivo.recibirDano();
        golpear(elPlayerCard);
    }

    mostrarChoque(ataqueJugador, ataqueEnemigo, resultado);
    actualizarVidas();
    agregarLog(
        resultado === 'GANASTE' ? 'win' : resultado === 'PERDISTE' ? 'lose' : 'tie',
        `${jugadorActivo.nombre} (${ataqueJugador}) vs ${enemigoActivo.nombre} (${ataqueEnemigo}) → ${resultado}`
    );

    // Consultamos a los objetos si alguno quedó sin vidas.
    if (!jugadorActivo.estaVivo() || !enemigoActivo.estaVivo()) {
        finalizarJuego(enemigoActivo.estaVivo() === false);
    }
}

// Íconos de los ataques: emblemas de movimiento estilo juego de pelea,
// con marco circular al tono de las cartas. Toman el color del tema.
const ICONO_ATAQUE = {
    // Puño → golpe recto directo.
    'Puño': `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="20" cy="20" r="17.5" stroke-width="1.3" opacity="0.35"/>
        <circle cx="20" cy="20" r="13.5" stroke-width="1" opacity="0.18"/>
        <path d="M7 20h15" stroke-width="3.6"/>
        <path d="M20 12.5 29 20l-9 7.5z" fill="currentColor" stroke="none"/>
        <path d="M25.5 9l2.6 2.6M25.5 31l2.6-2.6M31 20h3.5" stroke-width="2.2" opacity="0.7"/>
    </svg>`,
    // Patada → arco de media luna desde arriba.
    'Patada': `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="20" cy="20" r="17.5" stroke-width="1.3" opacity="0.35"/>
        <circle cx="20" cy="20" r="13.5" stroke-width="1" opacity="0.18"/>
        <path d="M8.5 13A15 15 0 0 0 30.5 27.5" stroke-width="3.6"/>
        <path d="M32.5 29 30 20.5l-8.4 3z" fill="currentColor" stroke="none"/>
    </svg>`,
    // Barrida → giro completo a ras del suelo.
    'Barrida': `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="20" cy="20" r="17.5" stroke-width="1.3" opacity="0.35"/>
        <path d="M20 7A13.5 13.5 0 1 1 8 15" stroke-width="3.6"/>
        <path d="M6.5 15.5 7.5 6l8.5 2z" fill="currentColor" stroke="none"/>
        <circle cx="20" cy="20" r="3" fill="currentColor" stroke="none"/>
    </svg>`,
};

// Dibujamos los botones de ataque RECORRIENDO el array  ataques  del
// jugador: cada objeto { nombre, id } se convierte en un <button>
// cuyo  id  es justamente el del objeto (boton_punio, boton_patada...).
function renderizarAtaques(personaje) {
    contenedorAtaques.innerHTML = '';

    personaje.ataques.forEach(function (ataque) {
        const boton = document.createElement('button');
        boton.className = 'action-card';
        boton.id = ataque.id;
        boton.innerHTML = `<span class="ico">${ICONO_ATAQUE[ataque.nombre]}</span>${ataque.nombre.toUpperCase()}`;
        boton.addEventListener('click', () => atacar(ataque.nombre));
        contenedorAtaques.appendChild(boton);
    });
}

function mostrarChoque(ataqueJ, ataqueE, resultado) {
    const clase = resultado === 'GANASTE' ? 'win' : resultado === 'PERDISTE' ? 'lose' : 'tie';
    elClash.className = 'clash show ' + clase;
    elClash.innerHTML = `
        <span class="clash__move">${ICONO_ATAQUE[ataqueJ]}</span>
        <span class="clash__res">${resultado}</span>
        <span class="clash__move">${ICONO_ATAQUE[ataqueE]}</span>`;
    // Reiniciamos la animación.
    void elClash.offsetWidth;
    elClash.classList.add('show');
}

function golpear(elCard) {
    elCard.classList.remove('is-hit');
    void elCard.offsetWidth;
    elCard.classList.add('is-hit');
}

function actualizarVidas() {
    elVidasJugador.innerHTML = pintarVidas(jugadorActivo);
    elVidasEnemigo.innerHTML = pintarVidas(enemigoActivo);
}

function pintarVidas(personaje) {
    let pips = '';
    for (let i = 0; i < personaje.vidasMax; i++) {
        const estado = i < personaje.vidas ? 'pip--full' : 'pip--empty';
        pips += `<span class="pip ${estado}"></span>`;
    }
    return pips;
}

function agregarLog(tipo, texto) {
    const linea = document.createElement('p');
    linea.className = 'log log--' + tipo;
    linea.textContent = texto;
    elHistory.appendChild(linea);
    elHistory.scrollTop = elHistory.scrollHeight;
}

function habilitarAtaques(habilitado) {
    document.querySelectorAll('.action-card').forEach(b => (b.disabled = !habilitado));
}

function finalizarJuego(gano) {
    juegoTerminado = true;
    habilitarAtaques(false);

    const titulo = gano ? '¡VICTORIA!' : '¡DERROTA!';
    const detalle = gano
        ? `${jugadorActivo.nombre} domina los cuatro elementos.`
        : `${enemigoActivo.nombre} fue superior esta vez.`;

    document.getElementById('fin-titulo').textContent = titulo;
    document.getElementById('fin-detalle').textContent = detalle;
    modalFin.dataset.result = gano ? 'win' : 'lose';
    abrirModal(modalFin);

    agregarLog(gano ? 'win' : 'lose', titulo + ' ' + detalle);
}

function reiniciar() {
    cerrarModal(modalFin);
    // Destildamos el radio para poder volver a elegir el mismo maestro.
    contenedorTarjetas.querySelectorAll('input[name="personaje"]').forEach(r => (r.checked = false));
    clearInterval(intervalo);
    sectionVerMapa.style.display = 'none';
    escenarioBatalla.classList.remove('is-visible');
    footerAcciones.classList.remove('is-visible');
    btnReiniciar.classList.remove('is-visible');
    pantallaSeleccion.classList.remove('is-hidden');
    delete document.body.dataset.nacion;
}
