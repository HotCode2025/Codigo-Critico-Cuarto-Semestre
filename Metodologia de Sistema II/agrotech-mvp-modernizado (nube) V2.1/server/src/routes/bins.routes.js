// Bins en comodato: los envases que presta cada fábrica para cosechar. La fábrica los trae vacíos
// (entrega), vuelven llenos con cada envío (envios.tipo_bin_id y envios.bins, sin cargar nada de
// nuevo) y la fábrica retira los vacíos que sobran (retiro). También se anotan los rotos o perdidos y
// un ajuste cuando se cuentan en la finca. El saldo es cuántos bins de esa fábrica hay en la finca.
const router = require('express').Router();
const db = require('../db');
const {
  errorFecha,
  errorOpcion,
  errorTexto,
  esIdValido,
  normalizarCuit,
  validarIdParam
} = require('../services/validar');

const TIPOS = ['entrega', 'retiro', 'rotura', 'ajuste'];

router.param('id', validarIdParam);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });

// Los bins de cada fábrica con lo que entró, salió y el saldo en la finca.
async function binsDe(productorId, id = null) {
  const { rows } = await db.query(
    `SELECT t.id, t.fabrica_nombre, t.fabrica_cuit, t.descripcion, t.marca, t.color, t.activo,
            COALESCE(m.entregados, 0)::int AS entregados, COALESCE(m.retirados, 0)::int AS retirados,
            COALESCE(m.rotos, 0)::int AS rotos, COALESCE(m.ajustes, 0)::int AS ajustes,
            COALESCE(e.enviados, 0)::int AS enviados,
            (COALESCE(m.total, 0) - COALESCE(e.enviados, 0))::int AS saldo,
            GREATEST(m.ultimo, e.ultimo) AS ultimo_movimiento
     FROM tipos_bin t
     LEFT JOIN (
       SELECT tipo_bin_id, SUM(cantidad) AS total, MAX(fecha) AS ultimo,
              SUM(cantidad) FILTER (WHERE tipo = 'entrega') AS entregados,
              -SUM(cantidad) FILTER (WHERE tipo = 'retiro') AS retirados,
              -SUM(cantidad) FILTER (WHERE tipo = 'rotura') AS rotos,
              SUM(cantidad) FILTER (WHERE tipo = 'ajuste') AS ajustes
       FROM movimientos_bins GROUP BY tipo_bin_id
     ) m ON m.tipo_bin_id = t.id
     LEFT JOIN (
       SELECT tipo_bin_id, SUM(bins) AS enviados, MAX(fecha) AS ultimo
       FROM envios WHERE estado <> 'anulado' GROUP BY tipo_bin_id
     ) e ON e.tipo_bin_id = t.id
     WHERE t.productor_id = $1 ${id ? 'AND t.id = $2' : ''}
     ORDER BY t.activo DESC, t.fabrica_nombre, t.descripcion`,
    id ? [productorId, id] : [productorId]
  );
  return rows;
}

function leerTipo(body, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  for (const [campo, columna, max, obligatorio] of [
    ['fabricaNombre', 'fabrica_nombre', 120, true],
    ['descripcion', 'descripcion', 120, true],
    ['marca', 'marca', 60, false],
    ['color', 'color', 40, false]
  ]) {
    if (!viene(campo)) {
      if (obligatorio && !parcial) return { error: `${campo} es obligatorio` };
      continue;
    }
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[columna] = (body[campo] || '').trim() || null;
    if (obligatorio && !datos[columna]) return { error: `${campo} es obligatorio` };
  }
  if (viene('fabricaCuit')) {
    if (!body.fabricaCuit) datos.fabrica_cuit = null;
    else {
      const cuit = normalizarCuit(body.fabricaCuit);
      if (!cuit) return { error: 'fabricaCuit no es un CUIT válido' };
      datos.fabrica_cuit = cuit;
    }
  }
  if (viene('activo')) datos.activo = !!body.activo;
  return { datos };
}

router.get('/', async (req, res) => {
  res.json(await binsDe(req.productorId));
});

