const db = require('../db');
const { getResumen } = require('./resumen');

// Dispara el webhook de N8N configurado por el productor. No bloquea la respuesta
// al cliente: los llamadores usan esto en "fire and forget".
async function notificarN8N(productorId, evento, datos) {
  const { rows } = await db.query(
    'SELECT webhook_url, habilitado FROM config_n8n WHERE productor_id = $1',
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
    resumen
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

module.exports = { notificarN8N };
