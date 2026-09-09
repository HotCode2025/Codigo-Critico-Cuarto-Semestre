// ============================================================
//  Clase 04 - Parte 2 -> server.js
//  Servidor de pagos con Mercado Pago (Checkout Pro / redirección)
// ============================================================
//  Flujo:
//   1. El frontend arma los items del carrito y hace POST /create_preference
//   2. El server crea una "preferencia" de pago en Mercado Pago
//   3. Mercado Pago devuelve un init_point (URL de pago)
//   4. El frontend redirige al usuario a esa URL
//   5. Al terminar, MP vuelve a success.html / failure.html / pending.html
// ============================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import "dotenv/config";
import { MercadoPagoConfig, Preference } from "mercadopago";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- Configuración ----------
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

if (!ACCESS_TOKEN || ACCESS_TOKEN.includes("TU_ACCESS_TOKEN")) {
    console.warn(
        "\n⚠️  Falta configurar MP_ACCESS_TOKEN en server/.env\n" +
        "   Copiá server/.env.example a server/.env y pegá tu Access Token de PRUEBA.\n"
    );
}

// Cliente de Mercado Pago (Parte 6 -> token)
const mpClient = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

// ---------- App ----------
const app = express();
app.use(cors());
app.use(express.json());

// Servimos el frontend (client/) desde el mismo servidor
app.use(express.static(path.join(__dirname, "..", "client")));

// ---------- Parte 3/5 -> Endpoint que crea la preferencia ----------
app.post("/create_preference", async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "El carrito está vacío." });
        }

        // Normalizamos y validamos lo que llega del frontend
        const itemsPreferencia = items.map((item) => ({
            title: String(item.title),
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            currency_id: "ARS",
        }));

        const preference = new Preference(mpClient);

        // Mercado Pago rechaza auto_return cuando las back_urls apuntan a
        // localhost. Solo lo activamos si el sitio tiene una URL pública real.
        const esLocal = /localhost|127\.0\.0\.1/.test(PUBLIC_URL);

        const body = {
            items: itemsPreferencia,
            back_urls: {
                success: `${PUBLIC_URL}/success.html`,
                failure: `${PUBLIC_URL}/failure.html`,
                pending: `${PUBLIC_URL}/pending.html`,
            },
            statement_descriptor: "GAMER PRO STORE",
        };

        if (!esLocal) body.auto_return = "approved";

        const resultado = await preference.create({ body });

        res.json({
            id: resultado.id,
            init_point: resultado.init_point,
        });
    } catch (error) {
        console.error("Error creando la preferencia:", error);
        res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
    }
});

// Endpoint opcional para exponer la public key al frontend (Parte 6)
app.get("/config", (_req, res) => {
    res.json({ publicKey: process.env.MP_PUBLIC_KEY || "" });
});

app.listen(PORT, () => {
    console.log(`✅ Servidor escuchando en ${PUBLIC_URL}`);
});
