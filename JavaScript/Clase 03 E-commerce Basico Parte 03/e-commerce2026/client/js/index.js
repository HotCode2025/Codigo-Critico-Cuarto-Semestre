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

// Botón "Proceder al pago"
document.querySelector(".btn-checkout").addEventListener("click", () => {
    if (carrito.length === 0) return;

    alert(`¡Gracias por tu compra!\nTotal: ${formatearPrecio(calcularTotal())}`);
    carrito = [];
    persistirCarrito();
    cerrarModal(modalCarrito);
});

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
