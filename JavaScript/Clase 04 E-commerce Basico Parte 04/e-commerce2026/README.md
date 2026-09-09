# Gamer Pro Store — Clase 04: E-commerce Básico Parte 04

E-commerce de la Clase 03 + **método de pago con Mercado Pago (Checkout Pro)**.

```
e-commerce2026/
├── client/            # Frontend (HTML/CSS/JS) — de la Clase 03
│   ├── index.html
│   ├── js/index.js    # 4.2 -> botón "Proceder al pago" llama al server
│   ├── success.html   # back_url cuando el pago se aprueba
│   ├── failure.html   # back_url cuando el pago se rechaza
│   └── pending.html   # back_url cuando el pago queda pendiente
└── server/            # Backend de pagos (Node + Express + Mercado Pago)
    ├── package.json
    ├── server.js
    └── .env.example   # copiar a .env y completar credenciales
```

> **4.1 Contador de productos en el botón del carrito**: ya está resuelto desde la
> Clase 03 (`#cart-counter` / `actualizarContadorCarrito()` en `client/js/index.js`).

---

## Requisitos

- Node.js 18+
- **pnpm** (la clase pide reemplazar npm por pnpm):
  ```bash
  npm install -g pnpm
  ```

## Puesta en marcha

### Parte 1 — Instalación

```bash
cd server
pnpm init           # ya viene un package.json, este paso es de referencia
```

### Parte 3 — Dependencias

```bash
cd server
pnpm install        # instala express, cors, mercadopago y dotenv
```

### Parte 6 — Credenciales (token y public_key)

1. Entrá a <https://www.mercadopago.com.ar/developers/panel> y creá una aplicación.
2. En **Credenciales de prueba** copiá el **Access Token** y la **Public Key** (empiezan con `TEST-`).
3. Copiá el archivo de ejemplo y pegá tus valores:
   ```bash
   cp .env.example .env
   ```
   ```env
   MP_ACCESS_TOKEN=TEST-1234567890...
   MP_PUBLIC_KEY=TEST-abcd-...
   ```
   `.env` está en `.gitignore`: **no se sube al repo**.

### Levantar el proyecto

```bash
cd server
pnpm start          # o: pnpm dev  (recarga al guardar)
```

Abrí <http://localhost:3000> — el server sirve el frontend y la API.

## Parte 4 y 5 — Cómo funciona el pago

1. En el modal del carrito tocás **"Proceder al pago"**.
2. `client/js/index.js` arma los `items` del carrito y hace `POST /create_preference`.
3. `server.js` crea una **preferencia** en Mercado Pago y devuelve `init_point`.
4. El frontend hace `window.location.href = init_point` → pantalla de Mercado Pago.
5. Al terminar, MP redirige a `success.html`, `failure.html` o `pending.html`.

## Parte 7 y 8 — Probar los pagos con cuentas de prueba

1. En el panel de desarrollador creá **usuarios de prueba** (uno vendedor, uno comprador).
2. Usá el Access Token del **vendedor de prueba** en `.env`.
3. Pagá logueado con el **comprador de prueba** y una tarjeta de test, por ejemplo:
   | Tarjeta            | Número              | CVV | Vto   |
   |--------------------|---------------------|-----|-------|
   | Mastercard         | 5031 7557 3453 0604 | 123 | 11/30 |
   | Visa               | 4509 9535 6623 3704 | 123 | 11/30 |
   - Nombre del titular: `APRO` (pago aprobado), `OTHE` (rechazado), `CONT` (pendiente).
   - DNI: `12345678`.

## Deploy en Render (para que Mercado Pago vuelva al sitio)

En `localhost` Mercado Pago **no** ofrece el retorno automático porque no acepta
`back_urls` con `localhost`. Subiendo el server a una URL pública (https) el propio
`server.js` activa `auto_return` y MP redirige solo a `success.html`.

1. <https://render.com> → registrate con GitHub.
2. **New → Web Service** → conectá este repo.
3. Configuración:
   | Campo | Valor |
   |---|---|
   | Root Directory | `JavaScript/Clase 04 E-commerce Basico Parte 04/e-commerce2026/server` |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
4. **Environment** → agregá:
   ```
   MP_ACCESS_TOKEN = APP_USR-...        (tu Access Token de prueba)
   MP_PUBLIC_KEY   = APP_USR-...        (tu Public Key de prueba)
   ```
   No hace falta setear `PUBLIC_URL`: el server la toma de `RENDER_EXTERNAL_URL`
   que Render inyecta sola.
5. Deploy → te queda `https://tuapp.onrender.com`. Abrí la tienda desde ahí.

> El plan free "duerme" tras 15 min sin tráfico; la primera visita tarda ~30 s.

## Notas

- Si Mercado Pago responde **`auto_return invalid`**, comentá la línea
  `if (!esLocal) body.auto_return = "approved";` en `server/server.js`.
- Si abrís el frontend con **Live Server** (otro puerto) en vez de `localhost:3000`,
  poné `const API_URL = "http://localhost:3000";` en `client/js/index.js`.

Material basado en el canal de YouTube **@onthecode**.
