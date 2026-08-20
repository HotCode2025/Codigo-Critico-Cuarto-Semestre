// --- VARIABLES GLOBALES PARA DRY ---
let vidasJ = 3, vidasE = 3;
let pNameJ = "", pNameE = "";

const elPlayerCard = document.getElementById('player-card');
const elEnemyCard = document.getElementById('enemy-card');
const elHistory = document.getElementById('battle-history');
const btnReiniciar = document.getElementById('btn-reiniciar');
const musicaFondo = document.getElementById('musica-fondo');

const pjsConfig = {
    Aang: 'bg-aang', Katara: 'bg-katara', Zuko: 'bg-zuko', Toph: 'bg-toph'
};

// --- FUNCIONES ---
function toggleMusica() {
    musicaFondo.paused ? musicaFondo.play() : musicaFondo.pause();
}

function seleccionarPersonaje(nombre, clase) {
    pNameJ = nombre;
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('battle-stage').style.display = 'flex';
    document.getElementById('action-footer').style.display = 'flex';
    
    elPlayerCard.className = `card card-bg ${clase}`;
    
    const opciones = Object.keys(pjsConfig).filter(n => n !== nombre);
    pNameE = opciones[Math.floor(Math.random() * opciones.length)];
    elEnemyCard.className = `card card-bg ${pjsConfig[pNameE]}`;
    
    actualizarVidas();

    // Reproducir música al iniciar la selección (resuelve el bloqueo del navegador)
    musicaFondo.play().catch(e => console.log("Esperando interacción para audio..."));
}

function atacar(tipo) {
    const ops = ['Puño', 'Patada', 'Barrida'];
    const e = ops[Math.floor(Math.random() * 3)];
    
    const gano = (tipo === 'Puño' && e === 'Barrida') || 
                 (tipo === 'Patada' && e === 'Puño') || 
                 (tipo === 'Barrida' && e === 'Patada');
    
    let res = (tipo === e) ? "EMPATE" : (gano ? "GANASTE" : "PERDISTE");
    
    if (res === "GANASTE") vidasE--; 
    else if (res === "PERDISTE") vidasJ--;
    
    actualizarVidas();
    agregarAlHistorial(tipo, e, res);
    
    if (vidasJ === 0 || vidasE === 0) finalizarJuego(res === "GANASTE");
}

function actualizarVidas() {
    document.getElementById('vidas-jugador').innerHTML = '💙'.repeat(vidasJ);
    document.getElementById('vidas-enemigo').innerHTML = '❤️'.repeat(vidasE);
}

function agregarAlHistorial(tipoJ, tipoE, res) {
    let color = (res === "GANASTE") ? "var(--win)" : (res === "PERDISTE") ? "var(--lose)" : "var(--gold)";
    elHistory.innerHTML += `<p style="color:${color}">${pNameJ}(${tipoJ}) vs ${pNameE}(${tipoE}): <strong>${res}</strong></p>`;
    elHistory.scrollTop = elHistory.scrollHeight;
}

function finalizarJuego(victoria) {
    btnReiniciar.style.visibility = 'visible';
    document.querySelectorAll('.action-card').forEach(b => b.disabled = true);
    let msg = victoria ? "¡VICTORIA! ERES EL MAESTRO AVATAR" : "¡DERROTA! HAS SIDO VENCIDO";
    let colorFin = victoria ? 'var(--win)' : 'var(--lose)';
    elHistory.innerHTML += `<p style="text-align:center; font-size:1.3rem; font-weight:bold; color:${colorFin}; margin-top:20px; border-top:2px solid ${colorFin}; padding-top:10px;">${msg}</p>`;
}