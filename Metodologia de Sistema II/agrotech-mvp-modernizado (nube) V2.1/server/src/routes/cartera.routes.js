const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, tipo, monto, estado, fecha_cobro AS fecha, creado_en FROM cheques_cartera
     WHERE productor_id = $1 ORDER BY fecha_cobro ASC`,
    [req.productorId]
  );
  res.json(rows);
});

// Envía a N8N los cheques pendientes de cobro (equivalente a sincronizarChequesConN8N).
router.post('/sincronizar', async (req, res) => {
  const { rows: pendientes } = await db.query(
    `SELECT id, tipo, monto, estado, fecha_cobro AS fecha FROM cheques_cartera
     WHERE productor_id = $1 AND estado = 'normal'`,
    [req.productorId]
  );

  if (pendientes.length === 0) return res.json({ success: false, motivo: 'sin_cheques_pendientes' });

  const resultado = await notificarN8N(req.productorId, 'cheques_pendientes', {
    cheques: pendientes,
    totalCheques: pendientes.length,
    montoTotalCheques: pendientes.reduce((s, c) => s + Number(c.monto), 0)
  });

  res.json(resultado);
});

// Marca un cheque como cobrado (ya presentado en el banco): sale de la cartera
// pendiente y deja de disparar la alarma del scheduler ([estado = 'normal']).
router.patch('/:id/cobrar', async (req, res) => {
  const { rows } = await db.query(
    `UPDATE cheques_cartera SET estado = 'cobrado'
     WHERE id = $1 AND productor_id = $2 AND estado = 'normal'
     RETURNING id, tipo, monto, estado, fecha_cobro AS fecha`,
    [req.params.id, req.productorId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Cheque no encontrado o ya estaba cobrado' });

  res.json(rows[0]);
});

module.exports = router;
