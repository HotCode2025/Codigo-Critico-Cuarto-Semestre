const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT f.id, f.nombre, f.ubicacion, f.creado_en, COUNT(l.id)::int AS lotes
     FROM fincas f LEFT JOIN lotes l ON l.finca_id = f.id
     WHERE f.productor_id = $1
     GROUP BY f.id ORDER BY f.id`,
    [req.productorId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, ubicacion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });

  const { rows } = await db.query(
    `INSERT INTO fincas (productor_id, nombre, ubicacion) VALUES ($1, $2, $3)
     RETURNING id, nombre, ubicacion, creado_en`,
    [req.productorId, nombre.trim(), (ubicacion || '').trim() || null]
  );
  res.status(201).json({ ...rows[0], lotes: 0 });
});

module.exports = router;
