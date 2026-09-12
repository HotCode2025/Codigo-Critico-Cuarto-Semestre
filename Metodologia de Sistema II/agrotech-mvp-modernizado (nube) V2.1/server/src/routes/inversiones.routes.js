const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, ticker, monto, fecha FROM inversiones WHERE productor_id = $1 ORDER BY fecha DESC',
    [req.productorId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { ticker, monto } = req.body;
  if (!ticker || !monto) return res.status(400).json({ error: 'ticker y monto son obligatorios' });

  const { rows } = await db.query(
    'INSERT INTO inversiones (productor_id, ticker, monto) VALUES ($1, $2, $3) RETURNING id, ticker, monto, fecha',
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

module.exports = router;
