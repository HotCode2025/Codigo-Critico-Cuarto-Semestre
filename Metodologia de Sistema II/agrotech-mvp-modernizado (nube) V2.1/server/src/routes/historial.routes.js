const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, tipo, datos, creado_en AS fecha FROM historial_eventos
     WHERE productor_id = $1 ORDER BY creado_en DESC LIMIT 100`,
    [req.productorId]
  );
  res.json(rows);
});

module.exports = router;
