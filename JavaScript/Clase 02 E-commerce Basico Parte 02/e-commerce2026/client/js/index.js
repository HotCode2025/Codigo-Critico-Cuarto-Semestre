const contenidoSeccion1 = document.querySelector(".section1 .card-section");
const contenidoSeccion2 = document.querySelector(".section2 .card-section");

productos.forEach((producto) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "product-card";
    
    tarjeta.innerHTML = `
        <div class="card-header-icons">
            <svg class="heart-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        </div>
        <div class="product-image">
            <img src="${producto.img}" alt="${producto.productName}">
        </div>
        <h3>${producto.productName}</h3>
        <p>${producto.description}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <span style="color:rgb(163,230,53); font-weight:bold; font-family:'Orbitron',sans-serif;">
                $${producto.price.toLocaleString('es-AR')}
            </span>
        </div>
        <button class="btn-buy">Comprar</button>
    `;

    if (producto.section === "section1") {
        contenidoSeccion1.appendChild(tarjeta);
    } else {
        contenidoSeccion2.appendChild(tarjeta);
    }
});

let arregloCarrito = [];
let arregloFavoritos = [];

const modalCarrito = document.getElementById('cart-modal');
const modalFavoritos = document.getElementById('fav-modal');
const contenedorCarrito = document.getElementById('cart-items-container');
const contenedorFavoritos = document.getElementById('fav-items-container');
const elementoContador = document.getElementById('cart-counter');

document.querySelector('.products-container').addEventListener('click', (e) => {
    const corazon = e.target.closest('.heart-icon');
    if (!corazon) return;

    const tarjeta = corazon.closest('.product-card');
    const spanPrecio = tarjeta.querySelector('span');
    
    const producto = {
        titulo: tarjeta.querySelector('h3').textContent,
        descripcion: tarjeta.querySelector('p').textContent,
        imagen: tarjeta.querySelector('img').src,
        precio: spanPrecio ? spanPrecio.textContent : ''
    };

    const esFavorito = corazon.classList.toggle('active-heart');

    if (esFavorito) {
        arregloFavoritos.push(producto);
    } else {
        arregloFavoritos = arregloFavoritos.filter(item => item.titulo !== producto.titulo);
    }
});

document.querySelector('.products-container').addEventListener('click', (e) => {
    const boton = e.target.closest('.btn-buy');
    if (!boton) return;

    const tarjeta = boton.closest('.product-card');
    const spanPrecio = tarjeta.querySelector('span');
    
    const producto = {
        titulo: tarjeta.querySelector('h3').textContent,
        descripcion: tarjeta.querySelector('p').textContent,
        imagen: tarjeta.querySelector('img').src,
        precio: spanPrecio ? spanPrecio.textContent : ''
    };

    arregloCarrito.push(producto);

    elementoContador.textContent = arregloCarrito.length;
    elementoContador.style.display = 'inline-block';

    const textoOriginal = boton.textContent;
    boton.textContent = '¡Agregado!';
    boton.style.backgroundColor = 'white';
    boton.style.color = 'black';

    setTimeout(() => {
        boton.textContent = textoOriginal;
        boton.style.backgroundColor = 'transparent';
        boton.style.color = 'rgb(163, 230, 53)';
    }, 1000);
});

function renderizarCarrito() {
    contenedorCarrito.innerHTML = '';
    if (arregloCarrito.length === 0) {
        contenedorCarrito.innerHTML = '<p style="color: gray; text-align:center;">Tu carrito está vacío.</p>';
        return;
    }
    arregloCarrito.forEach((item, indice) => {
        contenedorCarrito.innerHTML += `
            <div class="summary-item">
                <img src="${item.imagen}" alt="prod">
                <div class="item-info">
                    <h4>${item.titulo}</h4>
                    <p>${item.descripcion}</p>
                    <p style="color:rgb(163,230,53); font-weight:bold; margin-top:4px;">${item.precio}</p>
                </div>
                <button class="remove-btn" onclick="eliminarItem(${indice})">✖</button>
            </div>
        `;
    });
}

function renderizarFavoritos() {
    contenedorFavoritos.innerHTML = '';
    if (arregloFavoritos.length === 0) {
        contenedorFavoritos.innerHTML = '<p style="color: gray; text-align:center;">No tienes favoritos guardados.</p>';
        return;
    }
    arregloFavoritos.forEach((item) => {
        contenedorFavoritos.innerHTML += `
            <div class="summary-item">
                <img src="${item.imagen}" alt="prod">
                <div class="item-info">
                    <h4>${item.titulo}</h4>
                    <p>${item.descripcion}</p>
                    <p style="color:rgb(163,230,53); font-weight:bold; margin-top:4px;">${item.precio}</p>
                </div>
            </div>
        `;
    });
}

window.eliminarItem = function(indice) {
    arregloCarrito.splice(indice, 1);
    elementoContador.textContent = arregloCarrito.length;
    if (arregloCarrito.length === 0) elementoContador.style.display = 'none';
    renderizarCarrito();
};

document.getElementById('btn-open-cart').addEventListener('click', () => {
    renderizarCarrito();
    modalCarrito.classList.add('show');
});

document.getElementById('btn-open-fav').addEventListener('click', () => {
    renderizarFavoritos();
    modalFavoritos.classList.add('show');
});

document.getElementById('close-cart').addEventListener('click', () => modalCarrito.classList.remove('show'));
document.getElementById('close-fav').addEventListener('click', () => modalFavoritos.classList.remove('show'));

window.addEventListener('click', (e) => {
    if (e.target === modalCarrito) modalCarrito.classList.remove('show');
    if (e.target === modalFavoritos) modalFavoritos.classList.remove('show');
});

document.querySelector('.btn-cta').addEventListener('click', () => {
    document.getElementById('nosotros').scrollIntoView({ behavior: 'smooth' });
});