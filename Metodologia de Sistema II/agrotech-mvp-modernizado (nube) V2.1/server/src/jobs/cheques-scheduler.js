const db = require('../db');
const { notificarN8N } = require('../services/n8n');

const INTERVALO_MS = 30 * 60 * 1000;
const ultimaFirmaPorProductor = new Map();

// Evita reenviar el mismo aviso si la cartera de cheques no cambió desde el
// último chequeo (si no, cada 30 min se repetiría el mismo WhatsApp aunque
// nada nuevo haya pasado, y con el plan gratuito de N8N eso agota el cupo de
// ejecuciones mensuales en un par de días).
function firmaCheques(cheques) {
  return cheques.map(c => `${c.id}:${c.estado}`).sort().join(',');
}

async function revisarChequesPendientes() {
  const { rows: productores } = await db.query(
    `SELECT productor_id FROM config_n8n WHERE habilitado = true AND webhook_url IS NOT NULL`
  );

  for (const { productor_id: productorId } of productores) {
    try {
      const { rows: pendientes } = await db.query(
        `SELECT id, tipo, monto, estado, fecha_cobro AS fecha FROM cheques_cartera
         WHERE productor_id = $1 AND estado = 'normal'`,
        [productorId]
      );

      if (pendientes.length === 0) {
        ultimaFirmaPorProductor.delete(productorId);
        continue;
      }

      const firma = firmaCheques(pendientes);
      if (ultimaFirmaPorProductor.get(productorId) === firma) continue;

      await notificarN8N(productorId, 'cheques_pendientes', {
        cheques: pendientes,
        totalCheques: pendientes.length,
        montoTotalCheques: pendientes.reduce((s, c) => s + Number(c.monto), 0)
      });
      ultimaFirmaPorProductor.set(productorId, firma);
    } catch (err) {
      console.error(`[cheques-scheduler] Error revisando productor ${productorId}:`, err.message);
    }
  }
}

function iniciarSchedulerCheques() {
  setTimeout(revisarChequesPendientes, 15 * 1000);
  setInterval(revisarChequesPendientes, INTERVALO_MS);
}

module.exports = { iniciarSchedulerCheques };
