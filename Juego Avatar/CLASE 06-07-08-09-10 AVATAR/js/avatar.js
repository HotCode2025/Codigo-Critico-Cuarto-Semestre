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
//
//  Clase 11  ->  Movimiento desde el teclado + fondo del mapa
//                window.addEventListener('keydown' / 'keyup') con un
//                switch (event.key) para las flechas. Todo arranca en
//                iniciarMapa(). El canvas pasa a 800 x 600 con una imagen
//                de fondo (mapaBackground) y pintarPersonaje() se renombra
//                pintarCanvas() porque ahora pinta TODO el mapa.
//                obtenerObjetoPersonaje() recorre el array con un for y
//                devuelve el objeto del maestro elegido
//                (personajeJugadorObjeto). También se pinta al enemigo.
// =====================================================================


// =====================================================================
// 1. CLASE  Avatar   (Clase 04: el "plano" para construir personajes)
// =====================================================================
class Avatar {

    // El constructor recibe, EN ORDEN, la información propia de cada
    // personaje (nombre, elemento, vidas...) y la guarda dentro de sus
    // propiedades usando  this  ("el objeto actual donde estoy parado").
    // Con este molde podemos instanciar 4, 100 o 1000 personajes.
    constructor(nombre, elemento, imagen, vidas, habilidad, fotoMapa) {
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
        this.alto  = 110;      // Clase 11: alto del personaje de cuerpo entero en el mapa
        this.ancho = 73;       // se recalcula cuando carga la imagen
        this.velocidadX = 0;   // cuántos px se mueve en x en cada repintado
        this.velocidadY = 0;

        // La imagen del mapa se crea UNA vez, dentro del constructor.
        // Clase 11: ya no es la carta sino el personaje de cuerpo entero.
        // Si no se indica una, usa la silueta genérica de su nación.
        this.mapaFoto = new Image();
        this.mapaFoto.src = fotoMapa || 'imagenes/mapa/' + elemento + '.svg';

        // Cada dibujo tiene su propia proporción (Sokka agachado es más
        // ancho que Zuko parado): el ancho sale de la imagen para no deformarla.
        this.mapaFoto.onload = () => {
            this.ancho = Math.round(this.alto * this.mapaFoto.naturalWidth / this.mapaFoto.naturalHeight);
        };
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
//            nombre,  elemento, imagen,               vidas, habilidad,                           foto del mapa
const aang   = new Avatar('Aang',   'aire',   'imagenes/aan.png',    3, 'Planeador · aumenta la esquiva',    'imagenes/mapa/aang.png');
const katara = new Avatar('Katara', 'agua',   'imagenes/katara.png', 3, 'Curación · restaura vida',          'imagenes/mapa/katara.png');
const zuko   = new Avatar('Zuko',   'fuego',  'imagenes/zuko.png',   3, 'Rayo · daño masivo',                'imagenes/mapa/zuko.png');
const toph   = new Avatar('Toph',   'tierra', 'imagenes/toph.png',   3, 'Armadura de Piedra · absorbe daño', 'imagenes/mapa/toph.png');

// Personajes NUEVOS: sin imagen propia, la carta se dibuja por código.
// Cada uno lleva DISTINTA información (vidas, habilidad) desde el mismo molde.
const iroh  = new Avatar('Iroh',  'fuego',  '', 4, 'Dragón de Occidente · aguanta más golpes', 'imagenes/mapa/iroh.png');
const azula = new Avatar('Azula', 'fuego',  '', 2, 'Fuego azul · frágil pero letal',           'imagenes/mapa/azula.png');
const sokka = new Avatar('Sokka', 'agua',   '', 3, 'Bumerang · guerrero de la Tribu Agua',      'imagenes/mapa/sokka.png');
const bumi  = new Avatar('Bumi',  'tierra', '', 3, 'Rey de Omashu · espera el momento justo',   'imagenes/mapa/bumi.png');
const ozai  = new Avatar('Ozai',  'fuego',  '', 5, 'Señor del Fuego · poder del cometa',        'imagenes/mapa/ozai.png');
const tyLee = new Avatar('Ty Lee', 'fuego', '', 3, 'Bloqueo de chi · paraliza al rival',        'imagenes/mapa/tylee.png');

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

[aang, katara, toph, iroh, azula, sokka, bumi, ozai, tyLee].forEach(cargarAtaques);

// Creamos el ARRAY vacío de alcance global (una "caja" que guarda datos).
let avatares = [];

// Cargamos las instancias DENTRO del array con el método  push().
avatares.push(aang, katara, zuko, toph);   // personajes originales
avatares.push(iroh, azula, sokka, bumi);   // personajes nuevos
avatares.push(ozai, tyLee);                // Clase 11: llegan con su dibujo de cuerpo entero

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

// Clase 11: nombre del maestro elegido y su OBJETO completo.
let personajeJugador;
let personajeJugadorObjeto;

// Clase 11: imagen de fondo del mapa.
let mapaBackground = new Image();
mapaBackground.src = 'imagenes/mapa/mapa.svg';

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

    // Clase 11: obtenerObjetoPersonaje() busca por nombre, así que no
    // puede haber dos maestros con el mismo nombre.
    if (avatares.some(avatar => avatar.nombre.toLowerCase() === nombre.toLowerCase())) {
        alert('Ya existe un maestro llamado ' + nombre + '. Elegí otro nombre.');
        return;
    }

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
    // Clase 11: guardamos el nombre del elegido y arrancamos el mapa.
    personajeJugador = jugadorActivo.nombre;
    sectionVerMapa.style.display = 'flex';
    iniciarMapa();

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

// ---------------------------------------------------------------------
// Clase 11: obtenerObjetoPersonaje() recorre el array con un  for  y
// devuelve el OBJETO completo del maestro cuyo nombre coincide con el
// elegido (por eso no se permiten dos maestros con el mismo nombre).
// ---------------------------------------------------------------------
function obtenerObjetoPersonaje() {
    for (let i = 0; i < avatares.length; i++) {
        if (personajeJugador === avatares[i].nombre) {
            return avatares[i];
        }
    }
}

// Todo lo que necesita el mapa para arrancar.
function iniciarMapa() {
    mapa.width = 800;    // para el ancho
    mapa.height = 600;   // para el alto

    personajeJugadorObjeto = obtenerObjetoPersonaje(personajeJugador);

    // El enemigo espera en el Reino Tierra, cerca de Ba Sing Se.
    enemigoActivo.x = 600;
    enemigoActivo.y = 330;

    // Clase 10: setInterval(función, milisegundos) llama a pintarCanvas
    // cada 50 ms. Así vemos el movimiento mientras cambia la velocidad.
    clearInterval(intervalo);
    intervalo = setInterval(pintarCanvas, 50);

    // Escucha cuando se presiona una tecla y cuando se suelta.
    window.addEventListener('keydown', sePresionoUnaTecla);
    window.addEventListener('keyup', detenerMovimiento);
}

// El evento es un objeto: event.key nos dice qué tecla se presionó.
function sePresionoUnaTecla(event) {
    switch (event.key) {
        case 'ArrowUp':
            moverArriba();
            break;
        case 'ArrowDown':
            moverAbajo();
            break;
        case 'ArrowLeft':
            moverIzquierda();
            break;
        case 'ArrowRight':
            moverDerecha();
            break;
        default:
            return;   // otra tecla: no hacemos nada
    }
    // Las flechas no deben mover la página mientras jugamos.
    event.preventDefault();
}

// Pinta a un personaje (jugador o enemigo) con su nombre arriba.
function dibujarPersonaje(personaje, colorNombre) {
    lienzo.drawImage(
        personaje.mapaFoto,   // cada parámetro sale del objeto
        personaje.x,
        personaje.y,
        personaje.ancho,
        personaje.alto
    );

    // Cartelito con el nombre, centrado sobre la cabeza.
    lienzo.font = 'bold 13px Cinzel, Georgia, serif';
    lienzo.textAlign = 'center';
    const centroX = personaje.x + personaje.ancho / 2;
    const anchoCartel = lienzo.measureText(personaje.nombre).width + 14;
    lienzo.fillStyle = 'rgba(18, 21, 26, 0.75)';
    lienzo.fillRect(centroX - anchoCartel / 2, personaje.y - 20, anchoCartel, 18);
    lienzo.fillStyle = colorNombre;
    lienzo.fillText(personaje.nombre, centroX, personaje.y - 6);
    lienzo.textAlign = 'start';
}

// Antes era pintarPersonaje(): ahora pinta TODO el canvas
// (fondo + jugador + enemigo), por eso cambia de nombre.
function pintarCanvas() {
    // Ajustamos para ir actualizando dependiendo de la velocidad.
    personajeJugadorObjeto.x = personajeJugadorObjeto.x + personajeJugadorObjeto.velocidadX;
    personajeJugadorObjeto.y = personajeJugadorObjeto.y + personajeJugadorObjeto.velocidadY;

    // Límites: el personaje no puede salir del canvas.
    // Mínimo 0; máximo el tamaño del canvas menos el tamaño del personaje.
    if (personajeJugadorObjeto.x < 0) {
        personajeJugadorObjeto.x = 0;
    }
    if (personajeJugadorObjeto.x > mapa.width - personajeJugadorObjeto.ancho) {
        personajeJugadorObjeto.x = mapa.width - personajeJugadorObjeto.ancho;
    }
    if (personajeJugadorObjeto.y < 0) {
        personajeJugadorObjeto.y = 0;
    }
    if (personajeJugadorObjeto.y > mapa.height - personajeJugadorObjeto.alto) {
        personajeJugadorObjeto.y = mapa.height - personajeJugadorObjeto.alto;
    }

    // clearRect limpia todo el canvas para no dejar "rastro" del dibujo anterior.
    lienzo.clearRect(0, 0, mapa.width, mapa.height);

    // Fondo: empieza en (0,0) y cubre todo el ancho y alto del canvas.
    lienzo.drawImage(
        mapaBackground,
        0,
        0,
        mapa.width,
        mapa.height
    );

    dibujarPersonaje(enemigoActivo, '#ff9b8a');
    dibujarPersonaje(personajeJugadorObjeto, '#fff7e0');
}

// Las funciones de movimiento ya NO pintan: solo cambian la velocidad.
// El setInterval se encarga de repintar mientras la tecla o el botón sigan apretados.
function moverDerecha() {
    personajeJugadorObjeto.velocidadX = 5;
}

function moverIzquierda() {
    personajeJugadorObjeto.velocidadX = -5;
}

function moverAbajo() {
    personajeJugadorObjeto.velocidadY = 5;
}

function moverArriba() {
    personajeJugadorObjeto.velocidadY = -5;
}

// Al soltar la tecla o el botón la velocidad vuelve a cero y se frena.
function detenerMovimiento() {
    personajeJugadorObjeto.velocidadX = 0;
    personajeJugadorObjeto.velocidadY = 0;
}

// Deja de repintar y de escuchar el teclado (al salir del mapa).
function detenerMapa() {
    clearInterval(intervalo);
    window.removeEventListener('keydown', sePresionoUnaTecla);
    window.removeEventListener('keyup', detenerMovimiento);
}

// Del mapa pasamos al combate.
function irAlCombate() {
    detenerMapa();   // dejamos de repintar el mapa y de escuchar el teclado
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
    detenerMapa();
    sectionVerMapa.style.display = 'none';
    escenarioBatalla.classList.remove('is-visible');
    footerAcciones.classList.remove('is-visible');
    btnReiniciar.classList.remove('is-visible');
    pantallaSeleccion.classList.remove('is-hidden');
    delete document.body.dataset.nacion;
}
