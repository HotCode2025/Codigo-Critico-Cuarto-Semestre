const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { fincaId } = req.query;
  const params = [req.productorId];
  let where = 'productor_id = $1';
  if (fincaId) { params.push(fincaId); where += ` AND finca_id = $${params.length}`; }

  const { rows } = await db.query(
    `SELECT id, finca_id, nombre, color, area FROM lotes WHERE ${where} ORDER BY id`,
    params
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, area, fincaId } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
  if (!fincaId) return res.status(400).json({ error: 'fincaId es obligatorio' });

  const { rows: fincaCheck } = await db.query(
    'SELECT id FROM fincas WHERE id = $1 AND productor_id = $2',
    [fincaId, req.productorId]
  );
  if (fincaCheck.length === 0) return res.status(404).json({ error: 'Finca no encontrada' });

  const colores = ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'teal'];
  const { rows: existentes } = await db.query(
    'SELECT COUNT(*)::int AS total FROM lotes WHERE productor_id = $1',
    [req.productorId]
  );
  const color = colores[existentes[0].total % colores.length];

  const { rows } = await db.query(
    `INSERT INTO lotes (productor_id, finca_id, nombre, color, area) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, finca_id, nombre, color, area`,
    [req.productorId, fincaId, nombre.trim(), color, area || 10]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