router.post('/tipos', async (req, res) => {
  const { error, datos } = leerTipo(req.body);
  if (error) return res.status(400).json({ error });
  const columnas = ['productor_id', ...Object.keys(datos)];
  const { rows } = await db.query(
    `INSERT INTO tipos_bin (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    [req.productorId, ...Object.values(datos)]
  );
  res.status(201).json((await binsDe(req.productorId, rows[0].id))[0]);
});

router.patch('/tipos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { error, datos } = leerTipo(req.body, true);
  if (error) return res.status(400).json({ error });
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  const { rows } = await db.query(
    `UPDATE tipos_bin SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE id = $${columnas.length + 1} AND productor_id = $${columnas.length + 2} RETURNING id`,
    [...Object.values(datos), id, req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json((await binsDe(req.productorId, id))[0]);
});

// Solo se borra si no tiene movimientos ni envíos; si los tiene, se da de baja (la fábrica dejó de
// mandar esos bins) para no perder la cuenta.
router.delete('/tipos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [tipo] = await binsDe(req.productorId, id);
  if (!tipo) return res.status(404).json({ error: 'No encontrado' });
  const { rows: usados } = await db.query(
    `SELECT 1 FROM movimientos_bins WHERE tipo_bin_id = $1 UNION ALL SELECT 1 FROM envios WHERE tipo_bin_id = $1 LIMIT 1`,
    [id]
  );
  if (usados.length) return res.status(409).json({ error: 'Tiene movimientos: dalos de baja en vez de borrarlos' });
  await db.query('DELETE FROM tipos_bin WHERE id = $1', [id]);
  res.json({ id });
});

// Historial: los movimientos y los envíos que se llevaron esos bins, del más nuevo al más viejo.
router.get('/tipos/:id/movimientos', async (req, res) => {
  const id = Number(req.params.id);
  const [tipo] = await binsDe(req.productorId, id);
  if (!tipo) return res.status(404).json({ error: 'No encontrado' });
  const { rows } = await db.query(
    `SELECT id, fecha, tipo, cantidad, remito_fabrica, nota, NULL::int AS envio_id, NULL AS estado_envio
     FROM movimientos_bins WHERE tipo_bin_id = $1
     UNION ALL
     SELECT NULL, fecha, 'envio', -bins, NULL, destino_nombre, id, estado
     FROM envios WHERE tipo_bin_id = $1 AND bins > 0
     ORDER BY fecha DESC, id DESC NULLS LAST LIMIT 500`,
    [id]
  );
  res.json(rows);
});

// Entrega de vacíos, retiro de vacíos, rotos o perdidos (cantidad positiva) o ajuste por conteo
// (binsContados: los que hay en la finca).
router.post('/movimientos', async (req, res) => {
  const b = req.body;
  if (!esIdValido(b.tipoBinId)) return res.status(400).json({ error: 'Elegí de qué fábrica son los bins' });
  const eTipo = errorOpcion(b.tipo, TIPOS, 'tipo');
  if (eTipo) return res.status(400).json({ error: eTipo });
  const fecha = b.fecha || hoy();
  const e = errorFecha(fecha) || errorTexto(b.remitoFabrica, 40, 'remitoFabrica') || errorTexto(b.nota, 300, 'nota');
  if (e) return res.status(400).json({ error: e });
  if (String(fecha).slice(0, 10) > hoy()) return res.status(400).json({ error: 'La fecha no puede ser futura' });
  const [tipo] = await binsDe(req.productorId, Number(b.tipoBinId));
  if (!tipo) return res.status(404).json({ error: 'No encontrado' });

  let cantidad;
  if (b.tipo === 'ajuste') {
    const contados = Number(b.binsContados);
    if (
      b.binsContados === undefined ||
      b.binsContados === '' ||
      !Number.isInteger(contados) ||
      contados < 0 ||
      contados > 100000
    ) {
      return res.status(400).json({ error: 'Poné cuántos bins contaste en la finca' });
    }
    cantidad = contados - tipo.saldo;
    if (cantidad === 0) return res.status(400).json({ error: 'El saldo ya es ese: no hay nada que ajustar' });
  } else {
    const n = Number(b.cantidad);
    if (!Number.isInteger(n) || n <= 0 || n > 100000)
      return res.status(400).json({ error: 'La cantidad de bins debe ser un entero mayor a 0' });
    cantidad = b.tipo === 'entrega' ? n : -n;
  }
  const { rows } = await db.query(
    `INSERT INTO movimientos_bins (productor_id, tipo_bin_id, fecha, tipo, cantidad, remito_fabrica, nota)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, fecha, tipo, cantidad, remito_fabrica, nota`,
    [
      req.productorId,
      tipo.id,
      fecha,
      b.tipo,
      cantidad,
      (b.remitoFabrica || '').trim() || null,
      (b.nota || '').trim() || null
    ]
  );
  res.status(201).json({ movimiento: rows[0], bins: (await binsDe(req.productorId, tipo.id))[0] });
});

router.delete('/movimientos/:id', async (req, res) => {
  const { rows } = await db.query('DELETE FROM movimientos_bins WHERE id = $1 AND productor_id = $2 RETURNING id', [
    Number(req.params.id),
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Movimiento no encontrado' });
  res.json({ id: rows[0].id });
});

module.exports = router;
module.exports.binsDe = binsDe;
