const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');
const { loteEsDelProductor } = require('../services/lotes');

router.get('/', async (req, res) => {
  const { fincaId } = req.query;
  const params = [req.productorId];
  let join = '';
  let filtroFinca = '';

  if (fincaId) {
    join = 'JOIN lotes l ON l.id = i.lote_id';
    params.push(fincaId);
    filtroFinca = `AND l.finca_id = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT i.id, i.lote_id, i.monto, i.monto_neto, i.tipo, i.estado, i.con_descuento, i.costo_financiero, i.fecha_cobro, i.creado_en
     FROM ingresos i ${join} WHERE i.productor_id = $1 ${filtroFinca} ORDER BY i.creado_en DESC`,
    params
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { loteId, monto, tipo, estado, conDescuento, montoNeto, fechaCobro } = req.body;
  if (!loteId || !monto || !tipo) {
    return res.status(400).json({ error: 'loteId, monto y tipo son obligatorios' });
  }

  if (!(await loteEsDelProductor(loteId, req.productorId))) {
    return res.status(404).json({ error: 'Lote no encontrado' });
  }

  const descuento = !!conDescuento;
  const neto = parseFloat(montoNeto) || 0;
  const esCheque = tipo === 'fisico' || tipo === 'echeq';
  const estadoFinal = estado || 'normal';

  const aplicaDescuento = descuento && neto > 0 && neto < monto;
  const montoFinal = aplicaDescuento ? neto : monto;
  const costoFinanciero = aplicaDescuento ? monto - neto : 0;

  const { rows } = await db.query(
    `INSERT INTO ingresos
       (productor_id, lote_id, monto, monto_neto, tipo, estado, con_descuento, costo_financiero, fecha_cobro)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, lote_id, monto, tipo, estado, fecha_cobro`,
    [req.productorId, loteId, monto, aplicaDescuento ? neto : null, tipo, estadoFinal, aplicaDescuento, costoFinanciero, fechaCobro || null]
  );
  const ingreso = rows[0];

  if (esCheque && estadoFinal === 'normal' && !aplicaDescuento) {
    const fecha = fechaCobro && fechaCobro.trim() !== '' ? fechaCobro : new Date().toISOString().split('T')[0];
    await db.query(
      `INSERT INTO cheques_cartera (productor_id, ingreso_id, tipo, monto, fecha_cobro)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.productorId, ingreso.id, tipo, monto, fecha]
    );
  }

  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [req.productorId, 'ingreso_registrado', JSON.stringify(ingreso)]
  );
  notificarN8N(req.productorId, 'ingreso_registrado', ingreso).catch(() => {});

  res.status(201).json(ingreso);
});

// Editar: cuartel, monto y fecha de cobro. Tipo, estado y descuento no se cambian
// (para eso se borra y se vuelve a cargar). Si es un cheque, la cartera se mantiene en sintonía.
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Ingreso no encontrado' });

  const { rows: actual } = await db.query(
    'SELECT lote_id, monto, tipo, con_descuento, fecha_cobro FROM ingresos WHERE id = $1 AND productor_id = $2',
    [id, req.productorId]
  );
  if (actual.length === 0) return res.status(404).json({ error: 'Ingreso no encontrado' });
  const ing = actual[0];
  const esCheque = ing.tipo === 'fisico' || ing.tipo === 'echeq';

  const loteId = req.body.loteId !== undefined ? Number(req.body.loteId) : ing.lote_id;
  const monto = req.body.monto !== undefined ? Number(req.body.monto) : Number(ing.monto);
  const fechaCobro = esCheque && req.body.fechaCobro ? req.body.fechaCobro : ing.fecha_cobro;

  if (!Number.isFinite(monto) || monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  if (ing.con_descuento && monto !== Number(ing.monto)) {
    return res.status(409).json({ error: 'Un ingreso con descuento no puede cambiar de monto: borralo y cargalo de nuevo' });
  }
  if (loteId !== ing.lote_id && !(await loteEsDelProductor(loteId, req.productorId))) {
    return res.status(404).json({ error: 'Lote no encontrado' });
  }

  const { rows } = await db.query(
    `UPDATE ingresos SET lote_id = $1, monto = $2, fecha_cobro = $3
     WHERE id = $4 AND productor_id = $5
     RETURNING id, lote_id, monto, tipo, estado, fecha_cobro`,
    [loteId, monto, fechaCobro, id, req.productorId]
  );
  if (esCheque) {
    await db.query(
      `UPDATE cheques_cartera SET monto = $1, fecha_cobro = COALESCE($2, fecha_cobro)
       WHERE ingreso_id = $3 AND productor_id = $4`,
      [monto, fechaCobro, id, req.productorId]
    );
  }
  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [req.productorId, 'ingreso_editado', JSON.stringify(rows[0])]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Ingreso no encontrado' });

  const { rows: existe } = await db.query(
    'SELECT id, lote_id, monto, tipo FROM ingresos WHERE id = $1 AND productor_id = $2',
    [id, req.productorId]
  );
  if (existe.length === 0) return res.status(404).json({ error: 'Ingreso no encontrado' });

  // El cheque de la cartera queda con ingreso_id nulo si solo se borra el ingreso: se borra también.
  await db.query('DELETE FROM cheques_cartera WHERE ingreso_id = $1 AND productor_id = $2', [id, req.productorId]);
  await db.query('DELETE FROM ingresos WHERE id = $1 AND productor_id = $2', [id, req.productorId]);
  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [req.productorId, 'ingreso_eliminado', JSON.stringify(existe[0])]
  );
  res.json({ id });
});

module.exports = router;
