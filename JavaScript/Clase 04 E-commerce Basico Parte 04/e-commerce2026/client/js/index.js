/* ============================================================
   Gamer Pro Store - lógica de catálogo, carrito y favoritos
   ============================================================
   El carrito y los favoritos guardan solo el id del producto
   (no copian textos del DOM). Toda la info se lee del array
   `productos` de products.js, así el HTML puede cambiar sin
   romper la lógica. Se persiste en localStorage.
============================================================ */

const CLAVE_CARRITO = "gamerpro_carrito";
const CLAVE_FAVORITOS = "gamerpro_favoritos";

// carrito: [{ id, cantidad }]   |   favoritos: [id, id, ...]
let carrito = cargarDesdeStorage(CLAVE_CARRITO);
let favoritos = cargarDesdeStorage(CLAVE_FAVORITOS);

// ---------- Helpers ----------
function cargarDesdeStorage(clave) {
    try {
        const dato = JSON.parse(localStorage.getItem(clave));
        return Array.isArray(dato) ? dato : [];
    } catch {
        return [];
    }
}

function guardarEnStorage(clave, valor) {
    localStorage.setItem(clave, JSON.stringify(valor));
}

function buscarProducto(id) {
    return productos.find((p) => p.id === id);
}

function formatearPrecio(numero) {
    return "$" + numero.toLocaleString("es-AR");
}

// ---------- Referencias del DOM ----------
const contenidoSeccion1 = document.getElementById("section1Content");
const contenidoSeccion2 = document.getElementById("section2Content");

const modalCarrito = document.getElementById("cart-modal");
const modalFavoritos = document.getElementById("fav-modal");
const contenedorCarrito = document.getElementById("cart-items-container");
const contenedorFavoritos = document.getElementById("fav-items-container");
const contadorCarrito = document.getElementById("cart-counter");
const contadorFavoritos = document.getElementById("fav-counter");
const totalCarrito = document.getElementById("cart-total");

// ============================================================
//  3.1 / 3.2 -> el body y el footer ya están en index.html
//  Acá renderizamos las tarjetas a partir del array `productos`
// ============================================================
function renderizarCatalogo() {
    contenidoSeccion1.innerHTML = "";
    contenidoSeccion2.innerHTML = "";

    productos.forEach((producto) => {
        const esFavorito = favoritos.includes(producto.id);

        const tarjeta = document.createElement("div");
        tarjeta.className = "product-card";
        tarjeta.dataset.id = producto.id;
        tarjeta.innerHTML = `
            <div class="card-header-icons">
                <button class="heart-icon ${esFavorito ? "active-heart" : ""}"
                        aria-label="Agregar a favoritos" aria-pressed="${esFavorito}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>
            <div class="product-image">
                <img src="${producto.img}" alt="${producto.productName}">
            </div>
            <h3>${producto.productName}</h3>
            <p>${producto.description}</p>
            <div class="product-price-row">
                <span class="product-price">${formatearPrecio(producto.price)}</span>
            </div>
            <button class="btn-buy">Comprar</button>
        `;

        if (producto.section === "section1") {
            contenidoSeccion1.appendChild(tarjeta);
        } else {
            contenidoSeccion2.appendChild(tarjeta);
        }
    });
}

// Delegación de eventos en todo el catálogo (una sola vez)
document.getElementById("catalogo").addEventListener("click", (e) => {
    const tarjeta = e.target.closest(".product-card");
    if (!tarjeta) return;

    const id = Number(tarjeta.dataset.id);

    if (e.target.closest(".heart-icon")) {
        alternarFavorito(id);
    } else if (e.target.closest(".btn-buy")) {
        agregarAlCarrito(id);
        animarBotonComprar(e.target.closest(".btn-buy"));
    }
});

// ============================================================
//  3.3  Cantidades de productos en el carrito
// ============================================================
function agregarAlCarrito(id) {
    const producto = buscarProducto(id);
    if (!producto) return;

    const item = carrito.find((i) => i.id === id);

    if (item) {
        if (item.cantidad < producto.stock) item.cantidad++;
    } else {
        carrito.push({ id, cantidad: 1 });
    }

    persistirCarrito();
}

// ============================================================
//  3.4  Botones de suma y resta
// ============================================================
function cambiarCantidad(id, delta) {
    const item = carrito.find((i) => i.id === id);
    const producto = buscarProducto(id);
    if (!item || !producto) return;

    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad < 1) return;                 // para quitar del todo está la papelera
    if (nuevaCantidad > producto.stock) return;    // no hay más stock

    item.cantidad = nuevaCantidad;
    persistirCarrito();
}

