const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

async function registrarEvento(productorId, tipo, datos) {
  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [productorId, tipo, JSON.stringify(datos)]
  );
}

router.get('/', async (req, res) => {
  const { loteId, estado, fincaId } = req.query;
  const condiciones = ['g.productor_id = $1'];
  const params = [req.productorId];
  let join = '';

  if (loteId) { params.push(loteId); condiciones.push(`g.lote_id = $${params.length}`); }
  if (estado) { params.push(estado); condiciones.push(`g.estado = $${params.length}`); }
  if (fincaId) {
    join = 'JOIN lotes l ON l.id = g.lote_id';
    params.push(fincaId);
    condiciones.push(`l.finca_id = $${params.length}`);
  }

  const { rows } = await db.query(
    `SELECT g.id, g.lote_id, g.concepto, g.monto, g.estado, g.fecha, g.creado_en FROM gastos g ${join}
     WHERE ${condiciones.join(' AND ')} ORDER BY g.creado_en DESC`,
    params
  );
  res.json(rows);
});

router.get('/programados', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, lote_id, concepto, monto, fecha FROM gastos
     WHERE productor_id = $1 AND estado = 'programado' ORDER BY fecha ASC`,
    [req.productorId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { loteId, concepto, monto, estado, fecha } = req.body;
  if (!loteId || !concepto || !monto || !estado) {
    return res.status(400).json({ error: 'loteId, concepto, monto y estado son obligatorios' });
  }
  if (estado === 'programado' && !fecha) {
    return res.status(400).json({ error: 'fecha es obligatoria para gastos programados' });
  }

  const { rows } = await db.query(
    `INSERT INTO gastos (productor_id, lote_id, concepto, monto, estado, fecha)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, lote_id, concepto, monto, estado, fecha`,
    [req.productorId, loteId, concepto, monto, estado, fecha || null]
  );

  const gasto = rows[0];
  await registrarEvento(req.productorId, 'gasto_registrado', gasto);
  notificarN8N(req.productorId, 'gasto_registrado', gasto).catch(() => {});

  res.status(201).json(gasto);
});

module.exports = router;
