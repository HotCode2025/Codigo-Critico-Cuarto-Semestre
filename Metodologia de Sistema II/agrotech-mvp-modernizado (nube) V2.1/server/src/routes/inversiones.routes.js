const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, ticker, monto, fecha, estado, monto_venta, fecha_venta
     FROM inversiones WHERE productor_id = $1 ORDER BY fecha DESC`,
    [req.productorId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { ticker, monto } = req.body;
  if (!ticker || !monto) return res.status(400).json({ error: 'ticker y monto son obligatorios' });

  const { rows } = await db.query(
    `INSERT INTO inversiones (productor_id, ticker, monto)
     VALUES ($1, $2, $3) RETURNING id, ticker, monto, fecha, estado, monto_venta, fecha_venta`,
    [req.productorId, ticker, monto]
  );
  const inversion = rows[0];

  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [req.productorId, 'inversion_registrada', JSON.stringify(inversion)]
  );
  notificarN8N(req.productorId, 'inversion_registrada', inversion).catch(() => {});

  res.status(201).json(inversion);
});

router.patch('/:id/vender', async (req, res) => {
  const montoVenta = Number(req.body.montoVenta);
  if (!Number.isFinite(montoVenta) || montoVenta <= 0) {
    return res.status(400).json({ error: 'montoVenta debe ser un número mayor a 0' });
  }

  const { rows } = await db.query(
    `UPDATE inversiones SET estado = 'vendida', monto_venta = $1, fecha_venta = now()
     WHERE id = $2 AND productor_id = $3 AND estado = 'activa'
     RETURNING id, ticker, monto, fecha, estado, monto_venta, fecha_venta`,
    [montoVenta, req.params.id, req.productorId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Inversión no encontrada o ya vendida' });
  const inversion = rows[0];

  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [req.productorId, 'inversion_vendida', JSON.stringify(inversion)]
  );

  res.json(inversion);
});

module.exports = router;
