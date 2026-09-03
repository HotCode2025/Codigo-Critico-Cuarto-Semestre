// =========================================================
// 1. CLASE PERSONAJE (Manejo de estado individual)
// =========================================================
class Personaje {
    constructor(nombre, claseCSS) {
        this.nombre = nombre;
        this.claseCSS = claseCSS; // Aquí guardamos la clase que muestra la imagen
        this.vidas = 3; 
    }

    // Método para reducir las vidas de este personaje
    recibirDano() {
        if (this.vidas > 0) {
            this.vidas--;
        }
    }

    // Método para consultar si aún tiene vidas
    estaVivo() {
        return this.vidas > 0;
    }
}

// =========================================================
// 2. INSTANCIACIÓN DE PERSONAJES
// =========================================================
const aang = new Personaje('Aang', 'bg-aang');
const katara = new Personaje('Katara', 'bg-katara');
const zuko = new Personaje('Zuko', 'bg-zuko');
const toph = new Personaje('Toph', 'bg-toph');

// Agrupamos todos en un array para poder filtrarlos y elegirlos aleatoriamente
const todosLosPersonajes = [aang, katara, zuko, toph];

// Variables globales para guardar los objetos en combate
let jugadorActivo = null;
let enemigoActivo = null;

// =========================================================
// 3. REFERENCIAS AL DOM
// =========================================================
const elPlayerCard = document.getElementById('player-card');
const elEnemyCard = document.getElementById('enemy-card');
const elHistory = document.getElementById('battle-history');
const btnReiniciar = document.getElementById('btn-reiniciar');
const musicaFondo = document.getElementById('musica-fondo');

// =========================================================
// 4. FUNCIONES DE LÓGICA E INTERFAZ
// =========================================================

function toggleMusica() {
    musicaFondo.paused ? musicaFondo.play() : musicaFondo.pause();
}

function seleccionarPersonaje(nombreSeleccionado) {
    // Buscamos el objeto completo cuyo nombre coincida con el botón presionado
    jugadorActivo = todosLosPersonajes.find(p => p.nombre === nombreSeleccionado);
    
    // Creamos un array sin el personaje elegido para sortear al enemigo
    const opcionesEnemigo = todosLosPersonajes.filter(p => p.nombre !== nombreSeleccionado);
    const indiceAleatorio = Math.floor(Math.random() * opcionesEnemigo.length);
    enemigoActivo = opcionesEnemigo[indiceAleatorio];
    
    // Ocultamos la pantalla de selección y mostramos el combate
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('battle-stage').style.display = 'flex';
    document.getElementById('action-footer').style.display = 'flex';
    
    // Inyectamos las clases CSS desde los objetos para mostrar las imágenes
    elPlayerCard.className = `card card-bg ${jugadorActivo.claseCSS}`;
    elEnemyCard.className = `card card-bg ${enemigoActivo.claseCSS}`;
    
    actualizarVidas();

    // Reproducimos la música
    musicaFondo.play().catch(e => console.log("Esperando interacción para audio..."));
}

function atacar(tipoAtaqueJugador) {
    const opcionesAtaque = ['Puño', 'Patada', 'Barrida'];
    const tipoAtaqueEnemigo = opcionesAtaque[Math.floor(Math.random() * 3)];
    
    // Evaluamos la lógica de victoria
    const victoriaJugador = (tipoAtaqueJugador === 'Puño' && tipoAtaqueEnemigo === 'Barrida') || 
                            (tipoAtaqueJugador === 'Patada' && tipoAtaqueEnemigo === 'Puño') || 
                            (tipoAtaqueJugador === 'Barrida' && tipoAtaqueEnemigo === 'Patada');
    
    let resultadoBatalla = (tipoAtaqueJugador === tipoAtaqueEnemigo) ? "EMPATE" : (victoriaJugador ? "GANASTE" : "PERDISTE");
    
    // Aplicamos el daño a través de los métodos de la clase
    if (resultadoBatalla === "GANASTE") {
        enemigoActivo.recibirDano();
    } else if (resultadoBatalla === "PERDISTE") {
        jugadorActivo.recibirDano();
    }
    
    actualizarVidas();
    agregarAlHistorial(tipoAtaqueJugador, tipoAtaqueEnemigo, resultadoBatalla);
    
    // Comprobamos si el juego terminó
    if (!jugadorActivo.estaVivo() || !enemigoActivo.estaVivo()) {
        finalizarJuego(resultadoBatalla === "GANASTE");
    }
}

function actualizarVidas() {
    // Renderizamos los corazones basados en la propiedad 'vidas' de los objetos
    document.getElementById('vidas-jugador').innerHTML = '💙'.repeat(jugadorActivo.vidas);
    document.getElementById('vidas-enemigo').innerHTML = '❤️'.repeat(enemigoActivo.vidas);
}

function agregarAlHistorial(tipoJ, tipoE, res) {
    let color = (res === "GANASTE") ? "var(--win)" : (res === "PERDISTE") ? "var(--lose)" : "var(--gold)";
    
    // Usamos las propiedades 'nombre' de los objetos para el log
    elHistory.innerHTML += `<p style="color:${color}">${jugadorActivo.nombre}(${tipoJ}) vs ${enemigoActivo.nombre}(${tipoE}): <strong>${res}</strong></p>`;
    
    // Mantiene el scroll automático abajo
    elHistory.scrollTop = elHistory.scrollHeight;
}

function finalizarJuego(victoria) {
    btnReiniciar.style.visibility = 'visible';
    
    // Desactivamos los botones de ataque
    document.querySelectorAll('.action-card').forEach(boton => boton.disabled = true);
    
    let mensaje = victoria ? "¡VICTORIA! ERES EL MAESTRO AVATAR" : "¡DERROTA! HAS SIDO VENCIDO";
    let colorFin = victoria ? 'var(--win)' : 'var(--lose)';
    
    elHistory.innerHTML += `<p style="text-align:center; font-size:1.3rem; font-weight:bold; color:${colorFin}; margin-top:20px; border-top:2px solid ${colorFin}; padding-top:10px;">${mensaje}</p>`;
    elHistory.scrollTop = elHistory.scrollHeight;
}