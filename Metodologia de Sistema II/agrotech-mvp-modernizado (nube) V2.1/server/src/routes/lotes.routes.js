const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nombre, color, area FROM lotes WHERE productor_id = $1 ORDER BY id',
    [req.productorId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, area } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });

  const colores = ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'teal'];
  const { rows: existentes } = await db.query(
    'SELECT COUNT(*)::int AS total FROM lotes WHERE productor_id = $1',
    [req.productorId]
  );
  const color = colores[existentes[0].total % colores.length];

  const { rows } = await db.query(
    `INSERT INTO lotes (productor_id, nombre, color, area) VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, color, area`,
    [req.productorId, nombre.trim(), color, area || 10]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