// ============================================================
//  3.6  Eliminar productos del modal (por id, no por índice)
// ============================================================
function eliminarDelCarrito(id) {
    carrito = carrito.filter((i) => i.id !== id);
    persistirCarrito();
}

// ============================================================
//  3.5  Calcular el total de la compra
// ============================================================
function calcularTotal() {
    return carrito.reduce((acc, i) => acc + buscarProducto(i.id).price * i.cantidad, 0);
}

function contarUnidades() {
    return carrito.reduce((acc, i) => acc + i.cantidad, 0);
}

function actualizarContadorCarrito() {
    const unidades = contarUnidades();
    contadorCarrito.textContent = unidades;
    contadorCarrito.style.display = unidades > 0 ? "inline-block" : "none";
}

// Guarda + refresca contador + re-renderiza el modal
function persistirCarrito() {
    guardarEnStorage(CLAVE_CARRITO, carrito);
    actualizarContadorCarrito();
    renderizarCarrito();
    programarRenderMercadoPago();   // Parte 5 -> re-crea el botón embebido si el modal está abierto
}

function renderizarCarrito() {
    contenedorCarrito.innerHTML = "";

    if (carrito.length === 0) {
        contenedorCarrito.innerHTML = '<p class="empty-msg">Tu carrito está vacío.</p>';
        totalCarrito.textContent = formatearPrecio(0);
        return;
    }

    carrito.forEach((item) => {
        const producto = buscarProducto(item.id);
        const subtotal = producto.price * item.cantidad;

        const fila = document.createElement("div");
        fila.className = "summary-item";
        fila.dataset.id = producto.id;
        fila.innerHTML = `
            <img src="${producto.img}" alt="${producto.productName}">
            <div class="item-info">
                <h4>${producto.productName}</h4>
                <p class="item-price">${formatearPrecio(producto.price)} c/u</p>
                <div class="qty-controls">
                    <button class="qty-btn" data-accion="restar" aria-label="Quitar una unidad"
                            ${item.cantidad <= 1 ? "disabled" : ""}>&minus;</button>
                    <span class="qty-value">${item.cantidad}</span>
                    <button class="qty-btn" data-accion="sumar" aria-label="Agregar una unidad"
                            ${item.cantidad >= producto.stock ? "disabled" : ""}>+</button>
                </div>
                <p class="item-subtotal">Subtotal: ${formatearPrecio(subtotal)}</p>
            </div>
            <button class="remove-btn" data-accion="eliminar"
                    aria-label="Eliminar ${producto.productName} del carrito">&times;</button>
        `;
        contenedorCarrito.appendChild(fila);
    });

    totalCarrito.textContent = formatearPrecio(calcularTotal());
}

// Delegación de eventos dentro del modal del carrito
contenedorCarrito.addEventListener("click", (e) => {
    const fila = e.target.closest(".summary-item");
    if (!fila) return;

    const id = Number(fila.dataset.id);
    const accion = e.target.dataset.accion;

    if (accion === "sumar") cambiarCantidad(id, 1);
    else if (accion === "restar") cambiarCantidad(id, -1);
    else if (accion === "eliminar") eliminarDelCarrito(id);
});

// ============================================================
//  Favoritos (por id, sincronizados con las tarjetas)
// ============================================================
function alternarFavorito(id) {
    if (favoritos.includes(id)) {
        favoritos = favoritos.filter((f) => f !== id);
    } else {
        favoritos.push(id);
    }

    guardarEnStorage(CLAVE_FAVORITOS, favoritos);
    actualizarContadorFavoritos();
    sincronizarCorazones();
    renderizarFavoritos();
}

function sincronizarCorazones() {
    document.querySelectorAll(".product-card").forEach((tarjeta) => {
        const id = Number(tarjeta.dataset.id);
        const corazon = tarjeta.querySelector(".heart-icon");
        const activo = favoritos.includes(id);
        corazon.classList.toggle("active-heart", activo);
        corazon.setAttribute("aria-pressed", activo);
    });
}

function actualizarContadorFavoritos() {
    const cantidad = favoritos.length;
    contadorFavoritos.textContent = cantidad;
    contadorFavoritos.style.display = cantidad > 0 ? "inline-block" : "none";
}

