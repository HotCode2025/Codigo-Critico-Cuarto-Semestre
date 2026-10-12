const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');
const { loteEsDelProductor } = require('../services/lotes');
const { errorMonto, errorFecha, errorOpcion } = require('../services/validar');

const ESTADOS = ['pagado', 'programado'];
const { iaLimiter } = require('../middleware/rateLimit');
const { extraerItemsFactura, Anthropic } = require('../services/facturas');

async function registrarEvento(productorId, tipo, datos) {
  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [productorId, tipo, JSON.stringify(datos)]
  );
}

router.get('/', async (req, res) => {
  const { loteId, estado, fincaId } = req.query;
  const condiciones = ['g.productor_id = $1'];
  const params = [req.productorId];
  let join = '';

  if (loteId) { params.push(loteId); condiciones.push(`g.lote_id = $${params.length}`); }
  if (estado) { params.push(estado); condiciones.push(`g.estado = $${params.length}`); }
  if (fincaId) {
    join = 'JOIN lotes l ON l.id = g.lote_id';
    params.push(fincaId);
    condiciones.push(`l.finca_id = $${params.length}`);
  }

  const { rows } = await db.query(
    `SELECT g.id, g.lote_id, g.concepto, g.monto, g.estado, g.fecha, g.creado_en FROM gastos g ${join}
     WHERE ${condiciones.join(' AND ')} ORDER BY g.creado_en DESC`,
    params
  );
  res.json(rows);
});

router.get('/programados', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, lote_id, concepto, monto, fecha FROM gastos
     WHERE productor_id = $1 AND estado = 'programado' ORDER BY fecha ASC`,
    [req.productorId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { loteId, concepto, monto, estado, fecha } = req.body;
  if (!loteId || !concepto || !monto || !estado) {
    return res.status(400).json({ error: 'loteId, concepto, monto y estado son obligatorios' });
  }
  const errorEntrada = errorMonto(monto) || errorOpcion(estado, ESTADOS, 'estado') || errorFecha(fecha);
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });
  if (estado === 'programado' && !fecha) {
    return res.status(400).json({ error: 'fecha es obligatoria para gastos programados' });
  }

  if (!(await loteEsDelProductor(loteId, req.productorId))) {
    return res.status(404).json({ error: 'Lote no encontrado' });
  }

  const { rows } = await db.query(
    `INSERT INTO gastos (productor_id, lote_id, concepto, monto, estado, fecha)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, lote_id, concepto, monto, estado, fecha`,
    [req.productorId, loteId, concepto, monto, estado, fecha || null]
  );

  const gasto = rows[0];
  await registrarEvento(req.productorId, 'gasto_registrado', gasto);
  notificarN8N(req.productorId, 'gasto_registrado', gasto).catch(() => {});

  res.status(201).json(gasto);
});

// Editar: se pueden cambiar cuartel, concepto, monto, estado y fecha.
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Gasto no encontrado' });

  const { rows: actual } = await db.query(
    'SELECT lote_id, concepto, monto, estado, fecha FROM gastos WHERE id = $1 AND productor_id = $2',
    [id, req.productorId]
  );
  if (actual.length === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
  const g = actual[0];

  const loteId = req.body.loteId !== undefined ? Number(req.body.loteId) : g.lote_id;
  const concepto = req.body.concepto !== undefined ? String(req.body.concepto).trim() : g.concepto;
  const monto = req.body.monto !== undefined ? Number(req.body.monto) : Number(g.monto);
  const estado = req.body.estado !== undefined ? req.body.estado : g.estado;
  const fecha = req.body.fecha !== undefined ? (req.body.fecha || null) : g.fecha;

  if (!concepto) return res.status(400).json({ error: 'El concepto no puede quedar vacío' });
  if (!Number.isFinite(monto) || monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  if (!['pagado', 'programado'].includes(estado)) return res.status(400).json({ error: 'estado inválido' });
  if (errorFecha(req.body.fecha)) return res.status(400).json({ error: errorFecha(req.body.fecha) });
  if (estado === 'programado' && !fecha) return res.status(400).json({ error: 'fecha es obligatoria para gastos programados' });
  if (loteId !== g.lote_id && !(await loteEsDelProductor(loteId, req.productorId))) {
    return res.status(404).json({ error: 'Lote no encontrado' });
  }

  const { rows } = await db.query(
    `UPDATE gastos SET lote_id = $1, concepto = $2, monto = $3, estado = $4, fecha = $5
     WHERE id = $6 AND productor_id = $7
     RETURNING id, lote_id, concepto, monto, estado, fecha`,
    [loteId, concepto, monto, estado, fecha, id, req.productorId]
  );
  await registrarEvento(req.productorId, 'gasto_editado', rows[0]);
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Gasto no encontrado' });

  const { rows } = await db.query(
    'DELETE FROM gastos WHERE id = $1 AND productor_id = $2 RETURNING id, lote_id, concepto, monto',
    [id, req.productorId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
  await registrarEvento(req.productorId, 'gasto_eliminado', rows[0]);
  res.json({ id });
});

router.post('/extraer-factura', iaLimiter, async (req, res) => {
  const { imagenBase64, mediaType } = req.body;
  if (!imagenBase64) return res.status(400).json({ error: 'imagenBase64 es obligatorio' });

  try {
    const items = await extraerItemsFactura(imagenBase64, mediaType);
    if (items.length === 0) {
      return res.status(422).json({ error: 'No se detectaron ítems en la factura' });
    }
    res.json({ items });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Demasiadas solicitudes a la IA, probá de nuevo en un momento' });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: 'No se pudo procesar la factura con la IA' });
    }
    throw err;
  }
});

module.exports = router;
