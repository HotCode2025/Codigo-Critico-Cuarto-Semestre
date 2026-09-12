const router = require('express').Router();
const db = require('../db');

const COLORES_VALIDOS = ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'teal'];
const RIEGOS_VALIDOS = ['goteo', 'aspersion', 'surco', 'ninguno'];
const TERRENOS_VALIDOS = ['propio', 'arrendado'];

router.get('/', async (req, res) => {
  const { fincaId } = req.query;
  const params = [req.productorId];
  let where = 'productor_id = $1';
  if (fincaId) { params.push(fincaId); where += ` AND finca_id = $${params.length}`; }

  const { rows } = await db.query(
    `SELECT id, finca_id, nombre, color, area, cultivo, riego, malla_antigranizo, terreno
     FROM lotes WHERE ${where} ORDER BY id`,
    params
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, area, fincaId, color, cultivo, riego, mallaAntigranizo, terreno } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
  if (!fincaId) return res.status(400).json({ error: 'fincaId es obligatorio' });

  const { rows: fincaCheck } = await db.query(
    'SELECT id FROM fincas WHERE id = $1 AND productor_id = $2',
    [fincaId, req.productorId]
  );
  if (fincaCheck.length === 0) return res.status(404).json({ error: 'Finca no encontrada' });

  let colorFinal = COLORES_VALIDOS.includes(color) ? color : null;
  if (!colorFinal) {
    const { rows: existentes } = await db.query(
      'SELECT COUNT(*)::int AS total FROM lotes WHERE productor_id = $1',
      [req.productorId]
    );
    colorFinal = COLORES_VALIDOS[existentes[0].total % COLORES_VALIDOS.length];
  }

  const riegoFinal = RIEGOS_VALIDOS.includes(riego) ? riego : null;
  const terrenoFinal = TERRENOS_VALIDOS.includes(terreno) ? terreno : null;

  const { rows } = await db.query(
    `INSERT INTO lotes (productor_id, finca_id, nombre, color, area, cultivo, riego, malla_antigranizo, terreno)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, finca_id, nombre, color, area, cultivo, riego, malla_antigranizo, terreno`,
    [req.productorId, fincaId, nombre.trim(), colorFinal, area || 10, (cultivo || '').trim() || null, riegoFinal, !!mallaAntigranizo, terrenoFinal]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
