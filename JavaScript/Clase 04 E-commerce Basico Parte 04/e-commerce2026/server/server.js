// ============================================================
//  Clase 04 · server.js  —  Servidor de pagos con Mercado Pago
// ============================================================
//
//  ¿POR QUÉ HACE FALTA UN SERVIDOR?
//  --------------------------------
//  Para cobrar con Mercado Pago se necesita el "Access Token", que es
//  una credencial SECRETA (permite mover plata de la cuenta). Si la
//  pusiéramos en el JavaScript del navegador, cualquiera la vería con
//  F12. Por eso el token vive solo acá, en el backend, y el navegador
//  nunca lo toca.
//
//  QUÉ HACE ESTE ARCHIVO
//  ---------------------
//   1. Sirve la tienda (client/) como una página web normal.
//   2. Expone una ruta POST /create_preference: recibe el carrito,
//      le pide a Mercado Pago que cree una "orden de pago" (preferencia)
//      y devuelve su id.
//   3. Expone GET /config: le pasa al frontend la Public Key
//      (esa NO es secreta).
//
//  QUÉ ES UNA "PREFERENCIA"
//  -----------------------
//  Es una orden de pago que se crea y queda guardada en los servidores
//  de Mercado Pago. Contiene qué se compra, cuánto, y a dónde volver
//  después de pagar. Mercado Pago nos devuelve un id; con ese id se
//  abre la pantalla de pago (Checkout Pro).
// ============================================================

// ---------- 1. Importaciones ----------
import path from "node:path";                 // para armar rutas de archivos
import { fileURLToPath } from "node:url";     // para saber en qué carpeta estamos
import express from "express";                // framework para crear el servidor web
import cors from "cors";                      // permite que el navegador llame a esta API
import "dotenv/config";                       // carga el archivo .env dentro de process.env
import { MercadoPagoConfig, Preference } from "mercadopago"; // SDK oficial de Mercado Pago

// En módulos ES no existe __dirname, así que lo reconstruimos.
// Lo usamos más abajo para ubicar la carpeta client/.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- 2. Configuración (viene toda de variables de entorno) ----------
// process.env.X = "traeme la variable X del entorno".
// En local esas variables salen del archivo server/.env (gracias a dotenv).
// En Render se cargan desde el panel del servicio.

// Puerto donde escucha el servidor. Render impone el suyo con process.env.PORT.
const PORT = process.env.PORT || 3000;

// Dirección pública del sitio. Se usa para las "back_urls" (a dónde vuelve
// el usuario tras pagar). Prioridad:
//   1) PUBLIC_URL si la definimos a mano
//   2) RENDER_EXTERNAL_URL, que Render inyecta solo (https://tuapp.onrender.com)
//   3) localhost, para cuando corremos en la compu
const PUBLIC_URL =
    process.env.PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${PORT}`;

// La credencial SECRETA. Nunca se escribe en el código ni se sube al repo.
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

// Aviso amable si arrancamos sin configurar el token (error típico la 1ª vez).
if (!ACCESS_TOKEN || ACCESS_TOKEN.includes("TU_ACCESS_TOKEN")) {
    console.warn(
        "\n⚠️  Falta configurar MP_ACCESS_TOKEN en server/.env\n" +
        "   Copiá server/.env.example a server/.env y pegá tu Access Token de PRUEBA.\n"
    );
}

// ---------- 3. Cliente de Mercado Pago ----------
// Es como "iniciar sesión" en la API de Mercado Pago con nuestro token.
// A partir de acá, todo lo que le pidamos a MP va firmado con esta credencial.
const mpClient = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

// ---------- 4. Creación del servidor ----------
const app = express();

app.use(cors());            // el navegador puede hacer fetch a esta API
app.use(express.json());    // el servidor entiende los cuerpos de pedido en formato JSON

// Servimos la carpeta client/ como archivos estáticos.
// Gracias a esto, entrar a http://localhost:3000 muestra la tienda
// (index.html, style.css, js/, success.html, etc.).
app.use(express.static(path.join(__dirname, "..", "client")));

// ============================================================
//  5. RUTA PRINCIPAL:  POST /create_preference
//     El frontend manda el carrito -> devolvemos el id de la preferencia
// ============================================================
app.post("/create_preference", async (req, res) => {
    try {
        // 5.1 Sacamos "items" del cuerpo del pedido. El frontend manda algo así:
        //     { items: [ { title, quantity, unit_price }, ... ] }
        const { items } = req.body;

        // 5.2 Validación básica: si no vino un array con al menos un producto,
        //     respondemos 400 (pedido inválido) y cortamos.
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "El carrito está vacío." });
        }

        // 5.3 Normalizamos cada item al formato EXACTO que espera Mercado Pago.
        //     Nunca confiamos en los tipos que llegan del navegador:
        //     forzamos String y Number, y fijamos la moneda en pesos argentinos.
        const itemsPreferencia = items.map((item) => ({
            title: String(item.title),
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            currency_id: "ARS",
        }));

        // 5.4 Objeto que representa la operación de "crear preferencia".
        const preference = new Preference(mpClient);

        // 5.5 back_urls = a dónde vuelve el usuario después de pagar.
        //     auto_return = "que MP redirija SOLO, sin que el usuario toque nada".
        //     Problema: Mercado Pago RECHAZA auto_return si las back_urls son
        //     localhost. Por eso solo lo activamos cuando el sitio tiene una
        //     URL pública real (ej. la de Render).
        const esLocal = /localhost|127\.0\.0\.1/.test(PUBLIC_URL);

        const body = {
            items: itemsPreferencia,
            back_urls: {
                success: `${PUBLIC_URL}/success.html`,   // pago aprobado
                failure: `${PUBLIC_URL}/failure.html`,   // pago rechazado
                pending: `${PUBLIC_URL}/pending.html`,   // pago pendiente
            },
        };

        if (!esLocal) body.auto_return = "approved";

        // 5.6 Le pedimos a Mercado Pago que cree la preferencia.
        //     "await" = esperamos la respuesta de su API antes de seguir.
        const resultado = await preference.create({ body });

        // 5.7 Le devolvemos al frontend:
        //     - id: lo usa el botón embebido (Wallet Brick)
        //     - init_point: la URL directa a la pantalla de pago (por si se
        //       quisiera redirigir a mano)
        res.json({
            id: resultado.id,
            init_point: resultado.init_point,
        });
    } catch (error) {
        // Si algo falla (token inválido, MP caído, datos mal), lo logueamos
        // en el servidor y devolvemos un error genérico al frontend.
        console.error("Error creando la preferencia:", error);
        res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
    }
});

// ============================================================
//  6. RUTA AUXILIAR:  GET /config
//     Le pasa la Public Key al frontend. Esta clave NO es secreta:
//     sirve para inicializar el SDK de Mercado Pago en el navegador.
// ============================================================
app.get("/config", (_req, res) => {
    res.json({ publicKey: process.env.MP_PUBLIC_KEY || "" });
});

// ---------- 7. Arranque ----------
// El servidor queda "escuchando" pedidos en el puerto elegido.
app.listen(PORT, () => {
    console.log(`✅ Servidor escuchando en ${PUBLIC_URL}`);
});