function renderizarFavoritos() {
    contenedorFavoritos.innerHTML = "";

    if (favoritos.length === 0) {
        contenedorFavoritos.innerHTML = '<p class="empty-msg">No tienes favoritos guardados.</p>';
        return;
    }

    favoritos.forEach((id) => {
        const producto = buscarProducto(id);
        if (!producto) return;

        const fila = document.createElement("div");
        fila.className = "summary-item";
        fila.dataset.id = producto.id;
        fila.innerHTML = `
            <img src="${producto.img}" alt="${producto.productName}">
            <div class="item-info">
                <h4>${producto.productName}</h4>
                <p>${producto.description}</p>
                <p class="item-subtotal">${formatearPrecio(producto.price)}</p>
            </div>
            <button class="btn-buy-sm" data-accion="mover-carrito">Al carrito</button>
            <button class="remove-btn" data-accion="quitar-fav"
                    aria-label="Quitar ${producto.productName} de favoritos">&times;</button>
        `;
        contenedorFavoritos.appendChild(fila);
    });
}

contenedorFavoritos.addEventListener("click", (e) => {
    const fila = e.target.closest(".summary-item");
    if (!fila) return;

    const id = Number(fila.dataset.id);
    const accion = e.target.dataset.accion;

    if (accion === "quitar-fav") alternarFavorito(id);
    else if (accion === "mover-carrito") agregarAlCarrito(id);
});

// ============================================================
//  Modales (abrir / cerrar / Escape / click afuera)
// ============================================================
function abrirModal(modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function cerrarModal(modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "";
}

document.getElementById("btn-open-cart").addEventListener("click", () => {
    renderizarCarrito();
    abrirModal(modalCarrito);
    renderizarBotonMercadoPago();   // Parte 5 -> botón embebido de MP
});

document.getElementById("btn-open-fav").addEventListener("click", () => {
    renderizarFavoritos();
    abrirModal(modalFavoritos);
});

document.getElementById("close-cart").addEventListener("click", () => cerrarModal(modalCarrito));
document.getElementById("close-fav").addEventListener("click", () => cerrarModal(modalFavoritos));

window.addEventListener("click", (e) => {
    if (e.target === modalCarrito) cerrarModal(modalCarrito);
    if (e.target === modalFavoritos) cerrarModal(modalFavoritos);
});

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        cerrarModal(modalCarrito);
        cerrarModal(modalFavoritos);
    }
});

// ============================================================
//  4.2  MÉTODO DE PAGO — Mercado Pago (Checkout Pro con Wallet Brick)
// ============================================================
//
//  IDEA GENERAL
//  ------------
//  El frontend NO conoce el token secreto. Todo lo sensible pasa por
//  el server. Acá solo:
//    a) le pedimos al server que arme la orden de pago (preferencia),
//    b) dibujamos el botón oficial de Mercado Pago con el id que nos dio,
//    c) el usuario hace clic y Mercado Pago se encarga del cobro.
//
//  API_URL: dirección del backend.
//    - "" (vacío) = mismo origen. Sirve cuando la tienda la entrega el
//      propio server (http://localhost:3000 o la URL de Render).
//    - Si abrís el HTML con Live Server (otro puerto), poné aquí
//      "http://localhost:3000".
// ============================================================
const API_URL = "";

