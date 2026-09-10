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
// =====================================================================


// =====================================================================
// 1. CLASE  Avatar   (Clase 04: el "plano" para construir personajes)
// =====================================================================
class Avatar {

    // El constructor recibe, EN ORDEN, la información propia de cada
    // personaje (nombre, ataques, vidas...) y la guarda dentro de sus
    // propiedades usando  this  ("el objeto actual donde estoy parado").
    // Con este molde podemos instanciar 4, 100 o 1000 personajes.
    constructor(nombre, elemento, imagen, ataques, vidas, habilidad) {
        this.nombre    = nombre;      // Atributo: nombre del maestro
        this.elemento  = elemento;    // Atributo: nación / elemento
        this.imagen    = imagen;      // Atributo: ruta de la carta (puede ir vacío)
        this.ataques   = ataques;     // Atributo tipo ARRAY: ataques posibles
        this.vidasMax  = vidas;       // Atributo: vidas iniciales
        this.vidas     = vidas;       // Atributo: vidas actuales (estado)
        this.habilidad = habilidad || '';  // Atributo opcional: habilidad especial
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
    atacarAlAzar() {
        const indice = Math.floor(Math.random() * this.ataques.length);
        return this.ataques[indice];
    }

    // Restaura al personaje a su estado inicial (para "Reiniciar").
    revivir() {
        this.vidas = this.vidasMax;
    }
}


// =====================================================================
// 2. INSTANCIACIÓN + ARRAY   (Clase 05: crear los objetos con  new )
// =====================================================================

// Los tres ataques básicos del juego (piedra-papel-tijera).
const ATAQUES_BASICOS = ['Puño', 'Patada', 'Barrida'];

// --- Cada personaje es una INSTANCIA (un objeto) creado con  new  ---
// El "template" (la clase) se completa con la info de cada uno:
//            nombre,  elemento, imagen,               ataques,          vidas, habilidad
const aang   = new Avatar('Aang',   'aire',   'imagenes/aan.png',    ATAQUES_BASICOS, 3, 'Planeador · aumenta la esquiva');
const katara = new Avatar('Katara', 'agua',   'imagenes/katara.png', ATAQUES_BASICOS, 3, 'Curación · restaura vida');
const zuko   = new Avatar('Zuko',   'fuego',  'imagenes/zuko.png',   ATAQUES_BASICOS, 3, 'Rayo · daño masivo');
const toph   = new Avatar('Toph',   'tierra', 'imagenes/toph.png',   ATAQUES_BASICOS, 3, 'Armadura de Piedra · absorbe daño');

// Personajes NUEVOS: sin imagen propia, la carta se dibuja por código.
// Cada uno lleva DISTINTA información (vidas, habilidad) desde el mismo molde.
const iroh  = new Avatar('Iroh',  'fuego',  '', ATAQUES_BASICOS, 4, 'Dragón de Occidente · aguanta más golpes');
const azula = new Avatar('Azula', 'fuego',  '', ATAQUES_BASICOS, 2, 'Fuego azul · frágil pero letal');
const sokka = new Avatar('Sokka', 'agua',   '', ATAQUES_BASICOS, 3, 'Bumerang · guerrero de la Tribu Agua');
const bumi  = new Avatar('Bumi',  'tierra', '', ATAQUES_BASICOS, 3, 'Rey de Omashu · espera el momento justo');

// Creamos el ARRAY vacío de alcance global (una "caja" que guarda datos).
let avatares = [];

// Cargamos las instancias DENTRO del array con el método  push().
avatares.push(aang, katara, zuko, toph);   // personajes originales
avatares.push(iroh, azula, sokka, bumi);   // personajes nuevos

// Verificación pedida en la Issue #43: mirar el inspector del navegador.
console.log('Array avatares (' + avatares.length + ' personajes):', avatares);

// ---------------------------------------------------------------------
// ESCALABILIDAD: con la misma clase podemos instanciar 100, 1000, etc.
// Generamos un "ejército" con un bucle y lo guardamos en su propio
// array (no entra a la selección para no saturar la interfaz).
// ---------------------------------------------------------------------
const ELEMENTOS = ['aire', 'agua', 'fuego', 'tierra'];
const ejercito = [];
for (let i = 1; i <= 1000; i++) {
    ejercito.push(new Avatar('Recluta ' + i, ELEMENTOS[i % 4], '', ATAQUES_BASICOS, 3));
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
const grillaSeleccion   = document.getElementById('selection-grid');
const escenarioBatalla   = document.getElementById('battle-stage');
const footerAcciones      = document.getElementById('action-footer');

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
// 4. CONSTRUCCIÓN DINÁMICA DE LA PANTALLA DE SELECCIÓN
//    Recorremos el ARRAY de avatares y generamos una carta por objeto.
//    Cada vez que se crea un maestro nuevo, se vuelve a dibujar.
// =====================================================================
function renderizarSeleccion() {
    grillaSeleccion.innerHTML = '';

    avatares.forEach(function (personaje) {
        const carta = document.createElement('button');
        carta.className = 'select-card nacion-' + personaje.elemento;
        carta.setAttribute('aria-label', personaje.nombre);
        carta.title = personaje.nombre + (personaje.habilidad ? ' — ' + personaje.habilidad : '');

        if (personaje.imagen) {
            carta.style.backgroundImage = `url("${personaje.imagen}")`;
        } else {
            carta.classList.add('card--generado');
            carta.innerHTML = plantillaCarta(personaje);
        }

        // Le pasamos el OBJETO directamente (no el nombre) para poder
        // tener varios maestros con el mismo nombre sin confundirlos.
        carta.addEventListener('click', () => seleccionarPersonaje(personaje));
        grillaSeleccion.appendChild(carta);
    });

    // Carta especial: "＋ Crear maestro" (abre el formulario).
    const btnNuevo = document.createElement('button');
    btnNuevo.className = 'select-card select-card--nuevo';
    btnNuevo.innerHTML = `<span class="nuevo-mas">＋</span><span class="nuevo-txt">CREAR MAESTRO</span>`;
    btnNuevo.addEventListener('click', () => abrirModal(modalCrear));
    grillaSeleccion.appendChild(btnNuevo);
}

renderizarSeleccion();

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
    const nuevoMaestro = new Avatar(nombre, elemento, '', ATAQUES_BASICOS, vidas, habilidad);

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
}

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

