const router = require('express').Router();
const db = require('../db');
const { errorTexto, errorArea, esIdValido, validarFiltrosId, validarIdParam } = require('../services/validar');

const COLORES_VALIDOS = ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'teal'];
const RIEGOS_VALIDOS = ['goteo', 'aspersion', 'surco', 'ninguno'];
const TERRENOS_VALIDOS = ['propio', 'arrendado'];

router.param('id', validarIdParam);

router.get('/', validarFiltrosId('fincaId'), async (req, res) => {
  const { fincaId } = req.query;
  const params = [req.productorId];
  let where = 'productor_id = $1';
  if (fincaId) {
    params.push(fincaId);
    where += ` AND finca_id = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT id, finca_id, nombre, color, area, cultivo, riego, malla_antigranizo, terreno, activo
     FROM lotes WHERE ${where} ORDER BY id`,
    params
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, area, fincaId, color, cultivo, riego, mallaAntigranizo, terreno } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
  if (!fincaId) return res.status(400).json({ error: 'fincaId es obligatorio' });
  const errorEntrada =
    errorTexto(nombre, 120, 'nombre') || errorTexto(cultivo, 80, 'cultivo') || errorArea(area || undefined); // 0 o vacío = área por defecto
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });
  if (!esIdValido(fincaId)) return res.status(404).json({ error: 'Finca no encontrada' });

  const { rows: fincaCheck } = await db.query('SELECT id FROM fincas WHERE id = $1 AND productor_id = $2', [
    fincaId,
    req.productorId
  ]);
  if (fincaCheck.length === 0) return res.status(404).json({ error: 'Finca no encontrada' });

  let colorFinal = COLORES_VALIDOS.includes(color) ? color : null;
  if (!colorFinal) {
    const { rows: existentes } = await db.query('SELECT COUNT(*)::int AS total FROM lotes WHERE productor_id = $1', [
      req.productorId
    ]);
    colorFinal = COLORES_VALIDOS[existentes[0].total % COLORES_VALIDOS.length];
  }

  const riegoFinal = RIEGOS_VALIDOS.includes(riego) ? riego : null;
  const terrenoFinal = TERRENOS_VALIDOS.includes(terreno) ? terreno : null;

  const { rows } = await db.query(
    `INSERT INTO lotes (productor_id, finca_id, nombre, color, area, cultivo, riego, malla_antigranizo, terreno)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, finca_id, nombre, color, area, cultivo, riego, malla_antigranizo, terreno`,
    [
      req.productorId,
      fincaId,
      nombre.trim(),
      colorFinal,
      area || 10,
      (cultivo || '').trim() || null,
      riegoFinal,
      !!mallaAntigranizo,
      terrenoFinal
    ]
  );
  res.status(201).json(rows[0]);
});

// Archivar saca el cuartel de las listas activas pero conserva sus gastos e
// ingresos para el balance histórico (borrarlo se los llevaría por el ON DELETE CASCADE).
router.patch('/:id/archivar', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Cuartel no encontrado' });

  const { rows } = await db.query('SELECT id, finca_id, activo FROM lotes WHERE id = $1 AND productor_id = $2', [
    id,
    req.productorId
  ]);
  if (rows.length === 0) return res.status(404).json({ error: 'Cuartel no encontrado' });
  if (!rows[0].activo) return res.json({ id, activo: false });

  const { rows: otros } = await db.query(
    'SELECT COUNT(*)::int AS total FROM lotes WHERE finca_id = $1 AND activo = true AND id <> $2',
    [rows[0].finca_id, id]
  );
  if (otros[0].total === 0) {
    return res.status(409).json({ error: 'No podés archivar el único cuartel activo de la finca' });
  }

  await db.query('UPDATE lotes SET activo = false WHERE id = $1', [id]);
  await db.query('INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)', [
    req.productorId,
    'lote_archivado',
    JSON.stringify({ id })
  ]);
  res.json({ id, activo: false });
});

router.patch('/:id/restaurar', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Cuartel no encontrado' });

  const { rows } = await db.query(
    'UPDATE lotes SET activo = true WHERE id = $1 AND productor_id = $2 RETURNING id, activo',
    [id, req.productorId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Cuartel no encontrado' });
  res.json(rows[0]);
});

module.exports = router;
