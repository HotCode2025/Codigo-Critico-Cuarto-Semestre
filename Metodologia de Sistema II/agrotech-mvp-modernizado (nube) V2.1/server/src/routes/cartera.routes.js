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

module.exports = router;
