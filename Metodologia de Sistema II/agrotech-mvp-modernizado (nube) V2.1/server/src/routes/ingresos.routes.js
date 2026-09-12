const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

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

module.exports = router;