// ------------------------------------------------------------
//  crearPreferencia()
//  Traduce el carrito al formato que espera el server y le pide
//  que cree la preferencia en Mercado Pago.
//  Devuelve { id, init_point }.
// ------------------------------------------------------------
async function crearPreferencia() {
    // El carrito guarda solo { id, cantidad }. Acá completamos nombre y
    // precio buscando cada producto en el array `productos` (products.js).
    const items = carrito.map((item) => {
        const producto = buscarProducto(item.id);
        return {
            title: producto.productName,
            quantity: item.cantidad,
            unit_price: producto.price,
        };
    });

    // POST = "creá algo". Mandamos los items como JSON en el cuerpo.
    const respuesta = await fetch(`${API_URL}/create_preference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
    });

    // respuesta.ok es true si el status es 2xx. Si no, algo salió mal.
    if (!respuesta.ok) throw new Error("No se pudo crear la preferencia de pago");

    // El server responde { id: "...", init_point: "..." }
    return respuesta.json();
}

// ------------------------------------------------------------
//  Parte 4 y 5 -> BOTÓN OFICIAL EMBEBIDO de Mercado Pago (Wallet Brick)
// ------------------------------------------------------------
//  "Brick" = componente prefabricado del SDK de Mercado Pago.
//  El "wallet" es el botón amarillo "Pagar con Mercado Pago".
//  El SDK se carga en index.html con:
//     <script src="https://sdk.mercadopago.com/js/v2"></script>
//  que deja disponible la clase global `MercadoPago`.
// ------------------------------------------------------------

// Variables de estado del módulo de pago:
let mercadoPago = null;       // instancia del SDK (se crea una sola vez)
let walletController = null;   // "control remoto" del botón ya dibujado (para borrarlo)
let timerWallet = null;        // temporizador para el re-dibujo con retraso (debounce)

const contenedorWallet = document.getElementById("wallet-container");

// ------------------------------------------------------------
//  initMercadoPago()
//  Prende el SDK con la Public Key. Se ejecuta una única vez:
//  si `mercadoPago` ya existe, sale enseguida.
// ------------------------------------------------------------
async function initMercadoPago() {
    // Si ya está listo, o si el <script> del SDK todavía no cargó, no hacemos nada.
    if (mercadoPago || typeof MercadoPago === "undefined") return;
    try {
        // Le pedimos la Public Key al server (ruta /config).
        const respuesta = await fetch(`${API_URL}/config`);
        const { publicKey } = await respuesta.json();
        if (!publicKey) return;

        // Creamos la instancia del SDK. locale "es-AR" = textos y formato Argentina.
        mercadoPago = new MercadoPago(publicKey, { locale: "es-AR" });
    } catch (error) {
        console.error("No se pudo inicializar Mercado Pago:", error);
    }
}

// ------------------------------------------------------------
//  renderizarBotonMercadoPago()
//  Dibuja (o vuelve a dibujar) el botón oficial dentro del modal.
//  Se llama al abrir el carrito y cada vez que cambia su contenido.
// ------------------------------------------------------------
async function renderizarBotonMercadoPago() {
    // 1) Si ya había un botón, lo desmontamos: el carrito puede haber
    //    cambiado y necesitamos una preferencia nueva con el total nuevo.
    if (walletController) {
        walletController.unmount();
        walletController = null;
    }
    contenedorWallet.innerHTML = "";

    // 2) Carrito vacío -> no hay nada que pagar.
    if (carrito.length === 0) return;

    // 3) Mensaje mientras se prepara (crear la preferencia tarda ~1 segundo).
    contenedorWallet.innerHTML = '<p class="wallet-hint">Cargando el pago…</p>';

    // 4) Nos aseguramos de tener el SDK listo.
    await initMercadoPago();
    if (!mercadoPago) {
        contenedorWallet.innerHTML =
            '<p class="wallet-hint">No se pudo cargar Mercado Pago. Revisá el servidor.</p>';
        return;
    }

    try {
        // 5) Pedimos la preferencia (server -> Mercado Pago) y nos quedamos
        //    con su id (lo renombramos a preferenceId con la desestructuración).
        const { id: preferenceId } = await crearPreferencia();

        // 6) Limpiamos el "Cargando…" y creamos el brick "wallet":
        //      - "wallet"            = tipo de componente
        //      - "wallet-container"  = id del <div> donde se dibuja
        //      - initialization      = con qué preferencia trabaja
        //    Guardamos el controlador para poder desmontarlo la próxima vez.
        contenedorWallet.innerHTML = "";
        walletController = await mercadoPago.bricks().create(
            "wallet",
            "wallet-container",
            { initialization: { preferenceId } }
        );
    } catch (error) {
        console.error("No se pudo mostrar el botón de Mercado Pago:", error);
        contenedorWallet.innerHTML =
            '<p class="wallet-hint">No se pudo iniciar el pago. Intentá de nuevo.</p>';
    }
}

// ------------------------------------------------------------
//  programarRenderMercadoPago()  (debounce)
//  Cada clic en +/- del carrito llama a esto. En vez de re-dibujar
//  al instante (crearía una preferencia por cada clic), esperamos
//  500 ms de "silencio" y recién ahí re-dibujamos. Si llega otro
//  clic antes, se reinicia la espera.
// ------------------------------------------------------------
function programarRenderMercadoPago() {
    // Solo tiene sentido re-dibujar si el modal del carrito está abierto.
    if (!modalCarrito.classList.contains("show")) return;
    clearTimeout(timerWallet);
    timerWallet = setTimeout(renderizarBotonMercadoPago, 500);
}

// ============================================================
//  Varios
// ============================================================
function animarBotonComprar(boton) {
    const textoOriginal = boton.textContent;
    boton.textContent = "¡Agregado!";
    boton.classList.add("added");

    setTimeout(() => {
        boton.textContent = textoOriginal;
        boton.classList.remove("added");
    }, 1000);
}

document.querySelector(".btn-cta").addEventListener("click", () => {
    document.getElementById("nosotros").scrollIntoView({ behavior: "smooth" });
});

// ---------- Arranque ----------
renderizarCatalogo();
actualizarContadorCarrito();
actualizarContadorFavoritos();
