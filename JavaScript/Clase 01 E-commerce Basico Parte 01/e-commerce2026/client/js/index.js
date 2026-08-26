const section1Content = document.querySelector(".section1 .card-section");
const section2Content = document.querySelector(".section2 .card-section");

productos.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    
    card.innerHTML = `
        <div class="card-header-icons">
            <svg class="heart-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        </div>
        <div class="product-image">
            <img src="${product.img}" alt="${product.productName}">
        </div>
        <h3>${product.productName}</h3>
        <p>${product.description}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <span style="color:rgb(163,230,53); font-weight:bold; font-family:'Orbitron',sans-serif;">
                $${product.price.toLocaleString('es-AR')}
            </span>
        </div>
        <button class="btn-buy">Agregar al carrito</button>
    `;

    if (product.section === "section1") {
        section1Content.appendChild(card);
    } else {
        section2Content.appendChild(card);
    }
});

let cartArray = [];
let favArray = [];

const cartModal = document.getElementById('cart-modal');
const favModal = document.getElementById('fav-modal');
const cartContainer = document.getElementById('cart-items-container');
const favContainer = document.getElementById('fav-items-container');
const counterElement = document.getElementById('cart-counter');

document.querySelector('.products-container').addEventListener('click', (e) => {
    const heart = e.target.closest('.heart-icon');
    if (!heart) return;

    const card = heart.closest('.product-card');
    const priceSpan = card.querySelector('span');
    
    const product = {
        title: card.querySelector('h3').textContent,
        desc: card.querySelector('p').textContent,
        img: card.querySelector('img').src,
        price: priceSpan ? priceSpan.textContent : ''
    };

    const isFav = heart.classList.toggle('active-heart');

    if (isFav) {
        favArray.push(product);
    } else {
        favArray = favArray.filter(item => item.title !== product.title);
    }
});

document.querySelector('.products-container').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-buy');
    if (!btn) return;

    const card = btn.closest('.product-card');
    const priceSpan = card.querySelector('span');
    
    const product = {
        title: card.querySelector('h3').textContent,
        desc: card.querySelector('p').textContent,
        img: card.querySelector('img').src,
        price: priceSpan ? priceSpan.textContent : ''
    };

    cartArray.push(product);

    counterElement.textContent = cartArray.length;
    counterElement.style.display = 'inline-block';

    const originalText = btn.textContent;
    btn.textContent = '¡Agregado!';
    btn.style.backgroundColor = 'white';
    btn.style.color = 'black';

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'rgb(163, 230, 53)';
    }, 1000);
});

function renderCart() {
    cartContainer.innerHTML = '';
    if (cartArray.length === 0) {
        cartContainer.innerHTML = '<p style="color: gray; text-align:center;">Tu carrito está vacío.</p>';
        return;
    }
    cartArray.forEach((item, index) => {
        cartContainer.innerHTML += `
            <div class="summary-item">
                <img src="${item.img}" alt="prod">
                <div class="item-info">
                    <h4>${item.title}</h4>
                    <p>${item.desc}</p>
                    <p style="color:rgb(163,230,53); font-weight:bold; margin-top:4px;">${item.price}</p>
                </div>
                <button class="remove-btn" onclick="removeItem(${index})">✖</button>
            </div>
        `;
    });
}

function renderFavs() {
    favContainer.innerHTML = '';
    if (favArray.length === 0) {
        favContainer.innerHTML = '<p style="color: gray; text-align:center;">No tienes favoritos guardados.</p>';
        return;
    }
    favArray.forEach((item) => {
        favContainer.innerHTML += `
            <div class="summary-item">
                <img src="${item.img}" alt="prod">
                <div class="item-info">
                    <h4>${item.title}</h4>
                    <p>${item.desc}</p>
                    <p style="color:rgb(163,230,53); font-weight:bold; margin-top:4px;">${item.price}</p>
                </div>
            </div>
        `;
    });
}

window.removeItem = function(index) {
    cartArray.splice(index, 1);
    counterElement.textContent = cartArray.length;
    if (cartArray.length === 0) counterElement.style.display = 'none';
    renderCart();
};

document.getElementById('btn-open-cart').addEventListener('click', () => {
    renderCart();
    cartModal.classList.add('show');
});

document.getElementById('btn-open-fav').addEventListener('click', () => {
    renderFavs();
    favModal.classList.add('show');
});

document.getElementById('close-cart').addEventListener('click', () => cartModal.classList.remove('show'));
document.getElementById('close-fav').addEventListener('click', () => favModal.classList.remove('show'));

window.addEventListener('click', (e) => {
    if (e.target === cartModal) cartModal.classList.remove('show');
    if (e.target === favModal) favModal.classList.remove('show');
});

// ✅ CORREGIDO: Ahora apunta a "nosotros" (CONOCE MÁS)
document.querySelector('.btn-cta').addEventListener('click', () => {
    document.getElementById('nosotros').scrollIntoView({ behavior: 'smooth' });
});