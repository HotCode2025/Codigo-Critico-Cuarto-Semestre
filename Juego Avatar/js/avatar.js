// --- LÓGICA DEL JUEGO ---
let vidasJ = 3, vidasE = 3, pNameJ = "", pNameE = "";

function toggleMusica() {
    let musica = document.getElementById('musica-fondo');
    musica.paused ? musica.play() : musica.pause();
}

function seleccionarPersonaje(nombre, clase) {
    pNameJ = nombre;
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('battle-stage').style.display = 'flex';
    document.getElementById('action-footer').style.display = 'flex';
    document.getElementById('player-card').className = 'card card-bg ' + clase;
    
    let musica = document.getElementById('musica-fondo');
    musica.play().catch(e => console.log("Esperando interacción..."));
    
    const pjs = [
        {n: 'Aang', c: 'bg-aang'}, {n: 'Katara', c: 'bg-katara'}, 
        {n: 'Zuko', c: 'bg-zuko'}, {n: 'Toph', c: 'bg-toph'}
    ];
    
    const pjsDisponibles = pjs.filter(p => p.n !== nombre);
    let enemigo = pjsDisponibles[Math.floor(Math.random() * pjsDisponibles.length)];
    
    pNameE = enemigo.n;
    document.getElementById('enemy-card').className = 'card card-bg ' + enemigo.c;
    actualizarVidas();
}

function atacar(tipo) {
    let ops = ['Puño', 'Patada', 'Barrida'];
    let e = ops[Math.floor(Math.random()*3)];
    let res = (tipo === e) ? "EMPATE" : 
              ((tipo==='Puño'&&e==='Barrida')||(tipo==='Patada'&&e==='Puño')||(tipo==='Barrida'&&e==='Patada')) ? "GANASTE" : "PERDISTE";
    
    if(res === "GANASTE") vidasE--; else if(res === "PERDISTE") vidasJ--;
    actualizarVidas();
    
    let color = (res === "GANASTE") ? "var(--win)" : (res === "PERDISTE") ? "var(--lose)" : "var(--gold)";
    let panel = document.getElementById('battle-history');
    panel.innerHTML += `<p style="color:${color}">${pNameJ}(${tipo}) vs ${pNameE}(${e}): <strong>${res}</strong></p>`;
    panel.scrollTop = panel.scrollHeight;
    
    if(vidasJ === 0 || vidasE === 0) {
        document.getElementById('btn-reiniciar').style.visibility = 'visible';
        document.querySelectorAll('.action-card').forEach(b => b.disabled = true);
        let mensaje = (vidasJ === 0) ? "¡DERROTA! HAS SIDO VENCIDO" : "¡VICTORIA! ERES EL MAESTRO AVATAR";
        let colorFin = (vidasJ === 0) ? "var(--lose)" : "var(--win)";
        panel.innerHTML += `<p style="text-align:center; font-size:1.3rem; font-weight:bold; color:${colorFin}; margin-top:20px; border-top:2px solid ${colorFin}; padding-top:10px;">${mensaje}</p>`;
        panel.scrollTop = panel.scrollHeight;
    }
}

function actualizarVidas() {
    document.getElementById('vidas-jugador').innerHTML = '💙'.repeat(vidasJ);
    document.getElementById('vidas-enemigo').innerHTML = '❤️'.repeat(vidasE);
}