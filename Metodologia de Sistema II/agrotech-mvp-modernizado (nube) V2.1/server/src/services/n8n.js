const db = require('../db');
const { getResumen } = require('./resumen');

// Dispara el webhook de N8N configurado por el productor. No bloquea la respuesta
// al cliente: los llamadores usan esto en "fire and forget".
async function notificarN8N(productorId, evento, datos) {
  const { rows } = await db.query(
    'SELECT webhook_url, habilitado, whatsapp_telefono FROM config_n8n WHERE productor_id = $1',
    [productorId]
  );
  const config = rows[0];
  if (!config || !config.habilitado || !config.webhook_url) return { success: false };

  const resumen = await getResumen(productorId);
  const payload = {
    app: 'AgroTech',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    evento,
    datos,
    resumen,
    whatsapp: {
      telefono: config.whatsapp_telefono || null
    }
  };

  try {
    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: response.ok, status: response.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Dispara el webhook "de sistema" (fijo por variable de entorno, no configurable
// por productor) usado para flujos que ocurren antes de estar logueado, como la
// recuperación de contraseña.
async function notificarSistemaN8N(evento, datos) {
  const url = process.env.N8N_SYSTEM_WEBHOOK_URL;
  if (!url) return { success: false, error: 'N8N_SYSTEM_WEBHOOK_URL no configurada' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'AgroTech',
        timestamp: new Date().toISOString(),
        evento,
        datos
      })
    });
    return { success: response.ok, status: response.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { notificarN8N, notificarSistemaN8N };
