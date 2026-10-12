const db = require('../db');

// Devuelve true solo si el lote existe y pertenece al productor. Evita que se
// carguen gastos o ingresos contra el lote de otro productor.
async function loteEsDelProductor(loteId, productorId) {
  const id = Number(loteId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const { rows } = await db.query(
    'SELECT 1 FROM lotes WHERE id = $1 AND productor_id = $2',
    [id, productorId]
  );
  return rows.length > 0;
}

module.exports = { loteEsDelProductor };
