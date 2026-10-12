const db = require('../db');
const { esIdValido } = require('./validar');

// Devuelve true solo si el lote existe, es del productor y no está archivado.
// Evita cargar gastos o ingresos contra el lote de otro (o uno archivado).
async function loteEsDelProductor(loteId, productorId) {
  if (!esIdValido(loteId)) return false;
  const id = Number(loteId);
  const { rows } = await db.query(
    'SELECT 1 FROM lotes WHERE id = $1 AND productor_id = $2 AND activo = true',
    [id, productorId]
  );
  return rows.length > 0;
}

module.exports = { loteEsDelProductor };
