// Clima por finca: ubicación de la finca (buscando el lugar o con el GPS del celular), pronóstico de
// 7 días y umbral de helada para el aviso por N8N (ver jobs/clima-scheduler.js).
const router = require('express').Router();
const db = require('../db');
const { pronosticoConFuente, buscarLugar, ErrorClima } = require('../services/clima');
const { errorTexto, esIdValido, validarIdParam } = require('../services/validar');

router.param('id', validarIdParam);

async function configDe(productorId) {
  const { rows } = await db.query('SELECT umbral_helada, avisar FROM config_clima WHERE productor_id = $1', [
    productorId
  ]);
  return rows[0]
    ? { umbralHelada: Number(rows[0].umbral_helada), avisar: rows[0].avisar }
    : { umbralHelada: 0, avisar: true };
}

// Los errores de Open-Meteo se muestran como 502 con un mensaje claro, no como 500.
const conClima = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof ErrorClima) return res.status(502).json({ error: err.message });
    throw err;
  }
};

router.get('/fincas', async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nombre, latitud, longitud, lugar FROM fincas WHERE productor_id = $1 ORDER BY id',
    [req.productorId]
  );
  res.json({ fincas: rows, config: await configDe(req.productorId) });
});

// Ubica la finca. Con latitud y longitud en null, se borra la ubicación.
router.put('/fincas/:id/ubicacion', async (req, res) => {
  const { latitud, longitud, lugar } = req.body;
  const borrar = latitud === null && longitud === null;
  const lat = Number(latitud);
  const lon = Number(longitud);
  if (!borrar && (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)) {
    return res.status(400).json({ error: 'La ubicación no es válida' });
  }
  const e = errorTexto(lugar, 120, 'lugar');
  if (e) return res.status(400).json({ error: e });
  const { rows } = await db.query(
    `UPDATE fincas SET latitud = $1, longitud = $2, lugar = $3 WHERE id = $4 AND productor_id = $5
     RETURNING id, nombre, latitud, longitud, lugar`,
    [
      borrar ? null : Math.round(lat * 1e5) / 1e5,
      borrar ? null : Math.round(lon * 1e5) / 1e5,
      borrar ? null : (lugar || '').trim() || null,
      Number(req.params.id),
      req.productorId
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Finca no encontrada' });
  res.json(rows[0]);
});

router.get(
  '/buscar',
  conClima(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2 || q.length > 80) return res.status(400).json({ error: 'Escribí el nombre del lugar' });
    res.json(await buscarLugar(q));
  })
);

router.get(
  '/pronostico',
  conClima(async (req, res) => {
    if (!esIdValido(req.query.fincaId)) return res.status(400).json({ error: 'Elegí la finca' });
    const { rows } = await db.query(
      'SELECT id, nombre, latitud, longitud, lugar FROM fincas WHERE id = $1 AND productor_id = $2',
      [Number(req.query.fincaId), req.productorId]
    );
    const finca = rows[0];
    if (!finca) return res.status(404).json({ error: 'Finca no encontrada' });
    if (finca.latitud === null) return res.status(409).json({ error: 'Primero ubicá la finca' });
    const config = await configDe(req.productorId);
    const { dias, fuente } = await pronosticoConFuente(finca.latitud, finca.longitud, config.umbralHelada);
    res.json({ finca, umbralHelada: config.umbralHelada, dias, fuente });
  })
);

router.get('/config', async (req, res) => {
  res.json(await configDe(req.productorId));
});

router.put('/config', async (req, res) => {
  const actual = await configDe(req.productorId);
  const umbral = req.body.umbralHelada === undefined ? actual.umbralHelada : Number(req.body.umbralHelada);
  if (!Number.isFinite(umbral) || umbral < -15 || umbral > 10) {
    return res.status(400).json({ error: 'El umbral de helada tiene que estar entre -15 y 10 °C' });
  }
  const avisar = req.body.avisar === undefined ? actual.avisar : !!req.body.avisar;
  await db.query(
    `INSERT INTO config_clima (productor_id, umbral_helada, avisar) VALUES ($1, $2, $3)
     ON CONFLICT (productor_id) DO UPDATE SET umbral_helada = EXCLUDED.umbral_helada, avisar = EXCLUDED.avisar`,
    [req.productorId, Math.round(umbral * 10) / 10, avisar]
  );
  res.json(await configDe(req.productorId));
});

module.exports = router;