    // Cambiamos de pantalla.
    pantallaSeleccion.classList.add('is-hidden');
    escenarioBatalla.classList.add('is-visible');
    footerAcciones.classList.add('is-visible');
    btnReiniciar.classList.add('is-visible');

    // Volcamos los ATRIBUTOS de los objetos al DOM.
    pintarCombatiente(elPlayerCard, jugadorActivo);
    pintarCombatiente(elEnemyCard,  enemigoActivo);

    elHistory.innerHTML = '';
    agregarLog('system', `${jugadorActivo.nombre} desafía a ${enemigoActivo.nombre}. ¡Que empiece el Agni Kai!`);
    actualizarVidas();
    habilitarAtaques(true);

    musicaFondo.play().then(() => btnMusica.classList.add('is-on')).catch(() => {});
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
    const ataqueEnemigo = enemigoActivo.atacarAlAzar();

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

// Pintamos los íconos SVG en los botones de ataque (spans con data-ico).
document.querySelectorAll('.action-card .ico[data-ico]').forEach(function (span) {
    span.innerHTML = ICONO_ATAQUE[span.dataset.ico];
});

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
    escenarioBatalla.classList.remove('is-visible');
    footerAcciones.classList.remove('is-visible');
    btnReiniciar.classList.remove('is-visible');
    pantallaSeleccion.classList.remove('is-hidden');
    delete document.body.dataset.nacion;
}
